import { randomUUID } from 'node:crypto';

const CORRELATION_ID_HEADER = 'x-correlation-id';

export function getCorrelationId(headers: Headers): string {
  const headerValue = headers.get(CORRELATION_ID_HEADER)?.trim();

  if (headerValue && /^[a-zA-Z0-9._:-]{8,128}$/.test(headerValue)) {
    return headerValue;
  }

  return randomUUID();
}
