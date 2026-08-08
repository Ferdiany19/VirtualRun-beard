import { describe, expect, it } from "vitest";
import { assertCategoryPolicy } from "@/modules/categories/category.policy";
import type { EventRecord } from "@/modules/events/event.types";
import {
  assertCanManageEvent,
  assertEventDatePolicy,
  createSlugSuggestion,
  getAccessibleTextColor,
  isEventPubliclyVisible,
} from "@/modules/events/event.policy";
import type { AuthenticatedAdmin } from "@/modules/auth/auth.types";

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "event-id",
    name: "Nusantara Virtual Run 2026",
    slug: "nusantara-virtual-run-2026",
    shortDescription: "Short description for virtual run event.",
    fullDescription: "Full description for virtual run event.",
    termsAndConditions: "Terms.",
    registrationInstructions: "Registration instructions.",
    uploadInstructions: "Upload instructions.",
    registrationStartsAt: new Date("2026-08-01T00:00:00+07:00"),
    registrationEndsAt: new Date("2026-08-31T23:59:00+07:00"),
    activityStartsAt: new Date("2026-09-01T00:00:00+07:00"),
    activityEndsAt: new Date("2026-09-30T23:59:00+07:00"),
    uploadStartsAt: new Date("2026-09-01T00:00:00+07:00"),
    uploadEndsAt: new Date("2026-10-03T23:59:00+07:00"),
    allowSameActivityAcrossCategories: false,
    timezone: "Asia/Jakarta",
    eventStatus: "SCHEDULED",
    publicationStatus: "PUBLISHED",
    bannerObjectKey: null,
    thumbnailObjectKey: null,
    registrationMode: "FREE",
    priceAmountCents: 0,
    priceCurrency: "IDR",
    maximumParticipants: null,
    contactEmail: null,
    contactPhone: null,
    contactWhatsapp: null,
    brandPrimaryColor: "#0f766e",
    faqItems: [],
    createdByAdminUserId: "creator-id",
    updatedByAdminUserId: null,
    assignedAdminUserIds: [],
    createdAt: new Date("2026-07-23T00:00:00Z"),
    updatedAt: new Date("2026-07-23T00:00:00Z"),
    ...overrides,
  };
}

function makeAdmin(overrides: Partial<AuthenticatedAdmin> = {}): AuthenticatedAdmin {
  return {
    id: "admin-id",
    normalizedEmail: "admin@beard.test",
    displayEmail: "admin@beard.test",
    fullName: "Admin",
    status: "ACTIVE",
    roles: ["EVENT_ADMIN"],
    createdAt: new Date("2026-07-23T00:00:00Z"),
    updatedAt: new Date("2026-07-23T00:00:00Z"),
    sessionId: "session-id",
    sessionExpiresAt: new Date("2026-07-24T00:00:00Z"),
    csrfTokenHash: "a".repeat(64),
    ...overrides,
  };
}

describe("event management policy", () => {
  it("validates rational event date windows", () => {
    expect(() =>
      assertEventDatePolicy({
        registrationStartsAt: new Date("2026-09-01T00:00:00+07:00"),
        registrationEndsAt: new Date("2026-08-31T23:59:00+07:00"),
        activityStartsAt: new Date("2026-09-01T00:00:00+07:00"),
        activityEndsAt: new Date("2026-09-30T23:59:00+07:00"),
        uploadStartsAt: new Date("2026-09-01T00:00:00+07:00"),
        uploadEndsAt: new Date("2026-10-03T23:59:00+07:00"),
      }),
    ).toThrow();
  });

  it("creates stable slug suggestions from Indonesian event names", () => {
    expect(createSlugSuggestion("  Nusantara Virtual Run 2026! ")).toBe(
      "nusantara-virtual-run-2026",
    );
  });

  it("keeps draft events out of public visibility", () => {
    expect(isEventPubliclyVisible(makeEvent({ publicationStatus: "DRAFT" }))).toBe(false);
    expect(isEventPubliclyVisible(makeEvent({ publicationStatus: "PUBLISHED" }))).toBe(true);
  });

  it("allows super admins and assigned event admins to manage events", () => {
    expect(() =>
      assertCanManageEvent(makeAdmin({ roles: ["SUPER_ADMIN"] }), makeEvent()),
    ).not.toThrow();
    expect(() =>
      assertCanManageEvent(
        makeAdmin({ id: "assigned-admin-id" }),
        makeEvent({ assignedAdminUserIds: ["assigned-admin-id"] }),
      ),
    ).not.toThrow();
  });

  it("rejects event admins without assignment or creator ownership", () => {
    expect(() => assertCanManageEvent(makeAdmin(), makeEvent())).toThrow();
  });

  it("validates category distance and age policy", () => {
    expect(() =>
      assertCategoryPolicy({
        name: "5K Challenge",
        slug: "5k-challenge",
        description: null,
        distanceMeters: 0,
        distanceToleranceMeters: 0,
        minimumAgeYears: null,
        maximumAgeYears: null,
        genderDivision: "OPEN",
        participantQuota: null,
        rankingEnabled: true,
        certificateEnabled: true,
        displayOrder: 1,
      }),
    ).toThrow();
  });

  it("chooses accessible CTA text color for event primary colors", () => {
    expect(getAccessibleTextColor("#0f766e")).toBe("#ffffff");
    expect(getAccessibleTextColor("#f8fafc")).toBe("#111827");
  });
});
