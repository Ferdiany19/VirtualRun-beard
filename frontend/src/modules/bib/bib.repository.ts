import type { PoolClient } from "pg";
import { query } from "@/db/pool";
import type {
  BibFontFamily,
  BibGenerationData,
  BibSettings,
  BibTemplateVersion,
  BibTextAlignment,
} from "@/modules/bib/bib.types";

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
  object_key: string;
  canvas_width: number;
  canvas_height: number;
  file_size_bytes: number;
  checksum_sha256: string;
  version_number: number;
  is_active: boolean;
  created_at: Date;
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
    objectKey: row.object_key,
    canvasWidth: row.canvas_width,
    canvasHeight: row.canvas_height,
    fileSizeBytes: row.file_size_bytes,
    checksumSha256: row.checksum_sha256,
    versionNumber: row.version_number,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function settingsColumns(alias = "ebs") {
  const prefix = alias ? `${alias}.` : "";

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

function templateColumns(alias = "btv") {
  const prefix = alias ? `${alias}.` : "";

  return `
    ${prefix}id,
    ${prefix}event_id,
    ${prefix}object_key,
    ${prefix}canvas_width,
    ${prefix}canvas_height,
    ${prefix}file_size_bytes,
    ${prefix}checksum_sha256,
    ${prefix}version_number,
    ${prefix}is_active,
    ${prefix}created_at
  `;
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
  settings: Omit<BibSettings, "eventId" | "activeTemplateVersionId" | "updatedAt">,
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
      RETURNING ${settingsColumns("")}
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
        object_key,
        canvas_width,
        canvas_height,
        file_size_bytes,
        checksum_sha256,
        version_number,
        uploaded_by_admin_user_id
      )
      SELECT
        $1::uuid,
        $2::uuid,
        $3::text,
        $4::integer,
        $5::integer,
        $6::integer,
        $7::text,
        next_version.version_number,
        $8::uuid
      FROM next_version
      RETURNING ${templateColumns("")}
    `,
    [
      input.id,
      input.eventId,
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
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE bib_template_versions
      SET is_active = false
      WHERE event_id = $1
    `,
    [eventId],
    client,
  );
  await query(
    `
      UPDATE bib_template_versions
      SET is_active = true
      WHERE event_id = $1
        AND id = $2
    `,
    [eventId, templateVersionId],
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
        ${settingsColumns("ebs")},
        ${templateColumns("btv")},
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
