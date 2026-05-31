-- ──────────────────────────────────────────────────────────────────
-- KoreaGlowUp RLS — bootstrap
--
-- The system has THREE layers of authorization, applied in order:
--   1. Next.js 5-step middleware (lib/auth/middleware.ts)
--   2. Drizzle query layer (always filters by organization_id)
--   3. Postgres RLS (these files)
--
-- Layer 3 is the last line of defense. Even with a service-role key,
-- queries inside a request are run with `app.current_org_id` set, so
-- accidental cross-tenant reads are blocked.
--
-- A small helper function returns the GUC value, defaulting to NULL.
-- ──────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Per-request GUC: the active organization id (set by middleware step 5).
CREATE OR REPLACE FUNCTION public.current_org_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_org_id', true), '')::uuid;
$$;

-- Per-request GUC: the acting user id (mirrors auth.uid() in supabase).
CREATE OR REPLACE FUNCTION public.current_actor_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_actor_id', true), '')::uuid,
    auth.uid()
  );
$$;

-- A guard: "the actor belongs to org X with status='active'".
CREATE OR REPLACE FUNCTION public.is_active_member(org_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_memberships m
    WHERE m.organization_id = org_id
      AND m.user_id = public.current_actor_id()
      AND m.status = 'active'
  );
$$;

-- A guard: "the actor's org has an active affiliation/contract with org X".
CREATE OR REPLACE FUNCTION public.has_cross_org_visibility(
  source_org_id uuid,
  target_org_id uuid
) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.freelancer_affiliations fa
    WHERE fa.is_active = true
      AND (
        (fa.agency_org_id = source_org_id AND fa.freelancer_org_id = target_org_id)
        OR (fa.agency_org_id = target_org_id AND fa.freelancer_org_id = source_org_id)
      )
  ) OR EXISTS (
    SELECT 1 FROM public.partner_contracts pc
    WHERE pc.is_active = true
      AND (
        (pc.agency_org_id = source_org_id AND pc.partner_org_id = target_org_id)
        OR (pc.agency_org_id = target_org_id AND pc.partner_org_id = source_org_id)
      )
  );
$$;
