-- Freelancer referral codes (송객·인플루언서 추적용 코드 + QR)
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS freelancer_referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  target_locale text,
  notes text,
  clicks integer NOT NULL DEFAULT 0,
  signups integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS freelancer_referral_codes_code_uq
  ON freelancer_referral_codes (code);
CREATE INDEX IF NOT EXISTS freelancer_referral_codes_org_idx
  ON freelancer_referral_codes (organization_id, is_active);

ALTER TABLE freelancer_referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS freelancer_referral_codes_org_policy ON freelancer_referral_codes;
CREATE POLICY freelancer_referral_codes_org_policy ON freelancer_referral_codes
  USING (organization_id::text = current_setting('app.current_org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.current_org_id', true));
