import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import { requireEnv } from '../shared/config/env';
import { logger } from '../shared/logging/logger';

type MigrationFile = {
  version: number;
  name: string;
  filename: string;
  checksum: string;
  sql: string;
};

type AppliedMigration = {
  version: number;
  name: string;
  checksum: string;
};

const MIGRATION_LOCK_NAMESPACE = 72_001;
const MIGRATION_LOCK_KEY = 20_260_723;

function parseMigrationFilename(
  filename: string,
): { version: number; name: string } | null {
  const match = /^(\d{3})_([a-z0-9_]+)\.sql$/.exec(filename);

  if (!match) {
    return null;
  }

  return {
    version: Number.parseInt(match[1], 10),
    name: match[2],
  };
}

function checksumSql(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

export async function loadMigrationFiles(
  migrationsDirectory: string,
): Promise<MigrationFile[]> {
  const filenames = await readdir(migrationsDirectory);
  const migrationFiles: MigrationFile[] = [];

  for (const filename of filenames.sort()) {
    const parsed = parseMigrationFilename(filename);

    if (!parsed) {
      continue;
    }

    const sql = await readFile(
      path.join(migrationsDirectory, filename),
      'utf8',
    );
    migrationFiles.push({
      version: parsed.version,
      name: parsed.name,
      filename,
      checksum: checksumSql(sql),
      sql,
    });
  }

  return migrationFiles;
}

async function ensureSchemaMigrations(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version integer PRIMARY KEY,
      name text NOT NULL,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(
  client: PoolClient,
): Promise<Map<number, AppliedMigration>> {
  const result = await client.query<AppliedMigration>(
    `
      SELECT version, name, checksum
      FROM schema_migrations
      ORDER BY version ASC
    `,
  );

  return new Map(result.rows.map((row) => [row.version, row]));
}

function assertMigrationIntegrity(
  migrationFiles: MigrationFile[],
  appliedMigrations: Map<number, AppliedMigration>,
) {
  for (const migration of migrationFiles) {
    const applied = appliedMigrations.get(migration.version);

    if (!applied) {
      continue;
    }

    if (
      applied.name !== migration.name ||
      applied.checksum !== migration.checksum
    ) {
      throw new Error(
        `Applied migration ${migration.version} differs from local file ${migration.filename}`,
      );
    }
  }
}

async function applyMigration(client: PoolClient, migration: MigrationFile) {
  await client.query('BEGIN');

  try {
    await client.query(migration.sql);
    await client.query(
      `
        INSERT INTO schema_migrations (version, name, checksum)
        VALUES ($1, $2, $3)
      `,
      [migration.version, migration.name, migration.checksum],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function runMigrations(input?: {
  migrationsDirectory?: string;
  pool?: Pool;
}) {
  const migrationsDirectory =
    input?.migrationsDirectory ?? path.join(__dirname, 'migrations');
  const pool =
    input?.pool ?? new Pool({ connectionString: requireEnv('DATABASE_URL') });
  const client = await pool.connect();
  const createdPool = !input?.pool;

  try {
    await client.query('SELECT pg_advisory_lock($1, $2) AS locked', [
      MIGRATION_LOCK_NAMESPACE,
      MIGRATION_LOCK_KEY,
    ]);
    await ensureSchemaMigrations(client);

    const migrationFiles = await loadMigrationFiles(migrationsDirectory);
    const appliedMigrations = await getAppliedMigrations(client);
    assertMigrationIntegrity(migrationFiles, appliedMigrations);

    for (const migration of migrationFiles) {
      if (appliedMigrations.has(migration.version)) {
        logger.info('Skipping applied migration', {
          version: migration.version,
          name: migration.name,
        });
        continue;
      }

      logger.info('Applying migration', {
        version: migration.version,
        name: migration.name,
      });
      await applyMigration(client, migration);
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1, $2) AS unlocked', [
      MIGRATION_LOCK_NAMESPACE,
      MIGRATION_LOCK_KEY,
    ]);
    client.release();

    if (createdPool) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migrations completed');
    })
    .catch((error: unknown) => {
      logger.error('Migration failed', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exitCode = 1;
    });
}
