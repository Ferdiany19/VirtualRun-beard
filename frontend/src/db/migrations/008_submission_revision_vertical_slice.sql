ALTER TABLE participant_access_sessions
  ADD COLUMN csrf_token_hash text,
  ADD CONSTRAINT participant_access_sessions_csrf_hash_chk
    CHECK (csrf_token_hash IS NULL OR char_length(csrf_token_hash) = 64);

ALTER TABLE background_jobs
  DROP CONSTRAINT background_jobs_type_chk;

ALTER TABLE background_jobs
  ADD CONSTRAINT background_jobs_type_chk
    CHECK (job_type IN ('GENERATE_BIB', 'SEND_REGISTRATION_CONFIRMATION', 'CLEAN_EXPIRED_UPLOADS'));

ALTER TABLE registration_security_attempts
  DROP CONSTRAINT registration_security_attempts_type_chk;

ALTER TABLE registration_security_attempts
  ADD CONSTRAINT registration_security_attempts_type_chk
    CHECK (
      attempt_type IN (
        'REGISTRATION_SUBMIT',
        'PARTICIPANT_ACCESS',
        'SUBMIT_REVISION',
        'EVIDENCE_DOWNLOAD'
      )
    );

CREATE TABLE upload_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_registration_id uuid NOT NULL REFERENCES event_registrations (id) ON DELETE CASCADE,
  registration_category_id uuid REFERENCES registration_categories (id) ON DELETE CASCADE,
  upload_override_until timestamptz NOT NULL,
  upload_override_reason text NOT NULL,
  created_by_admin_user_id uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT upload_overrides_reason_chk
    CHECK (char_length(btrim(upload_override_reason)) >= 5),
  CONSTRAINT upload_overrides_expiry_chk
    CHECK (upload_override_until > created_at)
);

CREATE INDEX upload_overrides_registration_active_idx
  ON upload_overrides (event_registration_id, registration_category_id, upload_override_until)
  WHERE revoked_at IS NULL;

CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_category_id uuid NOT NULL REFERENCES registration_categories (id) ON DELETE CASCADE,
  current_revision_id uuid,
  status text NOT NULL DEFAULT 'SUBMITTED',
  revision_count integer NOT NULL DEFAULT 0,
  first_submitted_at timestamptz,
  last_submitted_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  disqualified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT submissions_registration_category_uq
    UNIQUE (registration_category_id),
  CONSTRAINT submissions_status_chk
    CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUIRED', 'APPROVED', 'REJECTED', 'DISQUALIFIED')),
  CONSTRAINT submissions_revision_count_chk
    CHECK (revision_count >= 0)
);

CREATE INDEX submissions_status_idx
  ON submissions (status, last_submitted_at DESC);

CREATE INDEX submissions_last_submitted_idx
  ON submissions (last_submitted_at DESC);

CREATE TABLE upload_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants (id) ON DELETE CASCADE,
  event_registration_id uuid NOT NULL REFERENCES event_registrations (id) ON DELETE CASCADE,
  registration_category_id uuid NOT NULL REFERENCES registration_categories (id) ON DELETE CASCADE,
  purpose text NOT NULL,
  expected_mime_type text,
  maximum_size_bytes integer NOT NULL,
  object_key text NOT NULL,
  status text NOT NULL DEFAULT 'CREATED',
  expires_at timestamptz NOT NULL,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT upload_sessions_purpose_chk
    CHECK (purpose IN ('SUBMISSION_SCREENSHOT')),
  CONSTRAINT upload_sessions_status_chk
    CHECK (status IN ('CREATED', 'UPLOADED', 'FINALIZING', 'READY', 'FAILED', 'EXPIRED')),
  CONSTRAINT upload_sessions_size_chk
    CHECK (maximum_size_bytes > 0),
  CONSTRAINT upload_sessions_expiry_chk
    CHECK (expires_at > created_at),
  CONSTRAINT upload_sessions_object_key_uq
    UNIQUE (object_key)
);

CREATE INDEX upload_sessions_status_expires_idx
  ON upload_sessions (status, expires_at);

CREATE INDEX upload_sessions_registration_category_idx
  ON upload_sessions (registration_category_id, created_at DESC);

CREATE TABLE submission_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions (id) ON DELETE CASCADE,
  revision_number integer NOT NULL,
  activity_date date NOT NULL,
  distance_meter integer NOT NULL,
  elapsed_time_seconds integer NOT NULL,
  moving_time_seconds integer,
  activity_platform text NOT NULL,
  activity_platform_other text,
  activity_url text,
  normalized_activity_url text,
  participant_note text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'PARTICIPANT_WEB',
  created_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  CONSTRAINT submission_revisions_submission_number_uq
    UNIQUE (submission_id, revision_number),
  CONSTRAINT submission_revisions_revision_number_chk
    CHECK (revision_number > 0),
  CONSTRAINT submission_revisions_distance_chk
    CHECK (distance_meter > 0 AND distance_meter <= 200000),
  CONSTRAINT submission_revisions_elapsed_chk
    CHECK (elapsed_time_seconds > 0 AND elapsed_time_seconds <= 172800),
  CONSTRAINT submission_revisions_moving_chk
    CHECK (moving_time_seconds IS NULL OR (moving_time_seconds > 0 AND moving_time_seconds <= 172800)),
  CONSTRAINT submission_revisions_platform_chk
    CHECK (activity_platform IN ('STRAVA', 'GARMIN_CONNECT', 'NIKE_RUN_CLUB', 'ADIDAS_RUNNING', 'COROS', 'POLAR', 'SUUNTO', 'SAMSUNG_HEALTH', 'APPLE_FITNESS', 'GOOGLE_FIT', 'TREADMILL', 'OTHER')),
  CONSTRAINT submission_revisions_other_platform_chk
    CHECK (
      (activity_platform = 'OTHER' AND activity_platform_other IS NOT NULL AND char_length(btrim(activity_platform_other)) BETWEEN 2 AND 40)
      OR (activity_platform <> 'OTHER' AND activity_platform_other IS NULL)
    )
);

ALTER TABLE submissions
  ADD CONSTRAINT submissions_current_revision_fk
    FOREIGN KEY (current_revision_id)
    REFERENCES submission_revisions (id)
    ON DELETE SET NULL;

CREATE INDEX submission_revisions_submission_number_idx
  ON submission_revisions (submission_id, revision_number DESC);

CREATE INDEX submission_revisions_activity_date_idx
  ON submission_revisions (activity_date);

CREATE INDEX submission_revisions_platform_idx
  ON submission_revisions (activity_platform);

CREATE TABLE submission_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_revision_id uuid REFERENCES submission_revisions (id) ON DELETE SET NULL,
  upload_session_id uuid NOT NULL REFERENCES upload_sessions (id) ON DELETE RESTRICT,
  object_key text NOT NULL,
  thumbnail_object_key text,
  original_filename text NOT NULL,
  original_mime_type text,
  detected_mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  checksum_sha256 text NOT NULL,
  status text NOT NULL DEFAULT 'READY',
  created_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT submission_files_object_key_uq
    UNIQUE (object_key),
  CONSTRAINT submission_files_upload_session_uq
    UNIQUE (upload_session_id),
  CONSTRAINT submission_files_status_chk
    CHECK (status IN ('PENDING', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED', 'DELETED')),
  CONSTRAINT submission_files_size_chk
    CHECK (size_bytes > 0),
  CONSTRAINT submission_files_dimensions_chk
    CHECK (width >= 320 AND height >= 320),
  CONSTRAINT submission_files_checksum_chk
    CHECK (char_length(checksum_sha256) = 64)
);

CREATE INDEX submission_files_revision_idx
  ON submission_files (submission_revision_id);

CREATE INDEX submission_files_checksum_idx
  ON submission_files (checksum_sha256);

CREATE TABLE submission_system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES submissions (id) ON DELETE CASCADE,
  submission_revision_id uuid REFERENCES submission_revisions (id) ON DELETE SET NULL,
  event_registration_id uuid REFERENCES event_registrations (id) ON DELETE CASCADE,
  registration_category_id uuid REFERENCES registration_categories (id) ON DELETE CASCADE,
  actor_type text NOT NULL,
  action text NOT NULL,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT submission_system_events_actor_type_chk
    CHECK (actor_type IN ('SYSTEM', 'PARTICIPANT_PUBLIC', 'ADMIN_USER', 'WORKER')),
  CONSTRAINT submission_system_events_action_chk
    CHECK (char_length(btrim(action)) >= 3)
);

CREATE INDEX submission_system_events_submission_idx
  ON submission_system_events (submission_id, created_at DESC);

CREATE INDEX submission_system_events_registration_category_idx
  ON submission_system_events (registration_category_id, created_at DESC);
