import type { PoolClient } from 'pg';
import { query } from '@/db/pool';
import type {
  BibFontFamily,
  BibTemplateDashboardData,
  BibTemplateDetailData,
  BibTemplateListFilters,
  BibTemplateListItem,
  BibGenerationData,
  BibSettings,
  BibTemplateSampleParticipant,
  BibTemplateStatus,
  BibTemplateVersion,
  BibTextAlignment,
} from '@/modules/bib/bib.types';
import type { AuthenticatedAdmin } from '@/modules/auth/auth.types';

type BibSettingsRow = {
  event_id: string;
  bib_prefix: string;
  bib_suffix: string | null;
  sequence_start: number;
  numeric_padding: number;
  next_sequence: number;
  text_color: string;
  font_family: BibFontFamily;
  font_size: number;
  font_weight: 400 | 500 | 600 | 700 | 800;
  text_alignment: BibTextAlignment;
  number_area_x: number;
  number_area_y: number;
  number_area_width: number;
  number_area_height: number;
  show_participant_name: boolean;
  participant_name_x: number;
  participant_name_y: number;
  participant_name_width: number;
  participant_name_height: number;
  participant_name_font_size: number;
  show_category_label: boolean;
  category_label_x: number;
  category_label_y: number;
  category_label_width: number;
  category_label_height: number;
  category_label_font_size: number;
  template_canvas_width: number;
  template_canvas_height: number;
  active_template_version_id: string | null;
  updated_at: Date;
};

type BibTemplateRow = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  status: BibTemplateStatus;
  object_key: string;
  canvas_width: number;
  canvas_height: number;
  file_size_bytes: number;
  checksum_sha256: string;
  version_number: number;
  is_active: boolean;
  uploaded_by_admin_user_id: string | null;
  uploaded_by_admin_name: string | null;
  updated_by_admin_user_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type BibTemplateListRow = {
  id: string;
  event_id: string;
  event_name: string;
  name: string;
  description: string | null;
  status: BibTemplateStatus;
  canvas_width: number;
  canvas_height: number;
  version_number: number;
  is_active: boolean;
  updated_at: Date;
  updated_by_name: string | null;
  usage_count: number;
  total_items?: number;
};

function mapSettings(row: BibSettingsRow): BibSettings {
  return {
    eventId: row.event_id,
    bibPrefix: row.bib_prefix,
    bibSuffix: row.bib_suffix,
    sequenceStart: row.sequence_start,
    numericPadding: row.numeric_padding,
    nextSequence: row.next_sequence,
    textColor: row.text_color,
    fontFamily: row.font_family,
    fontSize: row.font_size,
    fontWeight: row.font_weight,
    textAlignment: row.text_alignment,
    numberAreaX: row.number_area_x,
    numberAreaY: row.number_area_y,
    numberAreaWidth: row.number_area_width,
    numberAreaHeight: row.number_area_height,
    showParticipantName: row.show_participant_name,
    participantNameX: row.participant_name_x,
    participantNameY: row.participant_name_y,
    participantNameWidth: row.participant_name_width,
    participantNameHeight: row.participant_name_height,
    participantNameFontSize: row.participant_name_font_size,
    showCategoryLabel: row.show_category_label,
    categoryLabelX: row.category_label_x,
    categoryLabelY: row.category_label_y,
    categoryLabelWidth: row.category_label_width,
    categoryLabelHeight: row.category_label_height,
    categoryLabelFontSize: row.category_label_font_size,
    templateCanvasWidth: row.template_canvas_width,
    templateCanvasHeight: row.template_canvas_height,
    activeTemplateVersionId: row.active_template_version_id,
    updatedAt: row.updated_at,
  };
}

function mapTemplate(row: BibTemplateRow): BibTemplateVersion {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    description: row.description,
    status: row.status,
    objectKey: row.object_key,
    canvasWidth: row.canvas_width,
    canvasHeight: row.canvas_height,
    fileSizeBytes: row.file_size_bytes,
    checksumSha256: row.checksum_sha256,
    versionNumber: row.version_number,
    isActive: row.is_active,
    uploadedByAdminUserId: row.uploaded_by_admin_user_id,
    uploadedByAdminName: row.uploaded_by_admin_name,
    updatedByAdminUserId: row.updated_by_admin_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function orientationFor(
  width: number,
  height: number,
): 'LANDSCAPE' | 'PORTRAIT' {
  return width >= height ? 'LANDSCAPE' : 'PORTRAIT';
}

function mapTemplateListItem(row: BibTemplateListRow): BibTemplateListItem {
  return {
    id: row.id,
    eventId: row.event_id,
    eventName: row.event_name,
    name: row.name,
    description: row.description,
    status: row.status,
    orientation: orientationFor(row.canvas_width, row.canvas_height),
    canvasWidth: row.canvas_width,
    canvasHeight: row.canvas_height,
    versionNumber: row.version_number,
    isActive: row.is_active,
    updatedAt: row.updated_at,
    updatedByName: row.updated_by_name,
    usageCount: row.usage_count,
  };
}

function settingsColumns(alias = 'ebs') {
  const prefix = alias ? `${alias}.` : '';

  return `
    ${prefix}event_id,
    ${prefix}bib_prefix,
    ${prefix}bib_suffix,
    ${prefix}sequence_start,
    ${prefix}numeric_padding,
    ${prefix}next_sequence,
    ${prefix}text_color,
    ${prefix}font_family,
    ${prefix}font_size,
    ${prefix}font_weight,
    ${prefix}text_alignment,
    ${prefix}number_area_x,
    ${prefix}number_area_y,
    ${prefix}number_area_width,
    ${prefix}number_area_height,
    ${prefix}show_participant_name,
    ${prefix}participant_name_x,
    ${prefix}participant_name_y,
    ${prefix}participant_name_width,
    ${prefix}participant_name_height,
    ${prefix}participant_name_font_size,
    ${prefix}show_category_label,
    ${prefix}category_label_x,
    ${prefix}category_label_y,
    ${prefix}category_label_width,
    ${prefix}category_label_height,
    ${prefix}category_label_font_size,
    ${prefix}template_canvas_width,
    ${prefix}template_canvas_height,
    ${prefix}active_template_version_id,
    ${prefix}updated_at
  `;
}

function templateColumns(alias = 'btv') {
  const prefix = alias ? `${alias}.` : '';

  return `
    ${prefix}id,
    ${prefix}event_id,
    ${prefix}name,
    ${prefix}description,
    ${prefix}status,
    ${prefix}object_key,
    ${prefix}canvas_width,
    ${prefix}canvas_height,
    ${prefix}file_size_bytes,
    ${prefix}checksum_sha256,
    ${prefix}version_number,
    ${prefix}is_active,
    ${prefix}uploaded_by_admin_user_id,
    (
      SELECT uploaded_admin.full_name
      FROM admin_users uploaded_admin
      WHERE uploaded_admin.id = ${prefix}uploaded_by_admin_user_id
      LIMIT 1
    ) AS uploaded_by_admin_name,
    ${prefix}updated_by_admin_user_id,
    ${prefix}created_at,
    ${prefix}updated_at
  `;
}

function manageableEventCondition(
  adminIdIndex = 1,
  isSuperIndex = 2,
  eventAlias = 'e',
) {
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

function scopeForAdmin(admin: Pick<AuthenticatedAdmin, 'id' | 'roles'>) {
  return {
    adminId: admin.id,
    isSuperAdmin: true,
  };
}

export async function getOrCreateBibSettings(
  eventId: string,
  client?: PoolClient,
): Promise<BibSettings> {
  await query(
    `
      INSERT INTO event_bib_settings (event_id)
      VALUES ($1)
      ON CONFLICT (event_id) DO NOTHING
    `,
    [eventId],
    client,
  );

  const result = await query<BibSettingsRow>(
    `
      SELECT ${settingsColumns()}
      FROM event_bib_settings ebs
      WHERE ebs.event_id = $1
      LIMIT 1
    `,
    [eventId],
    client,
  );

  return mapSettings(result.rows[0]);
}

export async function updateBibSettings(
  eventId: string,
  settings: Omit<
    BibSettings,
    'eventId' | 'activeTemplateVersionId' | 'updatedAt'
  >,
  client?: PoolClient,
): Promise<BibSettings> {
  const result = await query<BibSettingsRow>(
    `
      UPDATE event_bib_settings
      SET
        bib_prefix = $2::text,
        bib_suffix = $3::text,
        sequence_start = $4::integer,
        numeric_padding = $5::integer,
        next_sequence = GREATEST($6::integer, $4::integer),
        text_color = $7::text,
        font_family = $8::text,
        font_size = $9::integer,
        font_weight = $10::integer,
        text_alignment = $11::text,
        number_area_x = $12::integer,
        number_area_y = $13::integer,
        number_area_width = $14::integer,
        number_area_height = $15::integer,
        show_participant_name = $16::boolean,
        participant_name_x = $17::integer,
        participant_name_y = $18::integer,
        participant_name_width = $19::integer,
        participant_name_height = $20::integer,
        participant_name_font_size = $21::integer,
        show_category_label = $22::boolean,
        category_label_x = $23::integer,
        category_label_y = $24::integer,
        category_label_width = $25::integer,
        category_label_height = $26::integer,
        category_label_font_size = $27::integer,
        template_canvas_width = $28::integer,
        template_canvas_height = $29::integer,
        updated_at = now()
      WHERE event_id = $1::uuid
      RETURNING ${settingsColumns('')}
    `,
    [
      eventId,
      settings.bibPrefix,
      settings.bibSuffix,
      settings.sequenceStart,
      settings.numericPadding,
      settings.nextSequence,
      settings.textColor,
      settings.fontFamily,
      settings.fontSize,
      settings.fontWeight,
      settings.textAlignment,
      settings.numberAreaX,
      settings.numberAreaY,
      settings.numberAreaWidth,
      settings.numberAreaHeight,
      settings.showParticipantName,
      settings.participantNameX,
      settings.participantNameY,
      settings.participantNameWidth,
      settings.participantNameHeight,
      settings.participantNameFontSize,
      settings.showCategoryLabel,
      settings.categoryLabelX,
      settings.categoryLabelY,
      settings.categoryLabelWidth,
      settings.categoryLabelHeight,
      settings.categoryLabelFontSize,
      settings.templateCanvasWidth,
      settings.templateCanvasHeight,
    ],
    client,
  );

  return mapSettings(result.rows[0]);
}

export async function createBibTemplateVersion(
  input: {
    id: string;
    eventId: string;
    name: string;
    description: string | null;
    status: BibTemplateStatus;
    objectKey: string;
    canvasWidth: number;
    canvasHeight: number;
    fileSizeBytes: number;
    checksumSha256: string;
    uploadedByAdminUserId: string;
  },
  client?: PoolClient,
): Promise<BibTemplateVersion> {
  const result = await query<BibTemplateRow>(
    `
      WITH next_version AS (
        SELECT COALESCE(max(version_number), 0) + 1 AS version_number
        FROM bib_template_versions
        WHERE event_id = $2
      )
      INSERT INTO bib_template_versions (
        id,
        event_id,
        name,
        description,
        status,
        object_key,
        canvas_width,
        canvas_height,
        file_size_bytes,
        checksum_sha256,
        version_number,
        uploaded_by_admin_user_id,
        updated_by_admin_user_id
      )
      SELECT
        $1::uuid,
        $2::uuid,
        $3::text,
        $4::text,
        $5::text,
        $6::text,
        $7::integer,
        $8::integer,
        $9::integer,
        $10::text,
        next_version.version_number,
        $11::uuid,
        $11::uuid
      FROM next_version
      RETURNING ${templateColumns('')}
    `,
    [
      input.id,
      input.eventId,
      input.name,
      input.description,
      input.status,
      input.objectKey,
      input.canvasWidth,
      input.canvasHeight,
      input.fileSizeBytes,
      input.checksumSha256,
      input.uploadedByAdminUserId,
    ],
    client,
  );

  return mapTemplate(result.rows[0]);
}

export async function activateBibTemplateVersion(
  eventId: string,
  templateVersionId: string,
  adminUserId?: string,
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE bib_template_versions
      SET
        is_active = false,
        status = CASE WHEN status = 'ACTIVE' THEN 'ARCHIVED' ELSE status END,
        updated_at = now(),
        updated_by_admin_user_id = COALESCE($3::uuid, updated_by_admin_user_id)
      WHERE event_id = $1
        AND id <> $2
    `,
    [eventId, templateVersionId, adminUserId ?? null],
    client,
  );
  await query(
    `
      UPDATE bib_template_versions
      SET
        is_active = true,
        status = 'ACTIVE',
        updated_at = now(),
        updated_by_admin_user_id = COALESCE($3::uuid, updated_by_admin_user_id)
      WHERE event_id = $1
        AND id = $2
    `,
    [eventId, templateVersionId, adminUserId ?? null],
    client,
  );
  await query(
    `
      UPDATE event_bib_settings
      SET active_template_version_id = $2, updated_at = now()
      WHERE event_id = $1
    `,
    [eventId, templateVersionId],
    client,
  );
}

export async function updateBibTemplateMetadata(
  input: {
    templateVersionId: string;
    name: string;
    description: string | null;
    updatedByAdminUserId: string;
  },
  client?: PoolClient,
): Promise<BibTemplateVersion> {
  const result = await query<BibTemplateRow>(
    `
      UPDATE bib_template_versions
      SET
        name = $2,
        description = $3,
        updated_by_admin_user_id = $4,
        updated_at = now()
      WHERE id = $1
      RETURNING ${templateColumns('')}
    `,
    [
      input.templateVersionId,
      input.name,
      input.description,
      input.updatedByAdminUserId,
    ],
    client,
  );

  return mapTemplate(result.rows[0]);
}

export async function archiveBibTemplateVersion(
  input: { templateVersionId: string; updatedByAdminUserId: string },
  client?: PoolClient,
): Promise<BibTemplateVersion> {
  const result = await query<BibTemplateRow>(
    `
      UPDATE bib_template_versions
      SET
        status = 'ARCHIVED',
        is_active = false,
        updated_by_admin_user_id = $2,
        updated_at = now()
      WHERE id = $1
      RETURNING ${templateColumns('')}
    `,
    [input.templateVersionId, input.updatedByAdminUserId],
    client,
  );

  return mapTemplate(result.rows[0]);
}

export async function clearActiveBibTemplateVersion(
  eventId: string,
  templateVersionId: string,
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE event_bib_settings
      SET active_template_version_id = NULL, updated_at = now()
      WHERE event_id = $1
        AND active_template_version_id = $2
    `,
    [eventId, templateVersionId],
    client,
  );
}

export async function listBibTemplateVersions(
  eventId: string,
  client?: PoolClient,
): Promise<BibTemplateVersion[]> {
  const result = await query<BibTemplateRow>(
    `
      SELECT ${templateColumns()}
      FROM bib_template_versions btv
      WHERE btv.event_id = $1
      ORDER BY btv.version_number DESC
    `,
    [eventId],
    client,
  );

  return result.rows.map(mapTemplate);
}

export async function getBibTemplateVersionById(
  templateVersionId: string,
  client?: PoolClient,
): Promise<BibTemplateVersion | null> {
  const result = await query<BibTemplateRow>(
    `
      SELECT ${templateColumns()}
      FROM bib_template_versions btv
      WHERE btv.id = $1
      LIMIT 1
    `,
    [templateVersionId],
    client,
  );

  return result.rows[0] ? mapTemplate(result.rows[0]) : null;
}

function addTemplateFilters(
  values: unknown[],
  conditions: string[],
  filters: BibTemplateListFilters,
) {
  if (filters.search) {
    values.push(filters.search.trim());
    const index = values.length;
    conditions.push(`(
      btv.name ILIKE '%' || $${index} || '%'
      OR e.name ILIKE '%' || $${index} || '%'
    )`);
  }

  if (filters.eventId) {
    values.push(filters.eventId);
    conditions.push(`e.id = $${values.length}::uuid`);
  }

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`btv.status = $${values.length}`);
  }

  if (filters.orientation === 'LANDSCAPE') {
    conditions.push('btv.canvas_width >= btv.canvas_height');
  } else if (filters.orientation === 'PORTRAIT') {
    conditions.push('btv.canvas_width < btv.canvas_height');
  }
}

export async function listBibTemplatesForAdmin(
  admin: Pick<AuthenticatedAdmin, 'id' | 'roles'>,
  filters: BibTemplateListFilters,
  client?: PoolClient,
): Promise<{ items: BibTemplateListItem[]; totalItems: number }> {
  const scope = scopeForAdmin(admin);
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 10));
  const values: unknown[] = [scope.adminId, scope.isSuperAdmin];
  const conditions = [manageableEventCondition()];

  addTemplateFilters(values, conditions, filters);

  values.push(pageSize);
  const limitIndex = values.length;
  values.push((page - 1) * pageSize);
  const offsetIndex = values.length;

  const result = await query<BibTemplateListRow>(
    `
      SELECT
        btv.id,
        btv.event_id,
        e.name AS event_name,
        btv.name,
        btv.description,
        btv.status,
        btv.canvas_width,
        btv.canvas_height,
        btv.version_number,
        btv.is_active,
        btv.updated_at,
        COALESCE(updated_admin.full_name, uploaded_admin.full_name) AS updated_by_name,
        count(DISTINCT bd.id)::integer AS usage_count,
        count(btv.id) OVER()::integer AS total_items
      FROM bib_template_versions btv
      JOIN events e ON e.id = btv.event_id
      LEFT JOIN admin_users updated_admin ON updated_admin.id = btv.updated_by_admin_user_id
      LEFT JOIN admin_users uploaded_admin ON uploaded_admin.id = btv.uploaded_by_admin_user_id
      LEFT JOIN bib_documents bd ON bd.template_version_id = btv.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY btv.id, e.id, updated_admin.full_name, uploaded_admin.full_name
      ORDER BY btv.updated_at DESC, btv.created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `,
    values,
    client,
  );

  return {
    items: result.rows.map(mapTemplateListItem),
    totalItems: result.rows[0]?.total_items ?? 0,
  };
}

export async function getBibTemplateStatsForAdmin(
  admin: Pick<AuthenticatedAdmin, 'id' | 'roles'>,
  client?: PoolClient,
): Promise<BibTemplateDashboardData['stats']> {
  const scope = scopeForAdmin(admin);
  const result = await query<{
    total_templates: number;
    active_templates: number;
    events_with_template: number;
    draft_or_archived_templates: number;
  }>(
    `
      SELECT
        count(btv.id)::integer AS total_templates,
        count(btv.id) FILTER (WHERE btv.status = 'ACTIVE')::integer AS active_templates,
        count(DISTINCT btv.event_id) FILTER (WHERE btv.status = 'ACTIVE')::integer AS events_with_template,
        count(btv.id) FILTER (WHERE btv.status IN ('DRAFT', 'ARCHIVED'))::integer AS draft_or_archived_templates
      FROM bib_template_versions btv
      JOIN events e ON e.id = btv.event_id
      WHERE ${manageableEventCondition()}
    `,
    [scope.adminId, scope.isSuperAdmin],
    client,
  );
  const row = result.rows[0];

  return {
    totalTemplates: row?.total_templates ?? 0,
    activeTemplates: row?.active_templates ?? 0,
    eventsWithTemplate: row?.events_with_template ?? 0,
    draftOrArchivedTemplates: row?.draft_or_archived_templates ?? 0,
  };
}

export async function listBibTemplateFilterEventsForAdmin(
  admin: Pick<AuthenticatedAdmin, 'id' | 'roles'>,
  client?: PoolClient,
): Promise<Array<{ id: string; name: string }>> {
  const scope = scopeForAdmin(admin);
  const result = await query<{ id: string; name: string }>(
    `
      SELECT e.id, e.name
      FROM events e
      WHERE ${manageableEventCondition()}
      ORDER BY e.name ASC
    `,
    [scope.adminId, scope.isSuperAdmin],
    client,
  );

  return result.rows;
}

export async function listEventsWithoutActiveBibTemplateForAdmin(
  admin: Pick<AuthenticatedAdmin, 'id' | 'roles'>,
  limit: number,
  client?: PoolClient,
): Promise<Array<{ id: string; name: string; status: string }>> {
  const scope = scopeForAdmin(admin);
  const result = await query<{
    id: string;
    name: string;
    event_status: string;
  }>(
    `
      SELECT e.id, e.name, e.event_status
      FROM events e
      WHERE ${manageableEventCondition()}
        AND NOT EXISTS (
          SELECT 1
          FROM bib_template_versions btv
          WHERE btv.event_id = e.id
            AND btv.status = 'ACTIVE'
            AND btv.is_active = true
        )
      ORDER BY e.updated_at DESC, e.created_at DESC
      LIMIT $3
    `,
    [scope.adminId, scope.isSuperAdmin, limit],
    client,
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.event_status,
  }));
}

export async function getBibTemplateAssignmentProgressForAdmin(
  admin: Pick<AuthenticatedAdmin, 'id' | 'roles'>,
  client?: PoolClient,
): Promise<BibTemplateDashboardData['assignmentProgress']> {
  const scope = scopeForAdmin(admin);
  const result = await query<{
    total_events: number;
    events_with_template: number;
  }>(
    `
      SELECT
        count(e.id)::integer AS total_events,
        count(e.id) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM bib_template_versions btv
            WHERE btv.event_id = e.id
              AND btv.status = 'ACTIVE'
              AND btv.is_active = true
          )
        )::integer AS events_with_template
      FROM events e
      WHERE ${manageableEventCondition()}
    `,
    [scope.adminId, scope.isSuperAdmin],
    client,
  );
  const row = result.rows[0];
  const totalEvents = row?.total_events ?? 0;
  const eventsWithTemplate = row?.events_with_template ?? 0;

  return {
    totalEvents,
    eventsWithTemplate,
    eventsWithoutTemplate: Math.max(0, totalEvents - eventsWithTemplate),
  };
}

export async function listRecentBibTemplateActivitiesForAdmin(
  admin: Pick<AuthenticatedAdmin, 'id' | 'roles'>,
  limit: number,
  client?: PoolClient,
): Promise<BibTemplateDashboardData['recentActivities']> {
  const scope = scopeForAdmin(admin);
  const result = await query<{
    id: string;
    action: string;
    event_id: string | null;
    event_name: string | null;
    actor_name: string | null;
    created_at: Date;
  }>(
    `
      SELECT
        al.id,
        al.action,
        al.event_id,
        e.name AS event_name,
        au.full_name AS actor_name,
        al.created_at
      FROM audit_logs al
      LEFT JOIN events e ON e.id = al.event_id
      LEFT JOIN admin_users au ON au.id = al.actor_id
      WHERE al.action IN (
        'BIB_TEMPLATE_UPLOADED',
        'BIB_TEMPLATE_METADATA_UPDATED',
        'BIB_TEMPLATE_PUBLISHED',
        'BIB_TEMPLATE_ARCHIVED',
        'BIB_TEMPLATE_DUPLICATED',
        'BIB_SETTINGS_UPDATED'
      )
        AND (
          al.event_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM events scoped_event
            WHERE scoped_event.id = al.event_id
              AND ${manageableEventCondition(1, 2, 'scoped_event')}
          )
        )
      ORDER BY al.created_at DESC
      LIMIT $3
    `,
    [scope.adminId, scope.isSuperAdmin, limit],
    client,
  );

  return result.rows.map((row) => ({
    id: row.id,
    action: row.action,
    eventId: row.event_id,
    eventName: row.event_name,
    actorName: row.actor_name,
    createdAt: row.created_at,
  }));
}

export async function listSampleParticipantsForBibTemplate(
  eventId: string,
  client?: PoolClient,
): Promise<BibTemplateSampleParticipant[]> {
  const result = await query<{
    registration_id: string;
    participant_name: string;
    bib_number: string;
    category_ids: string[];
    category_names: string[];
  }>(
    `
      SELECT
        er.id AS registration_id,
        p.full_name AS participant_name,
        er.bib_number,
        COALESCE(array_agg(ec.id::text ORDER BY ec.display_order, ec.name), ARRAY[]::text[]) AS category_ids,
        COALESCE(array_agg(ec.name ORDER BY ec.display_order, ec.name), ARRAY[]::text[]) AS category_names
      FROM event_registrations er
      JOIN participants p ON p.id = er.participant_id
      LEFT JOIN registration_categories rc ON rc.event_registration_id = er.id
        AND rc.registration_status = 'ACTIVE'
      LEFT JOIN event_categories ec ON ec.id = rc.event_category_id
      WHERE er.event_id = $1
        AND er.registration_status = 'ACTIVE'
        AND p.deleted_at IS NULL
      GROUP BY er.id, p.id
      ORDER BY er.registered_at DESC
      LIMIT 20
    `,
    [eventId],
    client,
  );

  return result.rows.map((row) => ({
    registrationId: row.registration_id,
    participantName: row.participant_name,
    bibNumber: row.bib_number,
    categories: row.category_ids.map((id, index) => ({
      id,
      name: row.category_names[index] ?? '',
    })),
  }));
}

export async function getBibTemplateDetailForAdmin(
  templateVersionId: string,
  admin: Pick<AuthenticatedAdmin, 'id' | 'roles'>,
  client?: PoolClient,
): Promise<Omit<BibTemplateDetailData, 'manageableEvents'> | null> {
  const scope = scopeForAdmin(admin);
  const template = await getBibTemplateVersionById(templateVersionId, client);

  if (!template) {
    return null;
  }

  const result = await query<{ id: string; name: string; slug: string }>(
    `
      SELECT e.id, e.name, e.slug
      FROM events e
      WHERE e.id = $1
        AND ${manageableEventCondition(2, 3)}
      LIMIT 1
    `,
    [template.eventId, scope.adminId, scope.isSuperAdmin],
    client,
  );

  const event = result.rows[0];

  if (!event) {
    return null;
  }

  const [settings, templates, sampleParticipants] = await Promise.all([
    getOrCreateBibSettings(event.id, client),
    listBibTemplateVersions(event.id, client),
    listSampleParticipantsForBibTemplate(event.id, client),
  ]);

  return {
    template,
    settings,
    templates,
    event,
    sampleParticipants,
  };
}

export async function getBibGenerationData(
  registrationId: string,
  client?: PoolClient,
): Promise<BibGenerationData | null> {
  const result = await query<
    BibSettingsRow &
      BibTemplateRow & {
        registration_id: string;
        participant_id: string;
        participant_name: string;
        bib_number: string;
        category_label: string;
        current_template_version_id: string | null;
      }
  >(
    `
      SELECT
        ${settingsColumns('ebs')},
        ${templateColumns('btv')},
        er.id AS registration_id,
        er.participant_id,
        p.full_name AS participant_name,
        er.bib_number,
        category_labels.category_label,
        bd.template_version_id::text AS current_template_version_id
      FROM event_registrations er
      JOIN participants p ON p.id = er.participant_id
      JOIN event_bib_settings ebs ON ebs.event_id = er.event_id
      JOIN bib_template_versions btv ON btv.id = ebs.active_template_version_id
      JOIN LATERAL (
        SELECT string_agg(ec.name, ', ' ORDER BY ec.display_order, ec.name) AS category_label
        FROM registration_categories rc
        JOIN event_categories ec ON ec.id = rc.event_category_id
        WHERE rc.event_registration_id = er.id
          AND rc.registration_status = 'ACTIVE'
      ) category_labels ON true
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
    registrationId: row.registration_id,
    eventId: row.event_id,
    participantId: row.participant_id,
    participantName: row.participant_name,
    bibNumber: row.bib_number,
    categoryLabel: row.category_label,
    settings: mapSettings(row),
    template: mapTemplate(row),
    currentTemplateVersionId: row.current_template_version_id,
  };
}

export async function createBibDocument(
  input: {
    registrationId: string;
    eventId: string;
    participantId: string;
    templateVersionId: string;
    objectKey: string;
  },
  client?: PoolClient,
): Promise<string> {
  const result = await query<{ id: string }>(
    `
      INSERT INTO bib_documents (
        event_registration_id,
        event_id,
        participant_id,
        template_version_id,
        object_key,
        status,
        generated_at
      )
      VALUES ($1, $2, $3, $4, $5, 'READY', now())
      RETURNING id
    `,
    [
      input.registrationId,
      input.eventId,
      input.participantId,
      input.templateVersionId,
      input.objectKey,
    ],
    client,
  );

  return result.rows[0].id;
}
