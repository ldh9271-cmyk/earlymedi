import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { listInboxConversations } from '@/lib/db/repositories/inbox';
import { ConversationList } from '@/components/agency/inbox/conversation-list';
import { ConversationPane } from '@/components/agency/inbox/conversation-pane';
import { ContextPanel } from '@/components/agency/inbox/context-panel';
import { KeyboardShortcuts } from '@/components/agency/inbox/keyboard-shortcuts';
import { InboxRealtimeBridge } from '@/components/agency/inbox/inbox-realtime-bridge';
import { AiAssistantPanel } from '@/components/agency/inbox/ai-assistant-panel';
import { InboxMobileShell } from '@/components/agency/inbox/inbox-mobile-shell';

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
    // InboxMobileShell wraps the 3-column grid + adds a single-pane
    // fullscreen mode on mobile (< md). The shell itself is a client
    // component that reads selectedConversationId from the inbox store
    // and toggles which column is visible.
    <>
      <KeyboardShortcuts />
      <InboxRealtimeBridge organizationId={ctx.orgId} />
      <InboxMobileShell
        list={<ConversationList initialId={initialId} />}
        pane={<ConversationPane />}
        context={<ContextPanel />}
        assistant={<AiAssistantPanel />}
      />
    </>
  );
}
