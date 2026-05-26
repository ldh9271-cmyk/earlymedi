-- Partner facilities & per-day availability overrides
-- Run in Supabase SQL Editor.
-- Postgres has no `CREATE TYPE IF NOT EXISTS`, so wrap in DO block.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'facility_kind') THEN
    CREATE TYPE facility_kind AS ENUM ('room', 'seat', 'vehicle', 'guide', 'other');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS partner_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind facility_kind NOT NULL DEFAULT 'room',
  capacity_total integer NOT NULL DEFAULT 1,
  description text,
  default_price_amount integer,
  default_price_currency text NOT NULL DEFAULT 'KRW',
  default_price_unit text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_facilities_org_idx
  ON partner_facilities (organization_id, is_active);

CREATE TABLE IF NOT EXISTS partner_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES partner_facilities(id) ON DELETE CASCADE,
  date date NOT NULL,
  available_count integer NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS partner_availability_facility_date_uq
  ON partner_availability (facility_id, date);
CREATE INDEX IF NOT EXISTS partner_availability_org_date_idx
  ON partner_availability (organization_id, date);

-- RLS: scope by organization
ALTER TABLE partner_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_facilities_org_policy ON partner_facilities;
CREATE POLICY partner_facilities_org_policy ON partner_facilities
  USING (organization_id::text = current_setting('app.current_org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.current_org_id', true));

DROP POLICY IF EXISTS partner_availability_org_policy ON partner_availability;
CREATE POLICY partner_availability_org_policy ON partner_availability
  USING (organization_id::text = current_setting('app.current_org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.current_org_id', true));
