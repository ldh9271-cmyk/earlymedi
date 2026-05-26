'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { cn } from '@/lib/utils/cn';
import {
  clearAvailabilityAction,
  setAvailabilityAction,
  type AvailabilityRow,
} from '@/lib/partner/facilities-actions';

type Facility = {
  id: string;
  name: string;
  kind: 'room' | 'seat' | 'vehicle' | 'guide' | 'other';
  capacityTotal: number;
};

const KIND_LABEL_KO: Record<Facility['kind'], string> = {
  room: '객실',
  seat: '좌석',
  vehicle: '차량',
  guide: '인력',
  other: '기타',
};

/**
 * Per-facility daily availability grid. Rows are facilities, columns
 * are the next N days. Each cell shows:
 *   - bold number if there's an override (different from facility default)
 *   - muted number if it's just the facility's capacity_total default
 *   - red "0" if explicitly blocked
 * Click any cell to open the editor and change the count.
 */
export function AvailabilityCalendar({
  facilities,
  overrides,
  startDate,
  dayCount,
}: {
  facilities: Facility[];
  overrides: AvailabilityRow[];
  startDate: string;
  dayCount: number;
}): JSX.Element {
  // Editor target
  const [editing, setEditing] = useState<{
    facility: Facility;
    date: string;
    currentCount: number;
    isOverride: boolean;
    notes: string | null;
  } | null>(null);

  // Lookup map: "${facilityId}|${date}" → override
  const overrideMap = new Map<string, AvailabilityRow>();
  for (const o of overrides) overrideMap.set(`${o.facilityId}|${o.date}`, o);

  // Generate the column dates
  const days: Array<{ iso: string; label: string; isWeekend: boolean }> = [];
  const start = new Date(startDate + 'T00:00:00');
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const iso = isoDate(d);
    const weekday = d.getDay();
    days.push({
      iso,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      isWeekend: weekday === 0 || weekday === 6,
    });
  }

  function openEditor(facility: Facility, date: string): void {
    const key = `${facility.id}|${date}`;
    const o = overrideMap.get(key);
    setEditing({
      facility,
      date,
      currentCount: o?.availableCount ?? facility.capacityTotal,
      isOverride: !!o,
      notes: o?.notes ?? null,
    });
  }

  return (
    <>
      <div className="overflow-auto rounded-lg border bg-card">
        <table className="w-full border-collapse text-[11px]">
          <thead className="sticky top-0 bg-muted/40">
            <tr>
              <th className="sticky left-0 z-10 min-w-[160px] border-b border-r bg-muted/40 px-3 py-2 text-left">
                시설
              </th>
              {days.map((d) => (
                <th
                  key={d.iso}
                  className={cn(
                    'border-b border-r px-1 py-1 text-center font-medium',
                    d.isWeekend ? 'bg-hospitality-50 text-hospitality-800' : '',
                  )}
                >
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facilities.map((f) => (
              <tr key={f.id} className="hover:bg-muted/10">
                <td className="sticky left-0 z-10 border-b border-r bg-card px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="slate" className="text-[9px]">
                      {KIND_LABEL_KO[f.kind]}
                    </Badge>
                    <span className="truncate font-semibold">{f.name}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    기본 {f.capacityTotal}
                  </div>
                </td>
                {days.map((d) => {
                  const key = `${f.id}|${d.iso}`;
                  const o = overrideMap.get(key);
                  const count = o?.availableCount ?? f.capacityTotal;
                  const isOverride = !!o;
                  const isBlocked = count === 0;
                  return (
                    <td
                      key={d.iso}
                      className={cn(
                        'cursor-pointer border-b border-r px-1 py-1 text-center transition',
                        d.isWeekend ? 'bg-hospitality-50/30' : '',
                        isBlocked
                          ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                          : isOverride
                            ? 'bg-brand-50 font-bold text-brand-900 hover:bg-brand-100'
                            : 'text-muted-foreground hover:bg-muted/40',
                      )}
                      onClick={() => openEditor(f, d.iso)}
                      title={o?.notes ?? (isOverride ? `오버라이드: ${count}` : `기본: ${count}`)}
                    >
                      {count}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-muted" />
          기본값 (시설 기본 수량)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-brand-100" />
          오버라이드 (수정됨)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-destructive/20" />
          차단 (0)
        </span>
        <span className="ml-auto">셀 클릭 → 수량 변경</span>
      </div>

      {editing ? (
        <EditorModal
          target={editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function EditorModal({
  target,
  onClose,
  onSaved,
}: {
  target: {
    facility: Facility;
    date: string;
    currentCount: number;
    isOverride: boolean;
    notes: string | null;
  };
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const [count, setCount] = useState(target.currentCount);
  const [notes, setNotes] = useState(target.notes ?? '');
  const [pending, start] = useTransition();

  function handleSave(): void {
    start(async () => {
      try {
        await setAvailabilityAction({
          facilityId: target.facility.id,
          date: target.date,
          availableCount: count,
          notes: notes.trim() || null,
        });
        toast.success('가용 수량이 저장되었습니다.');
        onSaved();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '저장 실패');
      }
    });
  }

  function handleClear(): void {
    start(async () => {
      try {
        await clearAvailabilityAction(target.facility.id, target.date);
        toast.success('기본값으로 복구되었습니다.');
        onSaved();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '복구 실패');
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold">{target.facility.name}</h2>
            <p className="text-[11px] text-muted-foreground">
              {target.date} · 기본 {target.facility.capacityTotal}개
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="avail-count">가용 수량</Label>
            <Input
              id="avail-count"
              type="number"
              min={0}
              max={10000}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
            <p className="text-[10px] text-muted-foreground">
              0 으로 설정하면 해당 날짜에 부킹 불가
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="avail-notes">메모 (선택)</Label>
            <Input
              id="avail-notes"
              placeholder="예) 유지보수 / 프라이빗 이벤트 / 성수기 +20%"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="flex justify-between gap-2 border-t pt-3">
            {target.isOverride ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={pending}
              >
                기본값으로 복구
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
                취소
              </Button>
              <Button type="button" variant="brand" onClick={handleSave} disabled={pending}>
                {pending ? '저장 중…' : '저장'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
