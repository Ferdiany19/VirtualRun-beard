ALTER TABLE events
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_index_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_visibility_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS participant_benefits jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE events
  ADD CONSTRAINT events_seo_title_length_chk
    CHECK (seo_title IS NULL OR char_length(seo_title) <= 80),
  ADD CONSTRAINT events_seo_description_length_chk
    CHECK (seo_description IS NULL OR char_length(seo_description) <= 180),
  ADD CONSTRAINT events_participant_benefits_array_chk
    CHECK (jsonb_typeof(participant_benefits) = 'array');
