ALTER TABLE submission_revisions
  ALTER COLUMN elapsed_time_seconds DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS submission_revisions_elapsed_chk,
  DROP CONSTRAINT IF EXISTS submission_revisions_moving_chk;

