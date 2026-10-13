/**
 * 예약 가능 기간 — 오늘(서울)부터 3개월 이내. founder 요구 (컨시어지·병원이 일정을 확정할 수 있는 범위).
 *
 * 클라이언트(예약 팝업·문의 폼)는 날짜 입력의 min/max 와 안내문에, 서버(/api/stay/request, /api/checkout/order,
 * 문의 폼 예약 모드)는 최종 검증에 같은 규칙을 쓴다. server-only 가드를 두지 않는다.
 */
export const BOOKING_MAX_MONTHS = 3;

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

/** 서울 기준 오늘 날짜의 연·월·일 */
function seoulYmdParts(now: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now);
  const get = (t: string): number => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get('year'), m: get('month'), d: get('day') };
}

const toYmd = (d: Date): string => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;

/** { min: 오늘, max: 오늘+3개월 } — 둘 다 YYYY-MM-DD (서울 날짜 기준, 월말은 Date 규칙대로 넘김) */
export function bookingWindow(now: Date = new Date()): { min: string; max: string } {
  const { y, m, d } = seoulYmdParts(now);
  const min = new Date(Date.UTC(y, m - 1, d));
  const max = new Date(Date.UTC(y, m - 1 + BOOKING_MAX_MONTHS, d));
  return { min: toYmd(min), max: toYmd(max) };
}

/** YYYY-MM-DD 가 예약 가능 기간 안인지 (형식이 틀리면 false) */
export function isWithinBookingWindow(ymd: string, now: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const { min, max } = bookingWindow(now);
  return ymd >= min && ymd <= max;
}
