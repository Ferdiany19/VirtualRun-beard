import { randomUUID } from "node:crypto";
import path from "node:path";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { runMigrations } from "@/db/migrate";
import { createAuditLog } from "@/modules/audit/audit.repository";
import {
  createAdminSession,
  ensureAdminRole,
  upsertDevelopmentAdminUser,
} from "@/modules/auth/auth.repository";
import { hashAdminPassword } from "@/modules/auth/password";
import { createCategory, listCategoriesByEventId } from "@/modules/categories/category.repository";
import type { CategoryInput } from "@/modules/categories/category.types";
import {
  createEvent,
  getPublishedEventBySlug,
  listEventsForAdmin,
  setEventPublicationAndStatus,
} from "@/modules/events/event.repository";
import type { EventInput } from "@/modules/events/event.types";
import { hashSensitiveToken } from "@/shared/security/token";

const describeWithDatabase = process.env.INTEGRATION_DATABASE_URL ? describe : describe.skip;
const migrationsDirectory = path.join(process.cwd(), "src", "db", "migrations");

function quoteIdentifier(identifier: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe test schema identifier: ${identifier}`);
  }

  return `"${identifier}"`;
}

async function withIsolatedPool<T>(operation: (pool: Pool) => Promise<T>): Promise<T> {
  const schemaName = `vrb_slice_${randomUUID().replace(/-/g, "_")}`;
  const quotedSchemaName = quoteIdentifier(schemaName);
  const pool = new Pool({
    connectionString: process.env.INTEGRATION_DATABASE_URL,
    options: `-c search_path=${schemaName},public`,
  });

  try {
    await pool.query(`CREATE SCHEMA ${quotedSchemaName}`);
    await runMigrations({ migrationsDirectory, pool });
    return await operation(pool);
  } finally {
    await pool.query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
    await pool.end();
  }
}

const baseEventInput: EventInput = {
  name: "Integration Virtual Run",
  slug: "integration-virtual-run",
  shortDescription: "Virtual run integration event with realistic copy.",
  fullDescription:
    "Event ini digunakan untuk memastikan repository event berjalan dengan PostgreSQL nyata.",
  termsAndConditions: "Peserta wajib mengikuti ketentuan event yang berlaku.",
  registrationInstructions: "Peserta memilih kategori dan mengisi data saat fitur tersedia.",
  uploadInstructions: "Peserta mengunggah hasil saat fitur upload tersedia.",
  registrationStartsAt: new Date("2026-08-01T00:00:00+07:00"),
  registrationEndsAt: new Date("2026-08-31T23:59:00+07:00"),
  activityStartsAt: new Date("2026-09-01T00:00:00+07:00"),
  activityEndsAt: new Date("2026-09-30T23:59:00+07:00"),
  uploadStartsAt: new Date("2026-09-01T00:00:00+07:00"),
  uploadEndsAt: new Date("2026-10-03T23:59:00+07:00"),
  bannerObjectKey: null,
  thumbnailObjectKey: null,
  maximumParticipants: null,
  contactEmail: "organizer@beard.test",
  contactPhone: "+6281234567890",
  contactWhatsapp: "+6281234567890",
  brandPrimaryColor: "#0f766e",
  faqItems: [],
};

const baseCategoryInput: CategoryInput = {
  name: "5K Challenge",
  slug: "5k-challenge",
  description: "Kategori integration test.",
  distanceMeters: 5_000,
  distanceToleranceMeters: 100,
  minimumAgeYears: null,
  maximumAgeYears: null,
  genderDivision: "OPEN",
  participantQuota: null,
  rankingEnabled: true,
  certificateEnabled: true,
  displayOrder: 1,
};

describeWithDatabase("admin event vertical slice repositories", () => {
  it("creates admin session, event, category, audit log, and public visibility safely", async () => {
    await withIsolatedPool(async (pool) => {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        const admin = await upsertDevelopmentAdminUser(
          {
            normalizedEmail: "admin@beard.test",
            displayEmail: "admin@beard.test",
            fullName: "Integration Admin",
            passwordHash: await hashAdminPassword("ChangeMe!2026"),
          },
          client,
        );
        await ensureAdminRole(admin.id, "SUPER_ADMIN", client);
        await createAdminSession(
          {
            adminUserId: admin.id,
            sessionTokenHash: hashSensitiveToken("session-token"),
            csrfTokenHash: hashSensitiveToken("csrf-token"),
            expiresAt: new Date(Date.now() + 60 * 60_000),
          },
          client,
        );

        const event = await createEvent(baseEventInput, admin.id, client);
        const draftPublicEvent = await getPublishedEventBySlug(event.slug, client);
        expect(draftPublicEvent).toBeNull();

        await createCategory(event.id, baseCategoryInput, client);
        await setEventPublicationAndStatus(event.id, "PUBLISHED", "SCHEDULED", admin.id, client);
        await createAuditLog(
          {
            actorType: "ADMIN_USER",
            actorId: admin.id,
            action: "EVENT_PUBLISHED",
            entityType: "EVENT",
            entityId: event.id,
            eventId: event.id,
          },
          client,
        );

        const publishedEvent = await getPublishedEventBySlug(event.slug, client);
        const categories = await listCategoriesByEventId(event.id, client);
        const searchedEvents = await listEventsForAdmin(
          { id: admin.id, roles: ["SUPER_ADMIN"] },
          { search: "integration%' OR '1'='1", eventStatus: null },
          client,
        );

        expect(publishedEvent?.id).toBe(event.id);
        expect(categories).toHaveLength(1);
        expect(searchedEvents).toHaveLength(0);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    });
  });

  it("rolls back category creation when a duplicate category slug fails", async () => {
    await withIsolatedPool(async (pool) => {
      const client = await pool.connect();

      try {
        const admin = await upsertDevelopmentAdminUser(
          {
            normalizedEmail: "admin@beard.test",
            displayEmail: "admin@beard.test",
            fullName: "Integration Admin",
            passwordHash: await hashAdminPassword("ChangeMe!2026"),
          },
          client,
        );
        const event = await createEvent(baseEventInput, admin.id, client);

        await client.query("BEGIN");
        await createCategory(event.id, baseCategoryInput, client);
        await expect(createCategory(event.id, baseCategoryInput, client)).rejects.toMatchObject({
          code: "23505",
        });
        await client.query("ROLLBACK");

        const categories = await listCategoriesByEventId(event.id, client);
        expect(categories).toHaveLength(0);
      } finally {
        client.release();
      }
    });
  });
});
