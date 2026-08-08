"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { parsePublicRegistrationFormData } from "@/modules/registrations/registration.schema";
import { registerParticipantForEvent } from "@/modules/registrations/registration.service";
import { setParticipantSessionCookie } from "@/modules/registrations/participant-session";
import { getRequestContext } from "@/shared/http/request-context";
import { isApplicationError } from "@/shared/errors/application-error";

type ZodLikeIssue = {
  path?: Array<string | number>;
  message?: string;
};

function zodIssues(error: unknown): ZodLikeIssue[] | null {
  if (error instanceof ZodError) {
    return error.issues;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown }).issues)
  ) {
    return (error as { issues: ZodLikeIssue[] }).issues;
  }

  return null;
}

function errorCode(error: unknown): string {
  if (isApplicationError(error)) {
    return error.code === "RATE_LIMITED" ? "rate-limited" : error.code.toLowerCase();
  }

  return "failed";
}

function errorMessage(error: unknown): string {
  if (isApplicationError(error)) {
    return error.safeMessage;
  }

  const issues = zodIssues(error);

  if (issues) {
    const firstIssue = issues[0];
    const field = firstIssue?.path?.join(".");

    if (field === "turnstileToken") {
      return "Verifikasi keamanan belum terkirim. Muat ulang halaman lalu centang/verifikasi Turnstile sebelum daftar.";
    }

    return firstIssue?.message ?? "Data pendaftaran belum lengkap atau belum sesuai.";
  }

  if (error instanceof Error && error.message.startsWith("Invalid environment configuration")) {
    return "Konfigurasi .env belum valid. Periksa SESSION_SECRET minimal 32 karakter dan pengaturan Turnstile.";
  }

  if (process.env.NODE_ENV !== "production" && error instanceof Error) {
    return `Development error: ${error.name} - ${error.message}`;
  }

  return "Pendaftaran belum berhasil. Periksa data lalu coba lagi.";
}

export async function submitEventDetailRegistrationAction(
  slug: string,
  formData: FormData,
): Promise<void> {
  const requestContext = await getRequestContext();

  try {
    const result = await registerParticipantForEvent({
      slug,
      registration: parsePublicRegistrationFormData(formData),
      requestContext,
    });
    await setParticipantSessionCookie(result.participantSession);
  } catch (error) {
    const params = new URLSearchParams({
      error: errorCode(error),
      message: errorMessage(error),
    });

    redirect(`/events/${slug}?${params.toString()}#form-pendaftaran`);
  }

  redirect(`/events/${slug}/register/confirmation`);
}
