'use client';

import { useInboxStore } from '@/lib/stores/inbox-store';
import { ALL_CHANNEL_KINDS, CHANNEL_DISPLAY } from '@/lib/channels/types';
import { INBOX_CHANNEL_ICONS } from '@/components/shared/channels/channel-icons';
import { cn } from '@/lib/utils/cn';

/**
 * Channel pill row above the conversation list. Clicking a chip toggles
 * a channel filter; the "전체" chip clears all filters. Active pills
 * render the brand glyph on the brand-coloured background; inactive
 * pills stay neutral so the toggle state is obvious.
 */
export function ChannelFilter(): JSX.Element {
  const { channelFilters, toggleChannel, clearChannels } = useInboxStore();
  return (
    <div className="flex flex-wrap gap-1">
      <button
        type="button"
        onClick={clearChannels}
        className={cn(
          'rounded-full border px-2 py-0.5 text-[11px] font-medium transition',
          channelFilters.length === 0 ? 'bg-foreground text-background' : 'bg-background hover:bg-muted',
        )}
      >
        전체
      </button>
      {ALL_CHANNEL_KINDS.map((kind) => {
        const active = channelFilters.includes(kind);
        const d = CHANNEL_DISPLAY[kind];
        const Icon = INBOX_CHANNEL_ICONS[kind];
        return (
          <button
            key={kind}
            type="button"
            onClick={() => toggleChannel(kind)}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full transition',
              active
                ? 'ring-2 ring-foreground/60'
                : 'opacity-50 hover:opacity-100 ring-1 ring-border',
            )}
            style={{ backgroundColor: d.brandColor }}
            title={d.label}
            aria-label={d.label}
            aria-pressed={active}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
