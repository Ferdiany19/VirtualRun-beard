import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import sharp from 'sharp';
import { withTransaction } from '@/db/transaction';
import { createAuditLog } from '@/modules/audit/audit.repository';
import { canAccessEventManagement } from '@/modules/auth/auth.policy';
import type { AuthenticatedAdmin } from '@/modules/auth/auth.types';
import {
  createPendingCertificate,
  getActiveCertificateTemplate,
  getCertificateEmailData,
  getCertificateForGeneration,
  getEventCertificateSummary,
  getSubmissionCertificateState,
  invalidateActiveCertificateForSubmission,
  listCertificateEligibleRowsForEvent,
  markCertificateEmailed,
  markCertificateFailed,
  markCertificateGenerated,
  replaceActiveCertificateTemplate,
} from '@/modules/certificates/certificate.repository';
import type {
  EventCertificateSummary,
  SubmissionCertificateSummary,
} from '@/modules/certificates/certificate.types';
import {
  createEmailDelivery,
  markEmailDeliveryFailed,
  markEmailDeliverySent,
} from '@/modules/email/email.repository';
import { sendCertificateEmail } from '@/modules/email/email.service';
import { getEventById } from '@/modules/events/event.repository';
import { enqueueBackgroundJob } from '@/modules/jobs/job.repository';
import {
  getPrivateObject,
  putPrivateObject,
} from '@/modules/storage/storage.service';
import { formatBusinessDate } from '@/shared/date/business-timezone';
import { ApplicationError } from '@/shared/errors/application-error';

function assertCanManageCertificates(admin: AuthenticatedAdmin): void {
  if (!canAccessEventManagement(admin)) {
    throw new ApplicationError({
      code: 'FORBIDDEN',
      message: 'Admin cannot manage certificates',
      safeMessage: 'Admin belum dapat mengelola sertifikat.',
      statusCode: 403,
    });
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function certificateNumber(): string {
  return `CERT-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function verificationCode(): string {
  return randomUUID().replace(/-/g, '').toUpperCase();
}

function certificateFilename(value: string): string {
  return `sertifikat-${value.replace(/[^a-zA-Z0-9._-]/g, '-')}.png`;
}

function sanitizedError(error: unknown): string {
  return error instanceof Error
    ? error.message.slice(0, 240)
    : 'Unknown certificate error';
}

export async function uploadManagedCertificateTemplate(input: {
  eventId: string;
  admin: AuthenticatedAdmin;
  file: File;
  correlationId: string | null;
}) {
  assertCanManageCertificates(input.admin);

  if (!(await getEventById(input.eventId))) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: 'Event not found for certificate template',
      safeMessage: 'Event tidak ditemukan.',
      statusCode: 404,
    });
  }

  if (input.file.size > 5 * 1024 * 1024) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Certificate template is too large',
      safeMessage: 'Template sertifikat maksimal 5 MB.',
      statusCode: 400,
    });
  }

  const templateId = randomUUID();
  const uploadedBuffer = Buffer.from(await input.file.arrayBuffer());
  const metadata = await sharp(uploadedBuffer, { failOn: 'error' }).metadata();

  if (!metadata.width || !metadata.height || metadata.format !== 'png') {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Certificate template must be a PNG image',
      safeMessage: 'Template sertifikat wajib berupa PNG.',
      statusCode: 400,
    });
  }

  const buffer = await sharp(uploadedBuffer).png().toBuffer();
  const objectKey = `events/${input.eventId}/templates/certificates/${templateId}.png`;

  await putPrivateObject({ objectKey, body: buffer, contentType: 'image/png' });

  return withTransaction(async (client) => {
    const template = await replaceActiveCertificateTemplate(
      {
        eventId: input.eventId,
        templateId,
        objectKey,
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        uploadedByAdminUserId: input.admin.id,
      },
      client,
    );
    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action: 'CERTIFICATE_TEMPLATE_UPLOADED',
        entityType: 'EVENT',
        entityId: input.eventId,
        eventId: input.eventId,
        newValues: {
          templateId,
          width: template.width,
          height: template.height,
        },
        correlationId: input.correlationId,
      },
      client,
    );
    return template;
  });
}

export async function getCertificateTemplatePreviewForAdmin(input: {
  eventId: string;
  admin: AuthenticatedAdmin;
}): Promise<{ buffer: Buffer }> {
  assertCanManageCertificates(input.admin);
  const template = await getActiveCertificateTemplate(input.eventId);

  if (!template) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: 'Certificate template not found',
      safeMessage: 'Template sertifikat belum tersedia.',
      statusCode: 404,
    });
  }

  return { buffer: await getPrivateObject(template.objectKey) };
}

export async function getManagedEventCertificateSummary(
  eventId: string,
  admin: AuthenticatedAdmin,
): Promise<EventCertificateSummary> {
  assertCanManageCertificates(admin);
  return getEventCertificateSummary(eventId);
}

export async function getManagedSubmissionCertificateSummary(input: {
  submissionId: string;
  admin: AuthenticatedAdmin;
}): Promise<SubmissionCertificateSummary> {
  assertCanManageCertificates(input.admin);
  const state = await getSubmissionCertificateState(input.submissionId);

  if (
    !state ||
    !state.certificate_enabled ||
    state.submission_status !== 'APPROVED' ||
    !state.approved_revision_id
  ) {
    return {
      status: 'NOT_ELIGIBLE',
      certificateStatus: state?.certificate_status ?? null,
      certificateNumber: state?.certificate_number ?? null,
      emailedAt: state?.emailed_at ?? null,
    };
  }

  if (!state.template_id) {
    return {
      status: 'CONFIGURATION_INCOMPLETE',
      certificateStatus: state.certificate_status,
      certificateNumber: state.certificate_number,
      emailedAt: state.emailed_at,
    };
  }

  if (state.event_status !== 'COMPLETED') {
    return {
      status: 'WAITING_EVENT_COMPLETION',
      certificateStatus: state.certificate_status,
      certificateNumber: state.certificate_number,
      emailedAt: state.emailed_at,
    };
  }

  if (state.certificate_status === 'EMAILED') {
    return {
      status: 'SENT',
      certificateStatus: state.certificate_status,
      certificateNumber: state.certificate_number,
      emailedAt: state.emailed_at,
    };
  }

  if (state.certificate_status === 'FAILED') {
    return {
      status: 'FAILED',
      certificateStatus: state.certificate_status,
      certificateNumber: state.certificate_number,
      emailedAt: state.emailed_at,
    };
  }

  if (state.certificate_status === 'INVALIDATED') {
    return {
      status: 'INVALIDATED',
      certificateStatus: state.certificate_status,
      certificateNumber: state.certificate_number,
      emailedAt: state.emailed_at,
    };
  }

  return {
    status: 'QUEUED',
    certificateStatus: state.certificate_status,
    certificateNumber: state.certificate_number,
    emailedAt: state.emailed_at,
  };
}

export async function enqueueCertificatesForCompletedEvent(
  eventId: string,
  client?: PoolClient,
): Promise<number> {
  const eligibleRows = await listCertificateEligibleRowsForEvent(
    eventId,
    client,
  );
  let queuedCount = 0;

  for (const row of eligibleRows) {
    const certificate = await createPendingCertificate(
      {
        eventId: row.eventId,
        registrationCategoryId: row.registrationCategoryId,
        submissionId: row.submissionId,
        approvedRevisionId: row.approvedRevisionId,
        templateId: row.templateId,
        certificateNumber: certificateNumber(),
        verificationCode: verificationCode(),
      },
      client,
    );

    if (certificate.status === 'PENDING') {
      await enqueueBackgroundJob(
        {
          jobType: 'GENERATE_CERTIFICATE',
          payload: { certificateId: certificate.id },
          maximumAttempts: 5,
        },
        client,
      );
      queuedCount += 1;
    }
  }

  return queuedCount;
}

export async function renderCertificate(certificateId: string): Promise<void> {
  const certificate = await getCertificateForGeneration(certificateId);

  if (!certificate) {
    return;
  }

  try {
    const template = await getPrivateObject(certificate.templateObjectKey);
    const approvedDate = certificate.validationCompletedAt
      ? formatBusinessDate(certificate.validationCompletedAt)
      : formatBusinessDate(new Date());
    const width = certificate.templateWidth;
    const height = certificate.templateHeight;
    const overlay = Buffer.from(`
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .name { fill: #0a1f44; font-family: Montserrat, Arial, sans-serif; font-size: ${Math.round(width * 0.052)}px; font-weight: 800; }
          .main { fill: #0a1f44; font-family: Montserrat, Arial, sans-serif; font-size: ${Math.round(width * 0.024)}px; font-weight: 700; }
          .meta { fill: #41506a; font-family: Montserrat, Arial, sans-serif; font-size: ${Math.round(width * 0.018)}px; font-weight: 600; }
        </style>
        <text class="name" x="50%" y="48%" text-anchor="middle">${escapeXml(certificate.participantName)}</text>
        <text class="main" x="50%" y="58%" text-anchor="middle">${escapeXml(certificate.eventName)} - ${escapeXml(certificate.categoryName)}</text>
        <text class="meta" x="50%" y="68%" text-anchor="middle">BIB ${escapeXml(certificate.bibNumber)} | ${escapeXml(certificate.certificateNumber)}</text>
        <text class="meta" x="50%" y="76%" text-anchor="middle">Divalidasi ${escapeXml(approvedDate)}</text>
      </svg>
    `);
    const output = await sharp(template)
      .composite([{ input: overlay }])
      .png()
      .toBuffer();
    const objectKey = `events/${certificate.eventId}/certificates/${certificate.id}.png`;

    await putPrivateObject({ objectKey, body: output, contentType: 'image/png' });
    await markCertificateGenerated({ certificateId, objectKey });
    await enqueueBackgroundJob({
      jobType: 'SEND_CERTIFICATE_EMAIL',
      payload: { certificateId },
      maximumAttempts: 5,
    });
  } catch (error) {
    await markCertificateFailed({
      certificateId,
      sanitizedError: sanitizedError(error),
    });
    throw error;
  }
}

export async function sendCertificateEmailForCertificate(
  certificateId: string,
): Promise<void> {
  const certificate = await getCertificateEmailData(certificateId);

  if (!certificate || !certificate.objectKey) {
    return;
  }

  const emailDeliveryId = await createEmailDelivery({
    eventRegistrationId: certificate.eventRegistrationId,
    recipientEmail: certificate.participantEmail,
    emailType: 'CERTIFICATE',
  });

  try {
    await sendCertificateEmail({
      to: certificate.participantEmail,
      participantName: certificate.participantName,
      eventName: certificate.eventName,
      categoryName: certificate.categoryName,
      certificateNumber: certificate.certificateNumber,
      contact: certificate.contact,
      certificateAttachment: {
        filename: certificateFilename(certificate.certificateNumber),
        contentType: 'image/png',
        content: await getPrivateObject(certificate.objectKey),
      },
    });
    await markEmailDeliverySent({
      eventRegistrationId: certificate.eventRegistrationId,
      emailDeliveryId,
      emailType: 'CERTIFICATE',
    });
    await markCertificateEmailed(certificateId);
  } catch (error) {
    await markCertificateFailed({
      certificateId,
      sanitizedError: sanitizedError(error),
    });
    await markEmailDeliveryFailed({
      eventRegistrationId: certificate.eventRegistrationId,
      emailDeliveryId,
      emailType: 'CERTIFICATE',
      sanitizedError: sanitizedError(error),
    });
    throw error;
  }
}

export async function invalidateCertificateAfterSubmissionRevision(
  submissionId: string,
  client?: PoolClient,
): Promise<void> {
  await invalidateActiveCertificateForSubmission(submissionId, client);
}
