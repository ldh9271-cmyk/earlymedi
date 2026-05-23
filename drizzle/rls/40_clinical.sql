-- Phase 4 — clinical RLS.
-- A hospital org (with linkedOrgId == its own organizations.id) can read +
-- write treatment_charts where hospital_org_id matches itself. The agency
-- still owns the row.

-- ── patients ────────────────────────────────────────────────────────
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS patients_agency_read ON public.patients;
CREATE POLICY patients_agency_read ON public.patients
  FOR SELECT
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id));

DROP POLICY IF EXISTS patients_agency_write ON public.patients;
CREATE POLICY patients_agency_write ON public.patients
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- Hospitals can read a patient only when there's an in-flight or finalized
-- treatment_chart linking that patient to the hospital's linked org.
DROP POLICY IF EXISTS patients_hospital_read ON public.patients;
CREATE POLICY patients_hospital_read ON public.patients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.treatment_charts tc
      WHERE tc.patient_id = patients.id
        AND tc.hospital_org_id = public.current_org_id()
        AND public.is_active_member(tc.hospital_org_id)
    )
  );

-- ── patient_medical_history ─────────────────────────────────────────
ALTER TABLE public.patient_medical_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS patient_history_org ON public.patient_medical_history;
CREATE POLICY patient_history_org ON public.patient_medical_history
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- ── patient_tags_catalog ────────────────────────────────────────────
ALTER TABLE public.patient_tags_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS patient_tags_org ON public.patient_tags_catalog;
CREATE POLICY patient_tags_org ON public.patient_tags_catalog
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- ── hospitals ───────────────────────────────────────────────────────
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hospitals_agency_full ON public.hospitals;
CREATE POLICY hospitals_agency_full ON public.hospitals
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- Linked hospital org can read its own listings.
DROP POLICY IF EXISTS hospitals_linked_read ON public.hospitals;
CREATE POLICY hospitals_linked_read ON public.hospitals
  FOR SELECT
  USING (
    linked_org_id = public.current_org_id() AND public.is_active_member(linked_org_id)
  );

-- ── hospital_doctors ────────────────────────────────────────────────
ALTER TABLE public.hospital_doctors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hospital_doctors_org ON public.hospital_doctors;
CREATE POLICY hospital_doctors_org ON public.hospital_doctors
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- ── procedures_catalog ──────────────────────────────────────────────
ALTER TABLE public.procedures_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS procedures_org ON public.procedures_catalog;
CREATE POLICY procedures_org ON public.procedures_catalog
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- ── hospital_term_aliases ───────────────────────────────────────────
ALTER TABLE public.hospital_term_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hospital_term_aliases_org ON public.hospital_term_aliases;
CREATE POLICY hospital_term_aliases_org ON public.hospital_term_aliases
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- ── hospital_referral_rates ─────────────────────────────────────────
ALTER TABLE public.hospital_referral_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS referral_rates_org ON public.hospital_referral_rates;
CREATE POLICY referral_rates_org ON public.hospital_referral_rates
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- ── hospital_deposit_policies ───────────────────────────────────────
ALTER TABLE public.hospital_deposit_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deposit_policies_org ON public.hospital_deposit_policies;
CREATE POLICY deposit_policies_org ON public.hospital_deposit_policies
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- ── treatment_charts ────────────────────────────────────────────────
ALTER TABLE public.treatment_charts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS charts_agency ON public.treatment_charts;
CREATE POLICY charts_agency ON public.treatment_charts
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- Hospital org can read + write charts assigned to its linked org. Finalized
-- charts are still read-only at the engine layer regardless of RLS.
DROP POLICY IF EXISTS charts_hospital_rw ON public.treatment_charts;
CREATE POLICY charts_hospital_rw ON public.treatment_charts
  FOR ALL
  USING (
    hospital_org_id = public.current_org_id() AND public.is_active_member(hospital_org_id)
  )
  WITH CHECK (
    hospital_org_id = public.current_org_id() AND public.is_active_member(hospital_org_id)
  );

-- ── treatment_chart_items ───────────────────────────────────────────
ALTER TABLE public.treatment_chart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chart_items_agency ON public.treatment_chart_items;
CREATE POLICY chart_items_agency ON public.treatment_chart_items
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

DROP POLICY IF EXISTS chart_items_hospital ON public.treatment_chart_items;
CREATE POLICY chart_items_hospital ON public.treatment_chart_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.treatment_charts tc
      WHERE tc.id = chart_id
        AND tc.hospital_org_id = public.current_org_id()
        AND public.is_active_member(tc.hospital_org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.treatment_charts tc
      WHERE tc.id = chart_id
        AND tc.hospital_org_id = public.current_org_id()
    )
  );

-- ── treatment_chart_revisions / attachments / approvals ─────────────
ALTER TABLE public.treatment_chart_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chart_revisions_org ON public.treatment_chart_revisions;
CREATE POLICY chart_revisions_org ON public.treatment_chart_revisions
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

ALTER TABLE public.treatment_chart_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chart_attachments_org ON public.treatment_chart_attachments;
CREATE POLICY chart_attachments_org ON public.treatment_chart_attachments
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

ALTER TABLE public.treatment_chart_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chart_approvals_org ON public.treatment_chart_approvals;
CREATE POLICY chart_approvals_org ON public.treatment_chart_approvals
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());
