import type { PoolClient } from "pg";
import { query } from "@/db/pool";
import type { EventCategoryRecord, GenderDivision } from "@/modules/categories/category.types";
import type {
  BibStatus,
  EmailStatus,
  EventRegistrationRecord,
  GlobalParticipantFilterOptions,
  GlobalParticipantListFilters,
  GlobalParticipantListItem,
  GlobalParticipantRecentActivity,
  GlobalParticipantStats,
  GlobalParticipantStatus,
  GlobalParticipantTopEvent,
  RegistrationCategoryRecord,
  RegistrationListFilters,
  RegistrationListItem,
  RegistrationStatus,
  RegistrationSummary,
} from "@/modules/registrations/registration.types";
import type { EventRecord } from "@/modules/events/event.types";
import type { ParticipantRecord } from "@/modules/participants/participant.repository";

type RegistrationRow = {
  id: string;
  event_id: string;
  participant_id: string;
  registration_code_lookup: string;
  registration_code_hash: string;
  bib_sequence: number;
  bib_number: string;
  registration_status: RegistrationStatus;
  bib_status: BibStatus;
  bib_document_id: string | null;
  bib_error: string | null;
  email_status: EmailStatus;
  registered_at: Date;
  terms_version: string;
  terms_accepted_at: Date;
  privacy_accepted_at: Date;
  source: string | null;
  created_at: Date;
  updated_at: Date;
  cancelled_at: Date | null;
};

type CategoryRow = {
  id: string;
  event_id: string;
  name: string;
  slug: string;
  description: string | null;
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
  price_amount_cents: number;
  price_currency: "IDR";
  created_at: Date;
  updated_at: Date;
};

type ParticipantSummaryRow = {
  participant_id: string;
  full_name: string;
  normalized_email: string;
  display_email: string;
  normalized_phone: string;
  display_phone: string;
  gender: ParticipantRecord["gender"];
  date_of_birth: string | null;
  province: string | null;
  city: string | null;
  city_or_regency: string | null;
  district: string | null;
  postal_code: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  status: ParticipantRecord["status"];
  deleted_at: Date | null;
  participant_created_at: Date;
  participant_updated_at: Date;
};

type EventSummaryRow = {
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
  allow_same_activity_across_categories: boolean;
  timezone: "Asia/Jakarta";
  event_status: EventRecord["eventStatus"];
  publication_status: EventRecord["publicationStatus"];
  banner_object_key: string | null;
  thumbnail_object_key: string | null;
  registration_mode: "FREE" | "PAID";
  price_amount_cents: number;
  price_currency: "IDR";
  maximum_participants: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  brand_primary_color: string;
  faq_items: EventRecord["faqItems"];
  event_created_at: Date;
  event_updated_at: Date;
};

type GlobalParticipantAdminScope = {
  adminId: string;
  isSuperAdmin: boolean;
};

type GlobalParticipantRow = {
  registration_id: string;
  participant_id: string;
  participant_name: string;
  participant_email: string;
  event_id: string;
  event_name: string;
  bib_number: string;
  category_names: string[] | null;
  registered_at: Date;
  registration_status: RegistrationStatus;
  bib_status: BibStatus;
  email_status: EmailStatus;
  submitted_category_count: number;
  total_category_count: number;
  list_status: GlobalParticipantStatus;
  total_items?: number;
};

type GlobalParticipantFilterRow = {
  id: string;
  event_id?: string;
  name: string;
};

function registrationColumns(alias = "er") {
  const prefix = alias ? `${alias}.` : "";

  return `
    ${prefix}id,
    ${prefix}event_id,
    ${prefix}participant_id,
    ${prefix}registration_code_lookup,
    ${prefix}registration_code_hash,
    ${prefix}bib_sequence,
    ${prefix}bib_number,
    ${prefix}registration_status,
    ${prefix}bib_status,
    ${prefix}bib_document_id,
    ${prefix}bib_error,
    ${prefix}email_status,
    ${prefix}registered_at,
    ${prefix}terms_version,
    ${prefix}terms_accepted_at,
    ${prefix}privacy_accepted_at,
    ${prefix}source,
    ${prefix}created_at,
    ${prefix}updated_at,
    ${prefix}cancelled_at
  `;
}

function mapRegistration(row: RegistrationRow): EventRegistrationRecord {
  return {
    id: row.id,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    cancelledAt: row.cancelled_at,
  };
}

function mapCategory(row: CategoryRow): EventCategoryRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
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
    priceAmountCents: row.price_amount_cents,
    priceCurrency: row.price_currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapParticipant(row: ParticipantSummaryRow): ParticipantRecord {
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
    status: row.status,
    deletedAt: row.deleted_at,
    createdAt: row.participant_created_at,
    updatedAt: row.participant_updated_at,
  };
}

function mapEvent(row: EventSummaryRow): EventRecord {
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
    allowSameActivityAcrossCategories: row.allow_same_activity_across_categories,
    timezone: row.timezone,
    eventStatus: row.event_status,
    publicationStatus: row.publication_status,
    bannerObjectKey: row.banner_object_key,
    thumbnailObjectKey: row.thumbnail_object_key,
    registrationMode: row.registration_mode,
    priceAmountCents: row.price_amount_cents,
    priceCurrency: row.price_currency,
    maximumParticipants: row.maximum_participants,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    contactWhatsapp: row.contact_whatsapp,
    brandPrimaryColor: row.brand_primary_color,
    faqItems: row.faq_items,
    createdByAdminUserId: null,
    updatedByAdminUserId: null,
    assignedAdminUserIds: [],
    createdAt: row.event_created_at,
    updatedAt: row.event_updated_at,
  };
}

function manageableEventCondition(adminIdIndex = 1, isSuperIndex = 2, eventAlias = "e") {
  return `(
    $${isSuperIndex}::boolean
    OR ${eventAlias}.created_by_admin_user_id = $${adminIdIndex}::uuid
    OR EXISTS (
      SELECT 1
      FROM admin_event_assignments aea_scope
      WHERE aea_scope.event_id = ${eventAlias}.id
        AND aea_scope.admin_user_id = $${adminIdIndex}::uuid
    )
  )`;
}

function mapGlobalParticipant(row: GlobalParticipantRow): GlobalParticipantListItem {
  return {
    registrationId: row.registration_id,
    participantId: row.participant_id,
    participantName: row.participant_name,
    participantEmail: row.participant_email,
    eventId: row.event_id,
    eventName: row.event_name,
    bibNumber: row.bib_number,
    categories: Array.isArray(row.category_names) ? row.category_names : [],
    registeredAt: row.registered_at,
    registrationStatus: row.registration_status,
    bibStatus: row.bib_status,
    emailStatus: row.email_status,
    submittedCategoryCount: row.submitted_category_count,
    totalCategoryCount: row.total_category_count,
    status: row.list_status,
  };
}

function addGlobalParticipantFilters(
  values: unknown[],
  conditions: string[],
  filters: GlobalParticipantListFilters,
) {
  if (filters.search) {
    values.push(filters.search.trim());
    const index = values.length;
    conditions.push(`(
      p.full_name ILIKE '%' || $${index} || '%'
      OR p.display_email ILIKE '%' || $${index} || '%'
      OR p.normalized_email ILIKE '%' || $${index} || '%'
      OR er.bib_number ILIKE '%' || $${index} || '%'
      OR e.name ILIKE '%' || $${index} || '%'
    )`);
  }

  if (filters.eventId) {
    values.push(filters.eventId);
    conditions.push(`e.id = $${values.length}::uuid`);
  }

  if (filters.categoryId) {
    values.push(filters.categoryId);
    conditions.push(`EXISTS (
      SELECT 1
      FROM registration_categories rc_filter
      WHERE rc_filter.event_registration_id = er.id
        AND rc_filter.event_category_id = $${values.length}::uuid
        AND rc_filter.registration_status = 'ACTIVE'
    )`);
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    conditions.push(`er.registered_at >= $${values.length}::date`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    conditions.push(`er.registered_at < ($${values.length}::date + interval '1 day')`);
  }
}

export async function getOrCreateBibSettingsForUpdate(eventId: string, client?: PoolClient) {
  await query(
    `
      INSERT INTO event_bib_settings (event_id)
      VALUES ($1)
      ON CONFLICT (event_id) DO NOTHING
    `,
    [eventId],
    client,
  );

  const result = await query<{
    next_sequence: number;
    bib_prefix: string;
    bib_suffix: string | null;
    numeric_padding: number;
  }>(
    `
      SELECT
        next_sequence,
        bib_prefix,
        bib_suffix,
        numeric_padding
      FROM event_bib_settings
      WHERE event_id = $1
      FOR UPDATE
    `,
    [eventId],
    client,
  );

  return result.rows[0];
}

export async function advanceBibSequence(
  eventId: string,
  nextSequence: number,
  client?: PoolClient,
) {
  await query(
    `
      UPDATE event_bib_settings
      SET next_sequence = $2, updated_at = now()
      WHERE event_id = $1
    `,
    [eventId, nextSequence],
    client,
  );
}

export async function countActiveEventRegistrations(
  eventId: string,
  client?: PoolClient,
): Promise<number> {
  const result = await query<{ registration_count: number }>(
    `
      SELECT count(id)::integer AS registration_count
      FROM event_registrations
      WHERE event_id = $1
        AND registration_status = 'ACTIVE'
    `,
    [eventId],
    client,
  );

  return result.rows[0]?.registration_count ?? 0;
}

export async function countActiveRegistrationsByEventIds(
  eventIds: string[],
  client?: PoolClient,
): Promise<Array<{ eventId: string; registrationCount: number }>> {
  if (eventIds.length === 0) {
    return [];
  }

  const result = await query<{ event_id: string; registration_count: number }>(
    `
      SELECT
        event_id,
        count(id)::integer AS registration_count
      FROM event_registrations
      WHERE event_id = ANY($1::uuid[])
        AND registration_status = 'ACTIVE'
      GROUP BY event_id
    `,
    [eventIds],
    client,
  );

  return result.rows.map((row) => ({
    eventId: row.event_id,
    registrationCount: row.registration_count,
  }));
}

export async function countDistinctActiveParticipantsByEventIds(
  eventIds: string[],
  client?: PoolClient,
): Promise<number> {
  if (eventIds.length === 0) {
    return 0;
  }

  const result = await query<{ participant_count: number }>(
    `
      SELECT count(DISTINCT participant_id)::integer AS participant_count
      FROM event_registrations
      WHERE event_id = ANY($1::uuid[])
        AND registration_status = 'ACTIVE'
    `,
    [eventIds],
    client,
  );

  return result.rows[0]?.participant_count ?? 0;
}

export async function countActiveCategoryRegistrations(
  categoryId: string,
  client?: PoolClient,
): Promise<number> {
  const result = await query<{ registration_count: number }>(
    `
      SELECT count(rc.id)::integer AS registration_count
      FROM registration_categories rc
      JOIN event_registrations er ON er.id = rc.event_registration_id
      WHERE rc.event_category_id = $1
        AND rc.registration_status = 'ACTIVE'
        AND er.registration_status = 'ACTIVE'
    `,
    [categoryId],
    client,
  );

  return result.rows[0]?.registration_count ?? 0;
}

export async function getActiveRegistrationByParticipantEvent(
  participantId: string,
  eventId: string,
  client?: PoolClient,
): Promise<EventRegistrationRecord | null> {
  const result = await query<RegistrationRow>(
    `
      SELECT ${registrationColumns()}
      FROM event_registrations er
      WHERE er.participant_id = $1
        AND er.event_id = $2
        AND er.registration_status = 'ACTIVE'
      LIMIT 1
    `,
    [participantId, eventId],
    client,
  );

  return result.rows[0] ? mapRegistration(result.rows[0]) : null;
}

export async function createEventRegistration(
  input: {
    eventId: string;
    participantId: string;
    registrationCodeLookup: string;
    registrationCodeHash: string;
    bibSequence: number;
    bibNumber: string;
    termsVersion: string;
    source: string | null;
  },
  client?: PoolClient,
): Promise<EventRegistrationRecord> {
  const result = await query<RegistrationRow>(
    `
      INSERT INTO event_registrations (
        event_id,
        participant_id,
        registration_code_lookup,
        registration_code_hash,
        bib_sequence,
        bib_number,
        terms_version,
        terms_accepted_at,
        privacy_accepted_at,
        source
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now(), $8)
      RETURNING ${registrationColumns("")}
    `,
    [
      input.eventId,
      input.participantId,
      input.registrationCodeLookup,
      input.registrationCodeHash,
      input.bibSequence,
      input.bibNumber,
      input.termsVersion,
      input.source,
    ],
    client,
  );

  return mapRegistration(result.rows[0]);
}

export async function createRegistrationCategory(
  eventRegistrationId: string,
  eventCategoryId: string,
  client?: PoolClient,
): Promise<RegistrationCategoryRecord> {
  const result = await query<{
    id: string;
    event_registration_id: string;
    event_category_id: string;
    registration_status: RegistrationStatus;
    created_at: Date;
    updated_at: Date;
    cancelled_at: Date | null;
  }>(
    `
      INSERT INTO registration_categories (
        event_registration_id,
        event_category_id
      )
      VALUES ($1, $2)
      RETURNING
        id,
        event_registration_id,
        event_category_id,
        registration_status,
        created_at,
        updated_at,
        cancelled_at
    `,
    [eventRegistrationId, eventCategoryId],
    client,
  );
  const row = result.rows[0];

  return {
    id: row.id,
    eventRegistrationId: row.event_registration_id,
    eventCategoryId: row.event_category_id,
    registrationStatus: row.registration_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    cancelledAt: row.cancelled_at,
  };
}

export async function findIdempotencyRecord(
  operation: string,
  key: string,
  client?: PoolClient,
): Promise<{ requestFingerprint: string; responseReference: string | null } | null> {
  const result = await query<{
    request_fingerprint: string;
    response_reference: string | null;
  }>(
    `
      SELECT request_fingerprint, response_reference
      FROM idempotency_records
      WHERE operation = $1
        AND key = $2
        AND expires_at > now()
      LIMIT 1
    `,
    [operation, key],
    client,
  );

  const row = result.rows[0];
  return row
    ? { requestFingerprint: row.request_fingerprint, responseReference: row.response_reference }
    : null;
}

export async function createIdempotencyRecord(
  input: { operation: string; key: string; requestFingerprint: string },
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      INSERT INTO idempotency_records (
        operation,
        key,
        request_fingerprint,
        expires_at
      )
      VALUES ($1, $2, $3, now() + interval '24 hours')
    `,
    [input.operation, input.key, input.requestFingerprint],
    client,
  );
}

export async function completeIdempotencyRecord(
  input: { operation: string; key: string; responseReference: string },
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE idempotency_records
      SET response_reference = $3
      WHERE operation = $1
        AND key = $2
    `,
    [input.operation, input.key, input.responseReference],
    client,
  );
}

export async function createParticipantAccessSession(
  input: {
    eventRegistrationId: string;
    participantId: string;
    sessionTokenHash: string;
    encryptedRegistrationCode?: string | null;
    csrfTokenHash?: string | null;
    expiresAt: Date;
  },
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      INSERT INTO participant_access_sessions (
        event_registration_id,
        participant_id,
        session_token_hash,
        encrypted_registration_code,
        csrf_token_hash,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      input.eventRegistrationId,
      input.participantId,
      input.sessionTokenHash,
      input.encryptedRegistrationCode ?? null,
      input.csrfTokenHash ?? null,
      input.expiresAt,
    ],
    client,
  );
}

export async function findParticipantSession(
  sessionTokenHash: string,
  client?: PoolClient,
): Promise<{
  eventRegistrationId: string;
  participantId: string;
  encryptedRegistrationCode: string | null;
  csrfTokenHash: string | null;
  expiresAt: Date;
} | null> {
  const result = await query<{
    event_registration_id: string;
    participant_id: string;
    encrypted_registration_code: string | null;
    csrf_token_hash: string | null;
    expires_at: Date;
  }>(
    `
      UPDATE participant_access_sessions
      SET last_seen_at = now()
      WHERE session_token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > now()
      RETURNING
        event_registration_id,
        participant_id,
        encrypted_registration_code,
        csrf_token_hash,
        expires_at
    `,
    [sessionTokenHash],
    client,
  );

  const row = result.rows[0];
  return row
    ? {
        eventRegistrationId: row.event_registration_id,
        participantId: row.participant_id,
        encryptedRegistrationCode: row.encrypted_registration_code,
        csrfTokenHash: row.csrf_token_hash,
        expiresAt: row.expires_at,
      }
    : null;
}

export async function findLatestEncryptedRegistrationCode(
  registrationId: string,
  client?: PoolClient,
): Promise<string | null> {
  const result = await query<{ encrypted_registration_code: string }>(
    `
      SELECT encrypted_registration_code
      FROM participant_access_sessions
      WHERE event_registration_id = $1
        AND encrypted_registration_code IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [registrationId],
    client,
  );

  return result.rows[0]?.encrypted_registration_code ?? null;
}

export async function findRegistrationForAccess(
  input: { codeLookup: string; codeHash: string; normalizedEmail: string; eventSlug: string },
  client?: PoolClient,
): Promise<EventRegistrationRecord | null> {
  const result = await query<RegistrationRow>(
    `
      SELECT ${registrationColumns("er")}
      FROM event_registrations er
      JOIN participants p ON p.id = er.participant_id
      JOIN events e ON e.id = er.event_id
      WHERE er.registration_code_lookup = $1
        AND er.registration_code_hash = $2
        AND p.normalized_email = $3
        AND e.slug = $4
        AND er.registration_status = 'ACTIVE'
      LIMIT 1
    `,
    [input.codeLookup, input.codeHash, input.normalizedEmail, input.eventSlug],
    client,
  );

  return result.rows[0] ? mapRegistration(result.rows[0]) : null;
}

async function getCategoriesForRegistration(
  registrationId: string,
  client?: PoolClient,
): Promise<EventCategoryRecord[]> {
  const result = await query<CategoryRow>(
    `
      SELECT
        ec.id,
        ec.event_id,
        ec.name,
        ec.slug,
        ec.description,
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
        ec.price_amount_cents,
        ec.price_currency,
        ec.created_at,
        ec.updated_at
      FROM registration_categories rc
      JOIN event_categories ec ON ec.id = rc.event_category_id
      WHERE rc.event_registration_id = $1
        AND rc.registration_status = 'ACTIVE'
      ORDER BY ec.display_order ASC, ec.name ASC
    `,
    [registrationId],
    client,
  );

  return result.rows.map(mapCategory);
}

export async function getRegistrationSummary(
  registrationId: string,
  client?: PoolClient,
): Promise<RegistrationSummary | null> {
  const result = await query<
    RegistrationRow &
      ParticipantSummaryRow &
      EventSummaryRow & {
        bib_object_key: string | null;
        template_version_id: string | null;
      }
  >(
    `
      SELECT
        ${registrationColumns("er")},
        p.id AS participant_id,
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
        p.status,
        p.deleted_at,
        p.created_at AS participant_created_at,
        p.updated_at AS participant_updated_at,
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
        e.allow_same_activity_across_categories,
        e.timezone,
        e.event_status,
        e.publication_status,
        e.banner_object_key,
        e.thumbnail_object_key,
        e.registration_mode,
        e.price_amount_cents,
        e.price_currency,
        e.maximum_participants,
        e.contact_email,
        e.contact_phone,
        e.contact_whatsapp,
        e.brand_primary_color,
        e.faq_items,
        e.created_at AS event_created_at,
        e.updated_at AS event_updated_at,
        bd.object_key AS bib_object_key,
        bd.template_version_id::text AS template_version_id
      FROM event_registrations er
      JOIN participants p ON p.id = er.participant_id
      JOIN events e ON e.id = er.event_id
      LEFT JOIN bib_documents bd ON bd.id = er.bib_document_id
      WHERE er.id = $1
      LIMIT 1
    `,
    [registrationId],
    client,
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    event: mapEvent(row),
    participant: mapParticipant(row),
    registration: mapRegistration(row),
    categories: await getCategoriesForRegistration(registrationId, client),
    bibObjectKey: row.bib_object_key,
    templateVersionId: row.template_version_id,
  };
}

export async function listRegistrationsForAdmin(
  eventId: string,
  filters: RegistrationListFilters,
  client?: PoolClient,
): Promise<RegistrationListItem[]> {
  const values: unknown[] = [eventId];
  const conditions = ["er.event_id = $1"];

  if (filters.search) {
    values.push(filters.search);
    conditions.push(
      `(p.full_name ILIKE '%' || $${values.length} || '%' OR er.bib_number ILIKE '%' || $${values.length} || '%' OR er.registration_code_lookup = $${values.length})`,
    );
  }

  if (filters.categoryId) {
    values.push(filters.categoryId);
    conditions.push(`EXISTS (
      SELECT 1
      FROM registration_categories rc_filter
      WHERE rc_filter.event_registration_id = er.id
        AND rc_filter.event_category_id = $${values.length}
        AND rc_filter.registration_status = 'ACTIVE'
    )`);
  }

  if (filters.registrationStatus) {
    values.push(filters.registrationStatus);
    conditions.push(`er.registration_status = $${values.length}`);
  }

  if (filters.bibStatus) {
    values.push(filters.bibStatus);
    conditions.push(`er.bib_status = $${values.length}`);
  }

  const sortSql =
    {
      registered_desc: "er.registered_at DESC, er.created_at DESC",
      registered_asc: "er.registered_at ASC, er.created_at ASC",
      bib_asc: "er.bib_sequence ASC",
      name_asc: "p.full_name ASC, er.registered_at DESC",
    }[filters.sort ?? "registered_desc"] ?? "er.registered_at DESC, er.created_at DESC";
  const page = Math.max(1, filters.page ?? 1);
  values.push((page - 1) * 25);

  const result = await query<
    RegistrationRow & ParticipantSummaryRow & { category_names: string[]; category_ids: string[] }
  >(
    `
      SELECT
        ${registrationColumns("er")},
        p.id AS participant_id,
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
        p.status,
        p.deleted_at,
        p.created_at AS participant_created_at,
        p.updated_at AS participant_updated_at,
        COALESCE(array_agg(ec.name ORDER BY ec.display_order, ec.name), ARRAY[]::text[]) AS category_names,
        COALESCE(array_agg(ec.id::text ORDER BY ec.display_order, ec.name), ARRAY[]::text[]) AS category_ids
      FROM event_registrations er
      JOIN participants p ON p.id = er.participant_id
      LEFT JOIN registration_categories rc ON rc.event_registration_id = er.id
        AND rc.registration_status = 'ACTIVE'
      LEFT JOIN event_categories ec ON ec.id = rc.event_category_id
      WHERE ${conditions.join(" AND ")}
      GROUP BY er.id, p.id
      ORDER BY ${sortSql}
      LIMIT 25 OFFSET $${values.length}
    `,
    values,
    client,
  );

  return result.rows.map((row) => ({
    registration: mapRegistration(row),
    participant: mapParticipant(row),
    categories: row.category_ids.map((categoryId, index) => ({
      id: categoryId,
      eventId,
      name: row.category_names[index] ?? "",
      slug: "",
      description: null,
      distanceMeters: 0,
      distanceToleranceMeters: 0,
      minimumAgeYears: null,
      maximumAgeYears: null,
      genderDivision: null,
      participantQuota: null,
      rankingEnabled: false,
      certificateEnabled: false,
      displayOrder: index,
      isActive: true,
      priceAmountCents: 0,
      priceCurrency: "IDR",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  }));
}

export async function listGlobalParticipantsForAdmin(
  scope: GlobalParticipantAdminScope,
  filters: GlobalParticipantListFilters,
  client?: PoolClient,
): Promise<{ items: GlobalParticipantListItem[]; totalItems: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 10));
  const values: unknown[] = [scope.adminId, scope.isSuperAdmin];
  const conditions = [manageableEventCondition()];
  const outerConditions: string[] = [];

  addGlobalParticipantFilters(values, conditions, filters);

  if (filters.status) {
    values.push(filters.status);
    outerConditions.push(`gp.list_status = $${values.length}`);
  }

  values.push(pageSize);
  const limitIndex = values.length;
  values.push((page - 1) * pageSize);
  const offsetIndex = values.length;

  const result = await query<GlobalParticipantRow>(
    `
      WITH registration_rollup AS (
        SELECT
          er.id AS registration_id,
          p.id AS participant_id,
          p.full_name AS participant_name,
          p.display_email AS participant_email,
          e.id AS event_id,
          e.name AS event_name,
          er.bib_number,
          COALESCE(
            array_agg(DISTINCT ec.name ORDER BY ec.name) FILTER (WHERE ec.id IS NOT NULL),
            ARRAY[]::text[]
          ) AS category_names,
          er.registered_at,
          er.registration_status,
          er.bib_status,
          er.email_status,
          count(DISTINCT rc.id)::integer AS total_category_count,
          (count(DISTINCT s.registration_category_id) FILTER (
            WHERE s.id IS NOT NULL
              AND (s.current_revision_id IS NOT NULL OR s.revision_count > 0)
          ))::integer AS submitted_category_count
        FROM event_registrations er
        JOIN participants p ON p.id = er.participant_id
        JOIN events e ON e.id = er.event_id
        LEFT JOIN registration_categories rc ON rc.event_registration_id = er.id
          AND rc.registration_status = 'ACTIVE'
        LEFT JOIN event_categories ec ON ec.id = rc.event_category_id
        LEFT JOIN submissions s ON s.registration_category_id = rc.id
        WHERE ${conditions.join(" AND ")}
          AND p.deleted_at IS NULL
        GROUP BY er.id, p.id, e.id
      ),
      participant_rows AS (
        SELECT
          registration_id,
          participant_id,
          participant_name,
          participant_email,
          event_id,
          event_name,
          bib_number,
          category_names,
          registered_at,
          registration_status,
          bib_status,
          email_status,
          submitted_category_count,
          total_category_count,
          CASE
            WHEN registration_status = 'CANCELLED' THEN 'CANCELLED'
            WHEN total_category_count > submitted_category_count THEN 'PENDING_UPLOAD'
            WHEN email_status = 'SENT' OR bib_status = 'READY' THEN 'VERIFIED'
            ELSE 'ACTIVE'
          END AS list_status
        FROM registration_rollup
      )
      SELECT
        gp.registration_id,
        gp.participant_id,
        gp.participant_name,
        gp.participant_email,
        gp.event_id,
        gp.event_name,
        gp.bib_number,
        gp.category_names,
        gp.registered_at,
        gp.registration_status,
        gp.bib_status,
        gp.email_status,
        gp.submitted_category_count,
        gp.total_category_count,
        gp.list_status,
        count(gp.registration_id) OVER()::integer AS total_items
      FROM participant_rows gp
      ${outerConditions.length > 0 ? `WHERE ${outerConditions.join(" AND ")}` : ""}
      ORDER BY gp.registered_at DESC, gp.registration_id DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `,
    values,
    client,
  );

  return {
    items: result.rows.map(mapGlobalParticipant),
    totalItems: result.rows[0]?.total_items ?? 0,
  };
}

export async function getGlobalParticipantStatsForAdmin(
  scope: GlobalParticipantAdminScope,
  client?: PoolClient,
): Promise<GlobalParticipantStats> {
  const result = await query<{
    total_participants: number;
    verified_email_count: number;
    pending_upload_count: number;
    new_this_month_count: number;
  }>(
    `
      SELECT
        (count(DISTINCT p.id) FILTER (
          WHERE er.registration_status = 'ACTIVE'
        ))::integer AS total_participants,
        (count(DISTINCT er.id) FILTER (
          WHERE er.registration_status = 'ACTIVE'
            AND er.email_status = 'SENT'
        ))::integer AS verified_email_count,
        (count(DISTINCT er.id) FILTER (
          WHERE er.registration_status = 'ACTIVE'
            AND EXISTS (
              SELECT 1
              FROM registration_categories rc_pending
              LEFT JOIN submissions s_pending ON s_pending.registration_category_id = rc_pending.id
              WHERE rc_pending.event_registration_id = er.id
                AND rc_pending.registration_status = 'ACTIVE'
                AND (
                  s_pending.id IS NULL
                  OR (s_pending.current_revision_id IS NULL AND s_pending.revision_count = 0)
                )
            )
        ))::integer AS pending_upload_count,
        (count(DISTINCT p.id) FILTER (
          WHERE er.registration_status = 'ACTIVE'
            AND er.registered_at >= (
              date_trunc('month', timezone('Asia/Jakarta', now())) AT TIME ZONE 'Asia/Jakarta'
            )
        ))::integer AS new_this_month_count
      FROM event_registrations er
      JOIN participants p ON p.id = er.participant_id
      JOIN events e ON e.id = er.event_id
      WHERE ${manageableEventCondition()}
        AND p.deleted_at IS NULL
    `,
    [scope.adminId, scope.isSuperAdmin],
    client,
  );
  const row = result.rows[0];

  return {
    totalParticipants: row?.total_participants ?? 0,
    verifiedEmailCount: row?.verified_email_count ?? 0,
    pendingUploadCount: row?.pending_upload_count ?? 0,
    newThisMonthCount: row?.new_this_month_count ?? 0,
  };
}

export async function listLatestGlobalParticipantsForAdmin(
  scope: GlobalParticipantAdminScope,
  client?: PoolClient,
): Promise<GlobalParticipantListItem[]> {
  const result = await listGlobalParticipantsForAdmin(scope, { page: 1, pageSize: 5 }, client);

  return result.items;
}

export async function listGlobalParticipantTopEventsForAdmin(
  scope: GlobalParticipantAdminScope,
  client?: PoolClient,
): Promise<GlobalParticipantTopEvent[]> {
  const result = await query<{
    event_id: string;
    event_name: string;
    registration_count: number;
    category_names: string[] | null;
  }>(
    `
      SELECT
        e.id AS event_id,
        e.name AS event_name,
        count(DISTINCT er.id)::integer AS registration_count,
        COALESCE(
          array_agg(DISTINCT ec.name ORDER BY ec.name) FILTER (WHERE ec.id IS NOT NULL),
          ARRAY[]::text[]
        ) AS category_names
      FROM events e
      JOIN event_registrations er ON er.event_id = e.id
        AND er.registration_status = 'ACTIVE'
      LEFT JOIN registration_categories rc ON rc.event_registration_id = er.id
        AND rc.registration_status = 'ACTIVE'
      LEFT JOIN event_categories ec ON ec.id = rc.event_category_id
      WHERE ${manageableEventCondition()}
      GROUP BY e.id
      ORDER BY registration_count DESC, e.name ASC
      LIMIT 5
    `,
    [scope.adminId, scope.isSuperAdmin],
    client,
  );

  return result.rows.map((row) => ({
    eventId: row.event_id,
    eventName: row.event_name,
    registrationCount: row.registration_count,
    categories: Array.isArray(row.category_names) ? row.category_names : [],
  }));
}

export async function listGlobalParticipantRecentActivitiesForAdmin(
  scope: GlobalParticipantAdminScope,
  client?: PoolClient,
): Promise<GlobalParticipantRecentActivity[]> {
  const result = await query<{
    id: string;
    participant_name: string;
    event_name: string;
    action: GlobalParticipantRecentActivity["action"];
    created_at: Date;
  }>(
    `
      WITH manageable_events AS (
        SELECT e.id
        FROM events e
        WHERE ${manageableEventCondition()}
      )
      SELECT
        'registration:' || er.id::text AS id,
        p.full_name AS participant_name,
        e.name AS event_name,
        'REGISTERED'::text AS action,
        er.registered_at AS created_at
      FROM event_registrations er
      JOIN manageable_events me ON me.id = er.event_id
      JOIN participants p ON p.id = er.participant_id
      JOIN events e ON e.id = er.event_id
      WHERE er.registration_status = 'ACTIVE'
        AND p.deleted_at IS NULL
      UNION ALL
      SELECT
        'submission:' || s.id::text AS id,
        p.full_name AS participant_name,
        e.name AS event_name,
        'SUBMITTED'::text AS action,
        COALESCE(s.last_submitted_at, s.created_at) AS created_at
      FROM submissions s
      JOIN registration_categories rc ON rc.id = s.registration_category_id
      JOIN event_registrations er ON er.id = rc.event_registration_id
      JOIN manageable_events me ON me.id = er.event_id
      JOIN participants p ON p.id = er.participant_id
      JOIN events e ON e.id = er.event_id
      WHERE er.registration_status = 'ACTIVE'
        AND p.deleted_at IS NULL
        AND (s.current_revision_id IS NOT NULL OR s.revision_count > 0)
      ORDER BY created_at DESC
      LIMIT 6
    `,
    [scope.adminId, scope.isSuperAdmin],
    client,
  );

  return result.rows.map((row) => ({
    id: row.id,
    participantName: row.participant_name,
    eventName: row.event_name,
    action: row.action,
    createdAt: row.created_at,
  }));
}

export async function listGlobalParticipantFilterOptionsForAdmin(
  scope: GlobalParticipantAdminScope,
  client?: PoolClient,
): Promise<GlobalParticipantFilterOptions> {
  const [events, categories] = await Promise.all([
    query<GlobalParticipantFilterRow>(
      `
        SELECT e.id, e.name
        FROM events e
        WHERE ${manageableEventCondition()}
        ORDER BY e.name ASC
      `,
      [scope.adminId, scope.isSuperAdmin],
      client,
    ),
    query<GlobalParticipantFilterRow>(
      `
        SELECT ec.id, ec.event_id, ec.name
        FROM event_categories ec
        JOIN events e ON e.id = ec.event_id
        WHERE ${manageableEventCondition()}
          AND ec.is_active = true
        ORDER BY e.name ASC, ec.display_order ASC, ec.name ASC
      `,
      [scope.adminId, scope.isSuperAdmin],
      client,
    ),
  ]);

  return {
    events: events.rows.map((row) => ({ id: row.id, name: row.name })),
    categories: categories.rows.map((row) => ({
      id: row.id,
      eventId: row.event_id ?? "",
      name: row.name,
    })),
  };
}

export async function updateRegistrationBibStatus(
  input: {
    registrationId: string;
    bibStatus: BibStatus;
    bibDocumentId?: string | null;
    bibError?: string | null;
  },
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE event_registrations
      SET
        bib_status = $2,
        bib_document_id = COALESCE($3, bib_document_id),
        bib_error = $4,
        updated_at = now()
      WHERE id = $1
    `,
    [input.registrationId, input.bibStatus, input.bibDocumentId ?? null, input.bibError ?? null],
    client,
  );
}

export async function updateRegistrationEmailStatus(
  input: { registrationId: string; emailStatus: EmailStatus },
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE event_registrations
      SET email_status = $2, updated_at = now()
      WHERE id = $1
    `,
    [input.registrationId, input.emailStatus],
    client,
  );
}

export async function countRecentSecurityAttempts(
  input: {
    eventId: string | null;
    attemptType:
      "REGISTRATION_SUBMIT" | "PARTICIPANT_ACCESS" | "SUBMIT_REVISION" | "EVIDENCE_DOWNLOAD";
    identifierHash: string;
    since: Date;
  },
  client?: PoolClient,
): Promise<number> {
  const result = await query<{ attempt_count: number }>(
    `
      SELECT count(id)::integer AS attempt_count
      FROM registration_security_attempts
      WHERE ($1::uuid IS NULL OR event_id = $1)
        AND attempt_type = $2
        AND identifier_hash = $3
        AND created_at >= $4
    `,
    [input.eventId, input.attemptType, input.identifierHash, input.since],
    client,
  );

  return result.rows[0]?.attempt_count ?? 0;
}

export async function recordSecurityAttempt(
  input: {
    eventId: string | null;
    attemptType:
      "REGISTRATION_SUBMIT" | "PARTICIPANT_ACCESS" | "SUBMIT_REVISION" | "EVIDENCE_DOWNLOAD";
    identifierHash: string;
    ipAddress: string | null;
    success: boolean;
  },
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      INSERT INTO registration_security_attempts (
        event_id,
        attempt_type,
        identifier_hash,
        ip_address,
        success
      )
      VALUES ($1, $2, $3, $4::inet, $5)
    `,
    [input.eventId, input.attemptType, input.identifierHash, input.ipAddress, input.success],
    client,
  );
}
