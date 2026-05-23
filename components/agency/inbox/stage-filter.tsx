'use client';

import { useInboxStore, type InboxStageFilter } from '@/lib/stores/inbox-store';
import { cn } from '@/lib/utils/cn';

const STAGES: Array<{ key: InboxStageFilter; label: string }> = [
  { key: 'lead', label: 'Lead' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'case', label: 'Case' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'booked', label: 'Booked' },
];

export function StageFilter(): JSX.Element {
  const { stageFilters, toggleStage, unreadOnly, setUnreadOnly } = useInboxStore();
  return (
    <div className="flex flex-wrap items-center gap-1">
      {STAGES.map((s) => {
        const active = stageFilters.includes(s.key);
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => toggleStage(s.key)}
            className={cn(
              'rounded-full border px-2 py-0.5 text-[11px] font-medium transition',
              active ? 'bg-care-500 text-white' : 'bg-background text-muted-foreground hover:bg-muted',
            )}
          >
            {s.label}
          </button>
        );
      })}
      <span className="ml-auto" />
      <button
        type="button"
        onClick={() => setUnreadOnly(!unreadOnly)}
        className={cn(
          'rounded-full border px-2 py-0.5 text-[11px] font-medium transition',
          unreadOnly ? 'bg-brand-600 text-white' : 'bg-background text-muted-foreground hover:bg-muted',
        )}
      >
        안 읽음
      </button>
    </div>
  );
}
