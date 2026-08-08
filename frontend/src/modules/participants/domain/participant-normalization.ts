import { ApplicationError } from "@/shared/errors/application-error";

export function normalizeEmail(input: string): string {
  const normalizedEmail = input.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new ApplicationError({
      code: "VALIDATION_FAILED",
      message: "Invalid participant email",
      safeMessage: "Alamat email belum valid.",
      statusCode: 400,
    });
  }

  return normalizedEmail;
}

export function normalizeIndonesianPhone(input: string): string {
  const compact = input.trim().replace(/[\s\-()]/g, "");
  let normalizedPhone = compact;

  if (compact.startsWith("08")) {
    normalizedPhone = `+62${compact.slice(1)}`;
  } else if (compact.startsWith("628")) {
    normalizedPhone = `+${compact}`;
  }

  if (!/^\+628\d{7,12}$/.test(normalizedPhone)) {
    throw new ApplicationError({
      code: "VALIDATION_FAILED",
      message: "Invalid Indonesian phone number",
      safeMessage: "Nomor HP Indonesia belum valid.",
      statusCode: 400,
    });
  }

  return normalizedPhone;
}
