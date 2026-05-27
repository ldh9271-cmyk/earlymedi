'use client';

import { ArrowLeft } from 'lucide-react';
import { useInboxStore } from '@/lib/stores/inbox-store';
import { cn } from '@/lib/utils/cn';

/**
 * Mobile-first layout switch around the inbox 3-column grid.
 *
 * Desktop (≥ md): list + pane + context all visible side-by-side. No
 *   visual change from before.
 *
 * Mobile (< md): only ONE of {list, pane} is shown at a time, full-width.
 *   - No conversation selected → list visible, pane hidden
 *   - Conversation selected   → pane visible (full-width), list hidden,
 *                                sticky "← 대화 목록" header for return
 *   - Context panel is always hidden on mobile (the conversation header
 *     keeps everything important — stage + status — visible).
 *
 * State lives in the inbox-store (Zustand). We deliberately DON'T sync
 * to the URL — the initial ?c= is handled by the server page on first
 * load, and subsequent selections shouldn't trigger server re-renders.
 */
export function InboxMobileShell({
  list,
  pane,
  context,
  assistant,
}: {
  list: React.ReactNode;
  pane: React.ReactNode;
  context: React.ReactNode;
  assistant: React.ReactNode;
}): JSX.Element {
  const selectedConversationId = useInboxStore((s) => s.selectedConversationId);
  const setSelectedConversationId = useInboxStore((s) => s.setSelectedConversationId);

  const isPaneOpenOnMobile = !!selectedConversationId;

  return (
    <div className="-m-6 grid min-h-0 flex-1 grid-cols-12 overflow-hidden bg-background md:-m-8">
      {/* List — full width on mobile when no conversation selected, 3/12 on desktop */}
      <aside
        className={cn(
          'col-span-12 border-r md:col-span-3 md:block',
          isPaneOpenOnMobile && 'hidden md:block',
        )}
      >
        {list}
      </aside>

      {/* Conversation pane — full width on mobile when a conversation is
          selected, 6/12 on desktop. Includes mobile-only sticky back
          header so the operator can return to the list with one tap. */}
      <section
        className={cn(
          'col-span-12 flex min-h-0 flex-col border-r md:col-span-6 md:block',
          !isPaneOpenOnMobile && 'hidden md:block',
        )}
      >
        {isPaneOpenOnMobile ? (
          <button
            type="button"
            onClick={() => setSelectedConversationId(null)}
            className="sticky top-0 z-20 flex w-full items-center gap-2 border-b bg-background/95 px-3 py-2.5 text-sm font-medium text-foreground backdrop-blur md:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>대화 목록</span>
          </button>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col">{pane}</div>
      </section>

      {/* Context — hidden on mobile (no obvious place for it), 3/12 on desktop */}
      <aside className="hidden md:col-span-3 md:block">{context}</aside>

      {assistant}
    </div>
  );
}
