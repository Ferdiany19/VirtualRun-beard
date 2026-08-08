import { randomUUID } from 'node:crypto';
import { withTransaction } from '@/db/transaction';
import {
  claimNextBackgroundJob,
  enqueueBackgroundJob,
  markBackgroundJobCompleted,
  markBackgroundJobFailed,
  type BackgroundJob,
} from '@/modules/jobs/job.repository';
import { renderBibForRegistration } from '@/modules/bib/bib.service';
import {
  findLatestEncryptedRegistrationCode,
  getRegistrationSummary,
  updateRegistrationBibStatus,
  updateRegistrationEmailStatus,
} from '@/modules/registrations/registration.repository';
import {
  createEmailDelivery,
  markEmailDeliveryFailed,
  markEmailDeliverySent,
} from '@/modules/email/email.repository';
import { sendRegistrationConfirmationEmail } from '@/modules/email/email.service';
import { cleanExpiredUploads } from '@/modules/submissions/submission.service';
import { sendSubmissionValidationEmail } from '@/modules/email/email.service';
import { getValidationNotificationSummary } from '@/modules/validation/validation.service';
import { getPrivateObject } from '@/modules/storage/storage.service';
import { decryptString } from '@/shared/security/encryption';
import { formatDateRange } from '@/modules/events/components/event-display';
import { env } from '@/shared/config/env';
import { isApplicationError } from '@/shared/errors/application-error';
import { logger } from '@/shared/logging/logger';

let shuttingDown = false;
const workerId = `worker-${randomUUID()}`;

function requestShutdown(signal: NodeJS.Signals) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info('Worker shutdown requested', { signal });
  process.exitCode = 0;
}

process.on('SIGINT', requestShutdown);
process.on('SIGTERM', requestShutdown);

logger.info('Worker foundation started', {
  handlersRegistered: 8,
  workerId,
});

function sanitizedError(error: unknown): string {
  return error instanceof Error
    ? error.message.slice(0, 240)
    : 'Unknown worker error';
}

function payloadString(job: BackgroundJob, key: string): string {
  const value = job.payload[key];

  if (typeof value !== 'string') {
    throw new Error(`Job payload missing ${key}`);
  }

  return value;
}

function optionalPayloadString(job: BackgroundJob, key: string): string | null {
  const value = job.payload[key];
  return typeof value === 'string' ? value : null;
}

function bibAttachmentFilename(bibNumber: string): string {
  return `bib-${bibNumber.replace(/[^a-zA-Z0-9._-]/g, '-')}.png`;
}

async function handleGenerateBib(job: BackgroundJob): Promise<void> {
  const registrationId = payloadString(job, 'registrationId');
  const force = job.payload.force === true;
  const emailAfterGenerate = job.payload.emailAfterGenerate === true;

  try {
    await renderBibForRegistration(registrationId, { force });

    if (emailAfterGenerate) {
      await enqueueRegistrationEmailAfterBib(registrationId);
    }
  } catch (error) {
    if (isApplicationError(error) && error.code === 'CONFIGURATION_MISSING') {
      await updateRegistrationBibStatus({
        registrationId,
        bibStatus: 'FAILED',
        bibError: error.safeMessage,
      });
      return;
    }

    await updateRegistrationBibStatus({
      registrationId,
      bibStatus: 'FAILED',
      bibError: sanitizedError(error),
    });
    throw error;
  }
}

async function enqueueRegistrationEmailAfterBib(
  registrationId: string,
): Promise<void> {
  await withTransaction(async (client) => {
    const summary = await getRegistrationSummary(registrationId, client);

    if (!summary) {
      throw new Error('Registration summary not found after BIB generation');
    }

    const encryptedRegistrationCode = await findLatestEncryptedRegistrationCode(
      registrationId,
      client,
    );

    if (!encryptedRegistrationCode) {
      logger.warn(
        'Registration email after BIB skipped because code is unavailable',
        {
          registrationId,
        },
      );
      return;
    }

    const emailDeliveryId = await createEmailDelivery(
      {
        eventRegistrationId: registrationId,
        recipientEmail: summary.participant.normalizedEmail,
        emailType: 'REGISTRATION_CONFIRMATION',
      },
      client,
    );

    await enqueueBackgroundJob(
      {
        jobType: 'SEND_REGISTRATION_CONFIRMATION',
        payload: {
          registrationId,
          encryptedRegistrationCode,
          emailDeliveryId,
        },
      },
      client,
    );
  });
}

async function handleRegistrationEmail(job: BackgroundJob): Promise<void> {
  const registrationId = payloadString(job, 'registrationId');
  const emailDeliveryId = optionalPayloadString(job, 'emailDeliveryId');
  const registrationCode = decryptString(
    payloadString(job, 'encryptedRegistrationCode'),
  );
  const summary = await getRegistrationSummary(registrationId);

  if (!summary) {
    throw new Error('Registration summary not found');
  }

  try {
    const bibAttachment = summary.bibObjectKey
      ? {
          filename: bibAttachmentFilename(summary.registration.bibNumber),
          contentType: 'image/png',
          content: await getPrivateObject(summary.bibObjectKey),
        }
      : null;

    await sendRegistrationConfirmationEmail({
      to: summary.participant.normalizedEmail,
      participantName: summary.participant.fullName,
      eventName: summary.event.name,
      registrationCode,
      bibNumber: summary.registration.bibNumber,
      categories: summary.categories.map((category) => category.name),
      eventPeriod: formatDateRange(
        summary.event.activityStartsAt,
        summary.event.activityEndsAt,
      ),
      participantAccessUrl: `${env.APP_URL}/events/${summary.event.slug}/participant`,
      bibStatus: summary.registration.bibStatus,
      contact:
        summary.event.contactEmail ??
        summary.event.contactWhatsapp ??
        summary.event.contactPhone ??
        'Kontak organizer belum tersedia',
      bibAttachment,
    });
    await withTransaction(async (client) => {
      await markEmailDeliverySent(
        { eventRegistrationId: registrationId, emailDeliveryId },
        client,
      );
      await updateRegistrationEmailStatus(
        { registrationId, emailStatus: 'SENT' },
        client,
      );
    });
  } catch (error) {
    await withTransaction(async (client) => {
      await markEmailDeliveryFailed(
        {
          eventRegistrationId: registrationId,
          emailDeliveryId,
          sanitizedError: sanitizedError(error),
        },
        client,
      );
      await updateRegistrationEmailStatus(
        { registrationId, emailStatus: 'FAILED' },
        client,
      );
    });
    throw error;
  }
}

async function handleCleanExpiredUploads(): Promise<void> {
  const cleanedCount = await cleanExpiredUploads();
  logger.info('Expired upload cleanup finished', { cleanedCount });
}

async function handleSubmissionValidationEmail(
  job: BackgroundJob,
): Promise<void> {
  const submissionId = payloadString(job, 'submissionId');
  const reviewIdValue = job.payload.reviewId;
  const summary = await getValidationNotificationSummary({
    submissionId,
    reviewId: typeof reviewIdValue === 'string' ? reviewIdValue : null,
  });

  await sendSubmissionValidationEmail({
    to: summary.recipientEmail,
    participantName: summary.participantName,
    eventName: summary.eventName,
    categoryName: summary.categoryName,
    status: summary.status,
    participantVisibleNote: summary.participantVisibleNote,
    participantAccessUrl: `${env.APP_URL}/events/${summary.eventSlug}/participant`,
    contact: summary.contact,
  });
}

async function handleJob(job: BackgroundJob): Promise<void> {
  if (job.jobType === 'GENERATE_BIB') {
    await handleGenerateBib(job);
    return;
  }

  if (job.jobType === 'SEND_REGISTRATION_CONFIRMATION') {
    await handleRegistrationEmail(job);
    return;
  }

  if (job.jobType === 'CLEAN_EXPIRED_UPLOADS') {
    await handleCleanExpiredUploads();
    return;
  }

  if (
    job.jobType === 'SEND_REVISION_REQUEST_NOTIFICATION' ||
    job.jobType === 'SEND_SUBMISSION_APPROVED_NOTIFICATION' ||
    job.jobType === 'SEND_SUBMISSION_REJECTED_NOTIFICATION' ||
    job.jobType === 'SEND_SUBMISSION_DISQUALIFIED_NOTIFICATION' ||
    job.jobType === 'SEND_REVISED_SUBMISSION_RECEIVED_NOTIFICATION'
  ) {
    await handleSubmissionValidationEmail(job);
    return;
  }

  throw new Error('Unhandled job type');
}

async function pollOnce(): Promise<boolean> {
  const job = await withTransaction((client) =>
    claimNextBackgroundJob(workerId, client),
  );

  if (!job) {
    return false;
  }

  try {
    await handleJob(job);
    await markBackgroundJobCompleted(job.id);
  } catch (error) {
    await markBackgroundJobFailed({
      jobId: job.id,
      sanitizedError: sanitizedError(error),
      retryDelaySeconds: Math.min(900, 30 * job.attempts),
    });
    logger.error('Worker job failed', {
      jobId: job.id,
      jobType: job.jobType,
      message: sanitizedError(error),
    });
  }

  return true;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  while (!shuttingDown) {
    const processed = await pollOnce();

    if (!processed) {
      await sleep(2_000);
    }
  }
}

main().catch((error: unknown) => {
  logger.error('Worker crashed', {
    message: sanitizedError(error),
  });
  process.exitCode = 1;
});
