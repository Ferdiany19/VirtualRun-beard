import { getCorrelationId } from '@/shared/http/correlation-id';

function sanitizeIpAddress(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const candidate = value.split(',')[0]?.trim() ?? '';

  if (/^[0-9a-fA-F:.]{3,45}$/.test(candidate)) {
    return candidate;
  }

  return null;
}

export function getRequestContextFromHeaders(headerStore: Headers) {
  return {
    correlationId: getCorrelationId(headerStore),
    ipAddress: sanitizeIpAddress(
      headerStore.get('x-forwarded-for') ??
        headerStore.get('x-real-ip') ??
        null,
    ),
    userAgent: headerStore.get('user-agent'),
  };
}

export async function getRequestContext() {
  return {
    correlationId: crypto.randomUUID(),
    ipAddress: null,
    userAgent: null,
  };
}
