import { describe, expect, it } from "vitest";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { loadMigrationFiles, runMigrations } from "@/db/migrate";

const migrationsDirectory = path.join(process.cwd(), "src", "db", "migrations");

describe("database migrations", () => {
  it("uses sequential migration numbers and descriptive names", async () => {
    const migrationFiles = await loadMigrationFiles(migrationsDirectory);

    expect(migrationFiles.length).toBeGreaterThan(0);

    migrationFiles.forEach((migration, index) => {
      expect(migration.version).toBe(index + 1);
      expect(migration.name).toMatch(/^[a-z0-9_]+$/);
      expect(migration.sql).toContain(";");
    });
  });
});

const describeWithDatabase = process.env.INTEGRATION_DATABASE_URL ? describe : describe.skip;

function quoteIdentifier(identifier: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe test schema identifier: ${identifier}`);
  }

  return `"${identifier}"`;
}

describeWithDatabase("database migration runner", () => {
  it("applies all migrations in an isolated schema", async () => {
    const migrationFiles = await loadMigrationFiles(migrationsDirectory);
    const schemaName = `vrb_test_${randomUUID().replace(/-/g, "_")}`;
    const quotedSchemaName = quoteIdentifier(schemaName);
    const pool = new Pool({
      connectionString: process.env.INTEGRATION_DATABASE_URL,
      options: `-c search_path=${schemaName},public`,
    });

    try {
      await pool.query(`CREATE SCHEMA ${quotedSchemaName}`);
      await runMigrations({ migrationsDirectory, pool });

      const result = await pool.query<{ applied_count: string }>(
        `
          SELECT count(version)::text AS applied_count
          FROM schema_migrations
        `,
      );

      expect(result.rows[0]?.applied_count).toBe(String(migrationFiles.length));
    } finally {
      await pool.query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
      await pool.end();
    }
  });
});
