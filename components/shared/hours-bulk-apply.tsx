'use client';

/**
 * 진료시간 일괄 적용 — 요일 7칸을 하나씩 치는 수고를 덜어준다.
 *
 * 같은 폼 안의 `mon_s`·`mon_e` … `sun_s`·`sun_e` 입력을 직접 채운다.
 * 값을 바로 눈에 보이는 칸에 써 넣으므로, 적용한 뒤 특정 요일만 손으로
 * 고치는 것도 그대로 된다(예: 평일 일괄 적용 → 토요일만 단축).
 *
 * 폼은 서버 컴포넌트가 그린 uncontrolled 입력이라 값 대입으로 충분하지만,
 * 브라우저 자동완성·유효성 검사가 걸리는 경우가 있어 input 이벤트도 같이 쏜다.
 */
import { useRef, useState } from 'react';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type Day = (typeof DAYS)[number];
const KO: Record<Day, string> = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' };
const WEEKDAYS: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri'];

export default function HoursBulkApply(): JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [picked, setPicked] = useState<Day[]>(WEEKDAYS);
  const [msg, setMsg] = useState<string | null>(null);

  function field(day: Day, which: 's' | 'e'): HTMLInputElement | null {
    const form = root.current?.closest('form');
    return (form ?? document).querySelector<HTMLInputElement>(`input[name="${day}_${which}"]`);
  }

  function write(day: Day, which: 's' | 'e', value: string): void {
    const el = field(day, which);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function apply(): void {
    if (picked.length === 0) { setMsg('요일을 하나 이상 고르세요.'); return; }
    if (!start || !end) { setMsg('시작·종료 시간을 입력하세요.'); return; }
    for (const d of picked) { write(d, 's', start); write(d, 'e', end); }
    setMsg(`${picked.map((d) => KO[d]).join('·')} → ${start}~${end} 적용됨 (저장을 눌러야 반영됩니다)`);
  }

  function clear(): void {
    if (picked.length === 0) { setMsg('요일을 하나 이상 고르세요.'); return; }
    for (const d of picked) { write(d, 's', ''); write(d, 'e', ''); }
    setMsg(`${picked.map((d) => KO[d]).join('·')} 비움 — 휴진으로 처리됩니다`);
  }

  function toggle(d: Day): void {
    setPicked((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
    setMsg(null);
  }

  const chip = 'rounded-md border px-2 py-1 text-xs font-semibold transition-colors';
  const preset = 'rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted';

  return (
    <div ref={root} className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold">일괄 적용</span>
        <span className="text-[11px] text-muted-foreground">고른 요일에 같은 시간을 한 번에 넣습니다. 적용 뒤 특정 요일만 따로 고쳐도 됩니다.</span>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1">
        {DAYS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            aria-pressed={picked.includes(d)}
            className={`${chip} ${picked.includes(d) ? 'border-brand-600 bg-brand-600 text-white' : 'bg-background'}`}
          >
            {KO[d]}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        <button type="button" className={preset} onClick={() => { setPicked(WEEKDAYS); setMsg(null); }}>평일</button>
        <button type="button" className={preset} onClick={() => { setPicked([...DAYS]); setMsg(null); }}>매일</button>
        <button type="button" className={preset} onClick={() => { setPicked(['sat', 'sun']); setMsg(null); }}>주말</button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="time"
          value={start}
          onChange={(e) => { setStart(e.target.value); setMsg(null); }}
          className="h-9 w-32 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="일괄 적용 시작 시간"
        />
        <span className="text-muted-foreground">~</span>
        <input
          type="time"
          value={end}
          onChange={(e) => { setEnd(e.target.value); setMsg(null); }}
          className="h-9 w-32 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="일괄 적용 종료 시간"
        />
        <button type="button" onClick={apply} className="h-9 rounded-md bg-foreground px-3 text-sm font-semibold text-background">적용</button>
        <button type="button" onClick={clear} className="h-9 rounded-md border px-3 text-sm">선택 요일 비우기</button>
      </div>

      {msg ? <p className="mt-2 text-[11px] text-muted-foreground">{msg}</p> : null}
    </div>
  );
}
