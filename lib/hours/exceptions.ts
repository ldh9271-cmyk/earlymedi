/**
 * 날짜별 예외(임시 휴무 · 특별진료) 텍스트 ↔ 구조 변환 — 순수 함수 (2026-11-19).
 *
 *  병원이 보내는 공지("2/7,8 설연휴 휴무", "2/9(화) 대체공휴일 특별진료")를 한 줄씩
 *  그대로 붙여 넣어도 읽히도록 느슨하게 받고, 저장은 "YYYY-MM-DD 휴무|특별진료 [HH:MM~HH:MM] [메모]" 로 정규화한다.
 *  판정에서의 쓰임은 lib/hours/status.ts exceptionOn · todayWindow 참고.
 */
import type { HoursException } from './status';

const CLOSED_RE = /휴무|휴진|휴원|휴업|미진료|closed|close\b|off\b/i;
const OPEN_RE = /특별\s*진료|정상\s*진료|진료\s*함|진료합니다|진료$|진료\s|open|special/i;
const TIME_RE = /(\d{1,2})\s*[:시]\s*(\d{2})?\s*분?\s*[~\-–〜]\s*(\d{1,2})\s*[:시]\s*(\d{2})?\s*분?/;

const pad2 = (n: number): string => String(n).padStart(2, '0');
const validYmd = (y: number, m: number, d: number): boolean => {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

/**
 * 한 줄에서 날짜 목록을 뽑는다. 지원:
 *  "2027-01-01" · "2027.1.1" · "2027/1/1" · "1/1" · "1.1" · "1월 1일" · 뒤에 "(금)" 요일 표기 허용
 *  "2/7,8" · "9/15,16" · "9/15~16" → 같은 달의 날짜 나열
 */
function takeDates(line: string, defaultYear: number): { dates: string[]; rest: string } | null {
  const s = line.trim();
  let m = /^(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})\s*(?:\([^)]*\))?\s*(.*)$/.exec(s);
  if (m) {
    const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
    if (!validYmd(y, mo, d)) return null;
    return { dates: [`${y}-${pad2(mo)}-${pad2(d)}`], rest: m[4] ?? '' };
  }
  m = /^(\d{1,2})\s*(?:[/.]|월)\s*(\d{1,2})\s*일?\s*((?:\s*[,、]\s*\d{1,2}\s*일?|\s*[~\-–]\s*\d{1,2}\s*일?)*)\s*(?:\([^)]*\))?\s*(.*)$/.exec(s);
  if (!m) return null;
  const mo = Number(m[1]); const first = Number(m[2]);
  const extra = m[3] ?? '';
  const days: number[] = [first];
  const range = /[~\-–]\s*(\d{1,2})/.exec(extra);
  if (range) { for (let d = first + 1; d <= Number(range[1]); d++) days.push(d); }
  for (const x of extra.matchAll(/[,、]\s*(\d{1,2})/g)) days.push(Number(x[1]));
  const dates: string[] = [];
  for (const d of days) {
    if (!validYmd(defaultYear, mo, d)) return null;
    dates.push(`${defaultYear}-${pad2(mo)}-${pad2(d)}`);
  }
  return { dates, rest: m[4] ?? '' };
}

/** 텍스트(여러 줄) → 예외 목록. 못 읽은 줄은 errors 에 모은다. 같은 날짜는 뒤 줄이 이긴다. */
export function parseHoursExceptions(text: string, defaultYear: number): { list: HoursException[]; errors: string[] } {
  const byDate = new Map<string, HoursException>();
  const errors: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const taken = takeDates(line, defaultYear);
    if (!taken) { errors.push(line); continue; }
    let rest = taken.rest.trim();
    let kind: HoursException['kind'] | null = null;
    if (OPEN_RE.test(rest)) kind = 'open';
    else if (CLOSED_RE.test(rest)) kind = 'closed';
    if (!kind) { errors.push(line); continue; }
    let hours: [string, string] | undefined;
    const t = TIME_RE.exec(rest);
    if (t && kind === 'open') {
      const a = `${pad2(Number(t[1]))}${t[2] ?? '00'}`; const b = `${pad2(Number(t[3]))}${t[4] ?? '00'}`;
      if (a < b) hours = [a, b];
      rest = rest.replace(t[0], ' ');
    }
    const note = rest
      .replace(kind === 'open' ? OPEN_RE : CLOSED_RE, ' ')
      .replace(/^[\s·,:\-–]+|[\s·,:\-–]+$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    for (const date of taken.dates) {
      const e: HoursException = { date, kind };
      if (hours) e.hours = hours;
      if (note) e.note = note;
      byDate.set(date, e);
    }
  }
  const list = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { list, errors };
}

const hm = (v: string): string => `${v.slice(0, 2)}:${v.slice(2)}`;

/** 예외 목록 → 편집용 텍스트 (한 줄 하나, 정규형) */
export function formatHoursExceptions(list: HoursException[] | null | undefined): string {
  if (!Array.isArray(list)) return '';
  return list
    .map((e) => [e.date, e.kind === 'closed' ? '휴무' : '특별진료', e.hours ? `${hm(e.hours[0])}~${hm(e.hours[1])}` : '', e.note ?? ''].filter(Boolean).join(' '))
    .join('\n');
}

/** 오늘(ymd) 이후 예외만 날짜순으로 limit 개 — 상세 페이지 안내용 */
export function upcomingExceptions(list: HoursException[] | null | undefined, todayYmd: string, limit = 8): HoursException[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((e) => e && typeof e.date === 'string' && e.date >= todayYmd && (e.kind === 'closed' || e.kind === 'open'))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(0, limit);
}
