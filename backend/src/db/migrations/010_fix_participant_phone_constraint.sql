ALTER TABLE participants
  DROP CONSTRAINT participants_normalized_phone_chk;

ALTER TABLE participants
  ADD CONSTRAINT participants_normalized_phone_chk
    CHECK (normalized_phone ~ '^[+]628[0-9]{7,12}$');
