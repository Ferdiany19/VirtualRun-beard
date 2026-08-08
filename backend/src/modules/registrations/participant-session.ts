import { env } from '@/shared/config/env';
import { ApplicationError } from '@/shared/errors/application-error';
import { hashSensitiveToken } from '@/shared/security/token';

export function participantSessionCookieHeaders(input: {
  token: string;
  csrfToken: string;
  expiresAt: Date;
}): string[] {
  return [
    serializeCookie(
      env.PARTICIPANT_SESSION_COOKIE_NAME,
      input.token,
      input.expiresAt,
    ),
    serializeCookie(
      env.PARTICIPANT_CSRF_COOKIE_NAME,
      input.csrfToken,
      input.expiresAt,
    ),
  ];
}

export function getParticipantCsrfTokenForFormFromCookie(
  csrfToken: string | undefined,
  session: { csrfTokenHash: string | null } | null,
): string {
  if (
    !csrfToken ||
    !session?.csrfTokenHash ||
    hashSensitiveToken(csrfToken) !== session.csrfTokenHash
  ) {
    throw new ApplicationError({
      code: 'FORBIDDEN',
      message: 'Participant CSRF token is missing or invalid',
      safeMessage: 'Sesi peserta perlu dimuat ulang.',
      statusCode: 403,
    });
  }

  return csrfToken;
}

export function validateParticipantCsrfTokenValue(input: {
  cookieToken?: string;
  formToken?: string;
  session: { csrfTokenHash: string | null };
}): void {
  if (
    !input.cookieToken ||
    !input.formToken ||
    input.cookieToken !== input.formToken ||
    !input.session.csrfTokenHash ||
    hashSensitiveToken(input.cookieToken) !== input.session.csrfTokenHash
  ) {
    throw new ApplicationError({
      code: 'FORBIDDEN',
      message: 'Invalid participant CSRF token',
      safeMessage:
        'Sesi peserta tidak valid. Muat ulang halaman dan coba lagi.',
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
