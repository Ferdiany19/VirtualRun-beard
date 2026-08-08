import type { PoolClient } from 'pg';
import { query } from '@/db/pool';

export async function createEmailDelivery(
  input: {
    eventRegistrationId: string;
    recipientEmail: string;
    emailType:
      | 'REGISTRATION_CONFIRMATION'
      | 'REVISION_REQUEST'
      | 'SUBMISSION_APPROVED'
      | 'SUBMISSION_REJECTED'
      | 'SUBMISSION_DISQUALIFIED'
      | 'REVISED_SUBMISSION_RECEIVED'
      | 'CERTIFICATE';
  },
  client?: PoolClient,
): Promise<string> {
  const result = await query<{ id: string }>(
    `
      INSERT INTO email_deliveries (
        event_registration_id,
        recipient_email,
        email_type
      )
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [input.eventRegistrationId, input.recipientEmail, input.emailType],
    client,
  );

  return result.rows[0].id;
}

export async function markEmailDeliverySent(
  input:
    | {
        eventRegistrationId: string;
        emailDeliveryId?: string | null;
        emailType?: string;
      }
    | string,
  client?: PoolClient,
): Promise<void> {
  const eventRegistrationId =
    typeof input === 'string' ? input : input.eventRegistrationId;
  const emailDeliveryId =
    typeof input === 'string' ? null : (input.emailDeliveryId ?? null);
  const emailType =
    typeof input === 'string'
      ? 'REGISTRATION_CONFIRMATION'
      : (input.emailType ?? 'REGISTRATION_CONFIRMATION');

  await query(
    `
      UPDATE email_deliveries
      SET
        status = 'SENT',
        attempts = attempts + 1,
        sent_at = now(),
        updated_at = now()
      WHERE event_registration_id = $1
        AND email_type = $2
        AND ($3::uuid IS NULL OR id = $3::uuid)
    `,
    [eventRegistrationId, emailType, emailDeliveryId],
    client,
  );
}

export async function markEmailDeliveryFailed(
  input: {
    eventRegistrationId: string;
    sanitizedError: string;
    emailDeliveryId?: string | null;
    emailType?: string;
  },
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE email_deliveries
      SET
        status = 'FAILED',
        attempts = attempts + 1,
        last_error = $3,
        updated_at = now()
      WHERE event_registration_id = $1
        AND email_type = $2
        AND ($4::uuid IS NULL OR id = $4::uuid)
    `,
    [
      input.eventRegistrationId,
      input.emailType ?? 'REGISTRATION_CONFIRMATION',
      input.sanitizedError,
      input.emailDeliveryId ?? null,
    ],
    client,
  );
}
