import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { listInboxConversations } from '@/lib/db/repositories/inbox';
import { ConversationList } from '@/components/agency/inbox/conversation-list';
import { ConversationPane } from '@/components/agency/inbox/conversation-pane';
import { ContextPanel } from '@/components/agency/inbox/context-panel';
import { KeyboardShortcuts } from '@/components/agency/inbox/keyboard-shortcuts';
import { InboxRealtimeBridge } from '@/components/agency/inbox/inbox-realtime-bridge';
import { AiAssistantPanel } from '@/components/agency/inbox/ai-assistant-panel';

export const metadata = { title: '병원 통합 인박스' };

/**
 * Medical institution's unified inbox. Reuses every agency inbox
 * component verbatim — channel webhooks, message routing, AI translation
 * and reply suggestions are all account-type-agnostic at the repository
 * layer. The only differences vs /agency/inbox are:
 *
 *   - requireAccess gate is 'medical' instead of 'agency'
 *   - The /api/agency/inbox/* endpoints (still URL-prefixed "agency" for
 *     historical reasons) have their allowedAccountTypes relaxed to
 *     ['agency', 'medical'] so client fetches work from this page too.
 *
 * Eventually we'll move the components under `components/shared/inbox/`
 * and rename the API routes, but that's a much bigger refactor than the
 * value it delivers right now.
 */
export default async function MedicalInboxPage({
  searchParams,
}: {
  searchParams: { c?: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const initial = await withRls(ctx, () => listInboxConversations(ctx.orgId, {}, 1));
  const initialId = searchParams.c ?? initial[0]?.id;

  return (
    // -m-6/-m-8 cancels main's padding so the 3-column grid fills edge-to-edge.
    <div className="-m-6 grid min-h-0 flex-1 grid-cols-12 overflow-hidden bg-background md:-m-8">
      <KeyboardShortcuts />
      <InboxRealtimeBridge organizationId={ctx.orgId} />

      <aside className="col-span-12 border-r md:col-span-3">
        <ConversationList initialId={initialId} />
      </aside>

      <section className="col-span-12 border-r md:col-span-6">
        <ConversationPane />
      </section>

      <aside className="hidden md:col-span-3 md:block">
        <ContextPanel />
      </aside>

      <AiAssistantPanel />
    </div>
  );
}
