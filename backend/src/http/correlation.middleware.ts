import type { NextFunction, Request, Response } from 'express';
import { requestContext } from '@/http/request';

export function correlationMiddleware(
  request: Request & { correlationId?: string },
  response: Response,
  next: NextFunction,
): void {
  const context = requestContext(request);
  request.correlationId = context.correlationId;
  response.setHeader('x-correlation-id', context.correlationId);
  next();
}
