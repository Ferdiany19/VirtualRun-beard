import type { PoolClient } from 'pg';
import { query } from '@/db/pool';
import type {
  EventCategoryRecord,
  GenderDivision,
} from '@/modules/categories/category.types';
import type { EventRecord } from '@/modules/events/event.types';
import type { ParticipantRecord } from '@/modules/participants/participant.repository';
import type { EventRegistrationRecord } from '@/modules/registrations/registration.types';
import type {
  ActivityPlatform,
  AdminSubmissionFilters,
  AdminSubmissionListItem,
  ParticipantSubmissionCategory,
  SubmissionDetail,
  SubmissionFileRecord,
  SubmissionRecord,
  SubmissionRevisionRecord,
  SubmissionStatus,
} from '@/modules/submissions/submission.types';

type SubmissionRow = {
  submission_id: string | null;
  registration_category_id: string;
  current_revision_id: string | null;
  submission_status: SubmissionStatus | null;
  revision_count: number | null;
  first_submitted_at: Date | null;
  last_submitted_at: Date | null;
  review_claimed_by_admin_user_id: string | null;
  review_claimed_by_admin_name: string | null;
  review_claimed_at: Date | null;
  review_claim_expires_at: Date | null;
  review_version: number | null;
  approved_revision_id: string | null;
  approved_by_admin_user_id: string | null;
  approved_at: Date | null;
  validation_completed_at: Date | null;
  ranking_eligible: boolean | null;
  ranking_exclusion_reason: string | null;
  latest_participant_visible_note: string | null;
  latest_validation_reason_code: string | null;
  submission_created_at: Date | null;
  submission_updated_at: Date | null;
};

type RevisionRow = {
  revision_id: string | null;
  submission_id: string | null;
  revision_number: number | null;
  activity_date: string | null;
  distance_meter: number | null;
  elapsed_time_seconds: number | null;
  moving_time_seconds: number | null;
  activity_platform: ActivityPlatform | null;
  activity_platform_other: string | null;
  activity_url: string | null;
  normalized_activity_url: string | null;
  participant_note: string | null;
  submitted_at: Date | null;
  superseded_at: Date | null;
};

type FileRow = {
  file_id: string | null;
  file_revision_id: string | null;
  upload_session_id: string | null;
  object_key: string | null;
  thumbnail_object_key: string | null;
  original_filename: string | null;
  original_mime_type: string | null;
  detected_mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  checksum_sha256: string | null;
  file_status: SubmissionFileRecord['status'] | null;
  file_created_at: Date | null;
  finalized_at: Date | null;
};

type BaseRow = SubmissionRow &
  RevisionRow &
  FileRow & {
    event_id: string;
    event_name: string;
    event_slug: string;
    short_description: string;
    full_description: string;
    terms_and_conditions: string;
    registration_instructions: string;
    upload_instructions: string;
    registration_starts_at: Date;
    registration_ends_at: Date;
    activity_starts_at: Date;
    activity_ends_at: Date;
    upload_starts_at: Date;
    upload_ends_at: Date;
    timezone: 'Asia/Jakarta';
    event_status: EventRecord['eventStatus'];
    publication_status: EventRecord['publicationStatus'];
    banner_object_key: string | null;
    thumbnail_object_key: string | null;
    registration_mode: 'FREE' | 'PAID';
    price_amount_cents: number;
    price_currency: 'IDR';
    maximum_participants: number | null;
    allow_same_activity_across_categories: boolean;
    contact_email: string | null;
    contact_phone: string | null;
    contact_whatsapp: string | null;
    brand_primary_color: string;
    faq_items: EventRecord['faqItems'];
    race_pack_enabled: boolean;
    emergency_contact_enabled: boolean;
    event_created_at: Date;
    event_updated_at: Date;
    registration_id: string;
    participant_id: string;
    registration_code_lookup: string;
    registration_code_hash: string;
    bib_sequence: number;
    bib_number: string;
    registration_status: EventRegistrationRecord['registrationStatus'];
    bib_status: EventRegistrationRecord['bibStatus'];
    bib_document_id: string | null;
    bib_error: string | null;
    email_status: EventRegistrationRecord['emailStatus'];
    registered_at: Date;
    terms_version: string;
    terms_accepted_at: Date;
    privacy_accepted_at: Date;
    source: string | null;
    registration_created_at: Date;
    registration_updated_at: Date;
    cancelled_at: Date | null;
    full_name: string;
    normalized_email: string;
    display_email: string;
    normalized_phone: string;
    display_phone: string;
    gender: ParticipantRecord['gender'];
    date_of_birth: string | null;
    province: string | null;
    city: string | null;
    city_or_regency: string | null;
    district: string | null;
    postal_code: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    participant_status: ParticipantRecord['status'];
    deleted_at: Date | null;
    participant_created_at: Date;
    participant_updated_at: Date;
    category_id: string;
    category_name: string;
    category_slug: string;
    category_description: string | null;
    distance_meters: number;
    distance_tolerance_meters: number;
    minimum_age_years: number | null;
    maximum_age_years: number | null;
    gender_division: GenderDivision | null;
    participant_quota: number | null;
    ranking_enabled: boolean;
    certificate_enabled: boolean;
    display_order: number;
    is_active: boolean;
    category_price_amount_cents: number;
    category_price_currency: 'IDR';
    category_created_at: Date;
    category_updated_at: Date;
  };

function mapEvent(row: BaseRow): EventRecord {
  return {
    id: row.event_id,
    name: row.event_name,
    slug: row.event_slug,
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    termsAndConditions: row.terms_and_conditions,
    registrationInstructions: row.registration_instructions,
    uploadInstructions: row.upload_instructions,
    registrationStartsAt: row.registration_starts_at,
    registrationEndsAt: row.registration_ends_at,
    activityStartsAt: row.activity_starts_at,
    activityEndsAt: row.activity_ends_at,
    uploadStartsAt: row.upload_starts_at,
    uploadEndsAt: row.upload_ends_at,
    timezone: row.timezone,
    eventStatus: row.event_status,
    publicationStatus: row.publication_status,
    bannerObjectKey: row.banner_object_key,
    thumbnailObjectKey: row.thumbnail_object_key,
    registrationMode: row.registration_mode,
    priceAmountCents: row.price_amount_cents,
    priceCurrency: row.price_currency,
    maximumParticipants: row.maximum_participants,
    allowSameActivityAcrossCategories:
      row.allow_same_activity_across_categories,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    contactWhatsapp: row.contact_whatsapp,
    brandPrimaryColor: row.brand_primary_color,
    faqItems: row.faq_items,
    racePackEnabled: row.race_pack_enabled,
    emergencyContactEnabled: row.emergency_contact_enabled,
    createdByAdminUserId: null,
    updatedByAdminUserId: null,
    assignedAdminUserIds: [],
    createdAt: row.event_created_at,
    updatedAt: row.event_updated_at,
  };
}

function mapRegistration(row: BaseRow): EventRegistrationRecord {
  return {
    id: row.registration_id,
    eventId: row.event_id,
    participantId: row.participant_id,
    registrationCodeLookup: row.registration_code_lookup,
    registrationCodeHash: row.registration_code_hash,
    bibSequence: row.bib_sequence,
    bibNumber: row.bib_number,
    registrationStatus: row.registration_status,
    bibStatus: row.bib_status,
    bibDocumentId: row.bib_document_id,
    bibError: row.bib_error,
    emailStatus: row.email_status,
    registeredAt: row.registered_at,
    termsVersion: row.terms_version,
    termsAcceptedAt: row.terms_accepted_at,
    privacyAcceptedAt: row.privacy_accepted_at,
    source: row.source,
    createdAt: row.registration_created_at,
    updatedAt: row.registration_updated_at,
    cancelledAt: row.cancelled_at,
  };
}

function mapParticipant(row: BaseRow): ParticipantRecord {
  return {
    id: row.participant_id,
    fullName: row.full_name,
    normalizedEmail: row.normalized_email,
    displayEmail: row.display_email,
    normalizedPhone: row.normalized_phone,
    displayPhone: row.display_phone,
    gender: row.gender,
    dateOfBirth: row.date_of_birth,
    province: row.province,
    city: row.city,
    cityOrRegency: row.city_or_regency ?? row.city,
    district: row.district,
    postalCode: row.postal_code,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    status: row.participant_status,
    deletedAt: row.deleted_at,
    createdAt: row.participant_created_at,
    updatedAt: row.participant_updated_at,
  };
}

function mapCategory(row: BaseRow): EventCategoryRecord {
  return {
    id: row.category_id,
    eventId: row.event_id,
    name: row.category_name,
    slug: row.category_slug,
    description: row.category_description,
    distanceMeters: row.distance_meters,
    distanceToleranceMeters: row.distance_tolerance_meters,
    minimumAgeYears: row.minimum_age_years,
    maximumAgeYears: row.maximum_age_years,
    genderDivision: row.gender_division,
    participantQuota: row.participant_quota,
    rankingEnabled: row.ranking_enabled,
    certificateEnabled: row.certificate_enabled,
    displayOrder: row.display_order,
    isActive: row.is_active,
    priceAmountCents: row.category_price_amount_cents,
    priceCurrency: row.category_price_currency,
    createdAt: row.category_created_at,
    updatedAt: row.category_updated_at,
  };
}

function mapSubmission(row: SubmissionRow): SubmissionRecord | null {
  if (
    !row.submission_id ||
    !row.submission_status ||
    row.revision_count === null
  ) {
    return null;
  }

  return {
    id: row.submission_id,
    registrationCategoryId: row.registration_category_id,
    currentRevisionId: row.current_revision_id,
    status: row.submission_status,
    revisionCount: row.revision_count,
    firstSubmittedAt: row.first_submitted_at,
    lastSubmittedAt: row.last_submitted_at,
    reviewClaimedByAdminUserId: row.review_claimed_by_admin_user_id,
    reviewClaimedByAdminName: row.review_claimed_by_admin_name,
    reviewClaimedAt: row.review_claimed_at,
    reviewClaimExpiresAt: row.review_claim_expires_at,
    reviewVersion: row.review_version ?? 0,
    approvedRevisionId: row.approved_revision_id,
    approvedByAdminUserId: row.approved_by_admin_user_id,
    approvedAt: row.approved_at,
    validationCompletedAt: row.validation_completed_at,
    rankingEligible: row.ranking_eligible ?? false,
    rankingExclusionReason: row.ranking_exclusion_reason,
    latestParticipantVisibleNote: row.latest_participant_visible_note,
    latestValidationReasonCode: row.latest_validation_reason_code,
    createdAt: row.submission_created_at ?? new Date(0),
    updatedAt: row.submission_updated_at ?? new Date(0),
  };
}

function mapRevision(row: RevisionRow): SubmissionRevisionRecord | null {
  if (
    !row.revision_id ||
    !row.submission_id ||
    row.revision_number === null ||
    !row.activity_date ||
    row.distance_meter === null ||
    row.elapsed_time_seconds === null ||
    !row.activity_platform ||
    !row.submitted_at
  ) {
    return null;
  }

  return {
    id: row.revision_id,
    submissionId: row.submission_id,
    revisionNumber: row.revision_number,
    activityDate: row.activity_date,
    distanceMeter: row.distance_meter,
    elapsedTimeSeconds: row.elapsed_time_seconds,
    movingTimeSeconds: row.moving_time_seconds,
    activityPlatform: row.activity_platform,
    activityPlatformOther: row.activity_platform_other,
    activityUrl: row.activity_url,
    normalizedActivityUrl: row.normalized_activity_url,
    participantNote: row.participant_note,
    submittedAt: row.submitted_at,
    supersededAt: row.superseded_at,
  };
}

function mapFile(row: FileRow): SubmissionFileRecord | null {
  if (
    !row.file_id ||
    !row.upload_session_id ||
    !row.object_key ||
    !row.original_filename ||
    !row.detected_mime_type ||
    row.size_bytes === null ||
    row.width === null ||
    row.height === null ||
    !row.checksum_sha256 ||
    !row.file_status ||
    !row.file_created_at
  ) {
    return null;
  }

  return {
    id: row.file_id,
    submissionRevisionId: row.file_revision_id,
    uploadSessionId: row.upload_session_id,
    objectKey: row.object_key,
    thumbnailObjectKey: row.thumbnail_object_key,
    originalFilename: row.original_filename,
    originalMimeType: row.original_mime_type,
    detectedMimeType: row.detected_mime_type,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    checksumSha256: row.checksum_sha256,
    status: row.file_status,
    createdAt: row.file_created_at,
    finalizedAt: row.finalized_at,
  };
}

const baseSelection = `
  e.id AS event_id,
  e.name AS event_name,
  e.slug AS event_slug,
  e.short_description,
  e.full_description,
  e.terms_and_conditions,
  e.registration_instructions,
  e.upload_instructions,
  e.registration_starts_at,
  e.registration_ends_at,
  e.activity_starts_at,
  e.activity_ends_at,
  e.upload_starts_at,
  e.upload_ends_at,
  e.timezone,
  e.event_status,
  e.publication_status,
  e.banner_object_key,
  e.thumbnail_object_key,
  e.registration_mode,
  e.price_amount_cents,
  e.price_currency,
  e.maximum_participants,
  e.allow_same_activity_across_categories,
  e.contact_email,
  e.contact_phone,
  e.contact_whatsapp,
  e.brand_primary_color,
  e.faq_items,
  e.race_pack_enabled,
  e.emergency_contact_enabled,
  e.created_at AS event_created_at,
  e.updated_at AS event_updated_at,
  er.id AS registration_id,
  er.participant_id,
  er.registration_code_lookup,
  er.registration_code_hash,
  er.bib_sequence,
  er.bib_number,
  er.registration_status,
  er.bib_status,
  er.bib_document_id,
  er.bib_error,
  er.email_status,
  er.registered_at,
  er.terms_version,
  er.terms_accepted_at,
  er.privacy_accepted_at,
  er.source,
  er.created_at AS registration_created_at,
  er.updated_at AS registration_updated_at,
  er.cancelled_at,
  p.full_name,
  p.normalized_email,
  p.display_email,
  p.normalized_phone,
  p.display_phone,
  p.gender,
  p.date_of_birth,
  p.province,
  p.city,
  p.city_or_regency,
  p.district,
  p.postal_code,
  p.emergency_contact_name,
  p.emergency_contact_phone,
  p.status AS participant_status,
  p.deleted_at,
  p.created_at AS participant_created_at,
  p.updated_at AS participant_updated_at,
  rc.id AS registration_category_id,
  ec.id AS category_id,
  ec.name AS category_name,
  ec.slug AS category_slug,
  ec.description AS category_description,
  ec.distance_meters,
  ec.distance_tolerance_meters,
  ec.minimum_age_years,
  ec.maximum_age_years,
  ec.gender_division,
  ec.participant_quota,
  ec.ranking_enabled,
  ec.certificate_enabled,
  ec.display_order,
  ec.is_active,
  ec.price_amount_cents AS category_price_amount_cents,
  ec.price_currency AS category_price_currency,
  ec.created_at AS category_created_at,
  ec.updated_at AS category_updated_at,
  s.id AS submission_id,
  s.current_revision_id,
  s.status AS submission_status,
  s.revision_count,
  s.first_submitted_at,
  s.last_submitted_at,
  s.review_claimed_by_admin_user_id,
  claim_admin.full_name AS review_claimed_by_admin_name,
  s.review_claimed_at,
  s.review_claim_expires_at,
  s.review_version,
  s.approved_revision_id,
  s.approved_by_admin_user_id,
  s.approved_at,
  s.validation_completed_at,
  s.ranking_eligible,
  s.ranking_exclusion_reason,
  s.latest_participant_visible_note,
  s.latest_validation_reason_code,
  s.created_at AS submission_created_at,
  s.updated_at AS submission_updated_at,
  sr.id AS revision_id,
  sr.submission_id,
  sr.revision_number,
  sr.activity_date::text AS activity_date,
  sr.distance_meter,
  sr.elapsed_time_seconds,
  sr.moving_time_seconds,
  sr.activity_platform,
  sr.activity_platform_other,
  sr.activity_url,
  sr.normalized_activity_url,
  sr.participant_note,
  sr.submitted_at,
  sr.superseded_at,
  sf.id AS file_id,
  sf.submission_revision_id AS file_revision_id,
  sf.upload_session_id,
  sf.object_key,
  sf.thumbnail_object_key,
  sf.original_filename,
  sf.original_mime_type,
  sf.detected_mime_type,
  sf.size_bytes,
  sf.width,
  sf.height,
  sf.checksum_sha256,
  sf.status AS file_status,
  sf.created_at AS file_created_at,
  sf.finalized_at
`;

const baseJoins = `
  FROM registration_categories rc
  JOIN event_registrations er ON er.id = rc.event_registration_id
  JOIN events e ON e.id = er.event_id
  JOIN participants p ON p.id = er.participant_id
  JOIN event_categories ec ON ec.id = rc.event_category_id
  LEFT JOIN submissions s ON s.registration_category_id = rc.id
  LEFT JOIN admin_users claim_admin ON claim_admin.id = s.review_claimed_by_admin_user_id
  LEFT JOIN submission_revisions sr ON sr.id = s.current_revision_id
  LEFT JOIN submission_files sf ON sf.submission_revision_id = sr.id
    AND sf.status = 'READY'
`;

function mapParticipantCategory(row: BaseRow): ParticipantSubmissionCategory {
  return {
    registrationCategoryId: row.registration_category_id,
    event: mapEvent(row),
    registration: mapRegistration(row),
    participant: mapParticipant(row),
    category: mapCategory(row),
    submission: mapSubmission(row),
    currentRevision: mapRevision(row),
    currentFile: mapFile(row),
  };
}

export async function listParticipantSubmissionCategories(
  eventRegistrationId: string,
  client?: PoolClient,
): Promise<ParticipantSubmissionCategory[]> {
  const result = await query<BaseRow>(
    `
      SELECT ${baseSelection}
      ${baseJoins}
      WHERE er.id = $1
        AND rc.registration_status = 'ACTIVE'
      ORDER BY ec.display_order ASC, ec.name ASC
    `,
    [eventRegistrationId],
    client,
  );

  return result.rows.map(mapParticipantCategory);
}

export async function getParticipantSubmissionCategory(
  input: {
    eventRegistrationId: string;
    registrationCategoryId: string;
    eventSlug: string;
  },
  client?: PoolClient,
): Promise<ParticipantSubmissionCategory | null> {
  const result = await query<BaseRow>(
    `
      SELECT ${baseSelection}
      ${baseJoins}
      WHERE er.id = $1
        AND rc.id = $2
        AND e.slug = $3
        AND rc.registration_status = 'ACTIVE'
      LIMIT 1
    `,
    [input.eventRegistrationId, input.registrationCategoryId, input.eventSlug],
    client,
  );

  return result.rows[0] ? mapParticipantCategory(result.rows[0]) : null;
}

export async function ensureSubmissionForUpdate(
  input: { submissionId: string; registrationCategoryId: string },
  client?: PoolClient,
): Promise<SubmissionRecord> {
  await query(
    `
      INSERT INTO submissions (
        id,
        registration_category_id,
        status
      )
      VALUES ($1, $2, 'SUBMITTED')
      ON CONFLICT (registration_category_id) DO NOTHING
    `,
    [input.submissionId, input.registrationCategoryId],
    client,
  );
  const result = await query<
    SubmissionRow & {
      id: string;
      status: SubmissionStatus;
      created_at: Date;
      updated_at: Date;
    }
  >(
    `
      SELECT
        id AS submission_id,
        registration_category_id,
        current_revision_id,
        status AS submission_status,
        revision_count,
        first_submitted_at,
        last_submitted_at,
        review_claimed_by_admin_user_id,
        NULL::text AS review_claimed_by_admin_name,
        review_claimed_at,
        review_claim_expires_at,
        review_version,
        approved_revision_id,
        approved_by_admin_user_id,
        approved_at,
        validation_completed_at,
        ranking_eligible,
        ranking_exclusion_reason,
        latest_participant_visible_note,
        latest_validation_reason_code,
        created_at AS submission_created_at,
        updated_at AS submission_updated_at
      FROM submissions
      WHERE registration_category_id = $1
      FOR UPDATE
    `,
    [input.registrationCategoryId],
    client,
  );
  const submission = mapSubmission(result.rows[0]);

  if (!submission) {
    throw new Error('Submission could not be locked');
  }

  return submission;
}

export async function createUploadSessionRecord(
  input: {
    id: string;
    participantId: string;
    eventRegistrationId: string;
    registrationCategoryId: string;
    maximumSizeBytes: number;
    objectKey: string;
    status: 'READY' | 'FAILED';
  },
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      INSERT INTO upload_sessions (
        id,
        participant_id,
        event_registration_id,
        registration_category_id,
        purpose,
        expected_mime_type,
        maximum_size_bytes,
        object_key,
        status,
        expires_at,
        finalized_at
      )
      VALUES ($1, $2, $3, $4, 'SUBMISSION_SCREENSHOT', 'image/*', $5, $6, $7, now() + interval '1 hour', now())
    `,
    [
      input.id,
      input.participantId,
      input.eventRegistrationId,
      input.registrationCategoryId,
      input.maximumSizeBytes,
      input.objectKey,
      input.status,
    ],
    client,
  );
}

export async function markCurrentRevisionSuperseded(
  currentRevisionId: string | null,
  client?: PoolClient,
): Promise<void> {
  if (!currentRevisionId) {
    return;
  }

  await query(
    `
      UPDATE submission_revisions
      SET superseded_at = now()
      WHERE id = $1
        AND superseded_at IS NULL
    `,
    [currentRevisionId],
    client,
  );
}

export async function createSubmissionRevision(
  input: {
    id: string;
    submissionId: string;
    revisionNumber: number;
    activityDate: string;
    distanceMeter: number;
    elapsedTimeSeconds: number;
    movingTimeSeconds: number | null;
    activityPlatform: ActivityPlatform;
    activityPlatformOther: string | null;
    activityUrl: string | null;
    normalizedActivityUrl: string | null;
    participantNote: string | null;
  },
  client?: PoolClient,
): Promise<SubmissionRevisionRecord> {
  const result = await query<RevisionRow>(
    `
      INSERT INTO submission_revisions (
        id,
        submission_id,
        revision_number,
        activity_date,
        distance_meter,
        elapsed_time_seconds,
        moving_time_seconds,
        activity_platform,
        activity_platform_other,
        activity_url,
        normalized_activity_url,
        participant_note
      )
      VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING
        id AS revision_id,
        submission_id,
        revision_number,
        activity_date::text AS activity_date,
        distance_meter,
        elapsed_time_seconds,
        moving_time_seconds,
        activity_platform,
        activity_platform_other,
        activity_url,
        normalized_activity_url,
        participant_note,
        submitted_at,
        superseded_at
    `,
    [
      input.id,
      input.submissionId,
      input.revisionNumber,
      input.activityDate,
      input.distanceMeter,
      input.elapsedTimeSeconds,
      input.movingTimeSeconds,
      input.activityPlatform,
      input.activityPlatformOther,
      input.activityUrl,
      input.normalizedActivityUrl,
      input.participantNote,
    ],
    client,
  );
  const revision = mapRevision(result.rows[0]);

  if (!revision) {
    throw new Error('Submission revision was not created');
  }

  return revision;
}

export async function updateSubmissionAfterRevision(
  input: { submissionId: string; revisionId: string; revisionCount: number },
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE submissions
      SET
        current_revision_id = $2,
        status = 'SUBMITTED',
        revision_count = $3,
        review_claimed_by_admin_user_id = NULL,
        review_claimed_at = NULL,
        review_claim_expires_at = NULL,
        review_version = review_version + 1,
        approved_revision_id = NULL,
        approved_by_admin_user_id = NULL,
        approved_at = NULL,
        validation_completed_at = NULL,
        ranking_eligible = false,
        ranking_exclusion_reason = NULL,
        latest_participant_visible_note = NULL,
        latest_validation_reason_code = NULL,
        first_submitted_at = COALESCE(first_submitted_at, now()),
        last_submitted_at = now(),
        updated_at = now()
      WHERE id = $1
    `,
    [input.submissionId, input.revisionId, input.revisionCount],
    client,
  );
}

export async function createSubmissionFile(
  input: {
    id: string;
    revisionId: string;
    uploadSessionId: string;
    objectKey: string;
    originalFilename: string;
    originalMimeType: string | null;
    detectedMimeType: string;
    sizeBytes: number;
    width: number;
    height: number;
    checksumSha256: string;
  },
  client?: PoolClient,
): Promise<SubmissionFileRecord> {
  const result = await query<FileRow>(
    `
      INSERT INTO submission_files (
        id,
        submission_revision_id,
        upload_session_id,
        object_key,
        original_filename,
        original_mime_type,
        detected_mime_type,
        size_bytes,
        width,
        height,
        checksum_sha256,
        status,
        finalized_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'READY', now())
      RETURNING
        id AS file_id,
        submission_revision_id AS file_revision_id,
        upload_session_id,
        object_key,
        thumbnail_object_key,
        original_filename,
        original_mime_type,
        detected_mime_type,
        size_bytes,
        width,
        height,
        checksum_sha256,
        status AS file_status,
        created_at AS file_created_at,
        finalized_at
    `,
    [
      input.id,
      input.revisionId,
      input.uploadSessionId,
      input.objectKey,
      input.originalFilename,
      input.originalMimeType,
      input.detectedMimeType,
      input.sizeBytes,
      input.width,
      input.height,
      input.checksumSha256,
    ],
    client,
  );
  const file = mapFile(result.rows[0]);

  if (!file) {
    throw new Error('Submission file was not created');
  }

  return file;
}

export async function recordSubmissionSystemEvent(
  input: {
    submissionId: string | null;
    revisionId?: string | null;
    eventRegistrationId: string;
    registrationCategoryId: string;
    actorType: 'ADMIN_USER' | 'PARTICIPANT_PUBLIC' | 'SYSTEM' | 'WORKER';
    action: string;
    metadata?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    correlationId?: string | null;
  },
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      INSERT INTO submission_system_events (
        submission_id,
        submission_revision_id,
        event_registration_id,
        registration_category_id,
        actor_type,
        action,
        metadata,
        ip_address,
        user_agent,
        correlation_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::inet, $9, $10)
    `,
    [
      input.submissionId,
      input.revisionId ?? null,
      input.eventRegistrationId,
      input.registrationCategoryId,
      input.actorType,
      input.action,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.ipAddress ?? null,
      input.userAgent ?? null,
      input.correlationId ?? null,
    ],
    client,
  );
}

export async function listSubmissionRevisions(
  submissionId: string,
  client?: PoolClient,
): Promise<
  Array<SubmissionRevisionRecord & { file: SubmissionFileRecord | null }>
> {
  const result = await query<RevisionRow & FileRow>(
    `
      SELECT
        sr.id AS revision_id,
        sr.submission_id,
        sr.revision_number,
        sr.activity_date::text AS activity_date,
        sr.distance_meter,
        sr.elapsed_time_seconds,
        sr.moving_time_seconds,
        sr.activity_platform,
        sr.activity_platform_other,
        sr.activity_url,
        sr.normalized_activity_url,
        sr.participant_note,
        sr.submitted_at,
        sr.superseded_at,
        sf.id AS file_id,
        sf.submission_revision_id AS file_revision_id,
        sf.upload_session_id,
        sf.object_key,
        sf.thumbnail_object_key,
        sf.original_filename,
        sf.original_mime_type,
        sf.detected_mime_type,
        sf.size_bytes,
        sf.width,
        sf.height,
        sf.checksum_sha256,
        sf.status AS file_status,
        sf.created_at AS file_created_at,
        sf.finalized_at
      FROM submission_revisions sr
      LEFT JOIN submission_files sf ON sf.submission_revision_id = sr.id
        AND sf.status = 'READY'
      WHERE sr.submission_id = $1
      ORDER BY sr.revision_number DESC
    `,
    [submissionId],
    client,
  );

  return result.rows.flatMap((row) => {
    const revision = mapRevision(row);

    return revision ? [{ ...revision, file: mapFile(row) }] : [];
  });
}

export async function getParticipantSubmissionDetail(
  input: {
    eventRegistrationId: string;
    registrationCategoryId: string;
    eventSlug: string;
  },
  client?: PoolClient,
): Promise<SubmissionDetail | null> {
  const category = await getParticipantSubmissionCategory(input, client);

  if (!category) {
    return null;
  }

  return {
    ...category,
    revisions: category.submission
      ? await listSubmissionRevisions(category.submission.id, client)
      : [],
    validationReviews: [],
    warnings: [],
  };
}

export async function listAdminSubmissions(
  eventId: string,
  filters: AdminSubmissionFilters,
  client?: PoolClient,
): Promise<AdminSubmissionListItem[]> {
  const values: unknown[] = [eventId];
  const conditions = ['e.id = $1', 's.id IS NOT NULL', 'sr.id IS NOT NULL'];

  if (filters.search) {
    values.push(filters.search);
    conditions.push(
      `(p.full_name ILIKE '%' || $${values.length} || '%' OR er.bib_number ILIKE '%' || $${values.length} || '%')`,
    );
  }

  if (filters.categoryId) {
    values.push(filters.categoryId);
    conditions.push(`ec.id = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`s.status = $${values.length}`);
  }

  if (filters.activityPlatform) {
    values.push(filters.activityPlatform);
    conditions.push(`sr.activity_platform = $${values.length}`);
  }

  if (filters.evidenceType === 'URL') {
    conditions.push('sr.activity_url IS NOT NULL AND sf.id IS NULL');
  } else if (filters.evidenceType === 'SCREENSHOT') {
    conditions.push('sr.activity_url IS NULL AND sf.id IS NOT NULL');
  } else if (filters.evidenceType === 'BOTH') {
    conditions.push('sr.activity_url IS NOT NULL AND sf.id IS NOT NULL');
  }

  const sortSql =
    {
      submitted_desc: 'sr.submitted_at DESC',
      submitted_asc: 'sr.submitted_at ASC',
      bib_asc: 'er.bib_sequence ASC',
      distance_desc: 'sr.distance_meter DESC',
    }[filters.sort ?? 'submitted_desc'] ?? 'sr.submitted_at DESC';
  const page = Math.max(1, filters.page ?? 1);
  values.push((page - 1) * 25);

  const result = await query<BaseRow>(
    `
      SELECT ${baseSelection}
      ${baseJoins}
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${sortSql}
      LIMIT 25 OFFSET $${values.length}
    `,
    values,
    client,
  );

  return result.rows.flatMap((row) => {
    const submission = mapSubmission(row);
    const currentRevision = mapRevision(row);

    if (!submission || !currentRevision) {
      return [];
    }

    return [
      {
        submission,
        currentRevision,
        currentFile: mapFile(row),
        warnings: [],
        participant: mapParticipant(row),
        event: mapEvent(row),
        registration: mapRegistration(row),
        category: mapCategory(row),
      },
    ];
  });
}

export async function getAdminSubmissionDetail(
  submissionId: string,
  client?: PoolClient,
): Promise<SubmissionDetail | null> {
  const result = await query<BaseRow>(
    `
      SELECT ${baseSelection}
      ${baseJoins}
      WHERE s.id = $1
      LIMIT 1
    `,
    [submissionId],
    client,
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const category = mapParticipantCategory(row);

  return {
    ...category,
    revisions: category.submission
      ? await listSubmissionRevisions(category.submission.id, client)
      : [],
    validationReviews: [],
    warnings: [],
  };
}

export async function findParticipantSubmissionFile(
  input: { fileId: string; eventRegistrationId: string },
  client?: PoolClient,
): Promise<SubmissionFileRecord | null> {
  const result = await query<FileRow>(
    `
      SELECT
        sf.id AS file_id,
        sf.submission_revision_id AS file_revision_id,
        sf.upload_session_id,
        sf.object_key,
        sf.thumbnail_object_key,
        sf.original_filename,
        sf.original_mime_type,
        sf.detected_mime_type,
        sf.size_bytes,
        sf.width,
        sf.height,
        sf.checksum_sha256,
        sf.status AS file_status,
        sf.created_at AS file_created_at,
        sf.finalized_at
      FROM submission_files sf
      JOIN upload_sessions us ON us.id = sf.upload_session_id
      WHERE sf.id = $1
        AND us.event_registration_id = $2
        AND sf.status = 'READY'
      LIMIT 1
    `,
    [input.fileId, input.eventRegistrationId],
    client,
  );

  return result.rows[0] ? mapFile(result.rows[0]) : null;
}

export async function findAdminSubmissionFile(
  fileId: string,
  client?: PoolClient,
): Promise<{ file: SubmissionFileRecord; eventId: string } | null> {
  const result = await query<FileRow & { event_id: string }>(
    `
      SELECT
        sf.id AS file_id,
        sf.submission_revision_id AS file_revision_id,
        sf.upload_session_id,
        sf.object_key,
        sf.thumbnail_object_key,
        sf.original_filename,
        sf.original_mime_type,
        sf.detected_mime_type,
        sf.size_bytes,
        sf.width,
        sf.height,
        sf.checksum_sha256,
        sf.status AS file_status,
        sf.created_at AS file_created_at,
        sf.finalized_at,
        er.event_id
      FROM submission_files sf
      JOIN upload_sessions us ON us.id = sf.upload_session_id
      JOIN event_registrations er ON er.id = us.event_registration_id
      WHERE sf.id = $1
        AND sf.status = 'READY'
      LIMIT 1
    `,
    [fileId],
    client,
  );
  const row = result.rows[0];
  const file = row ? mapFile(row) : null;

  return row && file ? { file, eventId: row.event_id } : null;
}

export async function listExpiredUploadObjects(
  limit: number,
  client?: PoolClient,
): Promise<Array<{ uploadSessionId: string; objectKey: string }>> {
  const result = await query<{ upload_session_id: string; object_key: string }>(
    `
      SELECT id AS upload_session_id, object_key
      FROM upload_sessions
      WHERE status IN ('CREATED', 'UPLOADED', 'FAILED', 'EXPIRED')
        AND expires_at < now()
      ORDER BY expires_at ASC
      LIMIT $1
    `,
    [limit],
    client,
  );

  return result.rows.map((row) => ({
    uploadSessionId: row.upload_session_id,
    objectKey: row.object_key,
  }));
}

export async function markUploadSessionsExpired(
  uploadSessionIds: string[],
  client?: PoolClient,
): Promise<void> {
  if (uploadSessionIds.length === 0) {
    return;
  }

  await query(
    `
      UPDATE upload_sessions
      SET status = 'EXPIRED'
      WHERE id = ANY($1::uuid[])
        AND status <> 'READY'
    `,
    [uploadSessionIds],
    client,
  );
}

export async function hasActiveUploadOverride(
  input: { eventRegistrationId: string; registrationCategoryId: string },
  client?: PoolClient,
): Promise<boolean> {
  const result = await query<{ has_override: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM upload_overrides uo
        WHERE uo.event_registration_id = $1
          AND (uo.registration_category_id IS NULL OR uo.registration_category_id = $2)
          AND uo.revoked_at IS NULL
          AND uo.upload_override_until > now()
      ) AS has_override
    `,
    [input.eventRegistrationId, input.registrationCategoryId],
    client,
  );

  return result.rows[0]?.has_override ?? false;
}
