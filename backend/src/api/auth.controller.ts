import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { authenticateAdmin, logoutAdmin } from '@/modules/auth/auth.service';
import {
  adminSessionCookieHeaders,
  clearAdminSessionCookieHeaders,
  getAdminCsrfTokenForFormFromCookie,
  requireAdminSessionFromToken,
} from '@/modules/auth/session';
import { env } from '@/shared/config/env';
import {
  getAdminCsrfCookie,
  getAdminSessionToken,
  requestContext,
} from '@/http/request';

@Controller('api/admin/auth')
export class AuthController {
  @Post('login')
  async login(
    @Body() body: { email?: string; password?: string },
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const context = requestContext(request);
    const tokens = await authenticateAdmin({
      email: String(body.email ?? ''),
      password: String(body.password ?? ''),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      correlationId: context.correlationId,
    });

    for (const cookie of adminSessionCookieHeaders(tokens)) {
      response.append('set-cookie', cookie);
    }

    response
      .status(200)
      .json({ ok: true, expiresAt: tokens.expiresAt.toISOString() });
  }

  @Post('logout')
  async logout(@Req() request: Request, @Res() response: Response) {
    const context = requestContext(request);
    const admin = await requireAdminSessionFromToken(
      getAdminSessionToken(request),
    );
    await logoutAdmin({
      admin,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      correlationId: context.correlationId,
    });

    for (const cookie of clearAdminSessionCookieHeaders()) {
      response.append('set-cookie', cookie);
    }

    response.status(200).json({ ok: true });
  }

  @Get('session')
  async session(@Req() request: Request) {
    const admin = await requireAdminSessionFromToken(
      getAdminSessionToken(request),
    );
    const csrfToken = getAdminCsrfTokenForFormFromCookie(
      getAdminCsrfCookie(request),
      admin,
    );

    return {
      admin: {
        id: admin.id,
        email: admin.displayEmail,
        fullName: admin.fullName,
        roles: admin.roles,
      },
      csrfToken,
      cookieNames: {
        session: env.ADMIN_SESSION_COOKIE_NAME,
        csrf: env.ADMIN_CSRF_COOKIE_NAME,
      },
    };
  }
}
