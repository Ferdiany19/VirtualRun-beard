import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { isApplicationError } from '@/shared/errors/application-error';
import { logger } from '@/shared/logging/logger';

@Catch()
export class ApplicationErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host
      .switchToHttp()
      .getRequest<{ correlationId?: string }>();
    const correlationId = request.correlationId ?? randomUUID();

    if (isApplicationError(exception)) {
      logger.warn('Operational request error', {
        correlationId,
        code: exception.code,
        message: exception.message,
      });

      response
        .status(exception.statusCode)
        .setHeader('x-correlation-id', correlationId)
        .json({
          error: {
            code: exception.code,
            message: exception.safeMessage,
            correlationId,
          },
        });
      return;
    }

    if (exception instanceof HttpException) {
      response
        .status(exception.getStatus())
        .setHeader('x-correlation-id', correlationId)
        .json({
          error: {
            code: 'HTTP_ERROR',
            message: 'Permintaan belum valid.',
            correlationId,
          },
        });
      return;
    }

    logger.error('Unhandled request error', {
      correlationId,
      message: exception instanceof Error ? exception.message : 'Unknown error',
    });

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .setHeader('x-correlation-id', correlationId)
      .json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Terjadi kesalahan. Silakan coba lagi.',
          correlationId,
        },
      });
  }
}
