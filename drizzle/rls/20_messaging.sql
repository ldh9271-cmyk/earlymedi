-- Phase 2 — messaging RLS. Same pattern as Phase 1: actor must be an active
-- member of the conversation's organization. No cross-org spillover.

-- ── channels ────────────────────────────────────────────────────────
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS channels_org_read ON public.channels;
CREATE POLICY channels_org_read ON public.channels
  FOR SELECT
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id));

DROP POLICY IF EXISTS channels_org_write ON public.channels;
CREATE POLICY channels_org_write ON public.channels
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- ── conversations ───────────────────────────────────────────────────
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversations_org_read ON public.conversations;
CREATE POLICY conversations_org_read ON public.conversations
  FOR SELECT
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id));

DROP POLICY IF EXISTS conversations_org_write ON public.conversations;
CREATE POLICY conversations_org_write ON public.conversations
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- ── conversation_assignees ──────────────────────────────────────────
ALTER TABLE public.conversation_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conv_assignees_visible ON public.conversation_assignees;
CREATE POLICY conv_assignees_visible ON public.conversation_assignees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND c.organization_id = public.current_org_id()
        AND public.is_active_member(c.organization_id)
    )
  );

DROP POLICY IF EXISTS conv_assignees_write ON public.conversation_assignees;
CREATE POLICY conv_assignees_write ON public.conversation_assignees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND c.organization_id = public.current_org_id()
        AND public.is_active_member(c.organization_id)
    )
  );

-- ── messages ────────────────────────────────────────────────────────
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_org_read ON public.messages;
CREATE POLICY messages_org_read ON public.messages
  FOR SELECT
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id));

DROP POLICY IF EXISTS messages_org_write ON public.messages;
CREATE POLICY messages_org_write ON public.messages
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- ── quick_replies ───────────────────────────────────────────────────
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quick_replies_org_read ON public.quick_replies;
CREATE POLICY quick_replies_org_read ON public.quick_replies
  FOR SELECT
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id));

DROP POLICY IF EXISTS quick_replies_org_write ON public.quick_replies;
CREATE POLICY quick_replies_org_write ON public.quick_replies
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());

-- ── glossary_terms ──────────────────────────────────────────────────
ALTER TABLE public.glossary_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS glossary_org_read ON public.glossary_terms;
CREATE POLICY glossary_org_read ON public.glossary_terms
  FOR SELECT
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id));

DROP POLICY IF EXISTS glossary_org_write ON public.glossary_terms;
CREATE POLICY glossary_org_write ON public.glossary_terms
  FOR ALL
  USING (organization_id = public.current_org_id() AND public.is_active_member(organization_id))
  WITH CHECK (organization_id = public.current_org_id());
