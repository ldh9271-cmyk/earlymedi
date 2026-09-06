/**
 * 플랫폼 취소·환불 규정 — 카테고리별 단계표 (순수 함수, 서버·클라이언트 공용).
 *
 *  일수는 서울 시간 기준 "예약일 - 오늘" 의 달력 일수. 환불 비율은 결제 총액
 *  (상품가 + 플랫폼 수수료, 예약금 결제면 예약금) 기준. 이용 시작 후·노쇼는 환불 불가.
 *  플랫폼·업체 사정으로 취소되면 시점과 무관하게 전액 환불 (여기서는 다루지 않고 마스터가 금액을 정함).
 *
 *  규정 문구는 dict.refund, 숫자는 여기 한 곳 — 바꾸면 안내·다이얼로그·예상액이 함께 바뀐다.
 */
export type RefundCategory = 'travel' | 'medical' | 'stay' | 'food' | 'beauty';
export const REFUND_CATEGORIES: readonly RefundCategory[] = ['travel', 'medical', 'stay', 'food', 'beauty'];

export type RefundTier = {
  /** 이 단계가 적용되는 최소 "며칠 전" (0 = 당일) */
  minDays: number;
  /** 환불 비율 % */
  pct: number;
  /** 당일 단계에서 이용 시각 N시간 전까지만 이 비율, 이후는 0 */
  sameDayHoursBefore?: number;
};

export const REFUND_POLICIES: Record<RefundCategory, RefundTier[]> = {
  travel: [{ minDays: 3, pct: 100 }, { minDays: 2, pct: 90 }, { minDays: 1, pct: 80 }, { minDays: 0, pct: 70 }],
  medical: [{ minDays: 3, pct: 100 }, { minDays: 1, pct: 50 }, { minDays: 0, pct: 0 }],
  stay: [{ minDays: 7, pct: 100 }, { minDays: 3, pct: 70 }, { minDays: 1, pct: 50 }, { minDays: 0, pct: 0 }],
  food: [{ minDays: 1, pct: 100 }, { minDays: 0, pct: 50, sameDayHoursBefore: 3 }],
  beauty: [{ minDays: 2, pct: 100 }, { minDays: 1, pct: 50 }, { minDays: 0, pct: 0 }],
};

/** 표 표시용 구간: from..to 일 전 (to = null 이면 "이상") */
export type RefundTierRange = { from: number; to: number | null; pct: number; sameDayHoursBefore?: number };
export function tierRanges(category: RefundCategory): RefundTierRange[] {
  const tiers = REFUND_POLICIES[category];
  return tiers.map((t, i) => ({ from: t.minDays, to: i === 0 ? null : (tiers[i - 1]?.minDays ?? t.minDays) - 1, pct: t.pct, sameDayHoursBefore: t.sameDayHoursBefore }));
}

const seoulYmd = (d: Date): string => {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
  return f.format(d); // en-CA → YYYY-MM-DD
};
const seoulMinutes = (d: Date): number => {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(d)) p[x.type] = x.value;
  return (Number(p.hour) % 24) * 60 + Number(p.minute);
};
const dayNumber = (ymd: string): number => Math.floor(Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10))) / 86_400_000);

export type RefundEstimate = {
  category: RefundCategory;
  /** 예약일까지 남은 달력 일수 (음수 = 지남) */
  daysBefore: number;
  pct: number;
  refundWon: number;
  /** 이용 시작 후(예약 시각 지남)·노쇼 구간 */
  afterStart: boolean;
  /** 당일 N시간 전 규정에 걸려 0 이 된 경우 */
  sameDayCutoff: boolean;
  reserveYmd: string | null;
};

/**
 * 지금 취소하면 얼마가 환불되는가.
 *  reserveYmd 없음(날짜 미정) → 전액.  reserveTime "HH:MM" 이 있으면 당일 시각 판정에 사용.
 */
export function estimateRefund(input: { category: RefundCategory; reserveYmd: string | null | undefined; reserveTime?: string | null; totalWon: number; now?: Date }): RefundEstimate {
  const now = input.now ?? new Date();
  const ymd = input.reserveYmd && /^\d{4}-\d{2}-\d{2}$/.test(input.reserveYmd) ? input.reserveYmd : null;
  const base = { category: input.category, reserveYmd: ymd, afterStart: false, sameDayCutoff: false };
  if (!ymd) return { ...base, daysBefore: 999, pct: 100, refundWon: input.totalWon };
  const daysBefore = dayNumber(ymd) - dayNumber(seoulYmd(now));
  const tm = /^(\d{1,2}):(\d{2})/.exec(input.reserveTime ?? '');
  const reserveMin = tm ? Number(tm[1]) * 60 + Number(tm[2]) : null;
  const nowMin = seoulMinutes(now);
  if (daysBefore < 0 || (daysBefore === 0 && reserveMin != null && nowMin >= reserveMin)) {
    return { ...base, daysBefore, pct: 0, refundWon: 0, afterStart: true };
  }
  const tier = REFUND_POLICIES[input.category].find((t) => daysBefore >= t.minDays) ?? { minDays: 0, pct: 0 };
  let pct = tier.pct;
  let sameDayCutoff = false;
  if (daysBefore === 0 && tier.sameDayHoursBefore != null && reserveMin != null && reserveMin - nowMin < tier.sameDayHoursBefore * 60) {
    pct = 0; sameDayCutoff = true;
  }
  return { ...base, daysBefore, pct, refundWon: Math.round((input.totalWon * pct) / 100), sameDayCutoff };
}

/** 표·다이얼로그 공용 라벨 (dict.refund 의 일부) */
export type TierLabels = { tierUntil: string; tierRange: string; tierDay: string; tierSameDay: string; tierSameDayBefore: string; tierAfter: string; full: string; pct: string; none: string };
const fill = (tpl: string, v: Record<string, string | number>): string => tpl.replace(/\{(\w+)\}/g, (_m, k: string) => String(v[k] ?? ''));

/** 표 한 줄: [시점 라벨, 환불 라벨]. 마지막에 "이용 시작 후·노쇼 → 환불 불가" 줄을 붙여 쓴다. */
export function describeTier(r: RefundTierRange, index: number, t: TierLabels): { when: string; refund: string } {
  const refund = r.pct >= 100 ? t.full : r.pct <= 0 ? t.none : fill(t.pct, { pct: r.pct });
  if (r.from === 0) return { when: r.sameDayHoursBefore ? fill(t.tierSameDayBefore, { h: r.sameDayHoursBefore }) : t.tierSameDay, refund };
  if (index === 0) return { when: fill(t.tierUntil, { n: r.from }), refund };
  if (r.to == null || r.to === r.from) return { when: fill(t.tierDay, { n: r.from }), refund };
  return { when: fill(t.tierRange, { a: r.from, b: r.to }), refund };
}

/** 예상액이 표의 몇 번째 줄에 해당하는가 (-1 = 마지막 "이용 시작 후" 줄) */
export function currentTierIndex(category: RefundCategory, est: RefundEstimate): number {
  if (est.afterStart) return -1;
  const ranges = tierRanges(category);
  const i = ranges.findIndex((r) => est.daysBefore >= r.from && (r.to == null || est.daysBefore <= r.to));
  return i;
}

/** partner_listings.category / category_listings.category_key → 환불 카테고리 */
export function refundCategoryOfListingCategory(cat: string | null | undefined, opts: { medical?: boolean } = {}): RefundCategory {
  if (opts.medical) return 'medical';
  switch (cat) {
    case 'hotel': return 'stay';
    case 'food': return 'food';
    case 'hair': case 'makeup': case 'nail': case 'pmu': case 'personal_color': case 'photo_studio': case 'skin': case 'lash': case 'waxing': case 'scalp': return 'beauty';
    case 'travel_package': case 'travel': case 'kpop': return 'travel';
    case 'dental': case 'dermatology': case 'health_checkup': case 'ophthalmology': case 'oriental': case 'plastic_surgery': case 'stem_cell': return 'medical';
    default: return 'travel';
  }
}
