import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { listInboxConversations } from '@/lib/db/repositories/inbox';
import { ConversationList } from '@/components/agency/inbox/conversation-list';
import { ConversationPane } from '@/components/agency/inbox/conversation-pane';
import { ContextPanel } from '@/components/agency/inbox/context-panel';
import { KeyboardShortcuts } from '@/components/agency/inbox/keyboard-shortcuts';
import { InboxRealtimeBridge } from '@/components/agency/inbox/inbox-realtime-bridge';
import { AiAssistantPanel } from '@/components/agency/inbox/ai-assistant-panel';

export const metadata = { title: '통합 인박스' };

export default async function AgencyInboxPage({
  searchParams,
}: {
  searchParams: { c?: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const initial = await withRls(ctx, () => listInboxConversations(ctx.orgId, {}, 1));
  const initialId = searchParams.c ?? initial[0]?.id;

  return (
    // -m-6/-m-8 cancels main's padding so the 3-column grid fills edge-to-edge.
    // min-h-0 + flex-1 lets the inbox grow into whatever vertical space main
    // gives it (AppShell now makes main `flex flex-col`), without
    // hard-coding viewport math that breaks when the trial banner appears.
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
