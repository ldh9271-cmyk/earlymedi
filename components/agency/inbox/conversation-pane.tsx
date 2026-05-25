'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox as InboxIcon, MoreHorizontal, Languages } from 'lucide-react';
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import { ChannelBadge } from './channel-badge';
import { MessageBubble } from './message-bubble';
import { Composer } from './composer';
import { useInboxStore } from '@/lib/stores/inbox-store';
import { cn } from '@/lib/utils/cn';
import type { ChannelKind } from '@/lib/channels/types';

type Detail = {
  conversation: {
    id: string;
    channelKind: ChannelKind;
    contactDisplayName: string | null;
    contactCountryCode: string | null;
    contactLocale: string | null;
    stage: 'lead' | 'qualified' | 'case' | 'quoted' | 'booked' | 'archived';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    subject: string | null;
    aiIntentClass: string | null;
    tags: string[];
  };
  messages: Array<{
    id: string;
    direction: 'inbound' | 'outbound' | 'system';
    senderRole: string;
    contentType: string;
    body: string;
    bodyLocale: string | null;
    translationKo: string | null;
    sentAt: string;
    status: string;
    aiRiskFlags: string[];
  }>;
};

const STAGES: Array<{ key: 'lead' | 'qualified' | 'case' | 'quoted' | 'booked'; label: string }> = [
  { key: 'lead', label: 'Lead' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'case', label: 'Case' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'booked', label: 'Booked' },
];

export function ConversationPane(): JSX.Element {
  const { selectedConversationId } = useInboxStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['conversation', selectedConversationId],
    enabled: !!selectedConversationId,
    queryFn: async () => {
      const res = await fetch(`/api/agency/inbox/${selectedConversationId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: Detail };
      return json.data;
    },
    refetchInterval: 8_000,
  });

  // Mark as read when opening
  useEffect(() => {
    if (!selectedConversationId) return;
    fetch(`/api/agency/inbox/${selectedConversationId}/read`, { method: 'POST' }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['inbox'] });
  }, [selectedConversationId, queryClient]);

  // Auto-translate any inbound messages on this conversation that don't
  // have a Korean translation yet. Fires once per conversation open. Free
  // for messages created when Gemini is now configured but were skipped
  // when it wasn't. Best-effort: on failure the operator can still hit
  // the manual "🌐 번역하기" pill under each bubble.
  useEffect(() => {
    if (!selectedConversationId) return;
    let cancelled = false;
    fetch(`/api/agency/inbox/${selectedConversationId}/backfill-translations`, {
      method: 'POST',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json) return;
        if (typeof json.translated === 'number' && json.translated > 0) {
          // Translations landed — refresh the pane so the new
          // translation_ko cards show up immediately.
          queryClient.invalidateQueries({ queryKey: ['conversation', selectedConversationId] });
        }
      })
      .catch(() => {});
    return (): void => {
      cancelled = true;
    };
  }, [selectedConversationId, queryClient]);

  const stageMut = useMutation({
    mutationFn: async (stage: 'lead' | 'qualified' | 'case' | 'quoted' | 'booked' | 'archived') => {
      if (!selectedConversationId) throw new Error('no conversation');
      const res = await fetch(`/api/agency/inbox/${selectedConversationId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });

  if (!selectedConversationId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <InboxIcon className="h-8 w-8 text-muted-foreground/40" />
        <div>대화를 선택하세요.</div>
        <div className="text-xs">J / K 키로 이동 · ⌘K 검색 · ⌘Enter 전송 · ⌘. AI 어시스턴트</div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-full flex-col gap-3 p-6">
        <div className="h-6 w-1/3 animate-pulse rounded bg-muted/60" />
        <div className="flex-1 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 w-3/4 animate-pulse rounded-2xl bg-muted/60" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <ChannelBadge kind={data.conversation.channelKind} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {data.conversation.contactDisplayName ?? '(이름 없음)'}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{data.conversation.contactCountryCode ?? '—'}</span>
            <span>·</span>
            <span>{data.conversation.contactLocale ?? '—'}</span>
            {data.conversation.aiIntentClass ? (
              <>
                <span>·</span>
                <span className="text-hospitality-700">
                  {data.conversation.aiIntentClass.replace(/_/g, ' ')}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {/* AI auto-translation toggle — global, persisted via inbox-store.
            ON ⇒ agent-typed Korean gets translated into patient's locale
            before delivery; only the translated text reaches the patient. */}
        <AutoTranslateToggle contactLocale={data.conversation.contactLocale} />

        <div className="ml-auto flex items-center gap-1.5">
          {STAGES.map((s) => {
            const active = data.conversation.stage === s.key;
            return (
              <button
                key={s.key}
                type="button"
                disabled={stageMut.isPending}
                onClick={() => stageMut.mutate(s.key)}
                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
                  active ? 'bg-care-500 text-white' : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {s.label}
              </button>
            );
          })}
          <button type="button" className="ml-1 rounded-md p-1 hover:bg-muted" title="더보기">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messenger-style stack: scroll fills the column, content is anchored
          to the bottom so the most recent message sits right above the
          composer (no gaping whitespace when there are only 1-2 messages). */}
      <ScrollArea className="flex-1">
        <div className="flex min-h-full flex-col justify-end gap-2 px-4 py-4">
          {data.messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={{
                ...m,
                sentAt: new Date(m.sentAt),
              }}
            />
          ))}
        </div>
      </ScrollArea>

      <Composer conversationId={data.conversation.id} contactLocale={data.conversation.contactLocale} />
    </div>
  );
}

/**
 * Small toggle that lives in the conversation header. Reads + writes
 * `autoTranslate` on the inbox store (persisted to localStorage). When
 * ON, any agent reply typed in Korean is AI-translated into the
 * patient's contactLocale before being delivered — the patient never
 * sees the Korean original. When the patient is already Korean-speaking
 * the button shows the neutral "ko" state since no translation happens.
 */
function AutoTranslateToggle({ contactLocale }: { contactLocale: string | null }): JSX.Element {
  const { autoTranslate, setAutoTranslate } = useInboxStore();
  const patientIsKorean = !contactLocale || contactLocale.startsWith('ko');
  const enabled = autoTranslate && !patientIsKorean;

  return (
    <button
      type="button"
      onClick={() => setAutoTranslate(!autoTranslate)}
      disabled={patientIsKorean}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
        enabled
          ? 'border-hospitality-300 bg-hospitality-50 text-hospitality-800'
          : patientIsKorean
            ? 'cursor-not-allowed border-border bg-muted/40 text-muted-foreground opacity-60'
            : 'border-border bg-card text-muted-foreground hover:bg-muted',
      )}
      title={
        patientIsKorean
          ? '한국어 환자 — 자동 번역 불필요'
          : enabled
            ? `ON · 한국어로 입력하면 ${contactLocale} 로 자동 번역해 전송 (고객은 번역문만 봅니다)`
            : 'OFF — 입력한 그대로 전송'
      }
      aria-pressed={enabled}
    >
      <Languages className="h-3 w-3" />
      <span>AI 번역</span>
      <span
        className={cn(
          'rounded-full px-1.5 py-0 text-[9px] font-bold',
          enabled
            ? 'bg-hospitality-500/20 text-hospitality-900'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {patientIsKorean ? '—' : enabled ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}
