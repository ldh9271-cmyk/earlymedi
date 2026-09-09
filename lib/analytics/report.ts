import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';

/**
 * 마스터 통계 리포트 쿼리 모음.
 *
 * 원천 세 가지:
 *   page_views      방문(트래픽) — 월별·일별·시간대별·나라별·게시물별
 *   auth.users      신규 가입 — 공급자(구글·카카오·라인·이메일)·로케일·출처
 *   checkout_orders 예약·결제 — 건수와 결제 완료 금액
 *
 * 날짜 버킷은 전부 서울 시각 기준이다. 서버(UTC)에서 자르면 저녁 9시
 * 이후 방문이 다음 날로 넘어가 버린다.
 */

export type RangePreset = '7d' | '30d' | '90d' | '12m';
export type Range = { preset: RangePreset; from: Date; to: Date; prevFrom: Date; prevTo: Date; days: number };

const DAYS: Record<RangePreset, number> = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };

export function resolveRange(raw: string | undefined): Range {
  const preset: RangePreset = raw === '7d' || raw === '90d' || raw === '12m' ? raw : '30d';
  const days = DAYS[preset];
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const prevTo = from;
  const prevFrom = new Date(from.getTime() - days * 86_400_000);
  return { preset, from, to, prevFrom, prevTo, days };
}

type Row = Record<string, unknown>;
async function q<T extends Row>(query: ReturnType<typeof sql>): Promise<T[]> {
  const rows = await db.execute(query);
  return rows as unknown as T[];
}

const SEOUL = sql.raw(`at time zone 'Asia/Seoul'`);

/**
 * Date 를 raw sql 템플릿에 그대로 넣으면 postgres.js 가 Buffer.byteLength(Date) 를
 * 호출하다 터진다(ERR_INVALID_ARG_TYPE — 운영에서 실제로 났다). 드리즐의 컬럼
 * 매핑을 거치지 않는 raw 쿼리에서는 ISO 문자열로 넘기고 캐스팅한다.
 */
const ts = (d: Date): ReturnType<typeof sql> => sql`${d.toISOString()}::timestamptz`;

/**
 * 쿼리를 한꺼번에 다 던지지 않고 몇 개씩만 동시에 돌린다.
 *
 * 리포트 한 화면이 쿼리 20개인데 Promise.all 로 전부 쏘면 람다 하나가 커넥션
 * 풀(10개)을 즉시 다 잡고, 기간 버튼을 연달아 누르면 람다가 여러 개 떠서
 * Supabase 풀러 한도를 넘긴다 → 대기 → 30초 타임아웃("Connection closed").
 * 운영에서 실제로 났다. 4개씩이면 한 요청이 커넥션 4개 이상 쓰지 않는다.
 */
export async function runLimited<T extends readonly (() => Promise<unknown>)[]>(
  tasks: T,
  size = 4,
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const out: unknown[] = [];
  for (let i = 0; i < tasks.length; i += size) {
    const chunk = tasks.slice(i, i + size);
    out.push(...(await Promise.all(chunk.map((t) => t()))));
  }
  return out as { [K in keyof T]: Awaited<ReturnType<T[K]>> };
}

// ─── 트래픽 ──────────────────────────────────────────────────────────

export type Bucket = { label: string; views: number; sessions: number };

export async function trafficTotals(from: Date, to: Date): Promise<{ views: number; sessions: number }> {
  const [r] = await q<{ views: number; sessions: number }>(sql`
    select count(*)::int as views, count(distinct session_id)::int as sessions
    from page_views where ts >= ${ts(from)} and ts < ${ts(to)}`);
  return { views: r?.views ?? 0, sessions: r?.sessions ?? 0 };
}

/** 최근 12개월, 빈 달도 0 으로 채운다. */
export async function trafficByMonth(): Promise<Bucket[]> {
  const rows = await q<{ m: string; views: number; sessions: number }>(sql`
    select to_char(date_trunc('month', ts ${SEOUL}), 'YYYY-MM') as m,
           count(*)::int as views, count(distinct session_id)::int as sessions
    from page_views
    where ts >= (date_trunc('month', now() ${SEOUL}) - interval '11 months')
    group by 1 order by 1`);
  const map = new Map(rows.map((r) => [r.m, r]));
  const out: Bucket[] = [];
  const now = seoulNow();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const r = map.get(key);
    out.push({ label: `${d.getUTCMonth() + 1}월`, views: r?.views ?? 0, sessions: r?.sessions ?? 0 });
  }
  return out;
}

/** 기간 내 일별, 빈 날도 0 으로 채운다. */
export async function trafficByDay(from: Date, to: Date): Promise<Bucket[]> {
  const rows = await q<{ d: string; views: number; sessions: number }>(sql`
    select to_char(date_trunc('day', ts ${SEOUL}), 'YYYY-MM-DD') as d,
           count(*)::int as views, count(distinct session_id)::int as sessions
    from page_views where ts >= ${ts(from)} and ts < ${ts(to)}
    group by 1 order by 1`);
  const map = new Map(rows.map((r) => [r.d, r]));
  const out: Bucket[] = [];
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  const end = seoulDate(to);
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end.getTime() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    const r = map.get(key);
    out.push({ label: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`, views: r?.views ?? 0, sessions: r?.sessions ?? 0 });
  }
  return out;
}

/** 기간 내 시간대별(0~23시, 서울) 합계. */
export async function trafficByHour(from: Date, to: Date): Promise<Bucket[]> {
  const rows = await q<{ h: number; views: number; sessions: number }>(sql`
    select extract(hour from ts ${SEOUL})::int as h,
           count(*)::int as views, count(distinct session_id)::int as sessions
    from page_views where ts >= ${ts(from)} and ts < ${ts(to)}
    group by 1 order by 1`);
  const map = new Map(rows.map((r) => [r.h, r]));
  return Array.from({ length: 24 }, (_, h) => ({ label: `${h}시`, views: map.get(h)?.views ?? 0, sessions: map.get(h)?.sessions ?? 0 }));
}

export type CountryRow = { country: string; views: number; sessions: number; share: number };
export async function trafficByCountry(from: Date, to: Date, limit = 15): Promise<CountryRow[]> {
  const rows = await q<{ country: string | null; views: number; sessions: number }>(sql`
    select country, count(*)::int as views, count(distinct session_id)::int as sessions
    from page_views where ts >= ${ts(from)} and ts < ${ts(to)}
    group by 1 order by 2 desc limit ${limit}`);
  const total = rows.reduce((a, r) => a + r.views, 0) || 1;
  return rows.map((r) => ({ country: r.country ?? '??', views: r.views, sessions: r.sessions, share: r.views / total }));
}

export type SplitRow = { key: string; views: number; sessions: number };
export async function trafficByDevice(from: Date, to: Date): Promise<SplitRow[]> {
  const rows = await q<{ key: string | null; views: number; sessions: number }>(sql`
    select device as key, count(*)::int as views, count(distinct session_id)::int as sessions
    from page_views where ts >= ${ts(from)} and ts < ${ts(to)} group by 1 order by 2 desc`);
  return rows.map((r) => ({ key: r.key ?? '?', views: r.views, sessions: r.sessions }));
}

export async function trafficByLocale(from: Date, to: Date): Promise<SplitRow[]> {
  const rows = await q<{ key: string | null; views: number; sessions: number }>(sql`
    select locale as key, count(*)::int as views, count(distinct session_id)::int as sessions
    from page_views where ts >= ${ts(from)} and ts < ${ts(to)} group by 1 order by 2 desc`);
  return rows.map((r) => ({ key: r.key ?? '?', views: r.views, sessions: r.sessions }));
}

export async function topReferrers(from: Date, to: Date, limit = 10): Promise<SplitRow[]> {
  const rows = await q<{ key: string; views: number; sessions: number }>(sql`
    select referrer_host as key, count(*)::int as views, count(distinct session_id)::int as sessions
    from page_views where ts >= ${ts(from)} and ts < ${ts(to)} and referrer_host is not null
    group by 1 order by 2 desc limit ${limit}`);
  return rows;
}

export type PageRow = { path: string; kind: string; views: number; sessions: number };

/** 경로를 사람이 읽는 종류로 — 인기 게시물 표의 분류 열. */
export function classifyPath(path: string): string {
  const p = path.replace(/^\/(kr|en|zh|ja|ru|vi)/, '') || '/';
  if (p === '/') return '홈';
  if (/^\/clinics\/r\//.test(p)) return '병원 (레지스트리)';
  if (/^\/clinics\/all/.test(p) || p === '/clinics') return '병원 목록';
  if (/^\/clinics\//.test(p)) return '병원 (인증)';
  if (/^\/listings\//.test(p)) return '글로우업 상품';
  if (/^\/glowup\/courses\//.test(p)) return '글로우업 코스';
  if (/^\/glowup\/pc/.test(p)) return '퍼스널 컬러';
  if (/^\/glowup/.test(p)) return '글로우업';
  if (/^\/eats\/r\//.test(p)) return '맛집';
  if (/^\/stays\/r\//.test(p)) return '숙박';
  if (/^\/shops\/r\//.test(p)) return '뷰티샵';
  if (/^\/attractions\/[^/]+$/.test(p) && !/\/all$/.test(p)) return '관광지';
  if (/^\/travel\//.test(p)) return '여행';
  if (/^\/(eats|stays|shops|attractions)\/all/.test(p)) return '목록';
  if (/^\/search/.test(p)) return '검색';
  if (/^\/map/.test(p)) return '지도';
  if (/^\/ai-trip/.test(p)) return 'AI 여행';
  if (/^\/ai-consult/.test(p)) return 'AI 상담';
  if (/^\/(login|signup)/.test(p)) return '로그인·가입';
  if (/^\/me/.test(p)) return '마이페이지';
  if (/^\/checkout/.test(p)) return '결제';
  return '기타';
}

/** 조회수 상위 경로 — 상세(게시물) 페이지만 따로 볼 때는 detailOnly. */
export async function topPages(from: Date, to: Date, limit = 20, detailOnly = false): Promise<PageRow[]> {
  const rows = await q<{ path: string; views: number; sessions: number }>(sql`
    select path, count(*)::int as views, count(distinct session_id)::int as sessions
    from page_views where ts >= ${ts(from)} and ts < ${ts(to)}
    group by 1 order by 2 desc limit ${detailOnly ? limit * 4 : limit}`);
  const mapped = rows.map((r) => ({ ...r, kind: classifyPath(r.path) }));
  const DETAIL = new Set(['병원 (레지스트리)', '병원 (인증)', '글로우업 상품', '글로우업 코스', '퍼스널 컬러', '맛집', '숙박', '뷰티샵', '관광지', '여행']);
  return (detailOnly ? mapped.filter((r) => DETAIL.has(r.kind)) : mapped).slice(0, limit);
}

export async function firstViewAt(): Promise<Date | null> {
  const [r] = await q<{ t: Date | null }>(sql`select min(ts) as t from page_views`);
  return r?.t ? new Date(r.t) : null;
}

// ─── 신규 가입 ────────────────────────────────────────────────────────

export async function signupTotals(from: Date, to: Date): Promise<number> {
  const [r] = await q<{ n: number }>(sql`select count(*)::int as n from auth.users where created_at >= ${ts(from)} and created_at < ${ts(to)}`);
  return r?.n ?? 0;
}

export async function signupsByDay(from: Date, to: Date): Promise<Bucket[]> {
  const rows = await q<{ d: string; n: number }>(sql`
    select to_char(date_trunc('day', created_at ${SEOUL}), 'YYYY-MM-DD') as d, count(*)::int as n
    from auth.users where created_at >= ${ts(from)} and created_at < ${ts(to)} group by 1 order by 1`);
  const map = new Map(rows.map((r) => [r.d, r.n]));
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  const end = seoulDate(to);
  const out: Bucket[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end.getTime() - i * 86_400_000);
    const n = map.get(d.toISOString().slice(0, 10)) ?? 0;
    out.push({ label: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`, views: n, sessions: n });
  }
  return out;
}

export async function signupsByMonth(): Promise<Bucket[]> {
  const rows = await q<{ m: string; n: number }>(sql`
    select to_char(date_trunc('month', created_at ${SEOUL}), 'YYYY-MM') as m, count(*)::int as n
    from auth.users where created_at >= (date_trunc('month', now() ${SEOUL}) - interval '11 months')
    group by 1 order by 1`);
  const map = new Map(rows.map((r) => [r.m, r.n]));
  const now = seoulNow();
  const out: Bucket[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const n = map.get(key) ?? 0;
    out.push({ label: `${d.getUTCMonth() + 1}월`, views: n, sessions: n });
  }
  return out;
}

export const PROVIDER_KO: Record<string, string> = {
  email: '이메일', google: '구글', kakao: '카카오', line: '라인', facebook: '페이스북', phone: '전화(왓츠앱)',
};

export async function signupsByProvider(from: Date, to: Date): Promise<SplitRow[]> {
  // 라인은 자체 브릿지라 provider 가 email 로 남고 user_metadata.provider_hint 에 line 이 찍힌다
  const rows = await q<{ key: string; n: number }>(sql`
    select coalesce(raw_user_meta_data->>'provider_hint', raw_app_meta_data->>'provider', 'email') as key, count(*)::int as n
    from auth.users where created_at >= ${ts(from)} and created_at < ${ts(to)} group by 1 order by 2 desc`);
  return rows.map((r) => ({ key: r.key, views: r.n, sessions: r.n }));
}

export async function signupsByLocale(from: Date, to: Date): Promise<SplitRow[]> {
  const rows = await q<{ key: string | null; n: number }>(sql`
    select raw_user_meta_data->>'signup_locale' as key, count(*)::int as n
    from auth.users where created_at >= ${ts(from)} and created_at < ${ts(to)} group by 1 order by 2 desc`);
  return rows.map((r) => ({ key: r.key ?? '미상', views: r.n, sessions: r.n }));
}

export type SignupRow = {
  id: string; email: string | null; createdAt: Date; provider: string;
  name: string | null; locale: string | null; source: string | null; country: string | null;
};
export async function recentSignups(limit = 20): Promise<SignupRow[]> {
  const rows = await q<{ id: string; email: string | null; created_at: Date; provider: string; name: string | null; locale: string | null; source: string | null; country: string | null }>(sql`
    select id, email, created_at,
           coalesce(raw_user_meta_data->>'provider_hint', raw_app_meta_data->>'provider', 'email') as provider,
           raw_user_meta_data->>'full_name' as name,
           raw_user_meta_data->>'signup_locale' as locale,
           raw_user_meta_data->>'signup_source' as source,
           raw_user_meta_data->>'country_code' as country
    from auth.users order by created_at desc limit ${limit}`);
  return rows.map((r) => ({ id: r.id, email: r.email, createdAt: new Date(r.created_at), provider: r.provider, name: r.name, locale: r.locale, source: r.source, country: r.country }));
}

// ─── 예약·결제 ────────────────────────────────────────────────────────

export type OrderSummary = { issued: number; reported: number; paid: number; cancelled: number; paidWon: number };
export async function orderSummary(from: Date, to: Date): Promise<OrderSummary> {
  const rows = await q<{ status: string; n: number; won: number }>(sql`
    select status::text as status, count(*)::int as n, coalesce(sum(total_won), 0)::float8 as won
    from checkout_orders where created_at >= ${ts(from)} and created_at < ${ts(to)} group by 1`);
  const s: OrderSummary = { issued: 0, reported: 0, paid: 0, cancelled: 0, paidWon: 0 };
  for (const r of rows) {
    if (r.status in s) s[r.status as keyof Omit<OrderSummary, 'paidWon'>] = r.n;
    if (r.status === 'paid') s.paidWon = r.won;
  }
  return s;
}

// ─── 서울 시각 도우미 ─────────────────────────────────────────────────

/** 지금을 "서울 달력 날짜" 로 — UTC 자정으로 정규화한 Date. */
function seoulNow(): Date {
  return seoulDate(new Date());
}
function seoulDate(d: Date): Date {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const get = (t: string): number => Number(p.find((x) => x.type === t)?.value ?? 0);
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
}
