import { withTransaction } from '@/db/transaction';
import { createAuditLog } from '@/modules/audit/audit.repository';
import { adminLoginSchema } from '@/modules/auth/auth.schema';
import type {
  AdminSessionTokens,
  AuthenticatedAdmin,
} from '@/modules/auth/auth.types';
import {
  countRecentFailedLoginAttempts,
  createAdminSession,
  findActiveSessionByTokenHash,
  findAdminByNormalizedEmail,
  incrementAdminFailedLogin,
  recordLoginAttempt,
  revokeAdminSession,
  updateAdminSuccessfulLogin,
} from '@/modules/auth/auth.repository';
import {
  hashAdminPassword,
  verifyAdminPassword,
} from '@/modules/auth/password';
import { ApplicationError } from '@/shared/errors/application-error';
import { createOpaqueToken, hashSensitiveToken } from '@/shared/security/token';

const MAX_FAILED_ATTEMPTS = 5;
const LOGIN_RATE_LIMIT_WINDOW_MINUTES = 15;
const SESSION_DURATION_HOURS = 8;

function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function authenticateAdmin(input: {
  email: string;
  password: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}): Promise<AdminSessionTokens> {
  const parsed = adminLoginSchema.parse(input);
  const normalizedEmail = normalizeAdminEmail(parsed.email);

  return withTransaction(async (client) => {
    const recentFailedAttempts = await countRecentFailedLoginAttempts(
      normalizedEmail,
      input.ipAddress,
      LOGIN_RATE_LIMIT_WINDOW_MINUTES,
      client,
    );

    if (recentFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      await recordLoginAttempt(
        {
          normalizedEmail,
          success: false,
          reason: 'RATE_LIMITED',
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
        client,
      );
      await createAuditLog(
        {
          actorType: 'SYSTEM',
          actorId: null,
          action: 'ADMIN_LOGIN_FAILED',
          entityType: 'ADMIN_USER',
          entityId: null,
          eventId: null,
          newValues: { reason: 'RATE_LIMITED', normalizedEmail },
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          correlationId: input.correlationId,
        },
        client,
      );

      throw new ApplicationError({
        code: 'RATE_LIMITED',
        message: 'Admin login rate limited',
        safeMessage:
          'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.',
        statusCode: 429,
      });
    }

    const admin = await findAdminByNormalizedEmail(normalizedEmail, client);
    const passwordMatches =
      admin?.status === 'ACTIVE'
        ? await verifyAdminPassword(admin.passwordHash, parsed.password)
        : await verifyAdminPassword(
            await hashAdminPassword('unused-password-for-timing'),
            parsed.password,
          );

    if (!admin || admin.status !== 'ACTIVE' || !passwordMatches) {
      const lockUntil =
        admin && admin.failedLoginCount + 1 >= MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60_000)
          : null;

      if (admin) {
        await incrementAdminFailedLogin(admin.id, lockUntil, client);
      }

      await recordLoginAttempt(
        {
          normalizedEmail,
          success: false,
          reason: 'INVALID_CREDENTIALS',
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
        client,
      );
      await createAuditLog(
        {
          actorType: 'SYSTEM',
          actorId: admin?.id ?? null,
          action: 'ADMIN_LOGIN_FAILED',
          entityType: 'ADMIN_USER',
          entityId: admin?.id ?? null,
          eventId: null,
          newValues: { reason: 'INVALID_CREDENTIALS', normalizedEmail },
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          correlationId: input.correlationId,
        },
        client,
      );

      throw new ApplicationError({
        code: 'UNAUTHORIZED',
        message: 'Invalid admin credentials',
        safeMessage: 'Email atau password tidak sesuai.',
        statusCode: 401,
      });
    }

    const sessionToken = createOpaqueToken();
    const csrfToken = createOpaqueToken();
    const expiresAt = new Date(
      Date.now() + SESSION_DURATION_HOURS * 60 * 60_000,
    );

    await createAdminSession(
      {
        adminUserId: admin.id,
        sessionTokenHash: hashSensitiveToken(sessionToken),
        csrfTokenHash: hashSensitiveToken(csrfToken),
        expiresAt,
      },
      client,
    );
    await updateAdminSuccessfulLogin(admin.id, client);
    await recordLoginAttempt(
      {
        normalizedEmail,
        success: true,
        reason: null,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
      client,
    );
    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: admin.id,
        action: 'ADMIN_LOGIN_SUCCEEDED',
        entityType: 'ADMIN_USER',
        entityId: admin.id,
        eventId: null,
        newValues: { roles: admin.roles },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        correlationId: input.correlationId,
      },
      client,
    );

    return {
      sessionToken,
      csrfToken,
      expiresAt,
    };
  });
}

export async function findAuthenticatedAdminBySessionToken(
  sessionToken: string,
): Promise<AuthenticatedAdmin | null> {
  return findActiveSessionByTokenHash(hashSensitiveToken(sessionToken));
}

export async function logoutAdmin(input: {
  admin: AuthenticatedAdmin;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}): Promise<void> {
  await withTransaction(async (client) => {
    await revokeAdminSession(input.admin.sessionId, client);
    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action: 'ADMIN_LOGOUT',
        entityType: 'ADMIN_SESSION',
        entityId: input.admin.sessionId,
        eventId: null,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        correlationId: input.correlationId,
      },
      client,
    );
  });
}
