import type { PoolClient } from "pg";
import { query } from "@/db/pool";
import type {
  CategoryInput,
  EventCategoryRecord,
  GenderDivision,
} from "@/modules/categories/category.types";

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

function categoryColumns() {
  return `
    id,
    event_id,
    name,
    slug,
    description,
    distance_meters,
    distance_tolerance_meters,
    minimum_age_years,
    maximum_age_years,
    gender_division,
    participant_quota,
    ranking_enabled,
    certificate_enabled,
    display_order,
    is_active,
    price_amount_cents,
    price_currency,
    created_at,
    updated_at
  `;
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

export async function listCategoriesByEventId(
  eventId: string,
  client?: PoolClient,
): Promise<EventCategoryRecord[]> {
  const result = await query<CategoryRow>(
    `
      SELECT ${categoryColumns()}
      FROM event_categories
      WHERE event_id = $1
      ORDER BY display_order ASC, name ASC
    `,
    [eventId],
    client,
  );

  return result.rows.map(mapCategory);
}

export async function listActiveCategoriesByEventId(
  eventId: string,
  client?: PoolClient,
): Promise<EventCategoryRecord[]> {
  const result = await query<CategoryRow>(
    `
      SELECT ${categoryColumns()}
      FROM event_categories
      WHERE event_id = $1
        AND is_active = true
      ORDER BY display_order ASC, name ASC
    `,
    [eventId],
    client,
  );

  return result.rows.map(mapCategory);
}

export async function listActiveCategoriesByEventIds(
  eventIds: string[],
  client?: PoolClient,
): Promise<EventCategoryRecord[]> {
  if (eventIds.length === 0) {
    return [];
  }

  const result = await query<CategoryRow>(
    `
      SELECT ${categoryColumns()}
      FROM event_categories
      WHERE event_id = ANY($1::uuid[])
        AND is_active = true
      ORDER BY event_id, display_order ASC, name ASC
    `,
    [eventIds],
    client,
  );

  return result.rows.map(mapCategory);
}

export async function countActiveCategoriesByEventId(
  eventId: string,
  client?: PoolClient,
): Promise<number> {
  const result = await query<{ active_count: number }>(
    `
      SELECT count(id)::integer AS active_count
      FROM event_categories
      WHERE event_id = $1
        AND is_active = true
    `,
    [eventId],
    client,
  );

  return result.rows[0]?.active_count ?? 0;
}

export type CategoryCountByEvent = {
  eventId: string;
  categoryCount: number;
  activeCategoryCount: number;
};

export async function countCategoriesByEventIds(
  eventIds: string[],
  client?: PoolClient,
): Promise<CategoryCountByEvent[]> {
  if (eventIds.length === 0) {
    return [];
  }

  const result = await query<{
    event_id: string;
    category_count: number;
    active_category_count: number;
  }>(
    `
      SELECT
        event_id,
        count(id)::integer AS category_count,
        count(id) FILTER (WHERE is_active = true)::integer AS active_category_count
      FROM event_categories
      WHERE event_id = ANY($1::uuid[])
      GROUP BY event_id
    `,
    [eventIds],
    client,
  );

  return result.rows.map((row) => ({
    eventId: row.event_id,
    categoryCount: row.category_count,
    activeCategoryCount: row.active_category_count,
  }));
}

export async function getCategoryById(
  categoryId: string,
  client?: PoolClient,
): Promise<EventCategoryRecord | null> {
  const result = await query<CategoryRow>(
    `
      SELECT ${categoryColumns()}
      FROM event_categories
      WHERE id = $1
      LIMIT 1
    `,
    [categoryId],
    client,
  );

  return result.rows[0] ? mapCategory(result.rows[0]) : null;
}

export async function createCategory(
  eventId: string,
  input: CategoryInput,
  client?: PoolClient,
): Promise<EventCategoryRecord> {
  const result = await query<CategoryRow>(
    `
      INSERT INTO event_categories (
        event_id,
        name,
        slug,
        description,
        distance_meters,
        distance_tolerance_meters,
        minimum_age_years,
        maximum_age_years,
        gender_division,
        participant_quota,
        ranking_enabled,
        certificate_enabled,
        display_order,
        is_active,
        price_amount_cents,
        price_currency
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, 0, 'IDR')
      RETURNING ${categoryColumns()}
    `,
    [
      eventId,
      input.name,
      input.slug,
      input.description,
      input.distanceMeters,
      input.distanceToleranceMeters,
      input.minimumAgeYears,
      input.maximumAgeYears,
      input.genderDivision,
      input.participantQuota,
      input.rankingEnabled,
      input.certificateEnabled,
      input.displayOrder,
    ],
    client,
  );

  return mapCategory(result.rows[0]);
}

export async function updateCategory(
  categoryId: string,
  input: CategoryInput,
  client?: PoolClient,
): Promise<EventCategoryRecord> {
  const result = await query<CategoryRow>(
    `
      UPDATE event_categories
      SET
        name = $2,
        slug = $3,
        description = $4,
        distance_meters = $5,
        distance_tolerance_meters = $6,
        minimum_age_years = $7,
        maximum_age_years = $8,
        gender_division = $9,
        participant_quota = $10,
        ranking_enabled = $11,
        certificate_enabled = $12,
        display_order = $13,
        updated_at = now()
      WHERE id = $1
      RETURNING ${categoryColumns()}
    `,
    [
      categoryId,
      input.name,
      input.slug,
      input.description,
      input.distanceMeters,
      input.distanceToleranceMeters,
      input.minimumAgeYears,
      input.maximumAgeYears,
      input.genderDivision,
      input.participantQuota,
      input.rankingEnabled,
      input.certificateEnabled,
      input.displayOrder,
    ],
    client,
  );

  return mapCategory(result.rows[0]);
}

export async function setCategoryActiveStatus(
  categoryId: string,
  isActive: boolean,
  client?: PoolClient,
): Promise<EventCategoryRecord> {
  const result = await query<CategoryRow>(
    `
      UPDATE event_categories
      SET
        is_active = $2,
        updated_at = now()
      WHERE id = $1
      RETURNING ${categoryColumns()}
    `,
    [categoryId, isActive],
    client,
  );

  return mapCategory(result.rows[0]);
}

export async function upsertSeedCategory(
  eventId: string,
  input: CategoryInput,
  client?: PoolClient,
): Promise<EventCategoryRecord> {
  const result = await query<CategoryRow>(
    `
      INSERT INTO event_categories (
        event_id,
        name,
        slug,
        description,
        distance_meters,
        distance_tolerance_meters,
        minimum_age_years,
        maximum_age_years,
        gender_division,
        participant_quota,
        ranking_enabled,
        certificate_enabled,
        display_order,
        is_active,
        price_amount_cents,
        price_currency
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, 0, 'IDR')
      ON CONFLICT (event_id, slug)
      DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        distance_meters = EXCLUDED.distance_meters,
        distance_tolerance_meters = EXCLUDED.distance_tolerance_meters,
        minimum_age_years = EXCLUDED.minimum_age_years,
        maximum_age_years = EXCLUDED.maximum_age_years,
        gender_division = EXCLUDED.gender_division,
        participant_quota = EXCLUDED.participant_quota,
        ranking_enabled = EXCLUDED.ranking_enabled,
        certificate_enabled = EXCLUDED.certificate_enabled,
        display_order = EXCLUDED.display_order,
        is_active = true,
        updated_at = now()
      RETURNING ${categoryColumns()}
    `,
    [
      eventId,
      input.name,
      input.slug,
      input.description,
      input.distanceMeters,
      input.distanceToleranceMeters,
      input.minimumAgeYears,
      input.maximumAgeYears,
      input.genderDivision,
      input.participantQuota,
      input.rankingEnabled,
      input.certificateEnabled,
      input.displayOrder,
    ],
    client,
  );

  return mapCategory(result.rows[0]);
}
