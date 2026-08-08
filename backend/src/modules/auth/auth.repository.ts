import type { PoolClient } from 'pg';
import { query } from '@/db/pool';
import type { AdminRole } from '@/modules/auth/domain/admin-role';
import type {
  AdminUser,
  AdminUserWithPassword,
  AuthenticatedAdmin,
} from '@/modules/auth/auth.types';

type AdminUserRow = {
  id: string;
  normalized_email: string;
  display_email: string;
  full_name: string;
  password_hash: string;
  status: 'ACTIVE' | 'DISABLED';
  failed_login_count: number;
  locked_until: Date | null;
  roles: AdminRole[];
  created_at: Date;
  updated_at: Date;
};

type SessionRow = {
  session_id: string;
  admin_user_id: string;
  session_expires_at: Date;
  csrf_token_hash: string;
  normalized_email: string;
  display_email: string;
  full_name: string;
  status: 'ACTIVE' | 'DISABLED';
  roles: AdminRole[];
  created_at: Date;
  updated_at: Date;
};

function mapAdminUserWithPassword(row: AdminUserRow): AdminUserWithPassword {
  return {
    id: row.id,
    normalizedEmail: row.normalized_email,
    displayEmail: row.display_email,
    fullName: row.full_name,
    passwordHash: row.password_hash,
    status: row.status,
    failedLoginCount: row.failed_login_count,
    lockedUntil: row.locked_until,
    roles: row.roles,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSession(row: SessionRow): AuthenticatedAdmin {
  return {
    id: row.admin_user_id,
    normalizedEmail: row.normalized_email,
    displayEmail: row.display_email,
    fullName: row.full_name,
    status: row.status,
    roles: row.roles,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sessionId: row.session_id,
    sessionExpiresAt: row.session_expires_at,
    csrfTokenHash: row.csrf_token_hash,
  };
}

export async function findAdminByNormalizedEmail(
  normalizedEmail: string,
  client?: PoolClient,
): Promise<AdminUserWithPassword | null> {
  const result = await query<AdminUserRow>(
    `
      SELECT
        au.id,
        au.normalized_email,
        au.display_email,
        au.full_name,
        au.password_hash,
        au.status,
        au.failed_login_count,
        au.locked_until,
        COALESCE(
          array_agg(aur.role ORDER BY aur.role) FILTER (WHERE aur.role IS NOT NULL),
          ARRAY[]::text[]
        )::text[] AS roles,
        au.created_at,
        au.updated_at
      FROM admin_users au
      LEFT JOIN admin_user_roles aur ON aur.admin_user_id = au.id
      WHERE au.normalized_email = $1
      GROUP BY au.id
      LIMIT 1
    `,
    [normalizedEmail],
    client,
  );

  return result.rows[0] ? mapAdminUserWithPassword(result.rows[0]) : null;
}

export async function findActiveSessionByTokenHash(
  sessionTokenHash: string,
  client?: PoolClient,
): Promise<AuthenticatedAdmin | null> {
  const result = await query<SessionRow>(
    `
      SELECT
        s.id AS session_id,
        s.admin_user_id,
        s.expires_at AS session_expires_at,
        s.csrf_token_hash,
        au.normalized_email,
        au.display_email,
        au.full_name,
        au.status,
        COALESCE(
          array_agg(aur.role ORDER BY aur.role) FILTER (WHERE aur.role IS NOT NULL),
          ARRAY[]::text[]
        )::text[] AS roles,
        au.created_at,
        au.updated_at
      FROM admin_sessions s
      INNER JOIN admin_users au ON au.id = s.admin_user_id
      LEFT JOIN admin_user_roles aur ON aur.admin_user_id = au.id
      WHERE s.session_token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
        AND (s.idle_expires_at IS NULL OR s.idle_expires_at > now())
        AND au.status = 'ACTIVE'
      GROUP BY s.id, au.id
      LIMIT 1
    `,
    [sessionTokenHash],
    client,
  );

  return result.rows[0] ? mapSession(result.rows[0]) : null;
}

export async function createAdminSession(
  input: {
    adminUserId: string;
    sessionTokenHash: string;
    csrfTokenHash: string;
    expiresAt: Date;
  },
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      INSERT INTO admin_sessions (
        admin_user_id,
        session_token_hash,
        csrf_token_hash,
        expires_at,
        idle_expires_at
      )
      VALUES ($1, $2, $3, $4, $4)
    `,
    [
      input.adminUserId,
      input.sessionTokenHash,
      input.csrfTokenHash,
      input.expiresAt,
    ],
    client,
  );
}

export async function revokeAdminSession(
  sessionId: string,
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE admin_sessions
      SET revoked_at = now()
      WHERE id = $1
        AND revoked_at IS NULL
    `,
    [sessionId],
    client,
  );
}

export async function updateAdminSuccessfulLogin(
  adminUserId: string,
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE admin_users
      SET
        failed_login_count = 0,
        locked_until = NULL,
        last_login_at = now(),
        updated_at = now()
      WHERE id = $1
    `,
    [adminUserId],
    client,
  );
}

export async function incrementAdminFailedLogin(
  adminUserId: string,
  lockUntil: Date | null,
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE admin_users
      SET
        failed_login_count = failed_login_count + 1,
        locked_until = COALESCE($2, locked_until),
        updated_at = now()
      WHERE id = $1
    `,
    [adminUserId, lockUntil],
    client,
  );
}

export async function countRecentFailedLoginAttempts(
  normalizedEmail: string,
  ipAddress: string | null,
  minutes: number,
  client?: PoolClient,
): Promise<number> {
  const result = await query<{ failed_count: number }>(
    `
      SELECT count(id)::integer AS failed_count
      FROM admin_login_attempts
      WHERE success = false
        AND created_at >= now() - make_interval(mins => $3::integer)
        AND (
          normalized_email = $1
          OR ($2::inet IS NOT NULL AND ip_address = $2::inet)
        )
    `,
    [normalizedEmail, ipAddress, minutes],
    client,
  );

  return result.rows[0]?.failed_count ?? 0;
}

export async function recordLoginAttempt(
  input: {
    normalizedEmail: string;
    success: boolean;
    reason: string | null;
    ipAddress: string | null;
    userAgent: string | null;
  },
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      INSERT INTO admin_login_attempts (
        normalized_email,
        success,
        reason,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, $3, $4::inet, $5)
    `,
    [
      input.normalizedEmail,
      input.success,
      input.reason,
      input.ipAddress,
      input.userAgent,
    ],
    client,
  );
}

export async function upsertDevelopmentAdminUser(
  input: {
    normalizedEmail: string;
    displayEmail: string;
    fullName: string;
    passwordHash: string;
  },
  client?: PoolClient,
): Promise<AdminUser> {
  const result = await query<AdminUserRow>(
    `
      INSERT INTO admin_users (
        normalized_email,
        display_email,
        full_name,
        password_hash,
        status
      )
      VALUES ($1, $2, $3, $4, 'ACTIVE')
      ON CONFLICT (normalized_email)
      DO UPDATE SET
        display_email = EXCLUDED.display_email,
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        status = 'ACTIVE',
        updated_at = now()
      RETURNING
        id,
        normalized_email,
        display_email,
        full_name,
        password_hash,
        status,
        failed_login_count,
        locked_until,
        ARRAY[]::text[] AS roles,
        created_at,
        updated_at
    `,
    [
      input.normalizedEmail,
      input.displayEmail,
      input.fullName,
      input.passwordHash,
    ],
    client,
  );

  const row = result.rows[0];
  return {
    id: row.id,
    normalizedEmail: row.normalized_email,
    displayEmail: row.display_email,
    fullName: row.full_name,
    status: row.status,
    roles: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function ensureAdminRole(
  adminUserId: string,
  role: AdminRole,
  client?: PoolClient,
): Promise<void> {
  await query(
    `
      INSERT INTO admin_user_roles (admin_user_id, role)
      VALUES ($1, $2)
      ON CONFLICT (admin_user_id, role)
      DO NOTHING
    `,
    [adminUserId, role],
    client,
  );
}

export async function updateAdminPasswordByEmail(
  normalizedEmail: string,
  passwordHash: string,
  client?: PoolClient,
): Promise<boolean> {
  const result = await query(
    `
      UPDATE admin_users
      SET
        password_hash = $2,
        failed_login_count = 0,
        locked_until = NULL,
        updated_at = now()
      WHERE normalized_email = $1
    `,
    [normalizedEmail, passwordHash],
    client,
  );

  return result.rowCount === 1;
}
