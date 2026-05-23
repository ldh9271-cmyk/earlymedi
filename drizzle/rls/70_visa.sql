-- ─────────────────────────────────────────────────────────
-- Phase 7 — Visa flow RLS
-- ─────────────────────────────────────────────────────────

ALTER TABLE public.visa_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visa_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY visa_requests_isolation ON public.visa_requests
  FOR ALL USING (
    organization_id = public.current_org_id()
    AND public.is_active_member(organization_id)
  );

CREATE POLICY visa_invitations_isolation ON public.visa_invitations
  FOR ALL USING (
    organization_id = public.current_org_id()
    AND public.is_active_member(organization_id)
  );
