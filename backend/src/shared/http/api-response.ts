import { isApplicationError } from '@/shared/errors/application-error';
import { logger } from '@/shared/logging/logger';

export function toErrorResponse(error: unknown, correlationId: string) {
  if (isApplicationError(error)) {
    logger.warn('Operational request error', {
      correlationId,
      code: error.code,
      message: error.message,
    });

    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.safeMessage,
          correlationId,
        },
      },
      headers: {
        'x-correlation-id': correlationId,
      },
    };
  }

  logger.error('Unhandled request error', {
    correlationId,
    message: error instanceof Error ? error.message : 'Unknown error',
  });

  return {
    statusCode: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan. Silakan coba lagi.',
        correlationId,
      },
    },
    headers: {
      'x-correlation-id': correlationId,
    },
  };
}
