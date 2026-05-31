-- ─────────────────────────────────────────────────────────
-- Phase 8 — GlowCare aftercare RLS
-- ─────────────────────────────────────────────────────────

ALTER TABLE public.recovery_routine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_routine_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_alerts ENABLE ROW LEVEL SECURITY;

-- Routine templates: global templates (organization_id IS NULL) are world-readable.
-- Org-specific templates only visible to the owning org's active members.
CREATE POLICY recovery_routine_templates_select ON public.recovery_routine_templates
  FOR SELECT USING (
    organization_id IS NULL
    OR (
      organization_id = public.current_org_id()
      AND public.is_active_member(organization_id)
    )
  );
CREATE POLICY recovery_routine_templates_write ON public.recovery_routine_templates
  FOR ALL USING (
    organization_id = public.current_org_id()
    AND public.is_active_member(organization_id)
  );

-- Routines / tasks / photos / alerts: strict org isolation.
CREATE POLICY recovery_routines_isolation ON public.recovery_routines
  FOR ALL USING (
    organization_id = public.current_org_id()
    AND public.is_active_member(organization_id)
  );

CREATE POLICY recovery_routine_tasks_isolation ON public.recovery_routine_tasks
  FOR ALL USING (
    organization_id = public.current_org_id()
    AND public.is_active_member(organization_id)
  );

CREATE POLICY recovery_photos_isolation ON public.recovery_photos
  FOR ALL USING (
    organization_id = public.current_org_id()
    AND public.is_active_member(organization_id)
  );

CREATE POLICY recovery_alerts_isolation ON public.recovery_alerts
  FOR ALL USING (
    organization_id = public.current_org_id()
    AND public.is_active_member(organization_id)
  );
