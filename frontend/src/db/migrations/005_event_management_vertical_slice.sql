ALTER TABLE events
  DROP CONSTRAINT events_time_order_chk;

ALTER TABLE events
  ADD CONSTRAINT events_time_order_chk
    CHECK (
      registration_starts_at <= registration_ends_at
      AND activity_starts_at <= activity_ends_at
      AND upload_starts_at <= upload_ends_at
    );

ALTER TABLE events
  ADD COLUMN faq_items jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE events
  ADD CONSTRAINT events_faq_items_array_chk
    CHECK (jsonb_typeof(faq_items) = 'array');

ALTER TABLE event_categories
  ADD COLUMN description text;

CREATE TABLE admin_event_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  assigned_by_admin_user_id uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_event_assignments_event_user_uq
    UNIQUE (event_id, admin_user_id)
);

CREATE INDEX admin_event_assignments_admin_user_id_idx
  ON admin_event_assignments (admin_user_id, event_id);

CREATE INDEX admin_event_assignments_event_id_idx
  ON admin_event_assignments (event_id);
