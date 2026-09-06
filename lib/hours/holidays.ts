import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { KR_HOLIDAYS_STATIC } from './kr-holidays-static';

/**
 * 공휴일 — kr_holidays 테이블(공공데이터포털 한국천문연구원 특일정보 API 로 채움)
 * + 정적 목록 보완. 페이지는 loadHolidayYmds() 로 YYYY-MM-DD 배열만 받아
 * 클라이언트 배지에 넘긴다.
 *
 *  API: apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo
 *       (solYear, solMonth) → items[].locdate(YYYYMMDD) · dateName · isHoliday
 *  키: DATA_GO_KR_KEY 없으면 HIRA_SERVICE_KEY (같은 계정 키로 승인된 API 모두 사용 가능)
 */
const API = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo';

type Row = { ymd: string; name: string; source: string };

export async function loadHolidayYmds(): Promise<string[]> {
  const year = new Date().getFullYear();
  const set = new Set<string>();
  try {
    const rows = (await db.execute(sql`select ymd from kr_holidays where ymd >= ${`${year - 1}-01-01`} and ymd <= ${`${year + 1}-12-31`}`)) as unknown as Array<{ ymd: string }>;
    for (const r of rows) set.add(r.ymd);
  } catch { /* 테이블 없음 등 — 정적 목록만 */ }
  for (const ymd of Object.keys(KR_HOLIDAYS_STATIC)) set.add(ymd);
  return [...set].sort();
}

async function fetchYear(year: number, key: string): Promise<Row[]> {
  const out: Row[] = [];
  for (let m = 1; m <= 12; m++) {
    const u = `${API}?serviceKey=${encodeURIComponent(key)}&solYear=${year}&solMonth=${String(m).padStart(2, '0')}&numOfRows=50&_type=json`;
    const res = await fetch(u, { cache: 'no-store' });
    if (!res.ok) throw new Error(`holiday api ${res.status}`);
    const text = await res.text();
    if (!text.trim().startsWith('{')) throw new Error(`holiday api non-json: ${text.slice(0, 80)}`);
    const j = JSON.parse(text) as { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: { item?: unknown } } } };
    const code = j.response?.header?.resultCode;
    if (code && code !== '00') throw new Error(`holiday api ${code} ${j.response?.header?.resultMsg ?? ''}`);
    const raw = j.response?.body?.items?.item;
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const it of items as Array<{ locdate?: number | string; dateName?: string; isHoliday?: string }>) {
      const d = String(it.locdate ?? '');
      if (!/^\d{8}$/.test(d) || (it.isHoliday && it.isHoliday !== 'Y')) continue;
      out.push({ ymd: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, name: String(it.dateName ?? ''), source: 'data.go.kr' });
    }
  }
  return out;
}

/** 크론: 올해·내년 공휴일을 API 로 받아 upsert. 키 없음/미승인이면 정적 목록을 넣고 skipped 로 알린다. */
export async function syncKrHolidays(): Promise<{ upserted: number; source: string; error?: string }> {
  const key = process.env.DATA_GO_KR_KEY || process.env.HIRA_SERVICE_KEY || '';
  const year = new Date().getFullYear();
  let rows: Row[] = [];
  let source = 'static';
  let error: string | undefined;
  if (key) {
    try {
      rows = [...(await fetchYear(year, key)), ...(await fetchYear(year + 1, key))];
      source = 'data.go.kr';
    } catch (e) {
      error = e instanceof Error ? e.message : 'failed';
    }
  }
  if (rows.length === 0) rows = Object.entries(KR_HOLIDAYS_STATIC).map(([ymd, name]) => ({ ymd, name, source: 'static' }));
  let n = 0;
  for (const r of rows) {
    await db.execute(sql`insert into kr_holidays (ymd, name, source, updated_at) values (${r.ymd}, ${r.name}, ${r.source}, now())
      on conflict (ymd) do update set name = excluded.name, source = excluded.source, updated_at = now()`);
    n++;
  }
  return { upserted: n, source, ...(error ? { error } : {}) };
}
