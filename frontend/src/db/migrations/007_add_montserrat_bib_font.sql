ALTER TABLE event_bib_settings
  DROP CONSTRAINT event_bib_settings_font_family_chk;

ALTER TABLE event_bib_settings
  ADD CONSTRAINT event_bib_settings_font_family_chk
    CHECK (font_family IN ('Inter', 'Montserrat', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman'));
