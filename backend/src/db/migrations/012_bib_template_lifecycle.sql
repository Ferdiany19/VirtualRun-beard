ALTER TABLE bib_template_versions
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS updated_by_admin_user_id uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE bib_template_versions
SET
  name = COALESCE(name, 'Template BIB v' || version_number::text),
  status = COALESCE(
    status,
    CASE WHEN is_active THEN 'ACTIVE' ELSE 'ARCHIVED' END
  ),
  updated_at = COALESCE(updated_at, created_at)
WHERE name IS NULL
   OR status IS NULL;

ALTER TABLE bib_template_versions
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'DRAFT';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bib_template_versions_status_chk'
  ) THEN
    ALTER TABLE bib_template_versions
      ADD CONSTRAINT bib_template_versions_status_chk
        CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bib_template_versions_name_chk'
  ) THEN
    ALTER TABLE bib_template_versions
      ADD CONSTRAINT bib_template_versions_name_chk
        CHECK (char_length(name) BETWEEN 1 AND 120);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS bib_template_versions_status_idx
  ON bib_template_versions (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS bib_template_versions_event_status_idx
  ON bib_template_versions (event_id, status, updated_at DESC);
