CREATE TABLE event_certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  object_key text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  uploaded_by_admin_user_id uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_certificate_templates_status_chk
    CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  CONSTRAINT event_certificate_templates_dimensions_chk
    CHECK (width > 0 AND height > 0),
  CONSTRAINT event_certificate_templates_object_key_chk
    CHECK (char_length(object_key) BETWEEN 1 AND 500)
);

CREATE UNIQUE INDEX event_certificate_templates_active_uq
  ON event_certificate_templates (event_id)
  WHERE status = 'ACTIVE';

CREATE INDEX event_certificate_templates_event_idx
  ON event_certificate_templates (event_id, status, created_at DESC);

CREATE TABLE certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  registration_category_id uuid NOT NULL REFERENCES registration_categories (id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES submissions (id) ON DELETE CASCADE,
  approved_revision_id uuid NOT NULL REFERENCES submission_revisions (id) ON DELETE RESTRICT,
  template_id uuid NOT NULL REFERENCES event_certificate_templates (id) ON DELETE RESTRICT,
  certificate_number text NOT NULL,
  verification_code text NOT NULL,
  object_key text,
  status text NOT NULL DEFAULT 'PENDING',
  generated_at timestamptz,
  emailed_at timestamptz,
  invalidated_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT certificates_status_chk
    CHECK (status IN ('PENDING', 'GENERATING', 'READY', 'EMAILED', 'FAILED', 'INVALIDATED')),
  CONSTRAINT certificates_number_chk
    CHECK (char_length(btrim(certificate_number)) BETWEEN 8 AND 80),
  CONSTRAINT certificates_verification_code_chk
    CHECK (char_length(btrim(verification_code)) BETWEEN 12 AND 80),
  CONSTRAINT certificates_object_key_chk
    CHECK (object_key IS NULL OR char_length(object_key) BETWEEN 1 AND 500),
  CONSTRAINT certificates_generated_status_chk
    CHECK ((generated_at IS NULL AND object_key IS NULL) OR object_key IS NOT NULL),
  CONSTRAINT certificates_invalidation_status_chk
    CHECK ((invalidated_at IS NULL AND status <> 'INVALIDATED') OR (invalidated_at IS NOT NULL AND status = 'INVALIDATED'))
);

CREATE UNIQUE INDEX certificates_number_uq
  ON certificates (certificate_number);

CREATE UNIQUE INDEX certificates_verification_code_uq
  ON certificates (verification_code);

CREATE UNIQUE INDEX certificates_active_registration_category_uq
  ON certificates (registration_category_id)
  WHERE invalidated_at IS NULL;

CREATE INDEX certificates_event_status_idx
  ON certificates (event_id, status, created_at DESC);

CREATE INDEX certificates_submission_idx
  ON certificates (submission_id, created_at DESC);

ALTER TABLE background_jobs
  DROP CONSTRAINT background_jobs_type_chk;

ALTER TABLE background_jobs
  ADD CONSTRAINT background_jobs_type_chk
    CHECK (
      job_type IN (
        'GENERATE_BIB',
        'SEND_REGISTRATION_CONFIRMATION',
        'CLEAN_EXPIRED_UPLOADS',
        'SEND_REVISION_REQUEST_NOTIFICATION',
        'SEND_SUBMISSION_APPROVED_NOTIFICATION',
        'SEND_SUBMISSION_REJECTED_NOTIFICATION',
        'SEND_SUBMISSION_DISQUALIFIED_NOTIFICATION',
        'SEND_REVISED_SUBMISSION_RECEIVED_NOTIFICATION',
        'GENERATE_CERTIFICATE',
        'SEND_CERTIFICATE_EMAIL'
      )
    );

ALTER TABLE email_deliveries
  DROP CONSTRAINT email_deliveries_type_chk;

ALTER TABLE email_deliveries
  ADD CONSTRAINT email_deliveries_type_chk
    CHECK (
      email_type IN (
        'REGISTRATION_CONFIRMATION',
        'REVISION_REQUEST',
        'SUBMISSION_APPROVED',
        'SUBMISSION_REJECTED',
        'SUBMISSION_DISQUALIFIED',
        'REVISED_SUBMISSION_RECEIVED',
        'CERTIFICATE'
      )
    );
