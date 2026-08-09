import type { EventCategoryRecord } from "@/modules/categories/category.types";
import type { EventRecord } from "@/modules/events/event.types";
import { formatBusinessDate, formatBusinessDateTime } from "@/shared/date/business-timezone";

export function resolveEventImageSrc(event: EventRecord): string | null {
  const candidate = event.thumbnailObjectKey ?? event.bannerObjectKey;

  if (candidate?.startsWith("/")) {
    return candidate;
  }

  if (candidate) {
    return `/api/public/events/${event.slug}/banner`;
  }

  return null;
}

export function resolveAdminEventImageSrc(event: EventRecord): string | null {
  const candidate = event.thumbnailObjectKey ?? event.bannerObjectKey;

  if (candidate?.startsWith("/")) {
    return candidate;
  }

  if (candidate) {
    return `/api/admin/events/${event.id}/banner`;
  }

  return null;
}

export function resolveEventBannerSrc(event: EventRecord): string | null {
  if (event.bannerObjectKey?.startsWith("/")) {
    return event.bannerObjectKey;
  }

  if (event.bannerObjectKey) {
    return `/api/public/events/${event.slug}/banner`;
  }

  return resolveEventImageSrc(event);
}

export function resolveAdminEventBannerSrc(event: EventRecord): string | null {
  if (event.bannerObjectKey?.startsWith("/")) {
    return event.bannerObjectKey;
  }

  if (event.bannerObjectKey) {
    return `/api/admin/events/${event.id}/banner`;
  }

  return resolveAdminEventImageSrc(event);
}

export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }

  const kilometers = distanceMeters / 1000;

  if (Number.isInteger(kilometers)) {
    return `${kilometers}K`;
  }

  return `${kilometers.toFixed(1).replace(/\.0$/, "")}K`;
}

export function formatCategorySummary(categories: EventCategoryRecord[]): string {
  if (categories.length === 0) {
    return "Belum ada kategori aktif";
  }

  return categories
    .slice(0, 3)
    .map((category) => formatDistance(category.distanceMeters))
    .join(" - ");
}

export function formatDateRange(start: Date, end: Date): string {
  return `${formatBusinessDate(start)} - ${formatBusinessDate(end)}`;
}

export function formatDateTimeRange(start: Date, end: Date): string {
  return `${formatBusinessDateTime(start)} - ${formatBusinessDateTime(end)} WIB`;
}

export function eventStatusLabel(status: EventRecord["eventStatus"]): string {
  const labels: Record<EventRecord["eventStatus"], string> = {
    DRAFT: "Draft",
    SCHEDULED: "Terjadwal",
    REGISTRATION_OPEN: "Pendaftaran dibuka",
    REGISTRATION_CLOSED: "Pendaftaran ditutup",
    ACTIVITY_OPEN: "Periode lari",
    UPLOAD_OPEN: "Upload dibuka",
    REVIEW: "Review hasil",
    COMPLETED: "Selesai",
    ARCHIVED: "Diarsipkan",
  };

  return labels[status];
}

export function publicationStatusLabel(status: EventRecord["publicationStatus"]): string {
  const labels: Record<EventRecord["publicationStatus"], string> = {
    DRAFT: "Draft",
    PUBLISHED: "Published",
    UNPUBLISHED: "Unpublished",
    ARCHIVED: "Archived",
  };

  return labels[status];
}
