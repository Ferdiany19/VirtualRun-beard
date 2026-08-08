CREATE TABLE participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  normalized_email text NOT NULL,
  display_email text NOT NULL,
  normalized_phone text NOT NULL,
  display_phone text NOT NULL,
  gender text,
  date_of_birth date,
  province text,
  city text,
  status text NOT NULL DEFAULT 'ACTIVE',
  deleted_at timestamptz,
  deleted_by_admin_user_id uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT participants_full_name_chk
    CHECK (char_length(btrim(full_name)) >= 2),
  CONSTRAINT participants_normalized_email_chk
    CHECK (normalized_email = lower(btrim(normalized_email)) AND position('@' in normalized_email) > 1),
  CONSTRAINT participants_normalized_phone_chk
    CHECK (normalized_phone ~ '^\\+628[0-9]{7,12}$'),
  CONSTRAINT participants_gender_chk
    CHECK (gender IS NULL OR gender IN ('MALE', 'FEMALE', 'OTHER')),
  CONSTRAINT participants_status_chk
    CHECK (status IN ('ACTIVE', 'SOFT_DELETED')),
  CONSTRAINT participants_soft_delete_chk
    CHECK (
      (status = 'ACTIVE' AND deleted_at IS NULL)
      OR (status = 'SOFT_DELETED' AND deleted_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX participants_active_normalized_email_uq
  ON participants (normalized_email)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX participants_active_normalized_phone_uq
  ON participants (normalized_phone)
  WHERE deleted_at IS NULL;

CREATE INDEX participants_location_idx
  ON participants (province, city);

CREATE INDEX participants_created_at_idx
  ON participants (created_at DESC);
