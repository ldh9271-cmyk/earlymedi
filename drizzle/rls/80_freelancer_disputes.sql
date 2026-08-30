-- ─────────────────────────────────────────────────────────
-- Freelancer disputes RLS — 양 당사자(프리랜서 org · Agency org)만
-- ─────────────────────────────────────────────────────────

ALTER TABLE public.freelancer_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY freelancer_disputes_party ON public.freelancer_disputes
  FOR ALL USING (
    (freelancer_org_id = public.current_org_id() AND public.is_active_member(freelancer_org_id))
    OR (agency_org_id = public.current_org_id() AND public.is_active_member(agency_org_id))
  );
