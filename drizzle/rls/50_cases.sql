-- Phase 5 — cases RLS.
-- Cases are agency-owned. A hospital org may read a case ONLY through the
-- treatment-chart bridge — i.e. when a treatment_chart exists linking the
-- case to the hospital's linked org. This mirrors the patients pattern in
-- drizzle/rls/40_clinical.sql.

-- ── cases ───────────────────────────────────────────────────────────
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cases_agency_all ON public.cases;
CREATE POLICY cases_agency_all ON public.cases
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- Hospital orgs see a case only when a treatment_chart links them.
DROP POLICY IF EXISTS cases_hospital_read ON public.cases;
CREATE POLICY cases_hospital_read ON public.cases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.treatment_charts tc
      WHERE tc.case_id = cases.id
        AND tc.hospital_org_id = public.current_org_id()
        AND public.is_active_member(tc.hospital_org_id)
    )
  );

-- ── case_counters ───────────────────────────────────────────────────
ALTER TABLE public.case_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS case_counters_org ON public.case_counters;
CREATE POLICY case_counters_org ON public.case_counters
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- ── case_events ─────────────────────────────────────────────────────
ALTER TABLE public.case_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS case_events_agency_all ON public.case_events;
CREATE POLICY case_events_agency_all ON public.case_events
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- Hospital orgs see events only for cases they have a chart on.
-- Hospital actors must not write to the agency's case timeline directly —
-- their state changes flow through treatment_charts updates which the agency
-- mirrors as case_events.
DROP POLICY IF EXISTS case_events_hospital_read ON public.case_events;
CREATE POLICY case_events_hospital_read ON public.case_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.treatment_charts tc
      WHERE tc.case_id = case_events.case_id
        AND tc.hospital_org_id = public.current_org_id()
        AND public.is_active_member(tc.hospital_org_id)
    )
  );

-- ── case_assignees ──────────────────────────────────────────────────
ALTER TABLE public.case_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS case_assignees_org ON public.case_assignees;
CREATE POLICY case_assignees_org ON public.case_assignees
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- The assigned user themselves can always read their own assignment rows
-- (e.g. a freelancer interpreter assigned by the agency reads it from their
-- own freelancer org context).
DROP POLICY IF EXISTS case_assignees_self_read ON public.case_assignees;
CREATE POLICY case_assignees_self_read ON public.case_assignees
  FOR SELECT
  USING (user_id = public.current_actor_id() AND is_active = true);
