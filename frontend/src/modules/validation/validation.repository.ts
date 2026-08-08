import type { PoolClient } from "pg";
import { query } from "@/db/pool";
import type { AdminRole } from "@/modules/auth/domain/admin-role";
import type { AuthenticatedAdmin } from "@/modules/auth/auth.types";
import type { SubmissionStatus } from "@/modules/submissions/submission.types";
import type {
  EligibleValidator,
  EventValidatorAssignmentRecord,
  ValidationAction,
  ValidationQueueFilters,
  ValidationQueueItem,
  ValidationReasonCode,
  ValidationReviewRecord,
} from "@/modules/validation/validation.types";

type ValidationReviewRow = {
  id: string;
  submission_id: string;
  submission_revision_id: string | null;
  event_id: string;
  registration_category_id: string;
  reviewer_admin_user_id: string | null;
  reviewer_name: string | null;
  action: ValidationAction;
  previous_status: SubmissionStatus;
  resulting_status: SubmissionStatus;
  reason_code: ValidationReasonCode | null;
  participant_visible_note: string | null;
  internal_note: string | null;
  reviewed_at: Date;
  created_at: Date;
  superseded_at: Date | null;
  metadata: Record<string, unknown> | null;
};

type AssignmentRow = {
  id: string;
  event_id: string;
  admin_user_id: string;
  admin_full_name: string;
  admin_display_email: string;
  roles: AdminRole[];
  assigned_by_admin_user_id: string | null;
  assigned_by_name: string | null;
  assigned_at: Date;
  revoked_at: Date | null;
  revoked_by_admin_user_id: string | null;
  revoked_by_name: string | null;
  revoke_reason: string | null;
  created_at: Date;
  updated_at: Date;
};

type QueueRow = {
  submission_id: string;
  event_id: string;
  event_name: string;
  participant_name: string;
  bib_number: string;
  category_id: string;
  category_name: string;
  target_distance_meter: number;
  tolerance_meter: number;
  current_revision_id: string;
  revision_number: number;
  actual_distance_meter: number;
  elapsed_time_seconds: number;
  moving_time_seconds: number | null;
  activity_date: string;
  activity_platform: ValidationQueueItem["activityPlatform"];
  has_screenshot: boolean;
  has_activity_url: boolean;
  revision_count: number;
  submitted_at: Date;
  status: SubmissionStatus;
  review_claimed_by_admin_user_id: string | null;
  review_claimed_by_admin_name: string | null;
  review_claim_expires_at: Date | null;
  review_version: number;
  warning_count: number;
};

export type LockedSubmissionForValidation = {
  submissionId: string;
  registrationCategoryId: string;
  eventRegistrationId: string;
  eventId: string;
  participantId: string;
  participantEmail: string;
  participantName: string;
  eventName: string;
  eventSlug: string;
  categoryName: string;
  currentRevisionId: string | null;
  status: SubmissionStatus;
  reviewClaimedByAdminUserId: string | null;
  reviewClaimExpiresAt: Date | null;
  reviewVersion: number;
  revisionCount: number;
  lastSubmittedAt: Date | null;
};

function mapReview(row: ValidationReviewRow): ValidationReviewRecord {
  return {
    id: row.id,
    submissionId: row.submission_id,
    submissionRevisionId: row.submission_revision_id,
    eventId: row.event_id,
    registrationCategoryId: row.registration_category_id,
    reviewerAdminUserId: row.reviewer_admin_user_id,
    reviewerName: row.reviewer_name,
    action: row.action,
    previousStatus: row.previous_status,
    resultingStatus: row.resulting_status,
    reasonCode: row.reason_code,
    participantVisibleNote: row.participant_visible_note,
    internalNote: row.internal_note,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    supersededAt: row.superseded_at,
    metadata: row.metadata,
  };
}

function mapAssignment(row: AssignmentRow): EventValidatorAssignmentRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    adminUserId: row.admin_user_id,
    adminFullName: row.admin_full_name,
    adminDisplayEmail: row.admin_display_email,
    roles: row.roles,
    assignedByAdminUserId: row.assigned_by_admin_user_id,
    assignedByName: row.assigned_by_name,
    assignedAt: row.assigned_at,
    revokedAt: row.revoked_at,
    revokedByAdminUserId: row.revoked_by_admin_user_id,
    revokedByName: row.revoked_by_name,
    revokeReason: row.revoke_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQueue(row: QueueRow): ValidationQueueItem {
  return {
    submissionId: row.submission_id,
    eventId: row.event_id,
    eventName: row.event_name,
    participantName: row.participant_name,
    bibNumber: row.bib_number,
    categoryId: row.category_id,
    categoryName: row.category_name,
    targetDistanceMeter: row.target_distance_meter,
    toleranceMeter: row.tolerance_meter,
    currentRevisionId: row.current_revision_id,
    revisionNumber: row.revision_number,
    actualDistanceMeter: row.actual_distance_meter,
    elapsedTimeSeconds: row.elapsed_time_seconds,
    movingTimeSeconds: row.moving_time_seconds,
    activityDate: row.activity_date,
    activityPlatform: row.activity_platform,
    hasScreenshot: row.has_screenshot,
    hasActivityUrl: row.has_activity_url,
    revisionCount: row.revision_count,
    submittedAt: row.submitted_at,
    status: row.status,
    reviewClaimedByAdminUserId: row.review_claimed_by_admin_user_id,
    reviewClaimedByAdminName: row.review_claimed_by_admin_name,
    reviewClaimExpiresAt: row.review_claim_expires_at,
    reviewVersion: row.review_version,
    warningCount: row.warning_count,
  };
}

export async function hasActiveValidatorAssignment(
  input: { eventId: string; adminUserId: string },
  client?: PoolClient,
): Promise<boolean> {
  const result = await query<{ has_assignment: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM event_validator_assignments eva
        WHERE eva.event_id = $1
          AND eva.admin_user_id = $2
          AND eva.revoked_at IS NULL
      ) AS has_assignment
    `,
    [input.eventId, input.adminUserId],
    client,
  );

  return result.rows[0]?.has_assignment ?? false;
}

export async function listValidationEventIdsForAdmin(
  admin: Pick<AuthenticatedAdmin, "id" | "roles">,
  client?: PoolClient,
): Promise<string[] | null> {
  void admin;
  void client;
  return null;
}

export async function listEligibleValidators(client?: PoolClient): Promise<EligibleValidator[]> {
  const result = await query<{
    id: string;
    full_name: string;
    display_email: string;
    roles: AdminRole[];
  }>(
    `
      SELECT
        au.id,
        au.full_name,
        au.display_email,
        COALESCE(array_agg(aur.role ORDER BY aur.role), ARRAY[]::text[])::text[] AS roles
      FROM admin_users au
      JOIN admin_user_roles aur ON aur.admin_user_id = au.id
      WHERE au.status = 'ACTIVE'
      GROUP BY au.id
      HAVING bool_or(aur.role = 'VALIDATOR')
      ORDER BY au.full_name ASC
    `,
    [],
    client,
  );

  return result.rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    displayEmail: row.display_email,
    roles: row.roles,
  }));
}

export async function listEventValidatorAssignments(
  eventId: string,
  client?: PoolClient,
): Promise<EventValidatorAssignmentRecord[]> {
  const result = await query<AssignmentRow>(
    `
      SELECT
        eva.id,
        eva.event_id,
        eva.admin_user_id,
        validator.full_name AS admin_full_name,
        validator.display_email AS admin_display_email,
        COALESCE(array_agg(aur.role ORDER BY aur.role), ARRAY[]::text[])::text[] AS roles,
        eva.assigned_by_admin_user_id,
        assigned_by.full_name AS assigned_by_name,
        eva.assigned_at,
        eva.revoked_at,
        eva.revoked_by_admin_user_id,
        revoked_by.full_name AS revoked_by_name,
        eva.revoke_reason,
        eva.created_at,
        eva.updated_at
      FROM event_validator_assignments eva
      JOIN admin_users validator ON validator.id = eva.admin_user_id
      LEFT JOIN admin_users assigned_by ON assigned_by.id = eva.assigned_by_admin_user_id
      LEFT JOIN admin_users revoked_by ON revoked_by.id = eva.revoked_by_admin_user_id
      LEFT JOIN admin_user_roles aur ON aur.admin_user_id = validator.id
      WHERE eva.event_id = $1
      GROUP BY eva.id, validator.id, assigned_by.id, revoked_by.id
      ORDER BY eva.revoked_at NULLS FIRST, eva.assigned_at DESC
    `,
    [eventId],
    client,
  );

  return result.rows.map(mapAssignment);
}

export async function createEventValidatorAssignment(
  input: { eventId: string; adminUserId: string; assignedByAdminUserId: string },
  client?: PoolClient,
): Promise<string> {
  const result = await query<{ id: string }>(
    `
      INSERT INTO event_validator_assignments (
        event_id,
        admin_user_id,
        assigned_by_admin_user_id
      )
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [input.eventId, input.adminUserId, input.assignedByAdminUserId],
    client,
  );

  return result.rows[0].id;
}

export async function revokeEventValidatorAssignment(
  input: { assignmentId: string; revokedByAdminUserId: string; reason: string },
  client?: PoolClient,
): Promise<EventValidatorAssignmentRecord | null> {
  const result = await query<AssignmentRow>(
    `
      WITH updated AS (
        UPDATE event_validator_assignments
        SET
          revoked_at = now(),
          revoked_by_admin_user_id = $2,
          revoke_reason = $3,
          updated_at = now()
        WHERE id = $1
          AND revoked_at IS NULL
        RETURNING *
      )
      SELECT
        updated.id,
        updated.event_id,
        updated.admin_user_id,
        validator.full_name AS admin_full_name,
        validator.display_email AS admin_display_email,
        COALESCE(array_agg(aur.role ORDER BY aur.role), ARRAY[]::text[])::text[] AS roles,
        updated.assigned_by_admin_user_id,
        assigned_by.full_name AS assigned_by_name,
        updated.assigned_at,
        updated.revoked_at,
        updated.revoked_by_admin_user_id,
        revoked_by.full_name AS revoked_by_name,
        updated.revoke_reason,
        updated.created_at,
        updated.updated_at
      FROM updated
      JOIN admin_users validator ON validator.id = updated.admin_user_id
      LEFT JOIN admin_users assigned_by ON assigned_by.id = updated.assigned_by_admin_user_id
      LEFT JOIN admin_users revoked_by ON revoked_by.id = updated.revoked_by_admin_user_id
      LEFT JOIN admin_user_roles aur ON aur.admin_user_id = validator.id
      GROUP BY updated.id, updated.event_id, updated.admin_user_id, validator.id, assigned_by.id, revoked_by.id,
        updated.assigned_by_admin_user_id, updated.assigned_at, updated.revoked_at,
        updated.revoked_by_admin_user_id, updated.revoke_reason, updated.created_at, updated.updated_at
    `,
    [input.assignmentId, input.revokedByAdminUserId, input.reason],
    client,
  );

  return result.rows[0] ? mapAssignment(result.rows[0]) : null;
}

export async function listValidationReviews(
  submissionId: string,
  client?: PoolClient,
): Promise<ValidationReviewRecord[]> {
  const result = await query<ValidationReviewRow>(
    `
      SELECT
        vr.id,
        vr.submission_id,
        vr.submission_revision_id,
        vr.event_id,
        vr.registration_category_id,
        vr.reviewer_admin_user_id,
        reviewer.full_name AS reviewer_name,
        vr.action,
        vr.previous_status,
        vr.resulting_status,
        vr.reason_code,
        vr.participant_visible_note,
        vr.internal_note,
        vr.reviewed_at,
        vr.created_at,
        vr.superseded_at,
        vr.metadata
      FROM validation_reviews vr
      LEFT JOIN admin_users reviewer ON reviewer.id = vr.reviewer_admin_user_id
      WHERE vr.submission_id = $1
      ORDER BY vr.reviewed_at DESC, vr.created_at DESC
    `,
    [submissionId],
    client,
  );

  return result.rows.map(mapReview);
}

export async function listParticipantVisibleValidationReviews(
  submissionId: string,
  client?: PoolClient,
): Promise<ValidationReviewRecord[]> {
  const result = await query<ValidationReviewRow>(
    `
      SELECT
        vr.id,
        vr.submission_id,
        vr.submission_revision_id,
        vr.event_id,
        vr.registration_category_id,
        NULL::uuid AS reviewer_admin_user_id,
        NULL::text AS reviewer_name,
        vr.action,
        vr.previous_status,
        vr.resulting_status,
        vr.reason_code,
        vr.participant_visible_note,
        NULL::text AS internal_note,
        vr.reviewed_at,
        vr.created_at,
        vr.superseded_at,
        vr.metadata
      FROM validation_reviews vr
      WHERE vr.submission_id = $1
        AND vr.participant_visible_note IS NOT NULL
      ORDER BY vr.reviewed_at DESC, vr.created_at DESC
    `,
    [submissionId],
    client,
  );

  return result.rows.map(mapReview);
}

export async function listValidationQueue(
  input: { eventIds: string[] | null; adminUserId: string; filters: ValidationQueueFilters },
  client?: PoolClient,
): Promise<ValidationQueueItem[]> {
  if (input.eventIds && input.eventIds.length === 0) {
    return [];
  }

  const values: unknown[] = [];
  const conditions = ["s.id IS NOT NULL", "sr.id IS NOT NULL"];

  const addAdminUserIdParam = () => {
    values.push(input.adminUserId);
    return `$${values.length}::uuid`;
  };

  if (input.eventIds) {
    values.push(input.eventIds);
    conditions.push(`e.id = ANY($${values.length}::uuid[])`);
  }

  if (input.filters.eventId) {
    values.push(input.filters.eventId);
    conditions.push(`e.id = $${values.length}`);
  }

  if (input.filters.status) {
    values.push(input.filters.status);
    conditions.push(`s.status = $${values.length}`);
  } else {
    const adminUserIdParam = addAdminUserIdParam();
    conditions.push(
      `(s.status = 'SUBMITTED' OR (s.status = 'UNDER_REVIEW' AND s.review_claimed_by_admin_user_id = ${adminUserIdParam}))`,
    );
  }

  if (input.filters.categoryId) {
    values.push(input.filters.categoryId);
    conditions.push(`ec.id = $${values.length}`);
  }

  if (input.filters.activityPlatform) {
    values.push(input.filters.activityPlatform);
    conditions.push(`sr.activity_platform = $${values.length}`);
  }

  if (input.filters.search) {
    values.push(input.filters.search);
    conditions.push(
      `(p.full_name ILIKE '%' || $${values.length} || '%' OR er.bib_number ILIKE '%' || $${values.length} || '%')`,
    );
  }

  if (input.filters.reviewer === "me") {
    conditions.push(`s.review_claimed_by_admin_user_id = ${addAdminUserIdParam()}`);
  } else if (input.filters.reviewer === "unassigned") {
    conditions.push(
      "(s.review_claimed_by_admin_user_id IS NULL OR s.review_claim_expires_at <= now())",
    );
  } else if (input.filters.reviewer) {
    values.push(input.filters.reviewer);
    conditions.push(`s.review_claimed_by_admin_user_id = $${values.length}`);
  }

  if (input.filters.evidenceType === "URL") {
    conditions.push("sr.activity_url IS NOT NULL AND sf.id IS NULL");
  } else if (input.filters.evidenceType === "SCREENSHOT") {
    conditions.push("sr.activity_url IS NULL AND sf.id IS NOT NULL");
  } else if (input.filters.evidenceType === "BOTH") {
    conditions.push("sr.activity_url IS NOT NULL AND sf.id IS NOT NULL");
  }

  if (input.filters.distanceCheck === "inside") {
    conditions.push("abs(sr.distance_meter - ec.distance_meters) <= ec.distance_tolerance_meters");
  } else if (input.filters.distanceCheck === "outside") {
    conditions.push("abs(sr.distance_meter - ec.distance_meters) > ec.distance_tolerance_meters");
  }

  if (input.filters.hasWarning) {
    conditions.push(`(
      abs(sr.distance_meter - ec.distance_meters) > ec.distance_tolerance_meters
      OR EXISTS (
        SELECT 1 FROM submission_revisions dup_sr
        WHERE dup_sr.normalized_activity_url = sr.normalized_activity_url
          AND dup_sr.id <> sr.id
          AND sr.normalized_activity_url IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM submission_files dup_sf
        WHERE dup_sf.checksum_sha256 = sf.checksum_sha256
          AND dup_sf.id <> sf.id
          AND sf.id IS NOT NULL
      )
    )`);
  }

  const sortSql =
    {
      submitted_desc: "sr.submitted_at DESC",
      submitted_asc: "sr.submitted_at ASC",
      bib_asc: "er.bib_sequence ASC",
      claim_expiry_asc: "s.review_claim_expires_at ASC NULLS LAST",
    }[input.filters.sort ?? "submitted_desc"] ?? "sr.submitted_at DESC";
  const page = Math.max(1, input.filters.page ?? 1);
  values.push((page - 1) * 25);

  const result = await query<QueueRow>(
    `
      SELECT
        s.id AS submission_id,
        e.id AS event_id,
        e.name AS event_name,
        p.full_name AS participant_name,
        er.bib_number,
        ec.id AS category_id,
        ec.name AS category_name,
        ec.distance_meters AS target_distance_meter,
        ec.distance_tolerance_meters AS tolerance_meter,
        sr.id AS current_revision_id,
        sr.revision_number,
        sr.distance_meter AS actual_distance_meter,
        sr.elapsed_time_seconds,
        sr.moving_time_seconds,
        sr.activity_date::text AS activity_date,
        sr.activity_platform,
        (sf.id IS NOT NULL) AS has_screenshot,
        (sr.activity_url IS NOT NULL) AS has_activity_url,
        s.revision_count,
        sr.submitted_at,
        s.status,
        s.review_claimed_by_admin_user_id,
        claim_admin.full_name AS review_claimed_by_admin_name,
        s.review_claim_expires_at,
        s.review_version,
        (
          CASE WHEN abs(sr.distance_meter - ec.distance_meters) > ec.distance_tolerance_meters THEN 1 ELSE 0 END
          + CASE WHEN EXISTS (
              SELECT 1 FROM submission_revisions dup_sr
              WHERE dup_sr.normalized_activity_url = sr.normalized_activity_url
                AND dup_sr.id <> sr.id
                AND sr.normalized_activity_url IS NOT NULL
            ) THEN 1 ELSE 0 END
          + CASE WHEN EXISTS (
              SELECT 1 FROM submission_files dup_sf
              WHERE dup_sf.checksum_sha256 = sf.checksum_sha256
                AND dup_sf.id <> sf.id
                AND sf.id IS NOT NULL
            ) THEN 1 ELSE 0 END
        )::integer AS warning_count
      FROM submissions s
      JOIN registration_categories rc ON rc.id = s.registration_category_id
      JOIN event_registrations er ON er.id = rc.event_registration_id
      JOIN participants p ON p.id = er.participant_id
      JOIN events e ON e.id = er.event_id
      JOIN event_categories ec ON ec.id = rc.event_category_id
      JOIN submission_revisions sr ON sr.id = s.current_revision_id
      LEFT JOIN submission_files sf ON sf.submission_revision_id = sr.id AND sf.status = 'READY'
      LEFT JOIN admin_users claim_admin ON claim_admin.id = s.review_claimed_by_admin_user_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${sortSql}
      LIMIT 25 OFFSET $${values.length}
    `,
    values,
    client,
  );

  return result.rows.map(mapQueue);
}

export async function countPendingValidationSubmissions(
  eventIds: string[] | null,
  client?: PoolClient,
): Promise<number> {
  if (eventIds && eventIds.length === 0) {
    return 0;
  }

  const values: unknown[] = [];
  const conditions = ["s.status = 'SUBMITTED'", "sr.id IS NOT NULL"];

  if (eventIds) {
    values.push(eventIds);
    conditions.push(`e.id = ANY($${values.length}::uuid[])`);
  }

  const result = await query<{ pending_count: number }>(
    `
      SELECT count(s.id)::integer AS pending_count
      FROM submissions s
      JOIN registration_categories rc ON rc.id = s.registration_category_id
      JOIN event_registrations er ON er.id = rc.event_registration_id
      JOIN events e ON e.id = er.event_id
      JOIN submission_revisions sr ON sr.id = s.current_revision_id
      WHERE ${conditions.join(" AND ")}
    `,
    values,
    client,
  );

  return result.rows[0]?.pending_count ?? 0;
}

export async function lockSubmissionForValidation(
  submissionId: string,
  client?: PoolClient,
): Promise<LockedSubmissionForValidation | null> {
  const result = await query<{
    submission_id: string;
    registration_category_id: string;
    event_registration_id: string;
    event_id: string;
    participant_id: string;
    participant_email: string;
    participant_name: string;
    event_name: string;
    event_slug: string;
    category_name: string;
    current_revision_id: string | null;
    status: SubmissionStatus;
    review_claimed_by_admin_user_id: string | null;
    review_claim_expires_at: Date | null;
    review_version: number;
    revision_count: number;
    last_submitted_at: Date | null;
  }>(
    `
      SELECT
        s.id AS submission_id,
        s.registration_category_id,
        er.id AS event_registration_id,
        e.id AS event_id,
        p.id AS participant_id,
        p.normalized_email AS participant_email,
        p.full_name AS participant_name,
        e.name AS event_name,
        e.slug AS event_slug,
        ec.name AS category_name,
        s.current_revision_id,
        s.status,
        s.review_claimed_by_admin_user_id,
        s.review_claim_expires_at,
        s.review_version,
        s.revision_count,
        s.last_submitted_at
      FROM submissions s
      JOIN registration_categories rc ON rc.id = s.registration_category_id
      JOIN event_registrations er ON er.id = rc.event_registration_id
      JOIN participants p ON p.id = er.participant_id
      JOIN events e ON e.id = er.event_id
      JOIN event_categories ec ON ec.id = rc.event_category_id
      WHERE s.id = $1
      FOR UPDATE OF s
    `,
    [submissionId],
    client,
  );
  const row = result.rows[0];

  return row
    ? {
        submissionId: row.submission_id,
        registrationCategoryId: row.registration_category_id,
        eventRegistrationId: row.event_registration_id,
        eventId: row.event_id,
        participantId: row.participant_id,
        participantEmail: row.participant_email,
        participantName: row.participant_name,
        eventName: row.event_name,
        eventSlug: row.event_slug,
        categoryName: row.category_name,
        currentRevisionId: row.current_revision_id,
        status: row.status,
        reviewClaimedByAdminUserId: row.review_claimed_by_admin_user_id,
        reviewClaimExpiresAt: row.review_claim_expires_at,
        reviewVersion: row.review_version,
        revisionCount: row.revision_count,
        lastSubmittedAt: row.last_submitted_at,
      }
    : null;
}

export async function updateSubmissionClaim(
  input: {
    submissionId: string;
    adminUserId: string | null;
    expiresAt: Date | null;
    status: SubmissionStatus;
    incrementVersion: boolean;
  },
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE submissions
      SET
        review_claimed_by_admin_user_id = $2,
        review_claimed_at = CASE WHEN $2::uuid IS NULL THEN NULL ELSE now() END,
        review_claim_expires_at = $3,
        status = $4,
        review_version = review_version + CASE WHEN $5 THEN 1 ELSE 0 END,
        updated_at = now()
      WHERE id = $1
    `,
    [input.submissionId, input.adminUserId, input.expiresAt, input.status, input.incrementVersion],
    client,
  );
}

export async function createValidationReview(
  input: {
    submissionId: string;
    revisionId: string | null;
    eventId: string;
    registrationCategoryId: string;
    reviewerAdminUserId: string | null;
    action: ValidationAction;
    previousStatus: SubmissionStatus;
    resultingStatus: SubmissionStatus;
    reasonCode?: ValidationReasonCode | null;
    participantVisibleNote?: string | null;
    internalNote?: string | null;
    metadata?: Record<string, unknown> | null;
  },
  client?: PoolClient,
): Promise<string> {
  const result = await query<{ id: string }>(
    `
      INSERT INTO validation_reviews (
        submission_id,
        submission_revision_id,
        event_id,
        registration_category_id,
        reviewer_admin_user_id,
        action,
        previous_status,
        resulting_status,
        reason_code,
        participant_visible_note,
        internal_note,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
      RETURNING id
    `,
    [
      input.submissionId,
      input.revisionId,
      input.eventId,
      input.registrationCategoryId,
      input.reviewerAdminUserId,
      input.action,
      input.previousStatus,
      input.resultingStatus,
      input.reasonCode ?? null,
      input.participantVisibleNote ?? null,
      input.internalNote ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
    client,
  );

  return result.rows[0].id;
}

export async function updateSubmissionDecision(
  input: {
    submissionId: string;
    status: SubmissionStatus;
    approvedRevisionId?: string | null;
    approvedByAdminUserId?: string | null;
    rankingEligible: boolean;
    rankingExclusionReason?: string | null;
    participantVisibleNote?: string | null;
    reasonCode?: ValidationReasonCode | null;
  },
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE submissions
      SET
        status = $2,
        reviewed_at = now(),
        approved_at = CASE WHEN $2 = 'APPROVED' THEN now() ELSE approved_at END,
        rejected_at = CASE WHEN $2 = 'REJECTED' THEN now() ELSE rejected_at END,
        disqualified_at = CASE WHEN $2 = 'DISQUALIFIED' THEN now() ELSE disqualified_at END,
        approved_revision_id = $3,
        approved_by_admin_user_id = $4,
        validation_completed_at = CASE WHEN $2 IN ('APPROVED', 'REJECTED', 'DISQUALIFIED') THEN now() ELSE NULL END,
        ranking_eligible = $5,
        ranking_exclusion_reason = $6,
        latest_participant_visible_note = $7,
        latest_validation_reason_code = $8,
        review_claimed_by_admin_user_id = NULL,
        review_claimed_at = NULL,
        review_claim_expires_at = NULL,
        review_version = review_version + 1,
        updated_at = now()
      WHERE id = $1
    `,
    [
      input.submissionId,
      input.status,
      input.approvedRevisionId ?? null,
      input.approvedByAdminUserId ?? null,
      input.rankingEligible,
      input.rankingExclusionReason ?? null,
      input.participantVisibleNote ?? null,
      input.reasonCode ?? null,
    ],
    client,
  );
}

export async function clearApprovalForReview(
  submissionId: string,
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE submissions
      SET
        approved_revision_id = NULL,
        approved_by_admin_user_id = NULL,
        approved_at = NULL,
        validation_completed_at = NULL,
        ranking_eligible = false,
        ranking_exclusion_reason = 'REOPENED',
        updated_at = now()
      WHERE id = $1
    `,
    [submissionId],
    client,
  );
}

export async function countDuplicateEvidence(
  input: {
    revisionId: string;
    normalizedActivityUrl: string | null;
    checksumSha256: string | null;
  },
  client?: PoolClient,
): Promise<{ duplicateUrlCount: number; duplicateChecksumCount: number }> {
  const result = await query<{ duplicate_url_count: number; duplicate_checksum_count: number }>(
    `
      SELECT
        (
          SELECT count(id)::integer
          FROM submission_revisions
          WHERE normalized_activity_url = $2
            AND id <> $1
            AND $2::text IS NOT NULL
        ) AS duplicate_url_count,
        (
          SELECT count(sf.id)::integer
          FROM submission_files sf
          JOIN submission_revisions sr ON sr.id = sf.submission_revision_id
          WHERE sf.checksum_sha256 = $3
            AND sr.id <> $1
            AND $3::text IS NOT NULL
            AND sf.status = 'READY'
        ) AS duplicate_checksum_count
    `,
    [input.revisionId, input.normalizedActivityUrl, input.checksumSha256],
    client,
  );

  return {
    duplicateUrlCount: result.rows[0]?.duplicate_url_count ?? 0,
    duplicateChecksumCount: result.rows[0]?.duplicate_checksum_count ?? 0,
  };
}
