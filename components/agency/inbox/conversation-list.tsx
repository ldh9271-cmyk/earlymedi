'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Inbox, AlertCircle } from 'lucide-react';
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: ConversationRow[] };
      return json.data;
    },
    refetchInterval: 15_000,
  });

  // Auto-pick initial conversation on first render
  useEffect(() => {
    if (initialId && !selectedConversationId) setSelectedConversationId(initialId);
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
          <div className="p-6 text-sm text-destructive">
            <AlertCircle className="mb-2 h-4 w-4" /> 인박스 로딩 실패. 새로고침 해주세요.
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
                onSelect={() => setSelectedConversationId(c.id)}
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
  onSelect,
}: {
  row: ConversationRow;
  active: boolean;
  onSelect: () => void;
}): JSX.Element {
  const when = row.lastInboundAt ? formatLocal(new Date(row.lastInboundAt), 'Asia/Seoul', 'MM-dd HH:mm') : '';
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'block w-full px-3 py-3 text-left transition-colors',
          active ? 'bg-brand-50' : 'hover:bg-muted/40',
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
    </li>
  );
}
