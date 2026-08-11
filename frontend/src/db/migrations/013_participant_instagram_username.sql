ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS instagram_username text;

ALTER TABLE participants
  ADD CONSTRAINT participants_instagram_username_chk
  CHECK (
    instagram_username IS NULL
    OR instagram_username ~ '^@?[A-Za-z0-9._]{1,30}$'
  );
