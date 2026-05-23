'use client';

import { useInboxStore } from '@/lib/stores/inbox-store';
import { ALL_CHANNEL_KINDS, CHANNEL_DISPLAY } from '@/lib/channels/types';
import { cn } from '@/lib/utils/cn';

export function ChannelFilter(): JSX.Element {
  const { channelFilters, toggleChannel, clearChannels } = useInboxStore();
  return (
    <div className="flex flex-wrap gap-1">
      <button
        type="button"
        onClick={clearChannels}
        className={cn(
          'rounded-full border px-2 py-0.5 text-[11px] font-medium',
          channelFilters.length === 0 ? 'bg-foreground text-background' : 'bg-background',
        )}
      >
        전체
      </button>
      {ALL_CHANNEL_KINDS.map((kind) => {
        const active = channelFilters.includes(kind);
        const d = CHANNEL_DISPLAY[kind];
        return (
          <button
            key={kind}
            type="button"
            onClick={() => toggleChannel(kind)}
            className={cn(
              'rounded-full border px-2 py-0.5 text-[11px] font-medium transition',
              active ? d.colorClass + ' ring-1 ring-foreground/40' : 'bg-background text-muted-foreground hover:bg-muted',
            )}
            title={d.label}
          >
            <span aria-hidden>{d.emoji}</span>
          </button>
        );
      })}
    </div>
  );
}
