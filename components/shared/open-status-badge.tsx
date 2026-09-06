'use client';

/**
 * 진료 중 / 곧 종료 / 점심시간 / 진료 종료 / 오늘 휴진 배지 — 클라이언트에서 현재
 * 서울 시각으로 계산하고 1분마다 다시 계산한다 (서버 캐시와 무관하게 항상 지금 기준).
 * 서버 렌더에서는 비워 두어 hydration 불일치를 피한다.
 */
import { useEffect, useState } from 'react';
import { computeOpenStatus, type OpenStatus, type WeeklyHours } from '@/lib/hours/status';

export type OpenStatusLabels = {
  open: string; closingSoon: string; lunch: string; closed: string; closedToday: string; holidayClosed: string;
  until: string; opensToday: string; opensTomorrow: string; opensOn: string; days: string[]; liveNote: string;
};

const TONE: Record<OpenStatus['state'], { bg: string; fg: string; dot: string }> = {
  open: { bg: '#ecfdf5', fg: '#047857', dot: '#10b981' },
  closing_soon: { bg: '#fffbeb', fg: '#b45309', dot: '#f59e0b' },
  lunch: { bg: '#fffbeb', fg: '#b45309', dot: '#f59e0b' },
  closed: { bg: '#f5f5f5', fg: '#6a6a6a', dot: '#9c9c9c' },
  closed_today: { bg: '#f5f5f5', fg: '#6a6a6a', dot: '#9c9c9c' },
  unknown: { bg: 'transparent', fg: '#6a6a6a', dot: '#9c9c9c' },
};
const DAY_IDX: Record<string, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };

export function describeOpenStatus(s: OpenStatus, t: OpenStatusLabels): { main: string; sub: string | null } | null {
  const fill = (tpl: string, v: Record<string, string>): string => tpl.replace(/\{(\w+)\}/g, (_m, k: string) => v[k] ?? '');
  const opens = (): string | null => {
    const o = s.opensAt;
    if (!o) return null;
    if (o.dayOffset === 0) return fill(t.opensToday, { time: o.time });
    if (o.dayOffset === 1) return fill(t.opensTomorrow, { time: o.time });
    return fill(t.opensOn, { day: t.days[DAY_IDX[o.day] ?? 0] ?? o.day, time: o.time });
  };
  switch (s.state) {
    case 'open': return { main: t.open, sub: s.until ? fill(t.until, { time: s.until }) : null };
    case 'closing_soon': return { main: t.closingSoon, sub: s.until ? fill(t.until, { time: s.until }) : null };
    case 'lunch': return { main: t.lunch, sub: s.until ? fill(t.until, { time: s.until }) : null };
    case 'closed': return { main: t.closed, sub: opens() };
    case 'closed_today': return { main: s.isHoliday ? t.holidayClosed : t.closedToday, sub: opens() };
    default: return null;
  }
}

export default function OpenStatusBadge({ hours, holidays, labels, size = 'md' }: {
  hours: WeeklyHours | null | undefined; holidays: string[]; labels: OpenStatusLabels; size?: 'sm' | 'md';
}): JSX.Element | null {
  const [s, setS] = useState<OpenStatus | null>(null);
  useEffect(() => {
    if (!hours) return;
    const tick = (): void => setS(computeOpenStatus(hours, new Date(), holidays));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [hours, holidays]);
  if (!s) return null;
  const d = describeOpenStatus(s, labels);
  if (!d) return null;
  const tone = TONE[s.state];
  const fs = size === 'sm' ? 12 : 13;
  return (
    <span title={labels.liveNote} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: tone.bg, color: tone.fg, borderRadius: 999, padding: size === 'sm' ? '3px 9px' : '5px 12px', fontSize: fs, fontWeight: 700, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: tone.dot, display: 'inline-block', animation: s.state === 'open' || s.state === 'closing_soon' ? 'm-os-pulse 1.6s infinite' : 'none' }} />
      {d.main}
      {d.sub ? <span style={{ fontWeight: 500, opacity: 0.85 }}>· {d.sub}</span> : null}
      <style>{'@keyframes m-os-pulse{0%,100%{opacity:.35}50%{opacity:1}}'}</style>
    </span>
  );
}
