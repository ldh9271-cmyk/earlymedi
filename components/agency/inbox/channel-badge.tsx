import { CHANNEL_DISPLAY, type ChannelKind } from '@/lib/channels/types';
import { INBOX_CHANNEL_ICONS } from '@/components/shared/channels/channel-icons';
import { cn } from '@/lib/utils/cn';

/**
 * Compact channel chip used throughout the inbox (conversation list rows,
 * conversation header, AI panel, etc.). Renders the messenger's real brand
 * mark on a small brand-coloured tile, with the channel name beside it.
 */
export function ChannelBadge({
  kind,
  className,
  iconOnly = false,
}: {
  kind: ChannelKind;
  className?: string;
  /** Hide the text label — useful in tight list rows. */
  iconOnly?: boolean;
}): JSX.Element {
  const d = CHANNEL_DISPLAY[kind];
  const Icon = INBOX_CHANNEL_ICONS[kind];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-card pl-0.5 pr-2 py-0.5 text-[10px] font-medium ring-1 ring-border',
        iconOnly && 'pr-0.5',
        className,
      )}
    >
      <span
        aria-hidden
        className="flex h-4 w-4 items-center justify-center rounded-full"
        style={{ backgroundColor: d.brandColor }}
      >
        <Icon className="h-2.5 w-2.5" />
      </span>
      {iconOnly ? null : <span className="text-foreground">{d.label}</span>}
    </span>
  );
}
