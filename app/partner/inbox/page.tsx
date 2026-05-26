import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { listInboxConversations } from '@/lib/db/repositories/inbox';
import { ConversationList } from '@/components/agency/inbox/conversation-list';
import { ConversationPane } from '@/components/agency/inbox/conversation-pane';
import { ContextPanel } from '@/components/agency/inbox/context-panel';
import { KeyboardShortcuts } from '@/components/agency/inbox/keyboard-shortcuts';
import { InboxRealtimeBridge } from '@/components/agency/inbox/inbox-realtime-bridge';
import { AiAssistantPanel } from '@/components/agency/inbox/ai-assistant-panel';

export const metadata = { title: '파트너 통합 인박스' };

/**
 * Partner organization's unified inbox. Reuses every agency/medical inbox
 * component — webhooks, message routing, AI translation and reply
 * suggestions are all account-type-agnostic at the repository layer.
 *
 * Why partners (hotels, spas, restaurants, transport, tours) need this:
 * foreign guests routinely message them directly on KakaoTalk·WhatsApp
 * before going through an agency or hospital. Without a shared inbox,
 * those bookings vanish.
 */
export default async function PartnerInboxPage({
  searchParams,
}: {
  searchParams: { c?: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  const initial = await withRls(ctx, () => listInboxConversations(ctx.orgId, {}, 1));
  const initialId = searchParams.c ?? initial[0]?.id;

  return (
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
