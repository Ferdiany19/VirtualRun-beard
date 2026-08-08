import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { withTransaction } from '@/db/transaction';
import { createAuditLog } from '@/modules/audit/audit.repository';
import { canAccessEventManagement } from '@/modules/auth/auth.policy';
import type { AuthenticatedAdmin } from '@/modules/auth/auth.types';
import { getManageableEvent } from '@/modules/events/event.service';
import { enqueueBackgroundJob } from '@/modules/jobs/job.repository';
import {
  completeIdempotencyRecord,
  countRecentSecurityAttempts,
  createIdempotencyRecord,
  findIdempotencyRecord,
  recordSecurityAttempt,
} from '@/modules/registrations/registration.repository';
import type { ParticipantRegistrationSessionSummary } from '@/modules/registrations/registration.service';
import {
  createSubmissionFile,
  createSubmissionRevision,
  createUploadSessionRecord,
  ensureSubmissionForUpdate,
  findAdminSubmissionFile,
  findParticipantSubmissionFile,
  getAdminSubmissionDetail,
  getParticipantSubmissionDetail,
  hasActiveUploadOverride,
  listAdminSubmissions,
  listExpiredUploadObjects,
  listParticipantSubmissionCategories,
  markCurrentRevisionSuperseded,
  markUploadSessionsExpired,
  recordSubmissionSystemEvent,
  updateSubmissionAfterRevision,
} from '@/modules/submissions/submission.repository';
import type {
  AdminSubmissionFilters,
  AdminSubmissionListItem,
  ParticipantSubmissionCategory,
  SubmissionDetail,
  SubmissionFileRecord,
} from '@/modules/submissions/submission.types';
import type { SubmissionFormInput } from '@/modules/submissions/submission.schema';
import { listParticipantVisibleValidationReviews } from '@/modules/validation/validation.repository';
import { env } from '@/shared/config/env';
import { BUSINESS_TIMEZONE } from '@/shared/date/business-timezone';
import { ApplicationError } from '@/shared/errors/application-error';
import { isDatabaseErrorCode } from '@/shared/errors/database';
import {
  deletePrivateObject,
  getPrivateObject,
  putPrivateObject,
} from '@/modules/storage/storage.service';

type RequestContext = {
  correlationId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

type ProcessedScreenshot = {
  uploadSessionId: string;
  fileId: string;
  buffer: Buffer;
  objectKey: string;
  originalFilename: string;
  originalMimeType: string | null;
  detectedMimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  checksumSha256: string;
};

export function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) {
    return '-';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

export function formatDistanceMeter(distanceMeter: number): string {
  return `${(distanceMeter / 1000).toFixed(2).replace(/\.00$/, '')} km`;
}

function jakartaDateValue(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: BUSINESS_TIMEZONE,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '00';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function requestFingerprint(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(value), 'utf8')
    .digest('hex');
}

function rateLimitIdentifier(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function parseDistanceMeter(input: string): number {
  const value = input.trim().replace(',', '.');

  if (!/^\d{1,3}(?:\.\d{1,3})?$/.test(value)) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Invalid distance format',
      safeMessage: 'Jarak aktual belum valid.',
      statusCode: 400,
    });
  }

  const [whole, fraction = ''] = value.split('.');
  const meters =
    Number.parseInt(whole, 10) * 1000 +
    Number.parseInt(fraction.padEnd(3, '0'), 10);

  if (!Number.isFinite(meters) || meters <= 0 || meters > 200_000) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Distance is outside allowed range',
      safeMessage: 'Jarak aktual harus lebih dari nol dan masih rasional.',
      statusCode: 400,
    });
  }

  return meters;
}

function secondsFromParts(
  hours: number | '',
  minutes: number | '',
  seconds: number | '',
): number | null {
  if (hours === '' && minutes === '' && seconds === '') {
    return null;
  }

  const total =
    Number(hours || 0) * 3600 +
    Number(minutes || 0) * 60 +
    Number(seconds || 0);
  return total > 0 ? total : null;
}

function normalizeActivityUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Activity URL is invalid',
      safeMessage: 'URL aktivitas belum valid.',
      statusCode: 400,
    });
  }

  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Activity URL is not allowed',
      safeMessage:
        'URL aktivitas harus HTTPS dan tidak boleh memuat credential.',
      statusCode: 400,
    });
  }

  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase();
  return parsed.toString();
}

function detectImageMime(
  buffer: Buffer,
): 'image/jpeg' | 'image/png' | 'image/webp' {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return 'image/jpeg';
  }

  if (
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }

  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  throw new ApplicationError({
    code: 'VALIDATION_FAILED',
    message: 'Screenshot type is not supported',
    safeMessage: 'Screenshot harus berupa JPEG, PNG, atau WebP.',
    statusCode: 400,
  });
}

async function processScreenshot(input: {
  file: File | null;
  eventId: string;
  submissionId: string;
  revisionId: string;
  participantId: string;
}): Promise<ProcessedScreenshot | null> {
  if (!input.file) {
    return null;
  }

  if (input.file.size > env.SUBMISSION_SCREENSHOT_MAX_BYTES) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Screenshot is too large',
      safeMessage: 'Ukuran screenshot melebihi batas.',
      statusCode: 400,
    });
  }

  const source = Buffer.from(await input.file.arrayBuffer());
  detectImageMime(source);
  const image = sharp(source, { failOn: 'error' }).rotate();
  const metadata = await image.metadata();

  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width < 320 ||
    metadata.height < 320
  ) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Screenshot dimensions are invalid',
      safeMessage: 'Resolusi screenshot terlalu kecil atau file rusak.',
      statusCode: 400,
    });
  }

  if (metadata.width > 8000 || metadata.height > 8000) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Screenshot dimensions are too large',
      safeMessage: 'Resolusi screenshot terlalu besar.',
      statusCode: 400,
    });
  }

  const normalized = await image
    .resize({
      width: 2200,
      height: 2200,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
  const normalizedMetadata = await sharp(normalized).metadata();
  const fileId = randomUUID();

  return {
    uploadSessionId: randomUUID(),
    fileId,
    buffer: normalized,
    objectKey: `events/${input.eventId}/submissions/${input.submissionId}/revisions/${input.revisionId}/${fileId}.jpg`,
    originalFilename: input.file.name || 'screenshot',
    originalMimeType: input.file.type || null,
    detectedMimeType: 'image/jpeg',
    sizeBytes: normalized.length,
    width: normalizedMetadata.width ?? metadata.width,
    height: normalizedMetadata.height ?? metadata.height,
    checksumSha256: createHash('sha256').update(normalized).digest('hex'),
  };
}

async function assertRateLimit(input: {
  eventId: string;
  requestContext: RequestContext;
  participantId: string;
  action: 'EVIDENCE_DOWNLOAD' | 'SUBMIT_REVISION';
}): Promise<void> {
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const identifiers = [
    input.participantId,
    input.requestContext.ipAddress ?? 'unknown-ip',
  ];

  for (const identifier of identifiers) {
    const count = await countRecentSecurityAttempts({
      eventId: input.eventId,
      attemptType: input.action,
      identifierHash: rateLimitIdentifier(`${input.action}:${identifier}`),
      since,
    });

    if (count >= 20) {
      throw new ApplicationError({
        code: 'RATE_LIMITED',
        message: 'Submission action is rate limited',
        safeMessage:
          'Permintaan belum dapat diproses. Coba lagi beberapa saat lagi.',
        statusCode: 429,
      });
    }
  }
}

function assertSubmissionAllowed(
  category: ParticipantSubmissionCategory,
  overrideActive: boolean,
): void {
  const now = new Date();

  if (category.event.eventStatus === 'ARCHIVED') {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Event is archived',
      safeMessage: 'Event sudah diarsipkan.',
      statusCode: 400,
    });
  }

  if (category.event.uploadStartsAt > now && !overrideActive) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Upload period has not opened',
      safeMessage: 'Periode upload belum dibuka.',
      statusCode: 400,
    });
  }

  if (category.event.uploadEndsAt < now && !overrideActive) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Upload period has closed',
      safeMessage: 'Periode upload sudah berakhir.',
      statusCode: 400,
    });
  }

  if (
    category.submission?.status === 'APPROVED' ||
    category.submission?.status === 'UNDER_REVIEW' ||
    category.submission?.status === 'REJECTED' ||
    category.submission?.status === 'DISQUALIFIED'
  ) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Submission cannot be changed in current status',
      safeMessage:
        'Status hasil saat ini tidak dapat diperbaiki pada fase ini.',
      statusCode: 400,
    });
  }
}

function assertActivityDate(
  category: ParticipantSubmissionCategory,
  activityDate: string,
): void {
  const start = jakartaDateValue(category.event.activityStartsAt);
  const end = jakartaDateValue(category.event.activityEndsAt);

  if (activityDate < start || activityDate > end) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Activity date is outside event activity period',
      safeMessage: 'Tanggal aktivitas harus berada dalam periode lari event.',
      statusCode: 400,
    });
  }
}

export async function getParticipantSubmissionDashboard(
  session: ParticipantRegistrationSessionSummary,
): Promise<ParticipantSubmissionCategory[]> {
  return listParticipantSubmissionCategories(session.summary.registration.id);
}

export async function getParticipantSubmissionDetailForSession(input: {
  session: ParticipantRegistrationSessionSummary;
  eventSlug: string;
  registrationCategoryId: string;
}): Promise<SubmissionDetail> {
  const detail = await getParticipantSubmissionDetail({
    eventRegistrationId: input.session.summary.registration.id,
    registrationCategoryId: input.registrationCategoryId,
    eventSlug: input.eventSlug,
  });

  if (!detail) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: 'Participant submission category not found',
      safeMessage: 'Kategori pendaftaran tidak ditemukan.',
      statusCode: 404,
    });
  }

  return {
    ...detail,
    validationReviews: detail.submission
      ? await listParticipantVisibleValidationReviews(detail.submission.id)
      : [],
  };
}

export async function submitParticipantRevision(input: {
  session: ParticipantRegistrationSessionSummary;
  eventSlug: string;
  registrationCategoryId: string;
  form: SubmissionFormInput;
  screenshot: File | null;
  requestContext: RequestContext;
}): Promise<{
  submissionId: string;
  revisionId: string;
  revisionNumber: number;
}> {
  const category = await getParticipantSubmissionDetailForSession({
    session: input.session,
    eventSlug: input.eventSlug,
    registrationCategoryId: input.registrationCategoryId,
  });
  await assertRateLimit({
    eventId: category.event.id,
    requestContext: input.requestContext,
    participantId: category.participant.id,
    action: 'SUBMIT_REVISION',
  });
  const normalizedActivityUrl = normalizeActivityUrl(input.form.activityUrl);

  if (!normalizedActivityUrl && !input.screenshot) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Submission evidence is missing',
      safeMessage: 'Isi activity URL atau unggah screenshot bukti.',
      statusCode: 400,
    });
  }

  const elapsedTimeSeconds = secondsFromParts(
    input.form.elapsedHours,
    input.form.elapsedMinutes,
    input.form.elapsedSeconds,
  );

  if (!elapsedTimeSeconds) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Elapsed time is invalid',
      safeMessage: 'Waktu tempuh harus lebih dari nol.',
      statusCode: 400,
    });
  }

  const movingTimeSeconds = secondsFromParts(
    input.form.movingHours,
    input.form.movingMinutes,
    input.form.movingSeconds,
  );

  if (movingTimeSeconds !== null && movingTimeSeconds > elapsedTimeSeconds) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Moving time exceeds elapsed time',
      safeMessage: 'Moving time tidak boleh melebihi waktu tempuh.',
      statusCode: 400,
    });
  }

  if (
    input.form.activityPlatform === 'OTHER' &&
    !input.form.activityPlatformOther
  ) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Other activity platform is missing',
      safeMessage: 'Nama platform lainnya wajib diisi.',
      statusCode: 400,
    });
  }

  if (
    input.form.activityPlatform !== 'OTHER' &&
    input.form.activityPlatformOther
  ) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Unexpected other activity platform',
      safeMessage: 'Nama platform lainnya hanya diisi jika memilih Lainnya.',
      statusCode: 400,
    });
  }

  const overrideActive = await hasActiveUploadOverride({
    eventRegistrationId: category.registration.id,
    registrationCategoryId: category.registrationCategoryId,
  });
  assertSubmissionAllowed(category, overrideActive);
  assertActivityDate(category, input.form.activityDate);

  const submissionId = category.submission?.id ?? randomUUID();
  const revisionId = randomUUID();
  const distanceMeter = parseDistanceMeter(input.form.distanceKilometer);
  const screenshot = await processScreenshot({
    file: input.screenshot,
    eventId: category.event.id,
    submissionId,
    revisionId,
    participantId: category.participant.id,
  });
  const fingerprint = requestFingerprint({
    registrationCategoryId: category.registrationCategoryId,
    activityDate: input.form.activityDate,
    distanceMeter,
    elapsedTimeSeconds,
    movingTimeSeconds,
    activityPlatform: input.form.activityPlatform,
    activityPlatformOther: input.form.activityPlatformOther,
    normalizedActivityUrl,
    participantNote: input.form.participantNote,
    screenshotChecksum: screenshot?.checksumSha256 ?? null,
  });
  const operation = `submission:${category.registrationCategoryId}`;

  return withTransaction(async (client) => {
    const existingIdempotency = await findIdempotencyRecord(
      operation,
      input.form.idempotencyKey,
      client,
    );

    if (existingIdempotency) {
      if (existingIdempotency.requestFingerprint !== fingerprint) {
        throw new ApplicationError({
          code: 'CONFLICT',
          message: 'Submission idempotency payload mismatch',
          safeMessage:
            'Permintaan duplikat tidak cocok dengan data sebelumnya.',
          statusCode: 409,
        });
      }

      if (existingIdempotency.responseReference) {
        const detail = await getParticipantSubmissionDetail(
          {
            eventRegistrationId: category.registration.id,
            registrationCategoryId: category.registrationCategoryId,
            eventSlug: category.event.slug,
          },
          client,
        );
        const revision = detail?.revisions.find(
          (item) => item.id === existingIdempotency.responseReference,
        );

        if (detail?.submission && revision) {
          return {
            submissionId: detail.submission.id,
            revisionId: revision.id,
            revisionNumber: revision.revisionNumber,
          };
        }
      }
    } else {
      await createIdempotencyRecord(
        {
          operation,
          key: input.form.idempotencyKey,
          requestFingerprint: fingerprint,
        },
        client,
      );
    }

    const lockedSubmission = await ensureSubmissionForUpdate(
      { submissionId, registrationCategoryId: category.registrationCategoryId },
      client,
    );
    const previousStatus = lockedSubmission.status;
    const revisionNumber = lockedSubmission.revisionCount + 1;
    await markCurrentRevisionSuperseded(
      lockedSubmission.currentRevisionId,
      client,
    );
    const revision = await createSubmissionRevision(
      {
        id: revisionId,
        submissionId: lockedSubmission.id,
        revisionNumber,
        activityDate: input.form.activityDate,
        distanceMeter,
        elapsedTimeSeconds,
        movingTimeSeconds,
        activityPlatform: input.form.activityPlatform,
        activityPlatformOther: input.form.activityPlatformOther,
        activityUrl: input.form.activityUrl,
        normalizedActivityUrl,
        participantNote: input.form.participantNote,
      },
      client,
    );

    if (screenshot) {
      await createUploadSessionRecord(
        {
          id: screenshot.uploadSessionId,
          participantId: category.participant.id,
          eventRegistrationId: category.registration.id,
          registrationCategoryId: category.registrationCategoryId,
          maximumSizeBytes: env.SUBMISSION_SCREENSHOT_MAX_BYTES,
          objectKey: screenshot.objectKey,
          status: 'READY',
        },
        client,
      );
      await putPrivateObject({
        objectKey: screenshot.objectKey,
        body: screenshot.buffer,
        contentType: 'image/jpeg',
      });
      await createSubmissionFile(
        {
          id: screenshot.fileId,
          revisionId: revision.id,
          uploadSessionId: screenshot.uploadSessionId,
          objectKey: screenshot.objectKey,
          originalFilename: screenshot.originalFilename,
          originalMimeType: screenshot.originalMimeType,
          detectedMimeType: screenshot.detectedMimeType,
          sizeBytes: screenshot.sizeBytes,
          width: screenshot.width,
          height: screenshot.height,
          checksumSha256: screenshot.checksumSha256,
        },
        client,
      );
    }

    await updateSubmissionAfterRevision(
      {
        submissionId: lockedSubmission.id,
        revisionId: revision.id,
        revisionCount: revisionNumber,
      },
      client,
    );
    await completeIdempotencyRecord(
      {
        operation,
        key: input.form.idempotencyKey,
        responseReference: revision.id,
      },
      client,
    );
    await recordSecurityAttempt(
      {
        eventId: category.event.id,
        attemptType: 'SUBMIT_REVISION',
        identifierHash: rateLimitIdentifier(
          `SUBMIT_REVISION:${category.participant.id}`,
        ),
        ipAddress: input.requestContext.ipAddress,
        success: true,
      },
      client,
    );
    await recordSubmissionSystemEvent(
      {
        submissionId: lockedSubmission.id,
        revisionId: revision.id,
        eventRegistrationId: category.registration.id,
        registrationCategoryId: category.registrationCategoryId,
        actorType: 'PARTICIPANT_PUBLIC',
        action:
          previousStatus === 'REVISION_REQUIRED'
            ? 'REQUESTED_REVISION_RECEIVED'
            : revisionNumber === 1
              ? 'SUBMISSION_CREATED'
              : 'SUBMISSION_REVISION_CREATED',
        metadata: {
          revisionNumber,
          hasScreenshot: Boolean(screenshot),
          hasActivityUrl: Boolean(normalizedActivityUrl),
        },
        ipAddress: input.requestContext.ipAddress,
        userAgent: input.requestContext.userAgent,
        correlationId: input.requestContext.correlationId,
      },
      client,
    );
    await createAuditLog(
      {
        actorType: 'PARTICIPANT_PUBLIC',
        actorId: category.participant.id,
        action:
          previousStatus === 'REVISION_REQUIRED'
            ? 'PARTICIPANT_REVISION_RECEIVED'
            : revisionNumber === 1
              ? 'SUBMISSION_CREATED'
              : 'SUBMISSION_REVISION_CREATED',
        entityType: 'SUBMISSION',
        entityId: lockedSubmission.id,
        eventId: category.event.id,
        newValues: {
          categoryId: category.category.id,
          revisionNumber,
          status: 'SUBMITTED',
        },
        ipAddress: input.requestContext.ipAddress,
        userAgent: input.requestContext.userAgent,
        correlationId: input.requestContext.correlationId,
      },
      client,
    );
    if (previousStatus === 'REVISION_REQUIRED') {
      await enqueueBackgroundJob(
        {
          jobType: 'SEND_REVISED_SUBMISSION_RECEIVED_NOTIFICATION',
          payload: {
            submissionId: lockedSubmission.id,
            revisionId: revision.id,
          },
          maximumAttempts: 5,
        },
        client,
      );
    }

    return {
      submissionId: lockedSubmission.id,
      revisionId: revision.id,
      revisionNumber,
    };
  }).catch((error) => {
    if (isDatabaseErrorCode(error, '23505')) {
      throw new ApplicationError({
        code: 'CONFLICT',
        message: 'Concurrent submission conflict',
        safeMessage:
          'Submit bersamaan terdeteksi. Muat ulang halaman dan periksa hasil terakhir.',
        statusCode: 409,
        cause: error,
      });
    }

    throw error;
  });
}

export async function listAdminEventSubmissions(input: {
  eventId: string;
  admin: AuthenticatedAdmin;
  filters: AdminSubmissionFilters;
}): Promise<AdminSubmissionListItem[]> {
  if (!canAccessEventManagement(input.admin)) {
    throw new ApplicationError({
      code: 'FORBIDDEN',
      message: 'Admin cannot list submissions',
      safeMessage: 'Role Anda tidak dapat melihat submission event.',
      statusCode: 403,
    });
  }

  await getManageableEvent(input.eventId, input.admin);
  return listAdminSubmissions(input.eventId, input.filters);
}

export async function getAdminEventSubmissionDetail(input: {
  submissionId: string;
  admin: AuthenticatedAdmin;
}): Promise<SubmissionDetail> {
  if (!canAccessEventManagement(input.admin)) {
    throw new ApplicationError({
      code: 'FORBIDDEN',
      message: 'Admin cannot view submission',
      safeMessage: 'Role Anda tidak dapat melihat submission event.',
      statusCode: 403,
    });
  }

  const detail = await getAdminSubmissionDetail(input.submissionId);

  if (!detail || !detail.submission) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: 'Submission not found',
      safeMessage: 'Submission tidak ditemukan.',
      statusCode: 404,
    });
  }

  await getManageableEvent(detail.event.id, input.admin);
  return detail;
}

export async function getParticipantEvidenceFile(input: {
  session: ParticipantRegistrationSessionSummary;
  fileId: string;
  requestContext: RequestContext;
}): Promise<SubmissionFileRecord & { body: Buffer }> {
  await assertRateLimit({
    eventId: input.session.summary.event.id,
    requestContext: input.requestContext,
    participantId: input.session.summary.participant.id,
    action: 'EVIDENCE_DOWNLOAD',
  });
  const file = await findParticipantSubmissionFile({
    fileId: input.fileId,
    eventRegistrationId: input.session.summary.registration.id,
  });

  if (!file) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: 'Evidence file not found',
      safeMessage: 'File bukti tidak ditemukan.',
      statusCode: 404,
    });
  }

  const body = await getPrivateObject(file.objectKey);
  return { ...file, body };
}

export async function getAdminEvidenceFile(input: {
  admin: AuthenticatedAdmin;
  fileId: string;
}): Promise<SubmissionFileRecord & { body: Buffer }> {
  const result = await findAdminSubmissionFile(input.fileId);

  if (!result) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: 'Evidence file not found',
      safeMessage: 'File bukti tidak ditemukan.',
      statusCode: 404,
    });
  }

  await getManageableEvent(result.eventId, input.admin);
  const body = await getPrivateObject(result.file.objectKey);
  return { ...result.file, body };
}

export async function cleanExpiredUploads(): Promise<number> {
  const expiredObjects = await listExpiredUploadObjects(50);

  for (const item of expiredObjects) {
    await deletePrivateObject(item.objectKey);
  }

  await markUploadSessionsExpired(
    expiredObjects.map((item) => item.uploadSessionId),
  );
  return expiredObjects.length;
}
