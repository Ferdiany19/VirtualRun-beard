ALTER TABLE events
  ADD COLUMN IF NOT EXISTS race_pack_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_contact_enabled boolean NOT NULL DEFAULT false;
