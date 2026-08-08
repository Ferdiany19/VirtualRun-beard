ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS city_or_regency text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

UPDATE participants
SET city_or_regency = city
WHERE city_or_regency IS NULL
  AND city IS NOT NULL;

CREATE TABLE event_bib_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  bib_prefix text NOT NULL DEFAULT '',
  bib_suffix text,
  sequence_start integer NOT NULL DEFAULT 1,
  numeric_padding integer NOT NULL DEFAULT 4,
  next_sequence integer NOT NULL DEFAULT 1,
  text_color text NOT NULL DEFAULT '#111827',
  font_family text NOT NULL DEFAULT 'Inter',
  font_size integer NOT NULL DEFAULT 96,
  font_weight integer NOT NULL DEFAULT 700,
  text_alignment text NOT NULL DEFAULT 'CENTER',
  number_area_x integer NOT NULL DEFAULT 0,
  number_area_y integer NOT NULL DEFAULT 0,
  number_area_width integer NOT NULL DEFAULT 1200,
  number_area_height integer NOT NULL DEFAULT 240,
  show_participant_name boolean NOT NULL DEFAULT false,
  participant_name_x integer NOT NULL DEFAULT 0,
  participant_name_y integer NOT NULL DEFAULT 260,
  participant_name_width integer NOT NULL DEFAULT 1200,
  participant_name_height integer NOT NULL DEFAULT 120,
  participant_name_font_size integer NOT NULL DEFAULT 42,
  show_category_label boolean NOT NULL DEFAULT false,
  category_label_x integer NOT NULL DEFAULT 0,
  category_label_y integer NOT NULL DEFAULT 390,
  category_label_width integer NOT NULL DEFAULT 1200,
  category_label_height integer NOT NULL DEFAULT 90,
  category_label_font_size integer NOT NULL DEFAULT 34,
  template_canvas_width integer NOT NULL DEFAULT 1200,
  template_canvas_height integer NOT NULL DEFAULT 800,
  active_template_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_bib_settings_event_uq
    UNIQUE (event_id),
  CONSTRAINT event_bib_settings_sequence_chk
    CHECK (sequence_start > 0 AND next_sequence >= sequence_start),
  CONSTRAINT event_bib_settings_padding_chk
    CHECK (numeric_padding BETWEEN 1 AND 8),
  CONSTRAINT event_bib_settings_color_chk
    CHECK (text_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT event_bib_settings_font_family_chk
    CHECK (font_family IN ('Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman')),
  CONSTRAINT event_bib_settings_font_weight_chk
    CHECK (font_weight IN (400, 500, 600, 700, 800)),
  CONSTRAINT event_bib_settings_alignment_chk
    CHECK (text_alignment IN ('LEFT', 'CENTER', 'RIGHT')),
  CONSTRAINT event_bib_settings_canvas_chk
    CHECK (
      template_canvas_width BETWEEN 600 AND 4000
      AND template_canvas_height BETWEEN 400 AND 4000
      AND number_area_width > 0
      AND number_area_height > 0
      AND font_size BETWEEN 16 AND 240
    )
);

CREATE TABLE bib_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  object_key text NOT NULL,
  canvas_width integer NOT NULL,
  canvas_height integer NOT NULL,
  file_size_bytes integer NOT NULL,
  checksum_sha256 text NOT NULL,
  version_number integer NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  uploaded_by_admin_user_id uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bib_template_versions_event_version_uq
    UNIQUE (event_id, version_number),
  CONSTRAINT bib_template_versions_object_key_uq
    UNIQUE (object_key),
  CONSTRAINT bib_template_versions_checksum_chk
    CHECK (char_length(checksum_sha256) = 64),
  CONSTRAINT bib_template_versions_dimensions_chk
    CHECK (canvas_width BETWEEN 600 AND 4000 AND canvas_height BETWEEN 400 AND 4000),
  CONSTRAINT bib_template_versions_size_chk
    CHECK (file_size_bytes > 0)
);

ALTER TABLE event_bib_settings
  ADD CONSTRAINT event_bib_settings_active_template_fk
    FOREIGN KEY (active_template_version_id)
    REFERENCES bib_template_versions (id)
    ON DELETE SET NULL;

CREATE INDEX bib_template_versions_event_active_idx
  ON bib_template_versions (event_id, is_active, created_at DESC);

CREATE TABLE event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants (id) ON DELETE RESTRICT,
  registration_code_lookup text NOT NULL,
  registration_code_hash text NOT NULL,
  bib_sequence integer NOT NULL,
  bib_number text NOT NULL,
  registration_status text NOT NULL DEFAULT 'ACTIVE',
  bib_status text NOT NULL DEFAULT 'PENDING',
  bib_document_id uuid,
  bib_error text,
  email_status text NOT NULL DEFAULT 'PENDING',
  registered_at timestamptz NOT NULL DEFAULT now(),
  terms_version text NOT NULL,
  terms_accepted_at timestamptz NOT NULL,
  privacy_accepted_at timestamptz NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  CONSTRAINT event_registrations_event_participant_uq
    UNIQUE (event_id, participant_id),
  CONSTRAINT event_registrations_event_bib_uq
    UNIQUE (event_id, bib_number),
  CONSTRAINT event_registrations_code_lookup_uq
    UNIQUE (registration_code_lookup),
  CONSTRAINT event_registrations_code_hash_chk
    CHECK (char_length(registration_code_hash) = 64),
  CONSTRAINT event_registrations_bib_sequence_chk
    CHECK (bib_sequence > 0),
  CONSTRAINT event_registrations_status_chk
    CHECK (registration_status IN ('ACTIVE', 'CANCELLED')),
  CONSTRAINT event_registrations_bib_status_chk
    CHECK (bib_status IN ('PENDING', 'PROCESSING', 'READY', 'FAILED')),
  CONSTRAINT event_registrations_email_status_chk
    CHECK (email_status IN ('PENDING', 'SENT', 'FAILED'))
);

CREATE INDEX event_registrations_participant_idx
  ON event_registrations (participant_id, registered_at DESC);

CREATE INDEX event_registrations_event_registered_idx
  ON event_registrations (event_id, registered_at DESC);

CREATE INDEX event_registrations_event_bib_status_idx
  ON event_registrations (event_id, bib_status, registered_at DESC);

CREATE TABLE registration_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_registration_id uuid NOT NULL REFERENCES event_registrations (id) ON DELETE CASCADE,
  event_category_id uuid NOT NULL REFERENCES event_categories (id) ON DELETE RESTRICT,
  registration_status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  CONSTRAINT registration_categories_registration_category_uq
    UNIQUE (event_registration_id, event_category_id),
  CONSTRAINT registration_categories_status_chk
    CHECK (registration_status IN ('ACTIVE', 'CANCELLED'))
);

CREATE INDEX registration_categories_category_idx
  ON registration_categories (event_category_id, registration_status);

CREATE TABLE bib_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_registration_id uuid NOT NULL REFERENCES event_registrations (id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants (id) ON DELETE RESTRICT,
  template_version_id uuid NOT NULL REFERENCES bib_template_versions (id) ON DELETE RESTRICT,
  object_key text NOT NULL,
  status text NOT NULL DEFAULT 'READY',
  attempt_count integer NOT NULL DEFAULT 0,
  error_message text,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bib_documents_object_key_uq
    UNIQUE (object_key),
  CONSTRAINT bib_documents_status_chk
    CHECK (status IN ('READY', 'FAILED')),
  CONSTRAINT bib_documents_attempt_chk
    CHECK (attempt_count >= 0)
);

ALTER TABLE event_registrations
  ADD CONSTRAINT event_registrations_bib_document_fk
    FOREIGN KEY (bib_document_id)
    REFERENCES bib_documents (id)
    ON DELETE SET NULL;

CREATE INDEX bib_documents_registration_created_idx
  ON bib_documents (event_registration_id, created_at DESC);

CREATE TABLE participant_access_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_registration_id uuid NOT NULL REFERENCES event_registrations (id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants (id) ON DELETE CASCADE,
  session_token_hash text NOT NULL,
  encrypted_registration_code text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT participant_access_sessions_token_uq
    UNIQUE (session_token_hash),
  CONSTRAINT participant_access_sessions_token_hash_chk
    CHECK (char_length(session_token_hash) = 64)
);

CREATE INDEX participant_access_sessions_active_idx
  ON participant_access_sessions (event_registration_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE idempotency_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  operation text NOT NULL,
  request_fingerprint text NOT NULL,
  response_reference text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT idempotency_records_operation_key_uq
    UNIQUE (operation, key),
  CONSTRAINT idempotency_records_fingerprint_chk
    CHECK (char_length(request_fingerprint) = 64)
);

CREATE INDEX idempotency_records_expires_idx
  ON idempotency_records (expires_at);

CREATE TABLE email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_registration_id uuid NOT NULL REFERENCES event_registrations (id) ON DELETE CASCADE,
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_deliveries_type_chk
    CHECK (email_type IN ('REGISTRATION_CONFIRMATION')),
  CONSTRAINT email_deliveries_status_chk
    CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  CONSTRAINT email_deliveries_attempts_chk
    CHECK (attempts >= 0)
);

CREATE INDEX email_deliveries_registration_type_idx
  ON email_deliveries (event_registration_id, email_type, created_at DESC);

CREATE TABLE background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0,
  maximum_attempts integer NOT NULL DEFAULT 5,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT background_jobs_type_chk
    CHECK (job_type IN ('GENERATE_BIB', 'SEND_REGISTRATION_CONFIRMATION')),
  CONSTRAINT background_jobs_status_chk
    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD')),
  CONSTRAINT background_jobs_attempts_chk
    CHECK (attempts >= 0 AND maximum_attempts > 0)
);

CREATE INDEX background_jobs_claim_idx
  ON background_jobs (status, available_at, created_at)
  WHERE status IN ('PENDING', 'FAILED');

CREATE TABLE registration_security_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events (id) ON DELETE CASCADE,
  attempt_type text NOT NULL,
  identifier_hash text NOT NULL,
  ip_address inet,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registration_security_attempts_type_chk
    CHECK (attempt_type IN ('REGISTRATION_SUBMIT', 'PARTICIPANT_ACCESS')),
  CONSTRAINT registration_security_attempts_hash_chk
    CHECK (char_length(identifier_hash) = 64)
);

CREATE INDEX registration_security_attempts_lookup_idx
  ON registration_security_attempts (event_id, attempt_type, identifier_hash, created_at DESC);
