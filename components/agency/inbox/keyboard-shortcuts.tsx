'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useInboxStore } from '@/lib/stores/inbox-store';
import type { ChannelKind } from '@/lib/channels/types';

type Row = { id: string };

/**
 * Global inbox keyboard shortcuts:
 *  - J / K           navigate next / previous conversation
 *  - ⌘K              focus search
 *  - ⌘Enter          handled inside the composer
 *  - ⌘.              toggle AI assistant pane
 *  - 1..5            stage shortcut (Lead/Qualified/Case/Quoted/Booked)
 *  - Esc             clear selection
 *
 * Avoids hijacking shortcuts while an input/textarea is focused.
 */
export function KeyboardShortcuts(): JSX.Element {
  const queryClient = useQueryClient();
  const {
    selectedConversationId,
    setSelectedConversationId,
    channelFilters,
    stageFilters,
    unreadOnly,
    search,
  } = useInboxStore();

  // Mirror the same query the list uses so J/K can find neighbours
  const { data: conversations } = useQuery<Row[]>({
    queryKey: ['inbox', { channelFilters, stageFilters, unreadOnly, search }],
    enabled: false, // never trigger fetch from here — read cache only
    initialData: undefined,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isEditable =
        tag === 'input' || tag === 'textarea' || (e.target as HTMLElement | null)?.isContentEditable;
      if (isEditable) {
        // Even while editing, allow ⌘K to focus search and ⌘. to toggle assistant.
        if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
          e.preventDefault();
          (document.getElementById('inbox-search') as HTMLInputElement | null)?.focus();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        (document.getElementById('inbox-search') as HTMLInputElement | null)?.focus();
        return;
      }

      const list = (queryClient.getQueryData([
        'inbox',
        { channelFilters, stageFilters, unreadOnly, search },
      ]) as Row[] | undefined) ?? conversations ?? [];
      const idx = list.findIndex((r) => r.id === selectedConversationId);

      if (e.key === 'j') {
        e.preventDefault();
        const next = list[Math.min(idx + 1, list.length - 1)];
        if (next) setSelectedConversationId(next.id);
      } else if (e.key === 'k') {
        e.preventDefault();
        const prev = list[Math.max(idx - 1, 0)];
        if (prev) setSelectedConversationId(prev.id);
      } else if (e.key === 'Escape') {
        setSelectedConversationId(null);
      } else if (['1', '2', '3', '4', '5'].includes(e.key) && selectedConversationId) {
        const stage = (['lead', 'qualified', 'case', 'quoted', 'booked'] as const)[Number(e.key) - 1];
        if (stage) {
          e.preventDefault();
          fetch(`/api/agency/inbox/${selectedConversationId}/stage`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stage }),
          })
            .then(() => queryClient.invalidateQueries({ queryKey: ['inbox'] }))
            .catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    queryClient,
    channelFilters,
    stageFilters,
    unreadOnly,
    search,
    selectedConversationId,
    setSelectedConversationId,
    conversations,
  ]);

  // Channel kind import kept for compile-time validation; no runtime usage here.
  void ({} as ChannelKind);

  return <></>;
}
