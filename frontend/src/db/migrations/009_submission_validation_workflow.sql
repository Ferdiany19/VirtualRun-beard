ALTER TABLE events
  ADD COLUMN allow_same_activity_across_categories boolean NOT NULL DEFAULT false;

ALTER TABLE submissions
  ADD COLUMN review_claimed_by_admin_user_id uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  ADD COLUMN review_claimed_at timestamptz,
  ADD COLUMN review_claim_expires_at timestamptz,
  ADD COLUMN review_version integer NOT NULL DEFAULT 0,
  ADD COLUMN approved_revision_id uuid,
  ADD COLUMN approved_by_admin_user_id uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  ADD COLUMN validation_completed_at timestamptz,
  ADD COLUMN ranking_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN ranking_exclusion_reason text,
  ADD COLUMN latest_participant_visible_note text,
  ADD COLUMN latest_validation_reason_code text,
  ADD CONSTRAINT submissions_review_version_chk
    CHECK (review_version >= 0),
  ADD CONSTRAINT submissions_review_claim_order_chk
    CHECK (
      (review_claimed_by_admin_user_id IS NULL AND review_claimed_at IS NULL AND review_claim_expires_at IS NULL)
      OR (review_claimed_by_admin_user_id IS NOT NULL AND review_claimed_at IS NOT NULL AND review_claim_expires_at IS NOT NULL AND review_claim_expires_at > review_claimed_at)
    ),
  ADD CONSTRAINT submissions_approved_revision_fk
    FOREIGN KEY (approved_revision_id)
    REFERENCES submission_revisions (id)
    ON DELETE SET NULL;

CREATE INDEX submissions_event_validation_queue_idx
  ON submissions (status, last_submitted_at DESC);

CREATE INDEX submissions_review_claim_idx
  ON submissions (review_claimed_by_admin_user_id, review_claim_expires_at)
  WHERE review_claimed_by_admin_user_id IS NOT NULL;

CREATE INDEX submissions_approved_revision_idx
  ON submissions (approved_revision_id)
  WHERE approved_revision_id IS NOT NULL;

CREATE INDEX submission_revisions_normalized_activity_url_idx
  ON submission_revisions (normalized_activity_url)
  WHERE normalized_activity_url IS NOT NULL;

CREATE INDEX submission_files_ready_checksum_idx
  ON submission_files (checksum_sha256)
  WHERE status = 'READY';

CREATE TABLE event_validator_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  assigned_by_admin_user_id uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by_admin_user_id uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  revoke_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_validator_assignments_revoke_reason_chk
    CHECK (revoke_reason IS NULL OR char_length(btrim(revoke_reason)) >= 5),
  CONSTRAINT event_validator_assignments_revoke_order_chk
    CHECK (revoked_at IS NULL OR revoked_at >= assigned_at)
);

CREATE UNIQUE INDEX event_validator_assignments_active_uq
  ON event_validator_assignments (event_id, admin_user_id)
  WHERE revoked_at IS NULL;

CREATE INDEX event_validator_assignments_event_idx
  ON event_validator_assignments (event_id, revoked_at, assigned_at DESC);

CREATE INDEX event_validator_assignments_admin_idx
  ON event_validator_assignments (admin_user_id, revoked_at, assigned_at DESC);

CREATE TABLE validation_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions (id) ON DELETE CASCADE,
  submission_revision_id uuid REFERENCES submission_revisions (id) ON DELETE SET NULL,
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  registration_category_id uuid NOT NULL REFERENCES registration_categories (id) ON DELETE CASCADE,
  reviewer_admin_user_id uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  action text NOT NULL,
  previous_status text NOT NULL,
  resulting_status text NOT NULL,
  reason_code text,
  participant_visible_note text,
  internal_note text,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  metadata jsonb,
  CONSTRAINT validation_reviews_action_chk
    CHECK (
      action IN (
        'START_REVIEW',
        'RELEASE_CLAIM',
        'APPROVE',
        'REQUEST_REVISION',
        'REJECT',
        'DISQUALIFY',
        'REOPEN_SUBMISSION',
        'RESTORE_TO_REVIEW',
        'OVERRIDE_REVIEW_CLAIM'
      )
    ),
  CONSTRAINT validation_reviews_status_chk
    CHECK (
      previous_status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUIRED', 'APPROVED', 'REJECTED', 'DISQUALIFIED')
      AND resulting_status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUIRED', 'APPROVED', 'REJECTED', 'DISQUALIFIED')
    ),
  CONSTRAINT validation_reviews_metadata_object_chk
    CHECK (metadata IS NULL OR jsonb_typeof(metadata) = 'object'),
  CONSTRAINT validation_reviews_reason_code_chk
    CHECK (
      reason_code IS NULL
      OR reason_code IN (
        'EVIDENCE_UNREADABLE',
        'ACTIVITY_URL_INACCESSIBLE',
        'DISTANCE_NEEDS_CLARIFICATION',
        'TIME_NEEDS_CLARIFICATION',
        'ACTIVITY_DATE_NEEDS_CLARIFICATION',
        'WRONG_CATEGORY_EVIDENCE',
        'PARTICIPANT_DATA_MISMATCH',
        'INCOMPLETE_EVIDENCE',
        'OTHER_REVISION_REQUIRED',
        'ACTIVITY_OUTSIDE_EVENT_PERIOD',
        'DISTANCE_BELOW_ALLOWED_TOLERANCE',
        'INVALID_OR_UNSUPPORTED_EVIDENCE',
        'DUPLICATE_ACTIVITY',
        'ACTIVITY_DOES_NOT_BELONG_TO_PARTICIPANT',
        'INVALID_ACTIVITY_DATA',
        'REVISION_DEADLINE_EXPIRED',
        'OTHER_REJECTION',
        'MANIPULATED_EVIDENCE',
        'SERIOUS_RULE_VIOLATION',
        'IDENTITY_FRAUD',
        'REPEATED_DUPLICATE_SUBMISSION',
        'ORGANIZER_DECISION',
        'OTHER_DISQUALIFICATION',
        'REOPEN_REQUESTED',
        'CLAIM_OVERRIDE'
      )
    )
);

CREATE INDEX validation_reviews_submission_idx
  ON validation_reviews (submission_id, reviewed_at DESC);

CREATE INDEX validation_reviews_revision_idx
  ON validation_reviews (submission_revision_id, reviewed_at DESC);

CREATE INDEX validation_reviews_event_action_idx
  ON validation_reviews (event_id, action, reviewed_at DESC);

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
        'SEND_REVISED_SUBMISSION_RECEIVED_NOTIFICATION'
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
        'REVISED_SUBMISSION_RECEIVED'
      )
    );
