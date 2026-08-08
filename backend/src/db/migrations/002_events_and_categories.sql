CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  short_description text NOT NULL,
  full_description text NOT NULL,
  terms_and_conditions text NOT NULL,
  registration_instructions text NOT NULL,
  upload_instructions text NOT NULL,
  registration_starts_at timestamptz NOT NULL,
  registration_ends_at timestamptz NOT NULL,
  activity_starts_at timestamptz NOT NULL,
  activity_ends_at timestamptz NOT NULL,
  upload_starts_at timestamptz NOT NULL,
  upload_ends_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Jakarta',
  event_status text NOT NULL DEFAULT 'DRAFT',
  publication_status text NOT NULL DEFAULT 'DRAFT',
  banner_object_key text,
  thumbnail_object_key text,
  registration_mode text NOT NULL DEFAULT 'FREE',
  price_amount_cents integer NOT NULL DEFAULT 0,
  price_currency char(3) NOT NULL DEFAULT 'IDR',
  maximum_participants integer,
  contact_email text,
  contact_phone text,
  contact_whatsapp text,
  brand_primary_color text NOT NULL DEFAULT '#0f766e',
  retention_policy jsonb NOT NULL DEFAULT '{"mode":"manual"}'::jsonb,
  created_by_admin_user_id uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  updated_by_admin_user_id uuid REFERENCES admin_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_slug_format_chk
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT events_time_order_chk
    CHECK (
      registration_starts_at < registration_ends_at
      AND activity_starts_at < activity_ends_at
      AND upload_starts_at < upload_ends_at
    ),
  CONSTRAINT events_timezone_chk
    CHECK (timezone = 'Asia/Jakarta'),
  CONSTRAINT events_status_chk
    CHECK (
      event_status IN (
        'DRAFT',
        'SCHEDULED',
        'REGISTRATION_OPEN',
        'REGISTRATION_CLOSED',
        'ACTIVITY_OPEN',
        'UPLOAD_OPEN',
        'REVIEW',
        'COMPLETED',
        'ARCHIVED'
      )
    ),
  CONSTRAINT events_publication_status_chk
    CHECK (publication_status IN ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED')),
  CONSTRAINT events_registration_mode_chk
    CHECK (registration_mode IN ('FREE', 'PAID')),
  CONSTRAINT events_price_amount_cents_chk
    CHECK (price_amount_cents >= 0),
  CONSTRAINT events_maximum_participants_chk
    CHECK (maximum_participants IS NULL OR maximum_participants > 0),
  CONSTRAINT events_brand_primary_color_chk
    CHECK (brand_primary_color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE UNIQUE INDEX events_slug_uq
  ON events (slug);

CREATE INDEX events_publication_status_idx
  ON events (publication_status, event_status);

CREATE INDEX events_registration_window_idx
  ON events (registration_starts_at, registration_ends_at);

CREATE INDEX events_upload_window_idx
  ON events (upload_starts_at, upload_ends_at);

CREATE TABLE event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  distance_meters integer NOT NULL,
  distance_tolerance_meters integer NOT NULL DEFAULT 0,
  minimum_age_years integer,
  maximum_age_years integer,
  gender_division text,
  participant_quota integer,
  ranking_enabled boolean NOT NULL DEFAULT true,
  certificate_enabled boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  price_amount_cents integer NOT NULL DEFAULT 0,
  price_currency char(3) NOT NULL DEFAULT 'IDR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_categories_slug_format_chk
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT event_categories_distance_chk
    CHECK (distance_meters > 0),
  CONSTRAINT event_categories_distance_tolerance_chk
    CHECK (distance_tolerance_meters >= 0),
  CONSTRAINT event_categories_age_chk
    CHECK (
      (minimum_age_years IS NULL OR minimum_age_years >= 0)
      AND (maximum_age_years IS NULL OR maximum_age_years >= 0)
      AND (
        minimum_age_years IS NULL
        OR maximum_age_years IS NULL
        OR maximum_age_years >= minimum_age_years
      )
    ),
  CONSTRAINT event_categories_gender_division_chk
    CHECK (gender_division IS NULL OR gender_division IN ('MALE', 'FEMALE', 'MIXED', 'OPEN')),
  CONSTRAINT event_categories_participant_quota_chk
    CHECK (participant_quota IS NULL OR participant_quota > 0),
  CONSTRAINT event_categories_display_order_chk
    CHECK (display_order >= 0),
  CONSTRAINT event_categories_price_amount_cents_chk
    CHECK (price_amount_cents >= 0),
  CONSTRAINT event_categories_event_slug_uq
    UNIQUE (event_id, slug)
);

CREATE INDEX event_categories_event_id_active_idx
  ON event_categories (event_id, is_active, display_order);
