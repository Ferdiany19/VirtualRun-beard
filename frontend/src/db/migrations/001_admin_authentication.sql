CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_email text NOT NULL,
  display_email text NOT NULL,
  full_name text NOT NULL,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  failed_login_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_normalized_email_format_chk
    CHECK (normalized_email = lower(btrim(normalized_email)) AND position('@' in normalized_email) > 1),
  CONSTRAINT admin_users_status_chk
    CHECK (status IN ('ACTIVE', 'DISABLED')),
  CONSTRAINT admin_users_failed_login_count_chk
    CHECK (failed_login_count >= 0)
);

CREATE UNIQUE INDEX admin_users_normalized_email_uq
  ON admin_users (normalized_email);

CREATE TABLE admin_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_user_roles_role_chk
    CHECK (role IN ('SUPER_ADMIN', 'EVENT_ADMIN', 'VALIDATOR', 'REPORT_VIEWER')),
  CONSTRAINT admin_user_roles_user_role_uq
    UNIQUE (admin_user_id, role)
);

CREATE INDEX admin_user_roles_admin_user_id_idx
  ON admin_user_roles (admin_user_id);

CREATE TABLE admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  session_token_hash text NOT NULL,
  csrf_token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  idle_expires_at timestamptz,
  revoked_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_sessions_session_token_hash_length_chk
    CHECK (char_length(session_token_hash) = 64),
  CONSTRAINT admin_sessions_csrf_token_hash_length_chk
    CHECK (char_length(csrf_token_hash) = 64),
  CONSTRAINT admin_sessions_expiration_order_chk
    CHECK (idle_expires_at IS NULL OR idle_expires_at <= expires_at)
);

CREATE UNIQUE INDEX admin_sessions_session_token_hash_uq
  ON admin_sessions (session_token_hash);

CREATE INDEX admin_sessions_admin_user_id_active_idx
  ON admin_sessions (admin_user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE admin_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_email text NOT NULL,
  success boolean NOT NULL,
  reason text,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_login_attempts_normalized_email_chk
    CHECK (normalized_email = lower(btrim(normalized_email)) AND position('@' in normalized_email) > 1)
);

CREATE INDEX admin_login_attempts_email_created_at_idx
  ON admin_login_attempts (normalized_email, created_at DESC);

CREATE INDEX admin_login_attempts_ip_created_at_idx
  ON admin_login_attempts (ip_address, created_at DESC);
