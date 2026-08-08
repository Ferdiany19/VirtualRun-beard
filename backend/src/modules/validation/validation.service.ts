import { withTransaction } from '@/db/transaction';
import { createAuditLog } from '@/modules/audit/audit.repository';
import { canAccessEventManagement } from '@/modules/auth/auth.policy';
import type { AuthenticatedAdmin } from '@/modules/auth/auth.types';
import { getManageableEvent } from '@/modules/events/event.service';
import { getEventById } from '@/modules/events/event.repository';
import type { EventRecord } from '@/modules/events/event.types';
import { enqueueBackgroundJob } from '@/modules/jobs/job.repository';
import {
  getAdminSubmissionDetail,
  recordSubmissionSystemEvent,
} from '@/modules/submissions/submission.repository';
import type {
  SubmissionDetail,
  SubmissionStatus,
} from '@/modules/submissions/submission.types';
import {
  clearApprovalForReview,
  countDuplicateEvidence,
  createEventValidatorAssignment,
  createValidationReview,
  hasActiveValidatorAssignment,
  listEligibleValidators,
  listEventValidatorAssignments,
  listParticipantVisibleValidationReviews,
  listValidationEventIdsForAdmin,
  listValidationQueue,
  listValidationReviews,
  lockSubmissionForValidation,
  revokeEventValidatorAssignment,
  updateSubmissionClaim,
  updateSubmissionDecision,
  type LockedSubmissionForValidation,
} from '@/modules/validation/validation.repository';
import {
  claimSubmissionSchema,
  validationDecisionSchema,
  validationQueueSchema,
  validatorAssignmentSchema,
  validatorRevocationSchema,
  type ValidationDecisionInput,
} from '@/modules/validation/validation.schema';
import {
  assertReasonCodeForAction,
  assertStatusTransition,
  canActOnValidation,
  canDisqualifySubmission,
  canManageValidatorAssignments,
  canViewValidation,
  isClaimActive,
} from '@/modules/validation/validation.policy';
import type {
  EligibleValidator,
  EventValidatorAssignmentRecord,
  ValidationAction,
  ValidationQueueFilters,
  ValidationQueueItem,
  ValidationWarning,
} from '@/modules/validation/validation.types';
import { env } from '@/shared/config/env';
import { BUSINESS_TIMEZONE } from '@/shared/date/business-timezone';
import { ApplicationError } from '@/shared/errors/application-error';
import { isDatabaseErrorCode } from '@/shared/errors/database';

type RequestContext = {
  correlationId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

type ValidationNotificationJob =
  | 'SEND_REVISION_REQUEST_NOTIFICATION'
  | 'SEND_SUBMISSION_APPROVED_NOTIFICATION'
  | 'SEND_SUBMISSION_REJECTED_NOTIFICATION'
  | 'SEND_SUBMISSION_DISQUALIFIED_NOTIFICATION'
  | 'SEND_REVISED_SUBMISSION_RECEIVED_NOTIFICATION';

function claimExpiry(): Date {
  return new Date(Date.now() + env.REVIEW_CLAIM_DURATION_MINUTES * 60_000);
}

function assertCanViewValidation(admin: AuthenticatedAdmin): void {
  if (!canViewValidation(admin)) {
    throw forbidden(
      'Admin role cannot view validation',
      'Role Anda belum dapat melihat validation.',
    );
  }
}

function assertCanActValidation(admin: AuthenticatedAdmin): void {
  if (!canActOnValidation(admin)) {
    throw forbidden(
      'Admin role cannot perform validation',
      'Role Anda belum dapat mengubah validation.',
    );
  }
}

function forbidden(message: string, safeMessage: string): ApplicationError {
  return new ApplicationError({
    code: 'FORBIDDEN',
    message,
    safeMessage,
    statusCode: 403,
  });
}

async function assertCanViewEventValidation(
  eventId: string,
  admin: AuthenticatedAdmin,
): Promise<void> {
  assertCanViewValidation(admin);

  if (canAccessEventManagement(admin)) {
    await getManageableEvent(eventId, admin);
    return;
  }

  if (await hasActiveValidatorAssignment({ eventId, adminUserId: admin.id })) {
    return;
  }

  throw forbidden(
    'Admin cannot view event validation',
    'Anda tidak ditugaskan ke event ini.',
  );
}

async function assertCanActEventValidation(
  eventId: string,
  admin: AuthenticatedAdmin,
): Promise<void> {
  assertCanActValidation(admin);

  if (canAccessEventManagement(admin)) {
    await getManageableEvent(eventId, admin);
    return;
  }

  if (await hasActiveValidatorAssignment({ eventId, adminUserId: admin.id })) {
    return;
  }

  throw forbidden(
    'Admin cannot validate event',
    'Anda tidak ditugaskan untuk memvalidasi event ini.',
  );
}

function auditValues(input: {
  previousStatus: SubmissionStatus;
  resultingStatus: SubmissionStatus;
  revisionId: string | null;
  reasonCode?: string | null;
}) {
  return {
    previousStatus: input.previousStatus,
    resultingStatus: input.resultingStatus,
    submissionRevisionId: input.revisionId,
    reasonCode: input.reasonCode ?? null,
  };
}

function notificationJobFor(
  action: ValidationAction,
): ValidationNotificationJob | null {
  if (action === 'REQUEST_REVISION') {
    return 'SEND_REVISION_REQUEST_NOTIFICATION';
  }
  if (action === 'APPROVE') {
    return 'SEND_SUBMISSION_APPROVED_NOTIFICATION';
  }
  if (action === 'REJECT') {
    return 'SEND_SUBMISSION_REJECTED_NOTIFICATION';
  }
  if (action === 'DISQUALIFY') {
    return 'SEND_SUBMISSION_DISQUALIFIED_NOTIFICATION';
  }

  return null;
}

function jakartaDateValue(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '00';

  return `${value('year')}-${value('month')}-${value('day')}`;
}

function buildWarnings(
  detail: SubmissionDetail,
  duplicates: { duplicateUrlCount: number; duplicateChecksumCount: number },
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const revision = detail.currentRevision;

  if (!revision) {
    return warnings;
  }

  const distanceDelta = revision.distanceMeter - detail.category.distanceMeters;
  const distanceOutside =
    Math.abs(distanceDelta) > detail.category.distanceToleranceMeters;
  warnings.push({
    code: 'DISTANCE_TOLERANCE',
    tone: distanceOutside ? 'warning' : 'neutral',
    label: distanceOutside
      ? 'Jarak di luar toleransi'
      : 'Jarak dalam toleransi',
    description: `Selisih ${distanceDelta} meter dari target kategori.`,
  });

  const activityDate = revision.activityDate;
  const start = jakartaDateValue(detail.event.activityStartsAt);
  const end = jakartaDateValue(detail.event.activityEndsAt);
  const outsideActivity = activityDate < start || activityDate > end;
  warnings.push({
    code: 'ACTIVITY_PERIOD',
    tone: outsideActivity ? 'danger' : 'neutral',
    label: outsideActivity
      ? 'Tanggal aktivitas di luar periode'
      : 'Tanggal aktivitas sesuai periode',
    description: `Periode aktivitas event ${start} sampai ${end}.`,
  });

  if (
    revision.movingTimeSeconds !== null &&
    revision.movingTimeSeconds > revision.elapsedTimeSeconds
  ) {
    warnings.push({
      code: 'MOVING_TIME',
      tone: 'warning',
      label: 'Moving time melebihi elapsed time',
      description: 'Periksa kembali data waktu aktivitas.',
    });
  }

  const paceSeconds = Math.round(
    revision.elapsedTimeSeconds / (revision.distanceMeter / 1000),
  );
  if (paceSeconds < 120 || paceSeconds > 3600) {
    warnings.push({
      code: 'PACE_RANGE',
      tone: 'warning',
      label: 'Pace perlu ditinjau',
      description:
        'Pace berada di luar rentang operasional yang umum, tetapi tidak otomatis menentukan keputusan.',
    });
  }

  if (!revision.activityUrl && !detail.currentFile) {
    warnings.push({
      code: 'EVIDENCE_MISSING',
      tone: 'danger',
      label: 'Bukti tidak tersedia',
      description: 'Submission tidak memiliki URL aktivitas atau screenshot.',
    });
  }

  if (duplicates.duplicateUrlCount > 0) {
    warnings.push({
      code: 'DUPLICATE_ACTIVITY_URL',
      tone: 'warning',
      label: 'Activity URL pernah dipakai',
      description: `${duplicates.duplicateUrlCount} submission lain memakai URL aktivitas yang sama.`,
    });
  }

  if (duplicates.duplicateChecksumCount > 0) {
    warnings.push({
      code: 'DUPLICATE_SCREENSHOT',
      tone: 'warning',
      label: 'Screenshot pernah dipakai',
      description: `${duplicates.duplicateChecksumCount} submission lain memakai checksum screenshot yang sama.`,
    });
  }

  return warnings;
}

export async function listValidationQueueForAdmin(input: {
  admin: AuthenticatedAdmin;
  filters: ValidationQueueFilters;
}): Promise<ValidationQueueItem[]> {
  assertCanViewValidation(input.admin);
  const parsed = validationQueueSchema.parse(input.filters);
  const eventIds = await listValidationEventIdsForAdmin(input.admin);
  return listValidationQueue({
    eventIds,
    adminUserId: input.admin.id,
    filters: parsed,
  });
}

export async function listEventValidationQueue(input: {
  eventId: string;
  admin: AuthenticatedAdmin;
  filters: ValidationQueueFilters;
}): Promise<ValidationQueueItem[]> {
  await assertCanViewEventValidation(input.eventId, input.admin);
  const parsed = validationQueueSchema.parse({
    ...input.filters,
    eventId: input.eventId,
  });
  return listValidationQueue({
    eventIds: [input.eventId],
    adminUserId: input.admin.id,
    filters: parsed,
  });
}

export async function getValidationEvent(input: {
  eventId: string;
  admin: AuthenticatedAdmin;
}): Promise<EventRecord> {
  await assertCanViewEventValidation(input.eventId, input.admin);
  const event = await getEventById(input.eventId);

  if (!event) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: 'Event not found',
      safeMessage: 'Event tidak ditemukan.',
      statusCode: 404,
    });
  }

  return event;
}

export async function getValidationSubmissionDetail(input: {
  submissionId: string;
  admin: AuthenticatedAdmin;
  participantVisibleOnly?: boolean;
}): Promise<SubmissionDetail> {
  const detail = await getAdminSubmissionDetail(input.submissionId);

  if (!detail || !detail.submission) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: 'Submission not found',
      safeMessage: 'Submission tidak ditemukan.',
      statusCode: 404,
    });
  }

  await assertCanViewEventValidation(detail.event.id, input.admin);
  const validationReviews = input.participantVisibleOnly
    ? await listParticipantVisibleValidationReviews(detail.submission.id)
    : await listValidationReviews(detail.submission.id);
  const duplicates =
    detail.currentRevision && detail.currentFile
      ? await countDuplicateEvidence({
          revisionId: detail.currentRevision.id,
          normalizedActivityUrl: detail.currentRevision.normalizedActivityUrl,
          checksumSha256: detail.currentFile.checksumSha256,
        })
      : detail.currentRevision
        ? await countDuplicateEvidence({
            revisionId: detail.currentRevision.id,
            normalizedActivityUrl: detail.currentRevision.normalizedActivityUrl,
            checksumSha256: null,
          })
        : { duplicateUrlCount: 0, duplicateChecksumCount: 0 };

  return {
    ...detail,
    validationReviews,
    warnings: buildWarnings(detail, duplicates),
  };
}

async function lockedOrThrow(submissionId: string): Promise<never> {
  throw new ApplicationError({
    code: 'NOT_FOUND',
    message: `Submission ${submissionId} not found`,
    safeMessage: 'Submission tidak ditemukan.',
    statusCode: 404,
  });
}

function assertReviewVersion(
  locked: LockedSubmissionForValidation,
  expectedReviewVersion: number,
): void {
  if (locked.reviewVersion !== expectedReviewVersion) {
    throw new ApplicationError({
      code: 'CONFLICT',
      message: 'Review version conflict',
      safeMessage:
        'Submission berubah saat sedang direview. Muat ulang halaman.',
      statusCode: 409,
    });
  }
}

function assertCurrentRevision(
  locked: LockedSubmissionForValidation,
  revisionId: string,
): void {
  if (!locked.currentRevisionId || locked.currentRevisionId !== revisionId) {
    throw new ApplicationError({
      code: 'CONFLICT',
      message: 'Current revision changed',
      safeMessage:
        'Revisi terbaru sudah berubah. Muat ulang halaman sebelum menyimpan keputusan.',
      statusCode: 409,
    });
  }
}

function assertOwnsClaim(
  locked: LockedSubmissionForValidation,
  admin: AuthenticatedAdmin,
): void {
  if (
    locked.reviewClaimedByAdminUserId !== admin.id ||
    !isClaimActive(locked.reviewClaimExpiresAt)
  ) {
    throw new ApplicationError({
      code: 'CONFLICT',
      message: 'Review claim is missing or expired',
      safeMessage:
        'Claim review sudah tidak aktif. Ambil ulang claim sebelum menyimpan keputusan.',
      statusCode: 409,
    });
  }
}

export async function claimSubmissionForReview(input: {
  admin: AuthenticatedAdmin;
  form: {
    submissionId: string;
    expectedReviewVersion: number;
    reason?: string | null;
  };
  requestContext: RequestContext;
}): Promise<void> {
  const parsed = claimSubmissionSchema.parse(input.form);

  await withTransaction(async (client) => {
    const locked =
      (await lockSubmissionForValidation(parsed.submissionId, client)) ??
      (await lockedOrThrow(parsed.submissionId));
    await assertCanActEventValidation(locked.eventId, input.admin);
    assertReviewVersion(locked, parsed.expectedReviewVersion);

    const activeClaimByOther =
      locked.reviewClaimedByAdminUserId &&
      locked.reviewClaimedByAdminUserId !== input.admin.id &&
      isClaimActive(locked.reviewClaimExpiresAt);

    if (activeClaimByOther && !canAccessEventManagement(input.admin)) {
      throw new ApplicationError({
        code: 'CONFLICT',
        message: 'Submission is claimed by another reviewer',
        safeMessage: 'Submission sedang di-claim reviewer lain.',
        statusCode: 409,
      });
    }

    if (activeClaimByOther && !parsed.reason) {
      throw new ApplicationError({
        code: 'VALIDATION_FAILED',
        message: 'Override reason is required',
        safeMessage: 'Alasan override claim wajib diisi.',
        statusCode: 400,
      });
    }

    const action: ValidationAction = activeClaimByOther
      ? 'OVERRIDE_REVIEW_CLAIM'
      : 'START_REVIEW';
    const resultingStatus = assertStatusTransition({
      action,
      previousStatus: locked.status,
    });
    await updateSubmissionClaim(
      {
        submissionId: locked.submissionId,
        adminUserId: input.admin.id,
        expiresAt: claimExpiry(),
        status: resultingStatus,
        incrementVersion: true,
      },
      client,
    );
    await createValidationReview(
      {
        submissionId: locked.submissionId,
        revisionId: locked.currentRevisionId,
        eventId: locked.eventId,
        registrationCategoryId: locked.registrationCategoryId,
        reviewerAdminUserId: input.admin.id,
        action,
        previousStatus: locked.status,
        resultingStatus,
        reasonCode:
          action === 'OVERRIDE_REVIEW_CLAIM' ? 'CLAIM_OVERRIDE' : null,
        internalNote: parsed.reason ?? null,
        metadata: {
          previousClaimedBy: locked.reviewClaimedByAdminUserId,
          previousClaimExpiresAt:
            locked.reviewClaimExpiresAt?.toISOString() ?? null,
        },
      },
      client,
    );
    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action:
          action === 'OVERRIDE_REVIEW_CLAIM'
            ? 'REVIEW_CLAIM_OVERRIDDEN'
            : 'REVIEW_CLAIMED',
        entityType: 'SUBMISSION',
        entityId: locked.submissionId,
        eventId: locked.eventId,
        newValues: auditValues({
          previousStatus: locked.status,
          resultingStatus,
          revisionId: locked.currentRevisionId,
          reasonCode:
            action === 'OVERRIDE_REVIEW_CLAIM' ? 'CLAIM_OVERRIDE' : null,
        }),
        ipAddress: input.requestContext.ipAddress,
        userAgent: input.requestContext.userAgent,
        correlationId: input.requestContext.correlationId,
      },
      client,
    );
  });
}

export async function releaseSubmissionClaim(input: {
  admin: AuthenticatedAdmin;
  submissionId: string;
  expectedReviewVersion: number;
  requestContext: RequestContext;
}): Promise<void> {
  await withTransaction(async (client) => {
    const locked =
      (await lockSubmissionForValidation(input.submissionId, client)) ??
      (await lockedOrThrow(input.submissionId));
    await assertCanActEventValidation(locked.eventId, input.admin);
    assertReviewVersion(locked, input.expectedReviewVersion);

    if (
      locked.reviewClaimedByAdminUserId !== input.admin.id &&
      !canAccessEventManagement(input.admin)
    ) {
      throw forbidden(
        'Cannot release another reviewer claim',
        'Anda tidak dapat melepas claim reviewer lain.',
      );
    }

    const resultingStatus = assertStatusTransition({
      action: 'RELEASE_CLAIM',
      previousStatus: locked.status,
    });
    await updateSubmissionClaim(
      {
        submissionId: locked.submissionId,
        adminUserId: null,
        expiresAt: null,
        status: resultingStatus,
        incrementVersion: true,
      },
      client,
    );
    await createValidationReview(
      {
        submissionId: locked.submissionId,
        revisionId: locked.currentRevisionId,
        eventId: locked.eventId,
        registrationCategoryId: locked.registrationCategoryId,
        reviewerAdminUserId: input.admin.id,
        action: 'RELEASE_CLAIM',
        previousStatus: locked.status,
        resultingStatus,
      },
      client,
    );
    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action: 'REVIEW_CLAIM_RELEASED',
        entityType: 'SUBMISSION',
        entityId: locked.submissionId,
        eventId: locked.eventId,
        newValues: auditValues({
          previousStatus: locked.status,
          resultingStatus,
          revisionId: locked.currentRevisionId,
        }),
        ipAddress: input.requestContext.ipAddress,
        userAgent: input.requestContext.userAgent,
        correlationId: input.requestContext.correlationId,
      },
      client,
    );
  });
}

export async function saveValidationDecision(input: {
  admin: AuthenticatedAdmin;
  form: ValidationDecisionInput;
  requestContext: RequestContext;
}): Promise<void> {
  const parsed = validationDecisionSchema.parse(input.form);

  await withTransaction(async (client) => {
    const locked =
      (await lockSubmissionForValidation(parsed.submissionId, client)) ??
      (await lockedOrThrow(parsed.submissionId));
    await assertCanActEventValidation(locked.eventId, input.admin);

    if (
      parsed.action === 'DISQUALIFY' &&
      !canDisqualifySubmission(input.admin)
    ) {
      throw forbidden(
        'Disqualification permission denied',
        'Role Anda tidak dapat mendiskualifikasi submission.',
      );
    }

    assertReviewVersion(locked, parsed.expectedReviewVersion);
    assertCurrentRevision(locked, parsed.revisionId);

    const isReopen =
      parsed.action === 'REOPEN_SUBMISSION' ||
      parsed.action === 'RESTORE_TO_REVIEW';
    if (!isReopen) {
      assertOwnsClaim(locked, input.admin);
    }

    const resultingStatus = assertStatusTransition({
      action: parsed.action,
      previousStatus: locked.status,
    });
    const reasonCode = assertReasonCodeForAction(parsed);
    const reviewId = await createValidationReview(
      {
        submissionId: locked.submissionId,
        revisionId: parsed.revisionId,
        eventId: locked.eventId,
        registrationCategoryId: locked.registrationCategoryId,
        reviewerAdminUserId: input.admin.id,
        action: parsed.action,
        previousStatus: locked.status,
        resultingStatus,
        reasonCode,
        participantVisibleNote: parsed.participantVisibleNote ?? null,
        internalNote: parsed.internalNote ?? null,
      },
      client,
    );

    if (isReopen) {
      await clearApprovalForReview(locked.submissionId, client);
      await updateSubmissionClaim(
        {
          submissionId: locked.submissionId,
          adminUserId: input.admin.id,
          expiresAt: claimExpiry(),
          status: resultingStatus,
          incrementVersion: true,
        },
        client,
      );
    } else {
      await updateSubmissionDecision(
        {
          submissionId: locked.submissionId,
          status: resultingStatus,
          approvedRevisionId:
            resultingStatus === 'APPROVED' ? parsed.revisionId : null,
          approvedByAdminUserId:
            resultingStatus === 'APPROVED' ? input.admin.id : null,
          rankingEligible: resultingStatus === 'APPROVED',
          rankingExclusionReason:
            resultingStatus === 'APPROVED'
              ? null
              : (reasonCode ?? resultingStatus),
          participantVisibleNote: parsed.participantVisibleNote ?? null,
          reasonCode,
        },
        client,
      );
    }

    await recordSubmissionSystemEvent(
      {
        submissionId: locked.submissionId,
        revisionId: parsed.revisionId,
        eventRegistrationId: locked.eventRegistrationId,
        registrationCategoryId: locked.registrationCategoryId,
        actorType: 'ADMIN_USER',
        action: parsed.action,
        metadata: { reviewId, reasonCode },
        ipAddress: input.requestContext.ipAddress,
        userAgent: input.requestContext.userAgent,
        correlationId: input.requestContext.correlationId,
      },
      client,
    );
    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action: `SUBMISSION_${parsed.action}`,
        entityType: 'SUBMISSION',
        entityId: locked.submissionId,
        eventId: locked.eventId,
        newValues: auditValues({
          previousStatus: locked.status,
          resultingStatus,
          revisionId: parsed.revisionId,
          reasonCode,
        }),
        ipAddress: input.requestContext.ipAddress,
        userAgent: input.requestContext.userAgent,
        correlationId: input.requestContext.correlationId,
      },
      client,
    );

    const jobType = notificationJobFor(parsed.action);
    if (jobType) {
      await enqueueBackgroundJob(
        {
          jobType,
          payload: { submissionId: locked.submissionId, reviewId },
          maximumAttempts: 5,
        },
        client,
      );
    }
  });
}

export async function getEventValidatorManagement(input: {
  eventId: string;
  admin: AuthenticatedAdmin;
}): Promise<{
  assignments: EventValidatorAssignmentRecord[];
  eligibleValidators: EligibleValidator[];
}> {
  if (!canManageValidatorAssignments(input.admin)) {
    throw forbidden(
      'Admin cannot manage validators',
      'Role Anda belum dapat mengelola validator.',
    );
  }

  await getManageableEvent(input.eventId, input.admin);
  const [assignments, eligibleValidators] = await Promise.all([
    listEventValidatorAssignments(input.eventId),
    listEligibleValidators(),
  ]);

  return { assignments, eligibleValidators };
}

export async function assignEventValidator(input: {
  eventId: string;
  admin: AuthenticatedAdmin;
  formData: FormData;
  requestContext: RequestContext;
}): Promise<void> {
  if (!canManageValidatorAssignments(input.admin)) {
    throw forbidden(
      'Admin cannot assign validator',
      'Role Anda belum dapat menugaskan validator.',
    );
  }

  const parsed = validatorAssignmentSchema.parse({
    adminUserId: input.formData.get('adminUserId'),
  });
  await getManageableEvent(input.eventId, input.admin);

  await withTransaction(async (client) => {
    const assignmentId = await createEventValidatorAssignment(
      {
        eventId: input.eventId,
        adminUserId: parsed.adminUserId,
        assignedByAdminUserId: input.admin.id,
      },
      client,
    );
    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action: 'VALIDATOR_ASSIGNED',
        entityType: 'EVENT_VALIDATOR_ASSIGNMENT',
        entityId: assignmentId,
        eventId: input.eventId,
        newValues: { adminUserId: parsed.adminUserId },
        ipAddress: input.requestContext.ipAddress,
        userAgent: input.requestContext.userAgent,
        correlationId: input.requestContext.correlationId,
      },
      client,
    );
  }).catch((error) => {
    if (isDatabaseErrorCode(error, '23505')) {
      throw new ApplicationError({
        code: 'CONFLICT',
        message: 'Validator assignment already exists',
        safeMessage: 'Validator sudah aktif pada event ini.',
        statusCode: 409,
        cause: error,
      });
    }
    throw error;
  });
}

export async function revokeEventValidator(input: {
  eventId: string;
  admin: AuthenticatedAdmin;
  formData: FormData;
  requestContext: RequestContext;
}): Promise<void> {
  if (!canManageValidatorAssignments(input.admin)) {
    throw forbidden(
      'Admin cannot revoke validator',
      'Role Anda belum dapat mencabut validator.',
    );
  }

  const parsed = validatorRevocationSchema.parse({
    assignmentId: input.formData.get('assignmentId'),
    reason: input.formData.get('reason'),
  });
  await getManageableEvent(input.eventId, input.admin);

  await withTransaction(async (client) => {
    const assignment = await revokeEventValidatorAssignment(
      {
        assignmentId: parsed.assignmentId,
        revokedByAdminUserId: input.admin.id,
        reason: parsed.reason,
      },
      client,
    );

    if (!assignment || assignment.eventId !== input.eventId) {
      throw new ApplicationError({
        code: 'NOT_FOUND',
        message: 'Validator assignment not found',
        safeMessage: 'Assignment validator tidak ditemukan.',
        statusCode: 404,
      });
    }

    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action: 'VALIDATOR_ASSIGNMENT_REVOKED',
        entityType: 'EVENT_VALIDATOR_ASSIGNMENT',
        entityId: assignment.id,
        eventId: input.eventId,
        newValues: {
          adminUserId: assignment.adminUserId,
          reason: parsed.reason,
        },
        ipAddress: input.requestContext.ipAddress,
        userAgent: input.requestContext.userAgent,
        correlationId: input.requestContext.correlationId,
      },
      client,
    );
  });
}

export async function getValidationNotificationSummary(input: {
  submissionId: string;
  reviewId?: string | null;
}): Promise<{
  recipientEmail: string;
  participantName: string;
  eventName: string;
  eventSlug: string;
  categoryName: string;
  status: SubmissionStatus;
  participantVisibleNote: string | null;
  contact: string;
}> {
  const detail = await getAdminSubmissionDetail(input.submissionId);

  if (!detail?.submission) {
    throw new Error('Submission notification detail not found');
  }

  const reviews = await listValidationReviews(input.submissionId);
  const review = input.reviewId
    ? reviews.find((item) => item.id === input.reviewId)
    : (reviews[0] ?? null);

  return {
    recipientEmail: detail.participant.normalizedEmail,
    participantName: detail.participant.fullName,
    eventName: detail.event.name,
    eventSlug: detail.event.slug,
    categoryName: detail.category.name,
    status: detail.submission.status,
    participantVisibleNote:
      review?.participantVisibleNote ??
      detail.submission.latestParticipantVisibleNote,
    contact:
      detail.event.contactEmail ??
      detail.event.contactWhatsapp ??
      detail.event.contactPhone ??
      'Kontak organizer belum tersedia',
  };
}
