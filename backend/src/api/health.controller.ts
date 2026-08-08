import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request } from 'express';
import type { Response } from 'express';
import { getPool } from '@/db/pool';
import { env } from '@/shared/config/env';
import { getCorrelationId } from '@/shared/http/correlation-id';
import { logger } from '@/shared/logging/logger';
import { headersFromRequest } from '@/http/request';

type DatabaseStatus = 'not_configured' | 'ok' | 'error';

@Controller('api/health')
export class HealthController {
  @Get()
  async get(@Req() request: Request, @Res() res: Response) {
    const headerStore = headersFromRequest(request);
    const correlationId = getCorrelationId(headerStore);
    let database: DatabaseStatus = 'not_configured';

    if (env.DATABASE_URL) {
      try {
        const result = await getPool().query<{ ok: number }>('SELECT 1 AS ok');
        database = result.rows[0]?.ok === 1 ? 'ok' : 'error';
      } catch (error) {
        database = 'error';
        logger.warn('Database health check failed', {
          correlationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res
      .status(database === 'error' ? 503 : 200)
      .setHeader('x-correlation-id', correlationId)
      .setHeader('cache-control', 'no-store')
      .json({
        service: 'virtual-run-beard',
        status: database === 'error' ? 'degraded' : 'ok',
        database,
        timezone: env.BUSINESS_TIMEZONE,
        checkedAt: new Date().toISOString(),
        correlationId,
      });
  }
}
