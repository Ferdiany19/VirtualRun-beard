UPDATE event_bib_settings
SET font_family = 'Montserrat'
WHERE font_family = 'Inter';

ALTER TABLE event_bib_settings
  ALTER COLUMN font_family SET DEFAULT 'Montserrat',
  DROP CONSTRAINT event_bib_settings_font_family_chk;

ALTER TABLE event_bib_settings
  ADD CONSTRAINT event_bib_settings_font_family_chk
    CHECK (font_family IN ('Montserrat', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman'));
