import { ApplicationError } from "@/shared/errors/application-error";

export const BUSINESS_TIMEZONE = "Asia/Jakarta";
export const BUSINESS_TIMEZONE_LABEL = "WIB";

export function formatBusinessDateTime(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: BUSINESS_TIMEZONE,
  }).format(date);
}

export function formatBusinessDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: BUSINESS_TIMEZONE,
  }).format(date);
}

export function parseJakartaDateTimeLocal(value: string): Date {
  const trimmedValue = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmedValue)) {
    throw new ApplicationError({
      code: "VALIDATION_FAILED",
      message: "Invalid local datetime format",
      safeMessage: "Format tanggal belum valid.",
      statusCode: 400,
    });
  }

  const date = new Date(`${trimmedValue}:00+07:00`);

  if (Number.isNaN(date.getTime())) {
    throw new ApplicationError({
      code: "VALIDATION_FAILED",
      message: "Invalid local datetime value",
      safeMessage: "Nilai tanggal belum valid.",
      statusCode: 400,
    });
  }

  return date;
}

export function toJakartaDateTimeLocalValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: BUSINESS_TIMEZONE,
  }).formatToParts(date);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "00";

  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function getRelativeScheduleState(now: Date, startsAt: Date, endsAt: Date): string {
  if (now < startsAt) {
    return "Belum dimulai";
  }

  if (now > endsAt) {
    return "Selesai";
  }

  return "Sedang berlangsung";
}
