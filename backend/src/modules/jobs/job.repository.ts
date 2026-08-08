import type { PoolClient } from 'pg';
import { query } from '@/db/pool';

export type BackgroundJobType =
  | 'GENERATE_BIB'
  | 'SEND_REGISTRATION_CONFIRMATION'
  | 'CLEAN_EXPIRED_UPLOADS'
  | 'SEND_REVISION_REQUEST_NOTIFICATION'
  | 'SEND_SUBMISSION_APPROVED_NOTIFICATION'
  | 'SEND_SUBMISSION_REJECTED_NOTIFICATION'
  | 'SEND_SUBMISSION_DISQUALIFIED_NOTIFICATION'
  | 'SEND_REVISED_SUBMISSION_RECEIVED_NOTIFICATION'
  | 'GENERATE_CERTIFICATE'
  | 'SEND_CERTIFICATE_EMAIL';
export type BackgroundJobStatus =
  'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD';

export type BackgroundJob = {
  id: string;
  jobType: BackgroundJobType;
  payload: Record<string, unknown>;
  status: BackgroundJobStatus;
  attempts: number;
  maximumAttempts: number;
};

type BackgroundJobRow = {
  id: string;
  job_type: BackgroundJobType;
  payload: Record<string, unknown>;
  status: BackgroundJobStatus;
  attempts: number;
  maximum_attempts: number;
};

function mapJob(row: BackgroundJobRow): BackgroundJob {
  return {
    id: row.id,
    jobType: row.job_type,
    payload: row.payload,
    status: row.status,
    attempts: row.attempts,
    maximumAttempts: row.maximum_attempts,
  };
}

export async function enqueueBackgroundJob(
  input: {
    jobType: BackgroundJobType;
    payload: Record<string, unknown>;
    availableAt?: Date;
    maximumAttempts?: number;
  },
  client?: PoolClient,
): Promise<string> {
  const result = await query<{ id: string }>(
    `
      INSERT INTO background_jobs (
        job_type,
        payload,
        available_at,
        maximum_attempts
      )
      VALUES ($1, $2::jsonb, COALESCE($3, now()), COALESCE($4, 5))
      RETURNING id
    `,
    [
      input.jobType,
      JSON.stringify(input.payload),
      input.availableAt ?? null,
      input.maximumAttempts ?? null,
    ],
    client,
  );

  return result.rows[0].id;
}

export async function claimNextBackgroundJob(
  workerId: string,
  client?: PoolClient,
): Promise<BackgroundJob | null> {
  const result = await query<BackgroundJobRow>(
    `
      WITH next_job AS (
        SELECT id
        FROM background_jobs
        WHERE (
            status IN ('PENDING', 'FAILED')
            OR (
              status = 'PROCESSING'
              AND locked_at < now() - interval '5 minutes'
            )
          )
          AND available_at <= now()
          AND attempts < maximum_attempts
        ORDER BY available_at ASC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE background_jobs bj
      SET
        status = 'PROCESSING',
        attempts = bj.attempts + 1,
        locked_at = now(),
        locked_by = $1,
        updated_at = now()
      FROM next_job
      WHERE bj.id = next_job.id
      RETURNING
        bj.id,
        bj.job_type,
        bj.payload,
        bj.status,
        bj.attempts,
        bj.maximum_attempts
    `,
    [workerId],
    client,
  );

  return result.rows[0] ? mapJob(result.rows[0]) : null;
}

export async function markBackgroundJobCompleted(
  jobId: string,
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE background_jobs
      SET
        status = 'COMPLETED',
        completed_at = now(),
        locked_at = NULL,
        locked_by = NULL,
        updated_at = now()
      WHERE id = $1
    `,
    [jobId],
    client,
  );
}

export async function markBackgroundJobFailed(
  input: { jobId: string; sanitizedError: string; retryDelaySeconds: number },
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE background_jobs
      SET
        status = CASE
          WHEN attempts >= maximum_attempts THEN 'DEAD'
          ELSE 'FAILED'
        END,
        last_error = $2,
        available_at = now() + ($3::text || ' seconds')::interval,
        locked_at = NULL,
        locked_by = NULL,
        updated_at = now()
      WHERE id = $1
    `,
    [input.jobId, input.sanitizedError, input.retryDelaySeconds],
    client,
  );
}
