/**
 * 진료 중 / 진료 종료 판정 — 순수 함수 (서버·클라이언트 공용, DB·API 없음).
 *
 *  "실시간 영업 정보"는 별도 API 가 아니라, 등록된 요일별 진료시간을 현재 서울
 *  시각과 비교해 계산한 것이다. 공휴일은 holidays(YYYY-MM-DD 집합)로 보정한다.
 *
 *  입력 WeeklyHours 는 심평원 상세(RegistryHours)와 같은 모양이라 레지스트리 병원은
 *  저장된 값을 그대로 넣고, 글로우 인증 병원은 details.hoursWeekly(관리자 입력) 또는
 *  자유 문장 진료시간을 parseKoHours 로 바꾼 값을 넣는다.
 */
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export const DAY_KEYS: readonly DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export type WeeklyHours = {
  /** 요일별 [시작, 종료] "HHMM" — 없으면 휴진 */
  mon?: [string, string]; tue?: [string, string]; wed?: [string, string]; thu?: [string, string];
  fri?: [string, string]; sat?: [string, string]; sun?: [string, string];
  /** 점심시간 — "1300~1400" · "13:00~14:00" 같은 자유 텍스트 (평일 / 토요일) */
  lunchWeek?: string; lunchSat?: string;
  /** 공휴일 휴진 여부 — 'Y' | 'N' | 텍스트 */
  closedHoliday?: string; closedSunday?: string;
  /** 공휴일에도 진료하면 그 시간 */
  holidayHours?: [string, string];
  note?: string;
  /** 날짜별 예외 — 임시 휴무·특별진료 (2026-11-19). 요일·공휴일 규칙보다 우선한다. */
  exceptions?: HoursException[];
};

/**
 * 날짜별 예외: 병원이 공지한 휴무일(설연휴 둘째 날 등)과 특별진료일(대체공휴일에도 진료 등).
 *  - kind 'closed' → 그날은 요일·공휴일 규칙과 무관하게 휴진
 *  - kind 'open'   → 공휴일이어도 진료. hours 가 있으면 그 시간, 없으면 그 요일의 평소 시간
 */
export type HoursException = {
  /** YYYY-MM-DD (서울 날짜) */
  date: string;
  kind: 'closed' | 'open';
  /** 'open' 일 때 그날 진료시간 "HHMM" — 없으면 요일 평소 시간 */
  hours?: [string, string];
  /** 공지 문구 — "설연휴", "대체공휴일 특별진료" 등 */
  note?: string;
};

/** 그 날짜의 예외 (없으면 undefined). 같은 날짜가 여러 개면 뒤의 것이 이긴다. */
export function exceptionOn(h: WeeklyHours | null | undefined, ymd: string): HoursException | undefined {
  const list = h?.exceptions;
  if (!Array.isArray(list) || list.length === 0) return undefined;
  let found: HoursException | undefined;
  for (const e of list) if (e && e.date === ymd && (e.kind === 'closed' || e.kind === 'open')) found = e;
  return found;
}

export type OpenState = 'open' | 'closing_soon' | 'lunch' | 'closed' | 'closed_today' | 'unknown';
export type OpenStatus = {
  state: OpenState;
  /** 현재 구간이 끝나는 시각 "HH:MM" (open/closing_soon → 종료, lunch → 점심 끝) */
  until?: string;
  /** 다음 진료 시작 — dayOffset 0 = 오늘, 1 = 내일 … */
  opensAt?: { dayOffset: number; day: DayKey; time: string };
  isHoliday: boolean;
  /** 오늘 적용된 날짜별 예외 — 휴무 공지 / 특별진료 (배지 문구용) */
  exception?: { kind: 'closed' | 'open'; note?: string };
  /** 판정에 쓴 서울 시각 */
  seoul: { ymd: string; day: DayKey; hm: string };
};

export const CLOSING_SOON_MIN = 30;

/** 서울 시각 분해 — Intl 로 시간대 변환 (date-fns-tz 없이). */
export function seoulParts(now: Date): { ymd: string; dayIdx: number; minutes: number } {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(now)) p[x.type] = x.value;
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday ?? 'Sun');
  const hour = Number(p.hour) % 24; // 일부 런타임은 24:00 로 준다
  return { ymd: `${p.year}-${p.month}-${p.day}`, dayIdx: wd < 0 ? 0 : wd, minutes: hour * 60 + Number(p.minute) };
}

const toMin = (hhmm: string): number | null => {
  const m = /^(\d{1,2}):?(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]); const mi = Number(m[2]);
  if (h > 24 || mi > 59) return null;
  return h * 60 + mi;
};
export const fmtHM = (min: number): string => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** "1300~1400" · "13:00~14:00(토요일 제외)" · "12시30분~13시30분" → [분, 분] */
export function parseRange(text: string | undefined | null): [number, number] | null {
  if (!text) return null;
  if (/없음|없|none|no/i.test(text) && !/\d/.test(text)) return null;
  const m = /(\d{1,2})\s*[:시]?\s*(\d{2})?\s*분?\s*[~\-–〜]\s*(\d{1,2})\s*[:시]?\s*(\d{2})?/.exec(text.replace(/\s+/g, ' '));
  if (!m) return null;
  const a = Number(m[1]) * 60 + Number(m[2] ?? 0);
  const b = Number(m[3]) * 60 + Number(m[4] ?? 0);
  if (a >= b || b > 24 * 60) return null;
  return [a, b];
}

const dayKeyOf = (idx: number): DayKey => (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as DayKey[])[idx] ?? 'sun';

function closedOnHoliday(h: WeeklyHours): boolean {
  const v = (h.closedHoliday ?? '').trim();
  if (!v) return !h.holidayHours; // 미기재 — 공휴일 진료시간이 따로 없으면 휴진으로 본다
  if (/^n$/i.test(v)) return false;
  if (/^y$/i.test(v) || /휴진|휴무|휴원|미진료|closed/i.test(v)) return true;
  return !/진료|open/i.test(v);
}

/** 오늘 적용할 [시작, 종료] (분). 공휴일·요일 휴진이면 null. 날짜별 예외(ex)가 있으면 그것이 먼저다. */
export function todayWindow(h: WeeklyHours, dayIdx: number, isHoliday: boolean, ex?: HoursException): { win: [number, number] | null; lunch: [number, number] | null } {
  const key = dayKeyOf(dayIdx);
  const lunchText = key === 'sat' ? (h.lunchSat ?? undefined) : key === 'sun' ? undefined : h.lunchWeek;
  const lunch = parseRange(lunchText);
  if (ex?.kind === 'closed') return { win: null, lunch: null };
  if (ex?.kind === 'open' && ex.hours) {
    const a = toMin(ex.hours[0]); const b = toMin(ex.hours[1]);
    return { win: a != null && b != null && a < b ? [a, b] : null, lunch };
  }
  // 특별진료(시간 미기재)는 공휴일이어도 그 요일의 평소 시간으로 본다
  if (isHoliday && ex?.kind !== 'open') {
    if (h.holidayHours) { const a = toMin(h.holidayHours[0]); const b = toMin(h.holidayHours[1]); return { win: a != null && b != null && a < b ? [a, b] : null, lunch: null }; }
    if (closedOnHoliday(h)) return { win: null, lunch: null };
  }
  const v = h[key];
  if (!v) return { win: null, lunch: null };
  const a = toMin(v[0]); const b = toMin(v[1]);
  if (a == null || b == null || a >= b) return { win: null, lunch: null };
  return { win: [a, b], lunch };
}

export function hasAnyHours(h: WeeklyHours | null | undefined): boolean {
  return Boolean(h && DAY_KEYS.some((k) => Array.isArray(h[k]) && h[k]?.length === 2));
}

export function computeOpenStatus(h: WeeklyHours | null | undefined, now: Date, holidays: ReadonlySet<string> | string[] = []): OpenStatus {
  const hol = holidays instanceof Set ? holidays : new Set(holidays);
  const { ymd, dayIdx, minutes } = seoulParts(now);
  const day = dayKeyOf(dayIdx);
  const isHoliday = hol.has(ymd);
  const ex = exceptionOn(h, ymd);
  const base: OpenStatus = { state: 'unknown', isHoliday, seoul: { ymd, day, hm: fmtHM(minutes) } };
  if (ex) base.exception = ex.note ? { kind: ex.kind, note: ex.note } : { kind: ex.kind };
  if (!hasAnyHours(h) || !h) return base;

  const nextOpen = (): OpenStatus['opensAt'] | undefined => {
    for (let off = 1; off <= 7; off++) {
      const idx = (dayIdx + off) % 7;
      // 다음 날의 공휴일 여부는 날짜 계산이 필요 — 하루씩 더해 ymd 를 만든다
      const d = new Date(now.getTime() + off * 86_400_000);
      const p = seoulParts(d);
      const w = todayWindow(h, idx, hol.has(p.ymd), exceptionOn(h, p.ymd)).win;
      if (w) return { dayOffset: off, day: dayKeyOf(idx), time: fmtHM(w[0]) };
    }
    return undefined;
  };

  const { win, lunch } = todayWindow(h, dayIdx, isHoliday, ex);
  if (!win) return { ...base, state: 'closed_today', opensAt: nextOpen() };
  const [start, end] = win;
  if (minutes < start) return { ...base, state: 'closed', opensAt: { dayOffset: 0, day, time: fmtHM(start) } };
  if (minutes >= end) return { ...base, state: 'closed', opensAt: nextOpen() };
  if (lunch && minutes >= lunch[0] && minutes < lunch[1] && lunch[0] >= start && lunch[1] <= end) {
    return { ...base, state: 'lunch', until: fmtHM(lunch[1]) };
  }
  if (end - minutes <= CLOSING_SOON_MIN) return { ...base, state: 'closing_soon', until: fmtHM(end) };
  return { ...base, state: 'open', until: fmtHM(end) };
}
