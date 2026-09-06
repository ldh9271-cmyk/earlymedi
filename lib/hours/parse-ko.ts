import { DAY_KEYS, type DayKey, type WeeklyHours } from './status';

/**
 * 한국어 자유 문장 진료시간 → WeeklyHours (최선 노력).
 *
 *  다루는 형태 (글로우 인증 병원 details.hours 실데이터 기준):
 *   "월·화·목 10:00~18:30 · 금요일 10:00~21:00 · 토요일 09:30~16:30 · 점심 13:00~14:00 · 수요일 휴진"
 *   "평일 10:00~19:00 · 토요일 10:00~16:00 · 일요일·공휴일 휴진"
 *   "월~목 10:30~20:00 · 금~일 10:30~20:30"  "평일·토요일 10:00~20:00 · 공휴일 10:00~18:00"
 *   "상담 월~금 10:00~19:30 · … / 시술 월~목 10:30~21:00 · …"  → 같은 요일은 시작 min·종료 max 로 합침
 *   "점심 13:00~14:00(토요일 제외)"  "점심시간 없음"
 *  못 읽는 것: "진료 시간은 예약 시 안내" 등 → null (배지 없음).
 */
const DAY_CH: Record<string, DayKey> = { 월: 'mon', 화: 'tue', 수: 'wed', 목: 'thu', 금: 'fri', 토: 'sat', 일: 'sun' };
const TIME_RE = /(\d{1,2})\s*[:시]\s*(\d{2})?\s*분?\s*[~\-–〜]\s*(\d{1,2})\s*[:시]\s*(\d{2})?\s*분?/;
const hhmm = (h: number, m: number): string => `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`;

/** 접두 문구에서 요일 집합 추출. 요일 표현이 전혀 없으면 null. */
function daysOf(prefix: string): { days: DayKey[]; holiday: boolean } | null {
  let s = prefix;
  const out = new Set<DayKey>();
  let holiday = false;
  if (/공휴일|휴일/.test(s)) { holiday = true; s = s.replace(/공휴일|휴일/g, ' '); }
  if (/평일|주중/.test(s)) { (['mon', 'tue', 'wed', 'thu', 'fri'] as DayKey[]).forEach((d) => out.add(d)); s = s.replace(/평일|주중/g, ' '); }
  if (/주말/.test(s)) { out.add('sat'); out.add('sun'); s = s.replace(/주말/g, ' '); }
  if (/매일|연중무휴|365일/.test(s)) { DAY_KEYS.forEach((d) => out.add(d)); s = s.replace(/매일|연중무휴|365일/g, ' '); }
  // 범위: 월~금, 금~일, 월-토  (앞뒤가 한글이면 단어의 일부 — "백화점"의 화, "휴점일"의 일 — 이므로 제외)
  s = s.replace(/(?<![가-힣])([월화수목금토일])(?:요일)?\s*[~\-–〜]\s*([월화수목금토일])(?:요일)?(?![가-힣])/g, (_m, a: string, b: string) => {
    const ia = DAY_KEYS.indexOf(DAY_CH[a] as DayKey); const ib = DAY_KEYS.indexOf(DAY_CH[b] as DayKey);
    if (ia >= 0 && ib >= 0) { for (let i = ia; i !== (ib + 1) % 7; i = (i + 1) % 7) { out.add(DAY_KEYS[i] as DayKey); if (i === ib) break; } }
    return ' ';
  });
  // 나열: 월·화·목, 토, 일요일, 월,수,금
  for (const m of s.matchAll(/(?<![가-힣])([월화수목금토일])(?:요일)?(?![가-힣])/g)) {
    const d = DAY_CH[m[1] ?? ''];
    if (d) out.add(d);
  }
  if (out.size === 0 && !holiday) return null;
  return { days: [...out], holiday };
}

export function parseKoHours(text: string | null | undefined): WeeklyHours | null {
  if (!text) return null;
  const raw = text.replace(/\s+/g, ' ').trim();
  if (!TIME_RE.test(raw) && !/휴진|휴무/.test(raw)) return null;
  const segs = raw.split(/\s*(?:·|\/|,|\|)\s*(?=[^\d])/).map((x) => x.trim()).filter(Boolean);
  // " · " 로 나누되 요일 나열의 '·'(월·화·목)는 유지해야 하므로: 시간이 뒤따르지 않는 '·' 만 요일 구분자로 두고 다시 합친다
  const merged: string[] = [];
  for (const seg of segs) {
    const prev = merged[merged.length - 1];
    if (prev !== undefined && !TIME_RE.test(prev) && !/휴진|휴무|없음/.test(prev) && /^[월화수목금토일평주매공휴]/.test(seg)) merged[merged.length - 1] = `${prev}·${seg}`;
    else merged.push(seg);
  }
  const h: WeeklyHours = {};
  let any = false;
  const setDay = (d: DayKey, s: string, e: string): void => {
    const cur = h[d];
    h[d] = cur ? [cur[0] < s ? cur[0] : s, cur[1] > e ? cur[1] : e] : [s, e];
    any = true;
  };
  for (const seg of merged) {
    if (/예약 시 안내|문의|안내/.test(seg) && !TIME_RE.test(seg)) continue;
    // 점심
    if (/점심|중식|브레이크|휴게/.test(seg)) {
      if (/없음|없이|무/.test(seg) && !TIME_RE.test(seg)) continue;
      const m = TIME_RE.exec(seg);
      if (!m) continue;
      const v = `${hhmm(Number(m[1]), Number(m[2] ?? 0))}~${hhmm(Number(m[3]), Number(m[4] ?? 0))}`;
      h.lunchWeek = v;
      if (!/토요일\s*제외|토\s*제외|평일만/.test(seg)) h.lunchSat = v;
      continue;
    }
    // 휴진
    if (/휴진|휴무|휴원|정기\s*휴/.test(seg) && !TIME_RE.test(seg)) {
      const d = daysOf(seg.replace(/휴진|휴무|휴원|정기\s*휴/g, ' '));
      if (!d) continue;
      if (d.holiday) h.closedHoliday = 'Y';
      for (const k of d.days) { delete h[k]; if (k === 'sun') h.closedSunday = 'Y'; }
      // 명시적 휴진 요일은 뒤에 나오는 일반 시간에도 덮이지 않게 기록
      any = any || d.days.length > 0 || d.holiday;
      continue;
    }
    const m = TIME_RE.exec(seg);
    if (!m) continue;
    const s = hhmm(Number(m[1]), Number(m[2] ?? 0)); const e = hhmm(Number(m[3]), Number(m[4] ?? 0));
    if (s >= e) continue;
    const prefix = seg.slice(0, m.index);
    // "매월 셋째 주 일요일 …" 같은 예외 일정은 건너뜀
    if (/매월|첫째|둘째|셋째|넷째|격주|마지막/.test(prefix)) continue;
    const d = daysOf(prefix);
    if (!d) {
      // 요일 표현 없음 ("검진 08:00~17:00", "10:00~19:00") → 평일로 본다
      (['mon', 'tue', 'wed', 'thu', 'fri'] as DayKey[]).forEach((k) => setDay(k, s, e));
      continue;
    }
    if (d.holiday) { h.holidayHours = [s, e]; h.closedHoliday = 'N'; }
    for (const k of d.days) setDay(k, s, e);
  }
  if (!any) return null;
  // 휴진 표기가 시간 표기보다 앞에 온 경우를 위해 한 번 더: 휴진 요일 재삭제
  for (const seg of merged) {
    if (/휴진|휴무|휴원/.test(seg) && !TIME_RE.test(seg)) {
      const d = daysOf(seg.replace(/휴진|휴무|휴원/g, ' '));
      for (const k of d?.days ?? []) delete h[k];
    }
  }
  if (!DAY_KEYS.some((k) => h[k])) return null;
  return h;
}
