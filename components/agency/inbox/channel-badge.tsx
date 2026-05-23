import { CHANNEL_DISPLAY, type ChannelKind } from '@/lib/channels/types';
import { cn } from '@/lib/utils/cn';

export function ChannelBadge({ kind, className }: { kind: ChannelKind; className?: string }): JSX.Element {
  const d = CHANNEL_DISPLAY[kind];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        d.colorClass,
        className,
      )}
    >
      <span aria-hidden>{d.emoji}</span>
      <span>{d.label}</span>
    </span>
  );
}
