import type { PoolClient } from 'pg';
import { query } from '@/db/pool';
import type {
  CertificateRecord,
  CertificateStatus,
  EventCertificateSummary,
  EventCertificateTemplateRecord,
} from '@/modules/certificates/certificate.types';
import { isDatabaseErrorCode } from '@/shared/errors/database';

type TemplateRow = {
  id: string;
  event_id: string;
  object_key: string;
  width: number;
  height: number;
  status: EventCertificateTemplateRecord['status'];
  uploaded_by_admin_user_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type CertificateRow = {
  id: string;
  event_id: string;
  registration_category_id: string;
  submission_id: string;
  approved_revision_id: string;
  template_id: string;
  certificate_number: string;
  verification_code: string;
  object_key: string | null;
  status: CertificateStatus;
  generated_at: Date | null;
  emailed_at: Date | null;
  invalidated_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
};

export type CertificateEligibleRow = {
  eventId: string;
  registrationCategoryId: string;
  eventRegistrationId: string;
  submissionId: string;
  approvedRevisionId: string;
  templateId: string;
};

export type CertificateRenderData = CertificateRecord & {
  templateObjectKey: string;
  templateWidth: number;
  templateHeight: number;
  participantName: string;
  eventName: string;
  categoryName: string;
  bibNumber: string;
  validationCompletedAt: Date | null;
};

export type CertificateEmailData = CertificateRecord & {
  eventRegistrationId: string;
  participantName: string;
  participantEmail: string;
  eventName: string;
  eventSlug: string;
  categoryName: string;
  contact: string;
};

function mapTemplate(row: TemplateRow): EventCertificateTemplateRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    objectKey: row.object_key,
    width: row.width,
    height: row.height,
    status: row.status,
    uploadedByAdminUserId: row.uploaded_by_admin_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCertificate(row: CertificateRow): CertificateRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    registrationCategoryId: row.registration_category_id,
    submissionId: row.submission_id,
    approvedRevisionId: row.approved_revision_id,
    templateId: row.template_id,
    certificateNumber: row.certificate_number,
    verificationCode: row.verification_code,
    objectKey: row.object_key,
    status: row.status,
    generatedAt: row.generated_at,
    emailedAt: row.emailed_at,
    invalidatedAt: row.invalidated_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function emptyEventCertificateSummary(): EventCertificateSummary {
  return {
    template: null,
    pendingCount: 0,
    readyCount: 0,
    emailedCount: 0,
    failedCount: 0,
    invalidatedCount: 0,
  };
}

export async function replaceActiveCertificateTemplate(
  input: {
    eventId: string;
    templateId: string;
    objectKey: string;
    width: number;
    height: number;
    uploadedByAdminUserId: string;
  },
  client?: PoolClient,
): Promise<EventCertificateTemplateRecord> {
  await query(
    `
      UPDATE event_certificate_templates
      SET status = 'ARCHIVED', updated_at = now()
      WHERE event_id = $1
        AND status = 'ACTIVE'
    `,
    [input.eventId],
    client,
  );

  const result = await query<TemplateRow>(
    `
      INSERT INTO event_certificate_templates (
        id,
        event_id,
        object_key,
        width,
        height,
        status,
        uploaded_by_admin_user_id
      )
      VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6)
      RETURNING
        id,
        event_id,
        object_key,
        width,
        height,
        status,
        uploaded_by_admin_user_id,
        created_at,
        updated_at
    `,
    [
      input.templateId,
      input.eventId,
      input.objectKey,
      input.width,
      input.height,
      input.uploadedByAdminUserId,
    ],
    client,
  );

  return mapTemplate(result.rows[0]);
}

export async function getActiveCertificateTemplate(
  eventId: string,
  client?: PoolClient,
): Promise<EventCertificateTemplateRecord | null> {
  const result = await query<TemplateRow>(
    `
      SELECT
        id,
        event_id,
        object_key,
        width,
        height,
        status,
        uploaded_by_admin_user_id,
        created_at,
        updated_at
      FROM event_certificate_templates
      WHERE event_id = $1
        AND status = 'ACTIVE'
      LIMIT 1
    `,
    [eventId],
    client,
  );

  return result.rows[0] ? mapTemplate(result.rows[0]) : null;
}

export async function getEventCertificateSummary(
  eventId: string,
  client?: PoolClient,
): Promise<EventCertificateSummary> {
  try {
    const [template, counts] = await Promise.all([
      getActiveCertificateTemplate(eventId, client),
      query<{
        pending_count: number;
        ready_count: number;
        emailed_count: number;
        failed_count: number;
        invalidated_count: number;
      }>(
        `
          SELECT
            count(id) FILTER (WHERE status IN ('PENDING', 'GENERATING'))::integer AS pending_count,
            count(id) FILTER (WHERE status = 'READY')::integer AS ready_count,
            count(id) FILTER (WHERE status = 'EMAILED')::integer AS emailed_count,
            count(id) FILTER (WHERE status = 'FAILED')::integer AS failed_count,
            count(id) FILTER (WHERE status = 'INVALIDATED')::integer AS invalidated_count
          FROM certificates
          WHERE event_id = $1
        `,
        [eventId],
        client,
      ),
    ]);
    const row = counts.rows[0];

    return {
      template,
      pendingCount: row?.pending_count ?? 0,
      readyCount: row?.ready_count ?? 0,
      emailedCount: row?.emailed_count ?? 0,
      failedCount: row?.failed_count ?? 0,
      invalidatedCount: row?.invalidated_count ?? 0,
    };
  } catch (error) {
    if (isDatabaseErrorCode(error, '42P01')) {
      return emptyEventCertificateSummary();
    }

    throw error;
  }
}

export type SubmissionCertificateStateRow = {
  event_status: string;
  certificate_enabled: boolean;
  submission_status: string | null;
  approved_revision_id: string | null;
  template_id: string | null;
  certificate_status: CertificateStatus | null;
  certificate_number: string | null;
  emailed_at: Date | null;
};

export async function getSubmissionCertificateState(
  submissionId: string,
  client?: PoolClient,
): Promise<SubmissionCertificateStateRow | null> {
  try {
    const result = await query<SubmissionCertificateStateRow>(
      `
        SELECT
          e.event_status,
          ec.certificate_enabled,
          s.status AS submission_status,
          s.approved_revision_id,
          ect.id AS template_id,
          c.status AS certificate_status,
          c.certificate_number,
          c.emailed_at
        FROM submissions s
        JOIN registration_categories rc ON rc.id = s.registration_category_id
        JOIN event_categories ec ON ec.id = rc.event_category_id
        JOIN event_registrations er ON er.id = rc.event_registration_id
        JOIN events e ON e.id = er.event_id
        LEFT JOIN event_certificate_templates ect ON ect.event_id = e.id
          AND ect.status = 'ACTIVE'
        LEFT JOIN certificates c ON c.submission_id = s.id
          AND (
            c.invalidated_at IS NULL
            OR c.status = 'INVALIDATED'
          )
        WHERE s.id = $1
        ORDER BY c.created_at DESC NULLS LAST
        LIMIT 1
      `,
      [submissionId],
      client,
    );

    return result.rows[0] ?? null;
  } catch (error) {
    if (isDatabaseErrorCode(error, '42P01')) {
      return null;
    }

    throw error;
  }
}

export async function listCertificateEligibleRowsForEvent(
  eventId: string,
  client?: PoolClient,
): Promise<CertificateEligibleRow[]> {
  try {
    const result = await query<{
      event_id: string;
      registration_category_id: string;
      event_registration_id: string;
      submission_id: string;
      approved_revision_id: string;
      template_id: string;
    }>(
      `
        SELECT
          e.id AS event_id,
          rc.id AS registration_category_id,
          er.id AS event_registration_id,
          s.id AS submission_id,
          s.approved_revision_id,
          ect.id AS template_id
        FROM submissions s
        JOIN registration_categories rc ON rc.id = s.registration_category_id
        JOIN event_registrations er ON er.id = rc.event_registration_id
        JOIN events e ON e.id = er.event_id
        JOIN event_categories ec ON ec.id = rc.event_category_id
        JOIN event_certificate_templates ect ON ect.event_id = e.id AND ect.status = 'ACTIVE'
        LEFT JOIN certificates c ON c.registration_category_id = rc.id
          AND c.invalidated_at IS NULL
        WHERE e.id = $1
          AND e.event_status = 'COMPLETED'
          AND er.registration_status = 'ACTIVE'
          AND rc.registration_status = 'ACTIVE'
          AND ec.certificate_enabled = true
          AND s.status = 'APPROVED'
          AND s.approved_revision_id IS NOT NULL
          AND c.id IS NULL
      `,
      [eventId],
      client,
    );

    return result.rows.map((row) => ({
      eventId: row.event_id,
      registrationCategoryId: row.registration_category_id,
      eventRegistrationId: row.event_registration_id,
      submissionId: row.submission_id,
      approvedRevisionId: row.approved_revision_id,
      templateId: row.template_id,
    }));
  } catch (error) {
    if (isDatabaseErrorCode(error, '42P01')) {
      return [];
    }

    throw error;
  }
}

export async function createPendingCertificate(
  input: {
    eventId: string;
    registrationCategoryId: string;
    submissionId: string;
    approvedRevisionId: string;
    templateId: string;
    certificateNumber: string;
    verificationCode: string;
  },
  client?: PoolClient,
): Promise<CertificateRecord> {
  const result = await query<CertificateRow>(
    `
      WITH inserted AS (
        INSERT INTO certificates (
          event_id,
          registration_category_id,
          submission_id,
          approved_revision_id,
          template_id,
          certificate_number,
          verification_code,
          status
        )
        SELECT $1, $2, $3, $4, $5, $6, $7, 'PENDING'
        WHERE NOT EXISTS (
          SELECT 1
          FROM certificates
          WHERE registration_category_id = $2
            AND invalidated_at IS NULL
        )
        RETURNING *
      )
      SELECT *
      FROM inserted
      UNION ALL
      SELECT *
      FROM certificates
      WHERE registration_category_id = $2
        AND invalidated_at IS NULL
      LIMIT 1
    `,
    [
      input.eventId,
      input.registrationCategoryId,
      input.submissionId,
      input.approvedRevisionId,
      input.templateId,
      input.certificateNumber,
      input.verificationCode,
    ],
    client,
  );

  return mapCertificate(result.rows[0]);
}

export async function getCertificateForGeneration(
  certificateId: string,
  client?: PoolClient,
): Promise<CertificateRenderData | null> {
  const result = await query<
    CertificateRow & {
      template_object_key: string;
      template_width: number;
      template_height: number;
      participant_name: string;
      event_name: string;
      category_name: string;
      bib_number: string;
      validation_completed_at: Date | null;
    }
  >(
    `
      UPDATE certificates c
      SET status = 'GENERATING', updated_at = now(), last_error = NULL
      FROM registration_categories rc,
        event_registrations er,
        participants p,
        events e,
        event_categories ec,
        event_certificate_templates ect,
        submissions s
      WHERE c.id = $1
        AND c.registration_category_id = rc.id
        AND er.id = rc.event_registration_id
        AND p.id = er.participant_id
        AND e.id = er.event_id
        AND ec.id = rc.event_category_id
        AND ect.id = c.template_id
        AND s.id = c.submission_id
        AND c.status IN ('PENDING', 'FAILED')
        AND c.invalidated_at IS NULL
      RETURNING
        c.*,
        ect.object_key AS template_object_key,
        ect.width AS template_width,
        ect.height AS template_height,
        p.full_name AS participant_name,
        e.name AS event_name,
        ec.name AS category_name,
        er.bib_number,
        s.validation_completed_at
    `,
    [certificateId],
    client,
  );
  const row = result.rows[0];

  return row
    ? {
        ...mapCertificate(row),
        templateObjectKey: row.template_object_key,
        templateWidth: row.template_width,
        templateHeight: row.template_height,
        participantName: row.participant_name,
        eventName: row.event_name,
        categoryName: row.category_name,
        bibNumber: row.bib_number,
        validationCompletedAt: row.validation_completed_at,
      }
    : null;
}

export async function markCertificateGenerated(
  input: { certificateId: string; objectKey: string },
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE certificates
      SET
        object_key = $2,
        status = 'READY',
        generated_at = now(),
        last_error = NULL,
        updated_at = now()
      WHERE id = $1
        AND invalidated_at IS NULL
    `,
    [input.certificateId, input.objectKey],
    client,
  );
}

export async function markCertificateFailed(
  input: { certificateId: string; sanitizedError: string },
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE certificates
      SET
        status = 'FAILED',
        last_error = $2,
        updated_at = now()
      WHERE id = $1
        AND invalidated_at IS NULL
    `,
    [input.certificateId, input.sanitizedError],
    client,
  );
}

export async function getCertificateEmailData(
  certificateId: string,
  client?: PoolClient,
): Promise<CertificateEmailData | null> {
  const result = await query<
    CertificateRow & {
      event_registration_id: string;
      participant_name: string;
      participant_email: string;
      event_name: string;
      event_slug: string;
      category_name: string;
      contact_email: string | null;
      contact_phone: string | null;
      contact_whatsapp: string | null;
    }
  >(
    `
      SELECT
        c.*,
        er.id AS event_registration_id,
        p.full_name AS participant_name,
        p.normalized_email AS participant_email,
        e.name AS event_name,
        e.slug AS event_slug,
        ec.name AS category_name,
        e.contact_email,
        e.contact_phone,
        e.contact_whatsapp
      FROM certificates c
      JOIN registration_categories rc ON rc.id = c.registration_category_id
      JOIN event_registrations er ON er.id = rc.event_registration_id
      JOIN participants p ON p.id = er.participant_id
      JOIN events e ON e.id = er.event_id
      JOIN event_categories ec ON ec.id = rc.event_category_id
      WHERE c.id = $1
        AND c.status IN ('READY', 'FAILED')
        AND c.object_key IS NOT NULL
        AND c.invalidated_at IS NULL
      LIMIT 1
    `,
    [certificateId],
    client,
  );
  const row = result.rows[0];

  return row
    ? {
        ...mapCertificate(row),
        eventRegistrationId: row.event_registration_id,
        participantName: row.participant_name,
        participantEmail: row.participant_email,
        eventName: row.event_name,
        eventSlug: row.event_slug,
        categoryName: row.category_name,
        contact:
          row.contact_email ??
          row.contact_whatsapp ??
          row.contact_phone ??
          'Kontak organizer belum tersedia',
      }
    : null;
}

export async function markCertificateEmailed(
  certificateId: string,
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE certificates
      SET status = 'EMAILED', emailed_at = now(), updated_at = now()
      WHERE id = $1
        AND status IN ('READY', 'FAILED')
        AND invalidated_at IS NULL
    `,
    [certificateId],
    client,
  );
}

export async function invalidateActiveCertificateForSubmission(
  submissionId: string,
  client?: PoolClient,
): Promise<void> {
  try {
    await query(
      `
        UPDATE certificates
        SET
          status = 'INVALIDATED',
          invalidated_at = now(),
          updated_at = now()
        WHERE submission_id = $1
          AND invalidated_at IS NULL
      `,
      [submissionId],
      client,
    );
  } catch (error) {
    if (isDatabaseErrorCode(error, '42P01')) {
      return;
    }

    throw error;
  }
}
