import { Pool } from 'pg';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { requireEnv } from '@/shared/config/env';
import { ApplicationError } from '@/shared/errors/application-error';

declare global {
  var virtualRunBeardPool: Pool | undefined;
}

function createPool() {
  const connectionString = requireEnv('DATABASE_URL');

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'virtual-run-beard',
  });
}

export function getPool(): Pool {
  try {
    if (!globalThis.virtualRunBeardPool) {
      globalThis.virtualRunBeardPool = createPool();
    }

    return globalThis.virtualRunBeardPool;
  } catch (error) {
    throw new ApplicationError({
      code: 'CONFIGURATION_MISSING',
      message: 'Database pool could not be created',
      safeMessage: 'Konfigurasi database belum tersedia.',
      statusCode: 500,
      cause: error,
    });
  }
}

export async function query<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
  client?: PoolClient,
): Promise<QueryResult<T>> {
  const executor = client ?? getPool();
  return executor.query<T>(text, values);
}
