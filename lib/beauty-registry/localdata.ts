import 'server-only';
import proj4 from 'proj4';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { beautyRegistry } from '@/drizzle/schema/beauty-registry';

/**
 * 행정안전부 생활_미용업 조회서비스 (LOCALDATA) — apis.data.go.kr/1741000/beauty_salons/info
 *
 *  - 파라미터는 pageNo / numOfRows(최대 100) 만 동작한다 (지자체·상태·기간 필터 없음).
 *  - 응답은 최근 갱신 순 → 일일 크론은 앞 페이지부터 LAST_MDFCN_PNT 가 마지막
 *    동기화 이전이 될 때까지만 읽으면 증분 갱신이 된다.
 *  - 좌표 CRD_INFO_X/Y 는 TM 중부원점(EPSG:5174, Bessel) → WGS84 변환.
 *  - 인증키는 심평원과 같은 공공데이터포털 키(HIRA_SERVICE_KEY) 재사용.
 */
const BASE = 'https://apis.data.go.kr/1741000/beauty_salons/info';
export const BEAUTY_PAGE_SIZE = 100;
const TM_5174 = '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43';

type Json = Record<string, unknown>;
const str = (v: unknown): string | null => { if (v === undefined || v === null) return null; const s = String(v).trim(); return s === '' ? null : s; };
const num = (v: unknown): number | null => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const int = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : 0; };

function key(): string {
  const raw = (process.env.HIRA_SERVICE_KEY ?? '').trim();
  if (!raw) throw new Error('HIRA_SERVICE_KEY 가 설정되지 않았습니다');
  return raw.includes('%') ? raw : encodeURIComponent(raw);
}

export async function fetchBeautyPage(pageNo: number, numOfRows = BEAUTY_PAGE_SIZE): Promise<{ items: Json[]; totalCount: number }> {
  const url = `${BASE}?serviceKey=${key()}&type=json&pageNo=${pageNo}&numOfRows=${numOfRows}`;
  let res: Response | null = null; let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3 && !res; attempt += 1) {
    try { res = await fetch(url, { cache: 'no-store' }); } catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))); }
  }
  if (!res) throw new Error(`LOCALDATA 연결 실패: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`LOCALDATA HTTP ${res.status}: ${text.slice(0, 160)}`);
  let json: Json;
  try { json = JSON.parse(text) as Json; } catch { throw new Error(`LOCALDATA 비JSON: ${text.slice(0, 160)}`); }
  const body = ((json.response as Json | undefined)?.body ?? {}) as Json;
  const wrap = body.items as Json | undefined;
  const it = wrap && typeof wrap === 'object' ? (wrap as Json).item : undefined;
  const items = Array.isArray(it) ? (it as Json[]) : it ? [it as Json] : [];
  return { items, totalCount: Number(body.totalCount ?? 0) || 0 };
}

/** 업태·상호 → 소비자 카테고리 키 (플랫폼 partner_listings.category 와 같은 키). */
export function categorize(bizType: string | null, name: string): string[] {
  const keys = new Set<string>();
  const b = bizType ?? '';
  if (/일반미용|종합미용/.test(b)) keys.add('hair');
  if (/메이크업|화장|분장|종합미용/.test(b)) keys.add('makeup');
  if (/네일|종합미용/.test(b)) keys.add('nail');
  if (/피부미용|종합미용/.test(b)) keys.add('skin');
  const n = name.replace(/\s+/g, '').toLowerCase();
  if (/반영구|pmu|아트메이크업|눈썹문신|semi|permanent/.test(n)) keys.add('pmu');
  if (/퍼스널컬러|퍼스널칼라|컬러진단|personalcolor|컬러컨설팅|퍼컬/.test(n)) keys.add('personal_color');
  if (/속눈썹|래쉬|라쉬|lash|눈썹연장/.test(n)) keys.add('lash');
  if (/왁싱|waxing/.test(n)) keys.add('waxing');
  if (/두피|헤드스파|탈모/.test(n)) keys.add('scalp');
  if (/네일|nail/.test(n)) keys.add('nail');
  if (/메이크업|makeup/.test(n)) keys.add('makeup');
  if (/헤어|hair|미용실|살롱|salon|바버|barber/.test(n)) keys.add('hair');
  return [...keys];
}

/** 주소 → 시도/시군구 (도로명 우선). */
function region(addr: string | null): { sido: string | null; sggu: string | null } {
  if (!addr) return { sido: null, sggu: null };
  const parts = addr.split(/\s+/);
  const sidoRaw = parts[0] ?? '';
  const sido = sidoRaw
    .replace(/특별자치도$|특별자치시$|광역시$|특별시$|통합특별시$/, '')
    .replace(/^전남광주$/, '광주').replace(/^전라남도$/, '전남').replace(/^전라북도$/, '전북').replace(/^전북$/, '전북')
    .replace(/^충청남도$/, '충남').replace(/^충청북도$/, '충북').replace(/^경상남도$/, '경남').replace(/^경상북도$/, '경북')
    .replace(/^경기도$/, '경기').replace(/^강원$/, '강원').replace(/^제주$/, '제주');
  // 시군구: "수원시 팔달구" 처럼 두 토큰이면 합친다
  let sggu = parts[1] ?? null;
  if (sggu && /시$/.test(sggu) && parts[2] && /구$|군$/.test(parts[2])) sggu = `${sggu} ${parts[2]}`;
  return { sido: sido || null, sggu };
}

export type BeautyRow = typeof beautyRegistry.$inferInsert;

export function mapBeautyItem(it: Json): BeautyRow | null {
  const mgtNo = str(it.MNG_NO); const name = str(it.BPLC_NM);
  if (!mgtNo || !name) return null;
  const addrRoad = str(it.ROAD_NM_ADDR); const addrLot = str(it.LOTNO_ADDR);
  const { sido, sggu } = region(addrRoad ?? addrLot);
  const x = num(it.CRD_INFO_X); const y = num(it.CRD_INFO_Y);
  let lat: number | null = null; let lng: number | null = null;
  if (x && y && Math.abs(x) < 2_000_000 && Math.abs(y) < 2_000_000) {
    try {
      const [lo, la] = proj4(TM_5174, 'EPSG:4326', [x, y]) as [number, number];
      if (la > 32 && la < 40 && lo > 124 && lo < 132) { lat = la; lng = lo; }
    } catch { /* 좌표 불량 — 주소 기반으로만 표시 */ }
  }
  const bizType = str(it.BZSTAT_SE_NM);
  const lastMod = str(it.LAST_MDFCN_PNT);
  return {
    mgtNo, name, bizType,
    sanitationType: str(it.SNTTN_BZSTAT_NM),
    categoryKeys: categorize(bizType, name),
    statusCode: str(it.SALS_STTS_CD), statusName: str(it.SALS_STTS_NM), detailStatusName: str(it.DTL_SALS_STTS_NM),
    openedDate: str(it.LCPMT_YMD), closedDate: str(it.CLSBIZ_YMD),
    localCode: str(it.OPN_ATMY_GRP_CD), sidoName: sido, sgguName: sggu,
    addrRoad, addrLot, zip: str(it.ROAD_NM_ZIP) ?? str(it.LCTN_ZIP), tel: str(it.TELNO),
    areaM2: num(it.LCTN_AREA), chairs: int(it.CHAI_CNT), beds: int(it.BED_CNT),
    lat, lng,
    details: { chairs: int(it.CHAI_CNT) || undefined, beds: int(it.BED_CNT) || undefined, areaM2: num(it.LCTN_AREA) ?? undefined },
    lastModifiedAt: lastMod ? new Date(lastMod.replace(' ', 'T') + '+09:00') : null,
    syncedAt: new Date(),
  };
}

export async function upsertBeautyRows(rows: BeautyRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const uniq = new Map<string, BeautyRow>();
  for (const r of rows) uniq.set(r.mgtNo, r);
  const values = [...uniq.values()];
  await db.insert(beautyRegistry).values(values).onConflictDoUpdate({
    target: beautyRegistry.mgtNo,
    set: {
      name: sql`excluded.name`, bizType: sql`excluded.biz_type`, sanitationType: sql`excluded.sanitation_type`,
      categoryKeys: sql`excluded.category_keys`,
      statusCode: sql`excluded.status_code`, statusName: sql`excluded.status_name`, detailStatusName: sql`excluded.detail_status_name`,
      openedDate: sql`excluded.opened_date`, closedDate: sql`excluded.closed_date`,
      localCode: sql`excluded.local_code`, sidoName: sql`excluded.sido_name`, sgguName: sql`excluded.sggu_name`,
      addrRoad: sql`excluded.addr_road`, addrLot: sql`excluded.addr_lot`, zip: sql`excluded.zip`, tel: sql`excluded.tel`,
      areaM2: sql`excluded.area_m2`, chairs: sql`excluded.chairs`, beds: sql`excluded.beds`,
      lat: sql`excluded.lat`, lng: sql`excluded.lng`,
      // 병원과 동일: 업소가 직접 입력한 details(intro/photos/languages)는 보존, 공공 수치만 갱신
      details: sql`beauty_registry.details || excluded.details`,
      lastModifiedAt: sql`excluded.last_modified_at`, syncedAt: sql`excluded.synced_at`, updatedAt: sql`now()`,
    },
  });
  return values.length;
}

export type BeautySyncResult = { pageNo: number; fetched: number; upserted: number; totalCount: number; done: boolean; oldestModified: string | null };

/** 한 페이지 동기화 (100건). 마스터 실행기/크론/로컬 스크립트가 pageNo 를 올려가며 호출. */
export async function syncBeautyPage(pageNo: number): Promise<BeautySyncResult> {
  const { items, totalCount } = await fetchBeautyPage(pageNo);
  const rows = items.map(mapBeautyItem).filter((r): r is BeautyRow => r !== null);
  const upserted = await upsertBeautyRows(rows);
  const oldest = rows.reduce<string | null>((acc, r) => {
    const t = r.lastModifiedAt ? r.lastModifiedAt.toISOString() : null;
    return t && (!acc || t < acc) ? t : acc;
  }, null);
  return { pageNo, fetched: items.length, upserted, totalCount, done: items.length < BEAUTY_PAGE_SIZE || pageNo * BEAUTY_PAGE_SIZE >= totalCount, oldestModified: oldest };
}

/** 증분 갱신 — 최근 갱신 순이므로 앞 페이지부터 since 이전 데이터가 나오면 중단 (크론용). */
export async function syncBeautyRecent(since: Date, maxPages = 60): Promise<{ pages: number; upserted: number }> {
  let upserted = 0; let page = 1;
  for (; page <= maxPages; page += 1) {
    const r = await syncBeautyPage(page);
    upserted += r.upserted;
    if (r.done || (r.oldestModified && new Date(r.oldestModified) < since)) break;
  }
  return { pages: page, upserted };
}
