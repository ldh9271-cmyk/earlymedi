import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatLocal } from '@/lib/utils/date';

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
 * filled brand bubble. When an inbound message has a Korean translation
 * (auto-filled by translateInboundMessage), it renders directly under
 * the bubble as a quoted, lighter "AI 번역" line — same width, same
 * column, so the eye flows naturally without breaking the chat rhythm.
 */
export function MessageBubble({ message }: { message: BubbleMessage }): JSX.Element {
  const isOutbound = message.direction === 'outbound';
  const isSystem = message.direction === 'system';
  const ts = formatLocal(new Date(message.sentAt), 'Asia/Seoul', 'HH:mm');
  const sourceLabel =
    message.bodyLocale && message.bodyLocale !== 'ko' ? message.bodyLocale.toUpperCase() : null;
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

      {/* AI translation row — slips right under the bubble, messenger-style */}
      {showInboundTranslation ? (
        <div className="max-w-[78%] rounded-2xl bg-hospitality-50/80 px-3 py-1.5 text-xs leading-relaxed text-hospitality-900">
          <div className="mb-0.5 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-hospitality-700/80">
            <Languages className="h-2.5 w-2.5" />
            AI 번역 {sourceLabel ? `· ${sourceLabel} → KO` : '· KO'}
          </div>
          <div className="whitespace-pre-wrap break-words">{message.translationKo}</div>
        </div>
      ) : null}

      {showOutboundOriginal ? (
        <div className="max-w-[78%] rounded-2xl bg-brand-50/70 px-3 py-1.5 text-xs leading-relaxed text-brand-900">
          <div className="mb-0.5 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-brand-700/80">
            <Languages className="h-2.5 w-2.5" />
            내 한국어 원문
          </div>
          <div className="whitespace-pre-wrap break-words">{message.translationKo}</div>
        </div>
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
