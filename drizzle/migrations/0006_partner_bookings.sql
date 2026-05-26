-- Partner bookings (reservations) — references facilities + services as JSONB items
-- Run in Supabase SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_booking_status') THEN
    CREATE TYPE partner_booking_status AS ENUM (
      'pending', 'confirmed', 'completed', 'cancelled', 'declined'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS partner_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_agency_org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  status partner_booking_status NOT NULL DEFAULT 'pending',
  guest_name text NOT NULL,
  guest_country_code text,
  guest_contact text,
  party_size integer NOT NULL DEFAULT 1,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'KRW',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz
);

CREATE INDEX IF NOT EXISTS partner_bookings_org_status_idx
  ON partner_bookings (organization_id, status, check_in_date);
CREATE INDEX IF NOT EXISTS partner_bookings_org_date_idx
  ON partner_bookings (organization_id, check_in_date);

ALTER TABLE partner_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_bookings_org_policy ON partner_bookings;
CREATE POLICY partner_bookings_org_policy ON partner_bookings
  USING (organization_id::text = current_setting('app.current_org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.current_org_id', true));
