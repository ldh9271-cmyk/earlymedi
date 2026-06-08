'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Inbox, AlertCircle, Trash2, Loader2 } from 'lucide-react';
import { Input } from '@/components/shared/ui/input';
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import { ChannelBadge } from './channel-badge';
import { ChannelFilter } from './channel-filter';
import { StageFilter } from './stage-filter';
import { useInboxStore } from '@/lib/stores/inbox-store';
import { cn } from '@/lib/utils/cn';
import { formatLocal } from '@/lib/utils/date';
import type { ChannelKind } from '@/lib/channels/types';

type ConversationRow = {
  id: string;
  channelKind: ChannelKind;
  contactDisplayName: string | null;
  contactCountryCode: string | null;
  contactLocale: string | null;
  stage: 'lead' | 'qualified' | 'case' | 'quoted' | 'booked' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  unreadCount: number;
  lastInboundAt: string | null;
  subject: string | null;
  aiIntentClass: string | null;
  lastMessagePreview: string | null;
  lastMessageTranslationKo: string | null;
};

export function ConversationList({ initialId }: { initialId?: string }): JSX.Element {
  const {
    selectedConversationId,
    setSelectedConversationId,
    channelFilters,
    stageFilters,
    unreadOnly,
    search,
    setSearch,
  } = useInboxStore();
  const qc = useQueryClient();
  // Tracks the row currently being deleted so we can disable that
  // single row's UI without locking the rest of the list.
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const queryKey = useMemo(
    () => ['inbox', { channelFilters, stageFilters, unreadOnly, search }],
    [channelFilters, stageFilters, unreadOnly, search],
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (channelFilters.length > 0) params.set('channels', channelFilters.join(','));
      if (stageFilters.length > 0) params.set('stages', stageFilters.join(','));
      if (unreadOnly) params.set('unread', '1');
      if (search) params.set('q', search);
      const res = await fetch(`/api/agency/inbox?${params.toString()}`);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${body ? ' — ' + body.slice(0, 200) : ''}`);
      }
      const json = (await res.json()) as { data: ConversationRow[] };
      return json.data;
    },
    refetchInterval: 15_000,
    retry: 1,
  });

  /**
   * Hard-delete a single conversation. UX intentionally uses native
   * window.confirm rather than a custom modal — this is a fairly
   * destructive action that benefits from the browser's own friction,
   * and avoids pulling in a dialog dependency just for one button.
   *
   * Optimistic update strategy:
   *   1. Snapshot the current list from cache.
   *   2. Eagerly drop the row.
   *   3. If the server returns an error, restore the snapshot + toast.
   *   4. If the deleted row was selected, clear selection so the
   *      detail pane doesn't keep loading messages for a row the
   *      server no longer recognizes.
   */
  async function handleDelete(row: ConversationRow): Promise<void> {
    const name = row.contactDisplayName ?? '(이름 없음)';
    if (!window.confirm(`"${name}" 대화를 정말 삭제할까요?\n메시지 전체가 함께 영구 삭제됩니다.`)) {
      return;
    }
    setDeletingId(row.id);
    const snapshot = qc.getQueryData<ConversationRow[]>(queryKey);
    qc.setQueryData<ConversationRow[]>(queryKey, (prev) =>
      (prev ?? []).filter((c) => c.id !== row.id),
    );
    try {
      const res = await fetch(`/api/agency/inbox/${row.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${body ? ' — ' + body.slice(0, 200) : ''}`);
      }
      if (selectedConversationId === row.id) {
        setSelectedConversationId(null);
      }
      toast.success(`"${name}" 대화를 삭제했습니다`);
    } catch (e) {
      qc.setQueryData(queryKey, snapshot);
      toast.error(e instanceof Error ? e.message : '삭제 실패');
    } finally {
      setDeletingId(null);
    }
  }

  // Auto-pick initial conversation on FIRST render only.
  //
  // History: this used to fire on every render where selectedConversationId
  // became null, which trapped mobile users — after tapping "← 대화 목록"
  // to clear the selection, this effect re-selected the same conversation
  // and bounced them right back into it. Now we guard with a ref so it
  // runs at most once per mount.
  //
  // Viewport behavior:
  //   - Desktop (≥ md): always auto-pick the first conversation so the
  //     middle pane isn't blank — matches Gmail / Slack default.
  //   - Mobile (< md): NEVER auto-pick. The list is the entry point;
  //     user explicitly taps a row to drill into a conversation. Except
  //     when they arrived via ?c= deep-link (notification / shared URL),
  //     in which case we still honor it.
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (autoSelectedRef.current) return;
    if (!initialId || selectedConversationId) return;

    // Latch immediately — even if we decide NOT to select (mobile), we
    // still want to prevent the effect from re-running after the user
    // clears the selection via the back button.
    autoSelectedRef.current = true;

    const isDesktop =
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 768px)').matches;
    const explicitFromUrl =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('c') === initialId;

    if (explicitFromUrl || isDesktop) {
      setSelectedConversationId(initialId);
    }
  }, [initialId, selectedConversationId, setSelectedConversationId]);

  // Listen for refresh requests from the Supabase Realtime channel
  useEffect(() => {
    const handler = (): void => {
      refetch();
    };
    window.addEventListener('em:inbox:refresh', handler);
    return () => window.removeEventListener('em:inbox:refresh', handler);
  }, [refetch]);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름·국가·시술 검색 (⌘K)"
            className="h-8 pl-8 text-sm"
            id="inbox-search"
          />
        </div>
        <ChannelFilter />
        <StageFilter />
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-md bg-muted/60" />
            ))}
          </div>
        ) : error ? (
          <div className="space-y-2 p-6 text-sm">
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-medium">인박스 로딩 실패</div>
                <div className="mt-1 break-all text-xs font-mono text-destructive/80">
                  {error instanceof Error ? error.message : String(error)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-md border border-input bg-card px-3 py-1 text-xs hover:bg-muted"
            >
              다시 시도
            </button>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-sm text-muted-foreground">
            <Inbox className="h-8 w-8 text-muted-foreground/40" />
            <div>매칭되는 대화가 없습니다.</div>
          </div>
        ) : (
          <ul className="divide-y">
            {data.map((c) => (
              <ConversationRowItem
                key={c.id}
                row={c}
                active={c.id === selectedConversationId}
                deleting={deletingId === c.id}
                onSelect={() => setSelectedConversationId(c.id)}
                onDelete={() => handleDelete(c)}
              />
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}

function ConversationRowItem({
  row,
  active,
  deleting,
  onSelect,
  onDelete,
}: {
  row: ConversationRow;
  active: boolean;
  deleting: boolean;
  onSelect: () => void;
  onDelete: () => void;
}): JSX.Element {
  const when = row.lastInboundAt ? formatLocal(new Date(row.lastInboundAt), 'Asia/Seoul', 'MM-dd HH:mm') : '';
  // The row is a giant <button>; we nest the delete control in a <span>
  // (not a <button>) and stopPropagation manually so the parent click
  // still fires for normal area clicks but the delete area opens the
  // confirm dialog instead. Using a sibling absolute-positioned button
  // is the standard pattern, but requires `position: relative` on the
  // parent and breaks the simple block layout we have today.
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onSelect}
        disabled={deleting}
        className={cn(
          'block w-full px-3 py-3 pr-9 text-left transition-colors',
          active ? 'bg-brand-50' : 'hover:bg-muted/40',
          deleting && 'opacity-50',
        )}
      >
        <div className="flex items-center gap-2">
          <ChannelBadge kind={row.channelKind} />
          {row.priority === 'urgent' ? (
            <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
              긴급
            </span>
          ) : null}
          {row.stage !== 'lead' ? (
            <span className="rounded-full bg-care-50 px-1.5 py-0.5 text-[10px] font-semibold text-care-700">
              {row.stage}
            </span>
          ) : null}
          <span className="ml-auto text-[10px] text-muted-foreground">{when}</span>
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <div className="truncate text-sm font-semibold">
            {row.contactDisplayName ?? '(이름 없음)'}
          </div>
          {row.contactCountryCode ? (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {row.contactCountryCode}
            </span>
          ) : null}
          {row.unreadCount > 0 ? (
            <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
              {row.unreadCount}
            </span>
          ) : null}
        </div>
        {row.lastMessagePreview ? (
          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {row.lastMessagePreview}
          </div>
        ) : null}
        {row.lastMessageTranslationKo &&
        row.lastMessageTranslationKo !== row.lastMessagePreview ? (
          <div className="mt-0.5 line-clamp-1 text-[11px] italic text-brand-700/80">
            ↳ {row.lastMessageTranslationKo}
          </div>
        ) : null}
        {row.aiIntentClass ? (
          <div className="mt-1 text-[10px] uppercase tracking-wider text-hospitality-700">
            {row.aiIntentClass.replace(/_/g, ' ')}
          </div>
        ) : null}
      </button>

      {/* Delete button — absolute-positioned over the row so it doesn't
          steal vertical space. Always rendered on touch (no hover), only
          fades in on desktop hover. Sized small to avoid accidental
          taps next to the main click target. */}
      <button
        type="button"
        aria-label="대화 삭제"
        title="대화 삭제 (메시지 전체 영구 삭제)"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={deleting}
        className={cn(
          'absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground/50 transition',
          'hover:bg-destructive/10 hover:text-destructive',
          'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
          'md:opacity-0',
          // On touch / coarse pointers the hover-only reveal hides the
          // button entirely. Force-show under coarse pointer media.
          '[@media(pointer:coarse)]:opacity-100',
          deleting && 'opacity-100',
        )}
      >
        {deleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
    </li>
  );
}
