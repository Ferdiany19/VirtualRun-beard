import type {
  AuthenticatedAdmin,
  AdminSessionTokens,
} from '@/modules/auth/auth.types';
import { findAuthenticatedAdminBySessionToken } from '@/modules/auth/auth.service';
import { env } from '@/shared/config/env';
import { ApplicationError } from '@/shared/errors/application-error';
import { hashSensitiveToken } from '@/shared/security/token';

export const adminCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export function adminSessionCookieHeaders(
  tokens: AdminSessionTokens,
): string[] {
  return [
    serializeCookie(
      env.ADMIN_SESSION_COOKIE_NAME,
      tokens.sessionToken,
      tokens.expiresAt,
    ),
    serializeCookie(
      env.ADMIN_CSRF_COOKIE_NAME,
      tokens.csrfToken,
      tokens.expiresAt,
    ),
  ];
}

export function clearAdminSessionCookieHeaders(): string[] {
  return [
    serializeCookie(env.ADMIN_SESSION_COOKIE_NAME, '', new Date(0)),
    serializeCookie(env.ADMIN_CSRF_COOKIE_NAME, '', new Date(0)),
  ];
}

export async function getCurrentAdminSessionFromToken(
  sessionToken?: string,
): Promise<AuthenticatedAdmin | null> {
  if (!sessionToken) {
    return null;
  }

  return findAuthenticatedAdminBySessionToken(sessionToken);
}

export async function requireAdminSessionFromToken(
  sessionToken?: string,
): Promise<AuthenticatedAdmin> {
  const session = await getCurrentAdminSessionFromToken(sessionToken);

  if (!session) {
    throw new ApplicationError({
      code: 'UNAUTHORIZED',
      message: 'Admin session is required',
      safeMessage: 'Sesi admin tidak valid.',
      statusCode: 401,
    });
  }

  return session;
}

export function getAdminCsrfTokenForFormFromCookie(
  csrfToken: string | undefined,
  session: AuthenticatedAdmin,
): string {
  if (!csrfToken || hashSensitiveToken(csrfToken) !== session.csrfTokenHash) {
    throw new ApplicationError({
      code: 'FORBIDDEN',
      message: 'Admin CSRF token is missing or invalid',
      safeMessage: 'Sesi admin perlu dimuat ulang.',
      statusCode: 403,
    });
  }

  return csrfToken;
}

export function validateAdminCsrfTokenValue(input: {
  cookieToken?: string;
  formToken?: string;
  session: AuthenticatedAdmin;
}): void {
  if (
    !input.cookieToken ||
    !input.formToken ||
    input.cookieToken !== input.formToken ||
    hashSensitiveToken(input.cookieToken) !== input.session.csrfTokenHash
  ) {
    throw new ApplicationError({
      code: 'FORBIDDEN',
      message: 'Invalid admin CSRF token',
      safeMessage: 'Sesi admin tidak valid. Muat ulang halaman dan coba lagi.',
      statusCode: 403,
    });
  }
}

function serializeCookie(name: string, value: string, expires: Date): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Expires=${expires.toUTCString()}`,
  ];

  if (env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  return parts.join('; ');
}
