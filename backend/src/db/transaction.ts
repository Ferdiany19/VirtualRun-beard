import type { PoolClient } from 'pg';
import { getPool } from '@/db/pool';

export async function withTransaction<T>(
  operation: (client: PoolClient) => Promise<T>,
  existingClient?: PoolClient,
): Promise<T> {
  if (existingClient) {
    return operation(existingClient);
  }

  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
