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

export function MessageBubble({ message }: { message: BubbleMessage }): JSX.Element {
  const isOutbound = message.direction === 'outbound';
  const isSystem = message.direction === 'system';
  const ts = formatLocal(new Date(message.sentAt), 'Asia/Seoul', 'HH:mm');
  const showTranslation =
    message.translationKo && message.translationKo !== message.body && !isOutbound;

  if (isSystem) {
    return (
      <div className="mx-auto my-1 max-w-md rounded-full bg-muted/60 px-3 py-1 text-center text-[11px] text-muted-foreground">
        {message.body}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-0.5', isOutbound ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm',
          isOutbound
            ? 'rounded-br-md bg-brand-600 text-white'
            : 'rounded-bl-md border bg-white text-foreground',
        )}
      >
        <div>{message.body}</div>
        {message.bodyLocale && message.bodyLocale !== 'ko' && !isOutbound ? (
          <div className="mt-0.5 text-[10px] uppercase tracking-wider opacity-60">
            {message.bodyLocale}
          </div>
        ) : null}
      </div>
      {showTranslation ? (
        <div
          className={cn(
            'max-w-[78%] rounded-2xl border border-dashed bg-brand-50/60 px-3 py-1.5 text-xs italic text-brand-900',
            isOutbound ? 'rounded-br-md' : 'rounded-bl-md',
          )}
        >
          ↳ {message.translationKo}
        </div>
      ) : null}
      <div
        className={cn(
          'flex items-center gap-1.5 text-[10px] text-muted-foreground',
          isOutbound ? 'flex-row-reverse' : '',
        )}
      >
        <span>{ts}</span>
        {isOutbound ? <span>· {message.status}</span> : null}
        {message.aiRiskFlags && message.aiRiskFlags.length > 0 ? (
          <span className="rounded-full bg-destructive/10 px-1.5 text-destructive">⚠ {message.aiRiskFlags.join(', ')}</span>
        ) : null}
      </div>
    </div>
  );
}
