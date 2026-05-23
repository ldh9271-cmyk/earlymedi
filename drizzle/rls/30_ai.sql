-- Phase 3 — AI tables RLS

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_usage_org_read ON public.ai_usage_logs;
CREATE POLICY ai_usage_org_read ON public.ai_usage_logs
  FOR SELECT
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id));
DROP POLICY IF EXISTS ai_usage_org_insert ON public.ai_usage_logs;
CREATE POLICY ai_usage_org_insert ON public.ai_usage_logs
  FOR INSERT
  WITH CHECK (organization_id = public.current_org_id());

ALTER TABLE public.ai_anonymization_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_anon_org ON public.ai_anonymization_tokens;
CREATE POLICY ai_anon_org ON public.ai_anonymization_tokens
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

ALTER TABLE public.ai_extraction_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_extraction_org ON public.ai_extraction_jobs;
CREATE POLICY ai_extraction_org ON public.ai_extraction_jobs
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

ALTER TABLE public.ai_extraction_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_feedback_org ON public.ai_extraction_feedback;
CREATE POLICY ai_feedback_org ON public.ai_extraction_feedback
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());
