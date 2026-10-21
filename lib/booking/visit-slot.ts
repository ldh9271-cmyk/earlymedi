/**
 * 희망 진료 일시가 병원 진료시간과 맞는지 — AI 상담 예약 요청 카드의 경고용 (순수 함수).
 * 확정은 병원이 하므로 '휴진·진료시간 밖'은 막지 않고 알려만 준다. '지난 시간'만 하드 오류.
 */
import { hasAnyHours, seoulParts, todayWindow, type WeeklyHours } from '@/lib/hours/status';

export type SlotIssue = 'past' | 'closed_day' | 'before_open' | 'after_close' | 'lunch';

/** ymd 의 요일 index (0=일) — 달력 날짜이므로 시간대와 무관 */
export const weekdayOf = (ymd: string): number => new Date(`${ymd}T00:00:00Z`).getUTCDay();

export function checkVisitSlot(
  h: WeeklyHours | null | undefined,
  ymd: string,
  hm: string,
  holidays: ReadonlySet<string> = new Set(),
  now: Date = new Date(),
): SlotIssue | null {
  const t = seoulParts(now);
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm);
  if (!m) return null;
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  if (ymd < t.ymd || (ymd === t.ymd && minutes <= t.minutes)) return 'past';
  if (!h || !hasAnyHours(h)) return null;
  const { win, lunch } = todayWindow(h, weekdayOf(ymd), holidays.has(ymd));
  if (!win) return 'closed_day';
  if (minutes < win[0]) return 'before_open';
  if (minutes >= win[1]) return 'after_close';
  if (lunch && minutes >= lunch[0] && minutes < lunch[1]) return 'lunch';
  return null;
}
