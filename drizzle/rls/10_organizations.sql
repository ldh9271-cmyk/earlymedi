-- organizations · users · memberships · affiliations · contracts · invites · billing · audit
-- RLS for Phase 1 foundation tables.

-- ── organizations ───────────────────────────────────────────────────
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_self_read ON public.organizations;
CREATE POLICY org_self_read ON public.organizations
  FOR SELECT
  USING (
    -- An actor sees an org if they are an active member of it...
    public.is_active_member(id)
    -- ...or their currently-active org has a cross-org link to it.
    OR public.has_cross_org_visibility(public.current_org_id(), id)
  );

DROP POLICY IF EXISTS org_self_update ON public.organizations;
CREATE POLICY org_self_update ON public.organizations
  FOR UPDATE
  USING (id = public.current_org_id() AND public.is_active_member(id))
  WITH CHECK (id = public.current_org_id());

-- Inserts are done by Supabase auth trigger / service role during signup wizard.
DROP POLICY IF EXISTS org_insert_authenticated ON public.organizations;
CREATE POLICY org_insert_authenticated ON public.organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── users ───────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_self_read ON public.users;
CREATE POLICY users_self_read ON public.users
  FOR SELECT
  USING (
    id = public.current_actor_id()
    OR EXISTS (
      SELECT 1 FROM public.org_memberships m1, public.org_memberships m2
      WHERE m1.user_id = public.current_actor_id()
        AND m2.user_id = users.id
        AND m1.organization_id = m2.organization_id
        AND m1.status = 'active' AND m2.status = 'active'
    )
  );

DROP POLICY IF EXISTS users_self_update ON public.users;
CREATE POLICY users_self_update ON public.users
  FOR UPDATE USING (id = public.current_actor_id())
  WITH CHECK (id = public.current_actor_id());

-- ── org_memberships ─────────────────────────────────────────────────
ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS memberships_org_visible ON public.org_memberships;
CREATE POLICY memberships_org_visible ON public.org_memberships
  FOR SELECT
  USING (
    user_id = public.current_actor_id()
    OR (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  );

DROP POLICY IF EXISTS memberships_org_admin_write ON public.org_memberships;
CREATE POLICY memberships_org_admin_write ON public.org_memberships
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- ── freelancer_affiliations ─────────────────────────────────────────
ALTER TABLE public.freelancer_affiliations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS affiliations_visible ON public.freelancer_affiliations;
CREATE POLICY affiliations_visible ON public.freelancer_affiliations
  FOR SELECT
  USING (
    (agency_org_id = public.current_org_id() AND public.is_active_member(agency_org_id))
    OR (freelancer_org_id = public.current_org_id() AND public.is_active_member(freelancer_org_id))
  );

DROP POLICY IF EXISTS affiliations_write ON public.freelancer_affiliations;
CREATE POLICY affiliations_write ON public.freelancer_affiliations
  FOR ALL
  USING (
    -- Only the agency side can mutate the affiliation contract.
    agency_org_id = public.current_org_id() AND public.is_active_member(agency_org_id)
  )
  WITH CHECK (agency_org_id = public.current_org_id());

-- ── partner_contracts ───────────────────────────────────────────────
ALTER TABLE public.partner_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contracts_visible ON public.partner_contracts;
CREATE POLICY contracts_visible ON public.partner_contracts
  FOR SELECT
  USING (
    (agency_org_id = public.current_org_id() AND public.is_active_member(agency_org_id))
    OR (partner_org_id = public.current_org_id() AND public.is_active_member(partner_org_id))
  );

DROP POLICY IF EXISTS contracts_write ON public.partner_contracts;
CREATE POLICY contracts_write ON public.partner_contracts
  FOR ALL
  USING (
    -- Either side can update their own signed_at column;
    -- detailed column-level rules handled by trigger in Phase 4.
    (agency_org_id = public.current_org_id() AND public.is_active_member(agency_org_id))
    OR (partner_org_id = public.current_org_id() AND public.is_active_member(partner_org_id))
  );

-- ── invites ─────────────────────────────────────────────────────────
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invites_org_visible ON public.invites;
CREATE POLICY invites_org_visible ON public.invites
  FOR SELECT
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id));

DROP POLICY IF EXISTS invites_org_write ON public.invites;
CREATE POLICY invites_org_write ON public.invites
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- ── billing_plans ───────────────────────────────────────────────────
-- Plans catalog is world-readable; only service role writes.
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plans_public_read ON public.billing_plans;
CREATE POLICY plans_public_read ON public.billing_plans
  FOR SELECT USING (true);

-- ── billing_accounts ────────────────────────────────────────────────
ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_self_read ON public.billing_accounts;
CREATE POLICY billing_self_read ON public.billing_accounts
  FOR SELECT
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id));

DROP POLICY IF EXISTS billing_self_write ON public.billing_accounts;
CREATE POLICY billing_self_write ON public.billing_accounts
  FOR UPDATE
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- ── audit_logs ──────────────────────────────────────────────────────
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_org_read ON public.audit_logs;
CREATE POLICY audit_org_read ON public.audit_logs
  FOR SELECT
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id));

-- Audit inserts are always done via service role / SECURITY DEFINER functions.
