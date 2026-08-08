CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type text NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  event_id uuid REFERENCES events (id) ON DELETE SET NULL,
  previous_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_actor_type_chk
    CHECK (actor_type IN ('SYSTEM', 'ADMIN_USER', 'PARTICIPANT_PUBLIC', 'WORKER')),
  CONSTRAINT audit_logs_action_chk
    CHECK (char_length(btrim(action)) >= 3),
  CONSTRAINT audit_logs_entity_type_chk
    CHECK (char_length(btrim(entity_type)) >= 2),
  CONSTRAINT audit_logs_correlation_id_chk
    CHECK (
      correlation_id IS NULL
      OR correlation_id ~ '^[a-zA-Z0-9._:-]{8,128}$'
    )
);

CREATE INDEX audit_logs_event_created_at_idx
  ON audit_logs (event_id, created_at DESC);

CREATE INDEX audit_logs_entity_idx
  ON audit_logs (entity_type, entity_id, created_at DESC);

CREATE INDEX audit_logs_actor_idx
  ON audit_logs (actor_type, actor_id, created_at DESC);

CREATE INDEX audit_logs_action_created_at_idx
  ON audit_logs (action, created_at DESC);
