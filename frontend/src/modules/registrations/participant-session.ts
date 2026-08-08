import { cookies } from "next/headers";
import { env } from "@/shared/config/env";
import { ApplicationError } from "@/shared/errors/application-error";
import { hashSensitiveToken } from "@/shared/security/token";

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function setParticipantSessionCookie(input: {
  token: string;
  csrfToken: string;
  expiresAt: Date;
}): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(env.PARTICIPANT_SESSION_COOKIE_NAME, input.token, {
    ...cookieOptions,
    expires: input.expiresAt,
  });
  cookieStore.set(env.PARTICIPANT_CSRF_COOKIE_NAME, input.csrfToken, {
    ...cookieOptions,
    expires: input.expiresAt,
  });
}

export async function getParticipantSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(env.PARTICIPANT_SESSION_COOKIE_NAME)?.value;
}

export async function getParticipantCsrfTokenForForm(
  session: { csrfTokenHash: string | null } | null,
): Promise<string> {
  const cookieStore = await cookies();
  const csrfToken = cookieStore.get(env.PARTICIPANT_CSRF_COOKIE_NAME)?.value;

  if (
    !csrfToken ||
    !session?.csrfTokenHash ||
    hashSensitiveToken(csrfToken) !== session.csrfTokenHash
  ) {
    throw new ApplicationError({
      code: "FORBIDDEN",
      message: "Participant CSRF token is missing or invalid",
      safeMessage: "Sesi peserta perlu dimuat ulang.",
      statusCode: 403,
    });
  }

  return csrfToken;
}

export async function validateParticipantCsrfToken(
  formData: FormData,
  session: { csrfTokenHash: string | null },
): Promise<void> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(env.PARTICIPANT_CSRF_COOKIE_NAME)?.value;
  const formToken = String(formData.get("csrfToken") ?? "");

  if (
    !cookieToken ||
    !formToken ||
    cookieToken !== formToken ||
    !session.csrfTokenHash ||
    hashSensitiveToken(cookieToken) !== session.csrfTokenHash
  ) {
    throw new ApplicationError({
      code: "FORBIDDEN",
      message: "Invalid participant CSRF token",
      safeMessage: "Sesi peserta tidak valid. Muat ulang halaman dan coba lagi.",
      statusCode: 403,
    });
  }
}
