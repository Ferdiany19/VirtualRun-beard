import type { AuthenticatedAdmin } from "@/modules/auth/auth.types";
import { canTransitionEventStatus } from "@/modules/events/domain/event-status";
import type { EventInput, EventRecord } from "@/modules/events/event.types";
import { ApplicationError } from "@/shared/errors/application-error";

export function createSlugSuggestion(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 120);
}

export function assertEventDatePolicy(
  input: Pick<
    EventInput,
    | "registrationStartsAt"
    | "registrationEndsAt"
    | "activityStartsAt"
    | "activityEndsAt"
    | "uploadStartsAt"
    | "uploadEndsAt"
  >,
): void {
  if (input.registrationStartsAt > input.registrationEndsAt) {
    throw new ApplicationError({
      code: "VALIDATION_FAILED",
      message: "Registration start is after registration end",
      safeMessage: "Tanggal mulai pendaftaran tidak boleh setelah tanggal akhir pendaftaran.",
      statusCode: 400,
    });
  }

  if (input.activityStartsAt > input.activityEndsAt) {
    throw new ApplicationError({
      code: "VALIDATION_FAILED",
      message: "Activity start is after activity end",
      safeMessage: "Tanggal mulai aktivitas tidak boleh setelah tanggal akhir aktivitas.",
      statusCode: 400,
    });
  }

  if (input.uploadStartsAt > input.uploadEndsAt) {
    throw new ApplicationError({
      code: "VALIDATION_FAILED",
      message: "Upload start is after upload end",
      safeMessage: "Tanggal mulai upload tidak boleh setelah tanggal batas upload.",
      statusCode: 400,
    });
  }

  if (input.registrationStartsAt > input.activityEndsAt) {
    throw new ApplicationError({
      code: "VALIDATION_FAILED",
      message: "Registration starts after activity ends",
      safeMessage: "Periode pendaftaran harus masih masuk akal terhadap periode aktivitas.",
      statusCode: 400,
    });
  }

  if (input.uploadEndsAt < input.activityStartsAt) {
    throw new ApplicationError({
      code: "VALIDATION_FAILED",
      message: "Upload ends before activity starts",
      safeMessage: "Batas upload tidak boleh sebelum periode aktivitas dimulai.",
      statusCode: 400,
    });
  }
}

export function isEventPubliclyVisible(
  event: Pick<EventRecord, "eventStatus" | "publicationStatus" | "publicVisibilityEnabled">,
): boolean {
  return (
    event.publicationStatus === "PUBLISHED" &&
    event.eventStatus !== "ARCHIVED" &&
    event.publicVisibilityEnabled !== false
  );
}

export function assertCanManageEvent(
  admin: AuthenticatedAdmin,
  event: Pick<EventRecord, "createdByAdminUserId" | "assignedAdminUserIds">,
): void {
  void admin;
  void event;
}

export function assertCanArchiveEvent(event: EventRecord): void {
  if (!canTransitionEventStatus(event.eventStatus, "ARCHIVED")) {
    throw new ApplicationError({
      code: "VALIDATION_FAILED",
      message: `Event status ${event.eventStatus} cannot transition to ARCHIVED`,
      safeMessage: "Event tidak dapat diarsipkan dari status saat ini.",
      statusCode: 400,
    });
  }
}

export function assertCanCompleteEvent(event: EventRecord): void {
  if (!canTransitionEventStatus(event.eventStatus, "COMPLETED")) {
    throw new ApplicationError({
      code: "VALIDATION_FAILED",
      message: `Event status ${event.eventStatus} cannot transition to COMPLETED`,
      safeMessage: "Event hanya dapat diselesaikan dari fase review.",
      statusCode: 400,
    });
  }
}

export function getAccessibleTextColor(backgroundHex: string): "#111827" | "#ffffff" {
  const normalized = backgroundHex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  const transform = (value: number) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const luminance = 0.2126 * transform(red) + 0.7152 * transform(green) + 0.0722 * transform(blue);

  return luminance > 0.42 ? "#111827" : "#ffffff";
}
