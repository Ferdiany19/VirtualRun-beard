import type { Request } from 'express';
import { env } from '@/shared/config/env';
import { getCorrelationId } from '@/shared/http/correlation-id';
import { requireAdminSessionFromToken } from '@/modules/auth/session';

export type ApiRequestContext = {
  correlationId: string;
  ipAddress: string | null;
  userAgent: string | null;
};

export function headersFromRequest(request: Request): Headers {
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') {
      headers.set(key, value);
    } else if (Array.isArray(value)) {
      headers.set(key, value.join(','));
    }
  }

  return headers;
}

export function requestContext(request: Request): ApiRequestContext {
  const headers = headersFromRequest(request);
  const forwardedFor =
    headers.get('x-forwarded-for') ?? headers.get('x-real-ip');
  const ipCandidate = forwardedFor?.split(',')[0]?.trim() ?? request.ip ?? null;

  return {
    correlationId: getCorrelationId(headers),
    ipAddress:
      ipCandidate && /^[0-9a-fA-F:.]{3,45}$/.test(ipCandidate)
        ? ipCandidate
        : null,
    userAgent: headers.get('user-agent'),
  };
}

export function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');

    if (rawName === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return undefined;
}

export function getAdminSessionToken(request: Request): string | undefined {
  return getCookie(request, env.ADMIN_SESSION_COOKIE_NAME);
}

export function getAdminCsrfCookie(request: Request): string | undefined {
  return getCookie(request, env.ADMIN_CSRF_COOKIE_NAME);
}

export function getParticipantSessionToken(
  request: Request,
): string | undefined {
  return getCookie(request, env.PARTICIPANT_SESSION_COOKIE_NAME);
}

export function getParticipantCsrfCookie(request: Request): string | undefined {
  return getCookie(request, env.PARTICIPANT_CSRF_COOKIE_NAME);
}

export async function requireAdminFromRequest(request: Request) {
  return requireAdminSessionFromToken(getAdminSessionToken(request));
}

export function formDataFromRecord(record: Record<string, unknown>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        formData.append(key, String(item));
      }
      continue;
    }

    formData.set(key, String(value));
  }

  return formData;
}

export function queryNumber(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
