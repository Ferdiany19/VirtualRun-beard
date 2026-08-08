import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthenticatedAdmin, AdminSessionTokens } from "@/modules/auth/auth.types";
import { findAuthenticatedAdminBySessionToken } from "@/modules/auth/auth.service";
import { env } from "@/shared/config/env";
import { ApplicationError } from "@/shared/errors/application-error";
import { hashSensitiveToken } from "@/shared/security/token";

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function setAdminSessionCookies(tokens: AdminSessionTokens): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(env.ADMIN_SESSION_COOKIE_NAME, tokens.sessionToken, {
    ...cookieOptions,
    expires: tokens.expiresAt,
  });
  cookieStore.set(env.ADMIN_CSRF_COOKIE_NAME, tokens.csrfToken, {
    ...cookieOptions,
    expires: tokens.expiresAt,
  });
}

export async function clearAdminSessionCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(env.ADMIN_SESSION_COOKIE_NAME);
  cookieStore.delete(env.ADMIN_CSRF_COOKIE_NAME);
}

export async function getCurrentAdminSession(): Promise<AuthenticatedAdmin | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(env.ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  return findAuthenticatedAdminBySessionToken(sessionToken);
}

export async function requireAdminSession(): Promise<AuthenticatedAdmin> {
  const session = await getCurrentAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}

export async function getAdminCsrfTokenForForm(session: AuthenticatedAdmin): Promise<string> {
  const cookieStore = await cookies();
  const csrfToken = cookieStore.get(env.ADMIN_CSRF_COOKIE_NAME)?.value;

  if (!csrfToken || hashSensitiveToken(csrfToken) !== session.csrfTokenHash) {
    throw new ApplicationError({
      code: "FORBIDDEN",
      message: "Admin CSRF token is missing or invalid",
      safeMessage: "Sesi admin perlu dimuat ulang.",
      statusCode: 403,
    });
  }

  return csrfToken;
}

export async function validateAdminCsrfToken(
  formData: FormData,
  session: AuthenticatedAdmin,
): Promise<void> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(env.ADMIN_CSRF_COOKIE_NAME)?.value;
  const formToken = String(formData.get("csrfToken") ?? "");

  if (
    !cookieToken ||
    !formToken ||
    cookieToken !== formToken ||
    hashSensitiveToken(cookieToken) !== session.csrfTokenHash
  ) {
    throw new ApplicationError({
      code: "FORBIDDEN",
      message: "Invalid admin CSRF token",
      safeMessage: "Sesi admin tidak valid. Muat ulang halaman dan coba lagi.",
      statusCode: 403,
    });
  }
}
