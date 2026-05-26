-- Partner services / menu (priced add-ons with no daily capacity)
-- Run in Supabase SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_service_category') THEN
    CREATE TYPE partner_service_category AS ENUM (
      'massage', 'transfer', 'guide', 'food', 'tour', 'other'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS partner_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category partner_service_category NOT NULL DEFAULT 'other',
  description text,
  price_amount integer NOT NULL,
  price_currency text NOT NULL DEFAULT 'KRW',
  price_unit text NOT NULL DEFAULT 'flat',
  duration_minutes integer,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_services_org_cat_idx
  ON partner_services (organization_id, category, is_active);

ALTER TABLE partner_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_services_org_policy ON partner_services;
CREATE POLICY partner_services_org_policy ON partner_services
  USING (organization_id::text = current_setting('app.current_org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.current_org_id', true));
