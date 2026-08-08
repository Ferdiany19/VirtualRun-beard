import type { PoolClient } from 'pg';
import { query } from '@/db/pool';
import type { AuthenticatedAdmin } from '@/modules/auth/auth.types';
import type {
  EventDashboardCounts,
  EventFaqItem,
  EventInput,
  EventListFilter,
  EventParticipantBenefit,
  EventRecord,
  PublicationStatus,
} from '@/modules/events/event.types';

type EventRow = {
  id: string;
  name: string;
  slug: string;
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
  publication_status: PublicationStatus;
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
  faq_items: EventFaqItem[];
  seo_title: string | null;
  seo_description: string | null;
  seo_index_enabled: boolean;
  public_visibility_enabled: boolean;
  participant_benefits: EventParticipantBenefit[];
  created_by_admin_user_id: string | null;
  updated_by_admin_user_id: string | null;
  assigned_admin_user_ids: string[];
  created_at: Date;
  updated_at: Date;
};

function eventColumnSelection() {
  return `
    e.id,
    e.name,
    e.slug,
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
    e.seo_title,
    e.seo_description,
    e.seo_index_enabled,
    e.public_visibility_enabled,
    e.participant_benefits,
    e.created_by_admin_user_id,
    e.updated_by_admin_user_id,
    COALESCE(
      array_agg(aea.admin_user_id ORDER BY aea.admin_user_id)
        FILTER (WHERE aea.admin_user_id IS NOT NULL),
      ARRAY[]::uuid[]
    )::text[] AS assigned_admin_user_ids,
    e.created_at,
    e.updated_at
  `;
}

function eventGroupBySelection() {
  return `
    e.id,
    e.name,
    e.slug,
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
    e.seo_title,
    e.seo_description,
    e.seo_index_enabled,
    e.public_visibility_enabled,
    e.participant_benefits,
    e.created_by_admin_user_id,
    e.updated_by_admin_user_id,
    e.created_at,
    e.updated_at
  `;
}

function mapEvent(row: EventRow): EventRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
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
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    seoIndexEnabled: row.seo_index_enabled,
    publicVisibilityEnabled: row.public_visibility_enabled,
    participantBenefits: row.participant_benefits ?? [],
    createdByAdminUserId: row.created_by_admin_user_id,
    updatedByAdminUserId: row.updated_by_admin_user_id,
    assignedAdminUserIds: row.assigned_admin_user_ids,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function applyAdminVisibilityCondition(
  admin: Pick<AuthenticatedAdmin, 'id' | 'roles'>,
  values: unknown[],
): string | null {
  if (admin.roles.includes('SUPER_ADMIN')) {
    return null;
  }

  if (admin.roles.includes('EVENT_ADMIN')) {
    values.push(admin.id);
    return `
      (
        e.created_by_admin_user_id = $${values.length}
        OR EXISTS (
          SELECT 1
          FROM admin_event_assignments aea_filter
          WHERE aea_filter.event_id = e.id
            AND aea_filter.admin_user_id = $${values.length}
        )
      )
    `;
  }

  return 'false';
}

export async function listEventsForAdmin(
  admin: Pick<AuthenticatedAdmin, 'id' | 'roles'>,
  filters: EventListFilter,
  client?: PoolClient,
): Promise<EventRecord[]> {
  const values: unknown[] = [];
  const conditions: string[] = [];
  const visibilityCondition = applyAdminVisibilityCondition(admin, values);

  if (visibilityCondition) {
    conditions.push(visibilityCondition);
  }

  if (filters.search) {
    values.push(filters.search);
    conditions.push(`e.name ILIKE '%' || $${values.length} || '%'`);
  }

  if (filters.eventStatus) {
    values.push(filters.eventStatus);
    conditions.push(`e.event_status = $${values.length}`);
  }

  if (filters.publicationStatus) {
    values.push(filters.publicationStatus);
    conditions.push(`e.publication_status = $${values.length}`);
  }

  if (filters.period === 'UPCOMING') {
    conditions.push('e.activity_starts_at > now()');
  } else if (filters.period === 'ONGOING') {
    conditions.push(
      'e.activity_starts_at <= now() AND e.activity_ends_at >= now()',
    );
  } else if (filters.period === 'PAST') {
    conditions.push('e.activity_ends_at < now()');
  }

  const whereSql =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 100;
  values.push(pageSize);
  const limitParameter = `$${values.length}`;
  values.push((page - 1) * pageSize);
  const offsetParameter = `$${values.length}`;

  const result = await query<EventRow>(
    `
      SELECT
        ${eventColumnSelection()}
      FROM events e
      LEFT JOIN admin_event_assignments aea ON aea.event_id = e.id
      ${whereSql}
      GROUP BY ${eventGroupBySelection()}
      ORDER BY e.updated_at DESC, e.created_at DESC
      LIMIT ${limitParameter}
      OFFSET ${offsetParameter}
    `,
    values,
    client,
  );

  return result.rows.map(mapEvent);
}

export async function countFilteredEventsForAdmin(
  admin: Pick<AuthenticatedAdmin, 'id' | 'roles'>,
  filters: EventListFilter,
  client?: PoolClient,
): Promise<number> {
  const values: unknown[] = [];
  const conditions: string[] = [];
  const visibilityCondition = applyAdminVisibilityCondition(admin, values);

  if (visibilityCondition) {
    conditions.push(visibilityCondition);
  }

  if (filters.search) {
    values.push(filters.search);
    conditions.push(`e.name ILIKE '%' || $${values.length} || '%'`);
  }

  if (filters.eventStatus) {
    values.push(filters.eventStatus);
    conditions.push(`e.event_status = $${values.length}`);
  }

  if (filters.publicationStatus) {
    values.push(filters.publicationStatus);
    conditions.push(`e.publication_status = $${values.length}`);
  }

  if (filters.period === 'UPCOMING') {
    conditions.push('e.activity_starts_at > now()');
  } else if (filters.period === 'ONGOING') {
    conditions.push(
      'e.activity_starts_at <= now() AND e.activity_ends_at >= now()',
    );
  } else if (filters.period === 'PAST') {
    conditions.push('e.activity_ends_at < now()');
  }

  const whereSql =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query<{ event_count: number }>(
    `
      SELECT count(e.id)::integer AS event_count
      FROM events e
      ${whereSql}
    `,
    values,
    client,
  );

  return result.rows[0]?.event_count ?? 0;
}

export async function getEventByIdForAdmin(
  eventId: string,
  admin: Pick<AuthenticatedAdmin, 'id' | 'roles'>,
  client?: PoolClient,
): Promise<EventRecord | null> {
  const values: unknown[] = [eventId];
  const conditions = ['e.id = $1'];
  const visibilityCondition = applyAdminVisibilityCondition(admin, values);

  if (visibilityCondition) {
    conditions.push(visibilityCondition);
  }

  const result = await query<EventRow>(
    `
      SELECT
        ${eventColumnSelection()}
      FROM events e
      LEFT JOIN admin_event_assignments aea ON aea.event_id = e.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY ${eventGroupBySelection()}
      LIMIT 1
    `,
    values,
    client,
  );

  return result.rows[0] ? mapEvent(result.rows[0]) : null;
}

export async function getEventById(
  eventId: string,
  client?: PoolClient,
): Promise<EventRecord | null> {
  const result = await query<EventRow>(
    `
      SELECT
        ${eventColumnSelection()}
      FROM events e
      LEFT JOIN admin_event_assignments aea ON aea.event_id = e.id
      WHERE e.id = $1
      GROUP BY ${eventGroupBySelection()}
      LIMIT 1
    `,
    [eventId],
    client,
  );

  return result.rows[0] ? mapEvent(result.rows[0]) : null;
}

export async function listPublishedEvents(
  client?: PoolClient,
): Promise<EventRecord[]> {
  const result = await query<EventRow>(
    `
      SELECT
        ${eventColumnSelection()}
      FROM events e
      LEFT JOIN admin_event_assignments aea ON aea.event_id = e.id
      WHERE e.publication_status = 'PUBLISHED'
        AND e.event_status <> 'ARCHIVED'
      GROUP BY ${eventGroupBySelection()}
      ORDER BY e.activity_starts_at ASC, e.created_at DESC
      LIMIT 20
    `,
    [],
    client,
  );

  return result.rows.map(mapEvent);
}

export async function getPublishedEventBySlug(
  slug: string,
  client?: PoolClient,
): Promise<EventRecord | null> {
  const result = await query<EventRow>(
    `
      SELECT
        ${eventColumnSelection()}
      FROM events e
      LEFT JOIN admin_event_assignments aea ON aea.event_id = e.id
      WHERE e.slug = $1
        AND e.publication_status = 'PUBLISHED'
        AND e.event_status <> 'ARCHIVED'
      GROUP BY ${eventGroupBySelection()}
      LIMIT 1
    `,
    [slug],
    client,
  );

  return result.rows[0] ? mapEvent(result.rows[0]) : null;
}

export async function createEvent(
  input: EventInput,
  adminUserId: string,
  client?: PoolClient,
): Promise<EventRecord> {
  const result = await query<EventRow>(
    `
      INSERT INTO events (
        name,
        slug,
        short_description,
        full_description,
        terms_and_conditions,
        registration_instructions,
        upload_instructions,
        registration_starts_at,
        registration_ends_at,
        activity_starts_at,
        activity_ends_at,
        upload_starts_at,
        upload_ends_at,
        timezone,
        event_status,
        publication_status,
        banner_object_key,
        thumbnail_object_key,
        registration_mode,
        price_amount_cents,
        price_currency,
        maximum_participants,
        allow_same_activity_across_categories,
        contact_email,
        contact_phone,
        contact_whatsapp,
        brand_primary_color,
        faq_items,
        seo_title,
        seo_description,
        seo_index_enabled,
        public_visibility_enabled,
        participant_benefits,
        created_by_admin_user_id,
        updated_by_admin_user_id
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        'Asia/Jakarta',
        'DRAFT',
        'DRAFT',
        $14,
        $15,
        'FREE',
        0,
        'IDR',
        $16,
        false,
        $17,
        $18,
        $19,
        $20,
        $21::jsonb,
        $22,
        $23,
        $24,
        $25,
        $26::jsonb,
        $27,
        $27
      )
      RETURNING
        id,
        name,
        slug,
        short_description,
        full_description,
        terms_and_conditions,
        registration_instructions,
        upload_instructions,
        registration_starts_at,
        registration_ends_at,
        activity_starts_at,
        activity_ends_at,
        upload_starts_at,
        upload_ends_at,
        timezone,
        event_status,
        publication_status,
        banner_object_key,
        thumbnail_object_key,
        registration_mode,
        price_amount_cents,
        price_currency,
        maximum_participants,
        allow_same_activity_across_categories,
        contact_email,
        contact_phone,
        contact_whatsapp,
        brand_primary_color,
        faq_items,
        seo_title,
        seo_description,
        seo_index_enabled,
        public_visibility_enabled,
        participant_benefits,
        created_by_admin_user_id,
        updated_by_admin_user_id,
        ARRAY[]::text[] AS assigned_admin_user_ids,
        created_at,
        updated_at
    `,
    [
      input.name,
      input.slug,
      input.shortDescription,
      input.fullDescription,
      input.termsAndConditions,
      input.registrationInstructions,
      input.uploadInstructions,
      input.registrationStartsAt,
      input.registrationEndsAt,
      input.activityStartsAt,
      input.activityEndsAt,
      input.uploadStartsAt,
      input.uploadEndsAt,
      input.bannerObjectKey,
      input.thumbnailObjectKey,
      input.maximumParticipants,
      input.contactEmail,
      input.contactPhone,
      input.contactWhatsapp,
      input.brandPrimaryColor,
      JSON.stringify(input.faqItems),
      input.seoTitle,
      input.seoDescription,
      input.seoIndexEnabled,
      input.publicVisibilityEnabled,
      JSON.stringify(input.participantBenefits),
      adminUserId,
    ],
    client,
  );

  return mapEvent(result.rows[0]);
}

export async function updateEvent(
  eventId: string,
  input: EventInput,
  adminUserId: string,
  client?: PoolClient,
): Promise<EventRecord> {
  const result = await query<EventRow>(
    `
      UPDATE events
      SET
        name = $2,
        slug = $3,
        short_description = $4,
        full_description = $5,
        terms_and_conditions = $6,
        registration_instructions = $7,
        upload_instructions = $8,
        registration_starts_at = $9,
        registration_ends_at = $10,
        activity_starts_at = $11,
        activity_ends_at = $12,
        upload_starts_at = $13,
        upload_ends_at = $14,
        banner_object_key = $15,
        thumbnail_object_key = $16,
        maximum_participants = $17,
        contact_email = $18,
        contact_phone = $19,
        contact_whatsapp = $20,
        brand_primary_color = $21,
        faq_items = $22::jsonb,
        seo_title = $23,
        seo_description = $24,
        seo_index_enabled = $25,
        public_visibility_enabled = $26,
        participant_benefits = $27::jsonb,
        updated_by_admin_user_id = $28,
        updated_at = now()
      WHERE id = $1
      RETURNING
        id,
        name,
        slug,
        short_description,
        full_description,
        terms_and_conditions,
        registration_instructions,
        upload_instructions,
        registration_starts_at,
        registration_ends_at,
        activity_starts_at,
        activity_ends_at,
        upload_starts_at,
        upload_ends_at,
        timezone,
        event_status,
        publication_status,
        banner_object_key,
        thumbnail_object_key,
        registration_mode,
        price_amount_cents,
        price_currency,
        maximum_participants,
        allow_same_activity_across_categories,
        contact_email,
        contact_phone,
        contact_whatsapp,
        brand_primary_color,
        faq_items,
        seo_title,
        seo_description,
        seo_index_enabled,
        public_visibility_enabled,
        participant_benefits,
        created_by_admin_user_id,
        updated_by_admin_user_id,
        ARRAY[]::text[] AS assigned_admin_user_ids,
        created_at,
        updated_at
    `,
    [
      eventId,
      input.name,
      input.slug,
      input.shortDescription,
      input.fullDescription,
      input.termsAndConditions,
      input.registrationInstructions,
      input.uploadInstructions,
      input.registrationStartsAt,
      input.registrationEndsAt,
      input.activityStartsAt,
      input.activityEndsAt,
      input.uploadStartsAt,
      input.uploadEndsAt,
      input.bannerObjectKey,
      input.thumbnailObjectKey,
      input.maximumParticipants,
      input.contactEmail,
      input.contactPhone,
      input.contactWhatsapp,
      input.brandPrimaryColor,
      JSON.stringify(input.faqItems),
      input.seoTitle,
      input.seoDescription,
      input.seoIndexEnabled,
      input.publicVisibilityEnabled,
      JSON.stringify(input.participantBenefits),
      adminUserId,
    ],
    client,
  );

  return mapEvent({ ...result.rows[0], assigned_admin_user_ids: [] });
}

export async function setEventPublicationAndStatus(
  eventId: string,
  publicationStatus: PublicationStatus,
  eventStatus: EventRecord['eventStatus'] | null,
  adminUserId: string,
  client?: PoolClient,
): Promise<EventRecord> {
  const result = await query<EventRow>(
    `
      UPDATE events
      SET
        publication_status = $2,
        event_status = COALESCE($3, event_status),
        updated_by_admin_user_id = $4,
        updated_at = now()
      WHERE id = $1
      RETURNING
        id,
        name,
        slug,
        short_description,
        full_description,
        terms_and_conditions,
        registration_instructions,
        upload_instructions,
        registration_starts_at,
        registration_ends_at,
        activity_starts_at,
        activity_ends_at,
        upload_starts_at,
        upload_ends_at,
        timezone,
        event_status,
        publication_status,
        banner_object_key,
        thumbnail_object_key,
        registration_mode,
        price_amount_cents,
        price_currency,
        maximum_participants,
        allow_same_activity_across_categories,
        contact_email,
        contact_phone,
        contact_whatsapp,
        brand_primary_color,
        faq_items,
        seo_title,
        seo_description,
        seo_index_enabled,
        public_visibility_enabled,
        participant_benefits,
        created_by_admin_user_id,
        updated_by_admin_user_id,
        ARRAY[]::text[] AS assigned_admin_user_ids,
        created_at,
        updated_at
    `,
    [eventId, publicationStatus, eventStatus, adminUserId],
    client,
  );

  return mapEvent({ ...result.rows[0], assigned_admin_user_ids: [] });
}

export async function countEventsForAdmin(
  admin: Pick<AuthenticatedAdmin, 'id' | 'roles'>,
  client?: PoolClient,
): Promise<EventDashboardCounts> {
  const values: unknown[] = [];
  const conditions: string[] = [];
  const visibilityCondition = applyAdminVisibilityCondition(admin, values);

  if (visibilityCondition) {
    conditions.push(visibilityCondition);
  }

  const whereSql =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query<{
    total_events: number;
    active_events: number;
    archived_events: number;
    draft_events: number;
    published_events: number;
    registration_open_events: number;
    upcoming_events: number;
  }>(
    `
      SELECT
        count(e.id)::integer AS total_events,
        count(e.id) FILTER (
          WHERE e.publication_status = 'PUBLISHED'
            AND e.event_status <> 'ARCHIVED'
        )::integer AS active_events,
        count(e.id) FILTER (
          WHERE e.event_status = 'ARCHIVED'
             OR e.publication_status = 'ARCHIVED'
        )::integer AS archived_events,
        count(e.id) FILTER (WHERE e.event_status = 'DRAFT')::integer AS draft_events,
        count(e.id) FILTER (WHERE e.publication_status = 'PUBLISHED')::integer AS published_events,
        count(e.id) FILTER (WHERE e.event_status = 'REGISTRATION_OPEN')::integer AS registration_open_events,
        count(e.id) FILTER (WHERE e.activity_starts_at > now())::integer AS upcoming_events
      FROM events e
      ${whereSql}
    `,
    values,
    client,
  );
  const row = result.rows[0];

  return {
    totalEvents: row.total_events,
    activeEvents: row.active_events,
    archivedEvents: row.archived_events,
    draftEvents: row.draft_events,
    publishedEvents: row.published_events,
    registrationOpenEvents: row.registration_open_events,
    upcomingEvents: row.upcoming_events,
  };
}

export async function upsertSeedEventBySlug(
  slug: string,
  input: EventInput,
  adminUserId: string,
  client?: PoolClient,
): Promise<EventRecord> {
  const result = await query<EventRow>(
    `
      INSERT INTO events (
        name,
        slug,
        short_description,
        full_description,
        terms_and_conditions,
        registration_instructions,
        upload_instructions,
        registration_starts_at,
        registration_ends_at,
        activity_starts_at,
        activity_ends_at,
        upload_starts_at,
        upload_ends_at,
        timezone,
        event_status,
        publication_status,
        banner_object_key,
        thumbnail_object_key,
        registration_mode,
        price_amount_cents,
        price_currency,
        maximum_participants,
        allow_same_activity_across_categories,
        contact_email,
        contact_phone,
        contact_whatsapp,
        brand_primary_color,
        faq_items,
        seo_title,
        seo_description,
        seo_index_enabled,
        public_visibility_enabled,
        participant_benefits,
        created_by_admin_user_id,
        updated_by_admin_user_id
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        'Asia/Jakarta',
        'SCHEDULED',
        'PUBLISHED',
        $14,
        $15,
        'FREE',
        0,
        'IDR',
        $16,
        false,
        $17,
        $18,
        $19,
        $20,
        $21::jsonb,
        $22,
        $23,
        $24,
        $25,
        $26::jsonb,
        $27,
        $27
      )
      ON CONFLICT (slug)
      DO UPDATE SET
        name = EXCLUDED.name,
        short_description = EXCLUDED.short_description,
        full_description = EXCLUDED.full_description,
        terms_and_conditions = EXCLUDED.terms_and_conditions,
        registration_instructions = EXCLUDED.registration_instructions,
        upload_instructions = EXCLUDED.upload_instructions,
        registration_starts_at = EXCLUDED.registration_starts_at,
        registration_ends_at = EXCLUDED.registration_ends_at,
        activity_starts_at = EXCLUDED.activity_starts_at,
        activity_ends_at = EXCLUDED.activity_ends_at,
        upload_starts_at = EXCLUDED.upload_starts_at,
        upload_ends_at = EXCLUDED.upload_ends_at,
        event_status = EXCLUDED.event_status,
        publication_status = EXCLUDED.publication_status,
        banner_object_key = EXCLUDED.banner_object_key,
        thumbnail_object_key = EXCLUDED.thumbnail_object_key,
        maximum_participants = EXCLUDED.maximum_participants,
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone,
        contact_whatsapp = EXCLUDED.contact_whatsapp,
        brand_primary_color = EXCLUDED.brand_primary_color,
        faq_items = EXCLUDED.faq_items,
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        seo_index_enabled = EXCLUDED.seo_index_enabled,
        public_visibility_enabled = EXCLUDED.public_visibility_enabled,
        participant_benefits = EXCLUDED.participant_benefits,
        updated_by_admin_user_id = EXCLUDED.updated_by_admin_user_id,
        updated_at = now()
      RETURNING
        id,
        name,
        slug,
        short_description,
        full_description,
        terms_and_conditions,
        registration_instructions,
        upload_instructions,
        registration_starts_at,
        registration_ends_at,
        activity_starts_at,
        activity_ends_at,
        upload_starts_at,
        upload_ends_at,
        timezone,
        event_status,
        publication_status,
        banner_object_key,
        thumbnail_object_key,
        registration_mode,
        price_amount_cents,
        price_currency,
        maximum_participants,
        allow_same_activity_across_categories,
        contact_email,
        contact_phone,
        contact_whatsapp,
        brand_primary_color,
        faq_items,
        seo_title,
        seo_description,
        seo_index_enabled,
        public_visibility_enabled,
        participant_benefits,
        created_by_admin_user_id,
        updated_by_admin_user_id,
        ARRAY[]::text[] AS assigned_admin_user_ids,
        created_at,
        updated_at
    `,
    [
      input.name,
      slug,
      input.shortDescription,
      input.fullDescription,
      input.termsAndConditions,
      input.registrationInstructions,
      input.uploadInstructions,
      input.registrationStartsAt,
      input.registrationEndsAt,
      input.activityStartsAt,
      input.activityEndsAt,
      input.uploadStartsAt,
      input.uploadEndsAt,
      input.bannerObjectKey,
      input.thumbnailObjectKey,
      input.maximumParticipants,
      input.contactEmail,
      input.contactPhone,
      input.contactWhatsapp,
      input.brandPrimaryColor,
      JSON.stringify(input.faqItems),
      input.seoTitle,
      input.seoDescription,
      input.seoIndexEnabled,
      input.publicVisibilityEnabled,
      JSON.stringify(input.participantBenefits),
      adminUserId,
    ],
    client,
  );

  return mapEvent(result.rows[0]);
}
