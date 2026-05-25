'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Languages, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatLocal } from '@/lib/utils/date';
import { useInboxStore } from '@/lib/stores/inbox-store';

export type BubbleMessage = {
  id: string;
  direction: 'inbound' | 'outbound' | 'system';
  senderRole: string;
  body: string;
  bodyLocale: string | null;
  translationKo: string | null;
  sentAt: Date | string;
  status: string;
  aiRiskFlags?: string[];
};

/**
 * One chat bubble, KakaoTalk/iMessage-shaped. Inbound (patient) sits on
 * the left with a white card; outbound (agent) sits on the right with a
 * filled brand bubble.
 *
 * Below each bubble the translation card may appear:
 *   - inbound non-Korean message with translation_ko present  →
 *       "AI 번역 · EN→KO" card with the Korean translation
 *   - inbound non-Korean message WITHOUT translation_ko       →
 *       "다시 번역" retry button (calls the manual translate API)
 *   - outbound message where the agent typed Korean and we
 *     translated it before delivery                            →
 *       "내 한국어 원문" card so the agent sees what they wrote
 */
export function MessageBubble({ message }: { message: BubbleMessage }): JSX.Element {
  const queryClient = useQueryClient();
  const { selectedConversationId } = useInboxStore();
  const [retrying, setRetrying] = useState(false);

  const isOutbound = message.direction === 'outbound';
  const isSystem = message.direction === 'system';
  const ts = formatLocal(new Date(message.sentAt), 'Asia/Seoul', 'HH:mm');
  const sourceLabel =
    message.bodyLocale && message.bodyLocale !== 'ko' ? message.bodyLocale.toUpperCase() : null;

  const inboundNeedsTranslation =
    !isOutbound &&
    !!message.bodyLocale &&
    !message.bodyLocale.startsWith('ko') &&
    !(message.translationKo && message.translationKo.trim());
  const showInboundTranslation =
    !isOutbound &&
    !!message.translationKo &&
    message.translationKo.trim() !== '' &&
    message.translationKo !== message.body;
  // Outbound: if the row has translation_ko ≠ body, the agent typed Korean
  // and the body got machine-translated for the patient. Show the agent's
  // Korean original under the bubble so they see what they actually wrote.
  const showOutboundOriginal =
    isOutbound &&
    !!message.translationKo &&
    message.translationKo.trim() !== '' &&
    message.translationKo !== message.body;

  async function handleRetryTranslate(): Promise<void> {
    if (!selectedConversationId) return;
    setRetrying(true);
    try {
      const res = await fetch(
        `/api/agency/inbox/${selectedConversationId}/messages/${message.id}/translate`,
        { method: 'POST' },
      );
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        hint?: string;
        data?: { translationKo: string | null };
      };
      if (!res.ok) {
        toast.error(json.message ?? json.error ?? `HTTP ${res.status}`, {
          description: json.hint,
          duration: 12000,
        });
        return;
      }
      if (json.data?.translationKo) {
        toast.success('번역 완료', { duration: 2000 });
      } else {
        toast.message('번역할 내용이 없습니다', { duration: 2000 });
      }
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConversationId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '번역 실패');
    } finally {
      setRetrying(false);
    }
  }

  if (isSystem) {
    return (
      <div className="mx-auto my-1 max-w-md rounded-full bg-muted/60 px-3 py-1 text-center text-[11px] text-muted-foreground">
        {message.body}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', isOutbound ? 'items-end' : 'items-start')}>
      {/* Primary bubble — the actual exchanged text */}
      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm',
          isOutbound
            ? 'rounded-br-md bg-brand-600 text-white'
            : 'rounded-bl-md border bg-white text-foreground',
        )}
      >
        <div className="whitespace-pre-wrap break-words">{message.body}</div>
      </div>

      {/* AI translation bubble — same size as the primary bubble so the
          conversation reads like a normal chat thread. A small "AI 번역"
          chip floats above identifying the source. */}
      {showInboundTranslation ? (
        <>
          <span className="flex items-center gap-1 text-[10px] font-medium text-hospitality-700/80">
            <Languages className="h-3 w-3" />
            AI 번역 {sourceLabel ? `· ${sourceLabel} → KO` : '· KO'}
          </span>
          <div className="max-w-[78%] rounded-2xl rounded-bl-md border border-hospitality-200 bg-hospitality-50 px-3 py-2 text-sm leading-relaxed text-hospitality-950 shadow-sm">
            <div className="whitespace-pre-wrap break-words">{message.translationKo}</div>
          </div>
        </>
      ) : inboundNeedsTranslation ? (
        // Translation hasn't landed yet — show a retry button with the
        // language hint so the operator can fire it manually.
        <button
          type="button"
          onClick={handleRetryTranslate}
          disabled={retrying}
          className="inline-flex max-w-[78%] items-center gap-1.5 rounded-full border border-dashed bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-hospitality-300 hover:bg-hospitality-50 hover:text-hospitality-800 disabled:opacity-50"
          title="이 메시지를 한국어로 번역"
        >
          <RefreshCw className={cn('h-3 w-3', retrying && 'animate-spin')} />
          {retrying ? '번역 중…' : `🌐 ${sourceLabel ?? ''} 번역하기`}
        </button>
      ) : null}

      {showOutboundOriginal ? (
        <>
          <span className="flex items-center gap-1 text-[10px] font-medium text-brand-700/80">
            <Languages className="h-3 w-3" />
            내 한국어 원문
          </span>
          <div className="max-w-[78%] rounded-2xl rounded-br-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm leading-relaxed text-brand-950 shadow-sm">
            <div className="whitespace-pre-wrap break-words">{message.translationKo}</div>
          </div>
        </>
      ) : null}

      {/* Footer row: timestamp + status + risk flags */}
      <div
        className={cn(
          'flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground',
          isOutbound ? 'flex-row-reverse' : '',
        )}
      >
        <span>{ts}</span>
        {sourceLabel && !isOutbound ? (
          <span className="text-muted-foreground/70">· {sourceLabel}</span>
        ) : null}
        {isOutbound ? <span>· {message.status}</span> : null}
        {message.aiRiskFlags && message.aiRiskFlags.length > 0 ? (
          <span className="rounded-full bg-destructive/10 px-1.5 text-destructive">
            ⚠ {message.aiRiskFlags.join(', ')}
          </span>
        ) : null}
      </div>
    </div>
  );
}
