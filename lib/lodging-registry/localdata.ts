import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { lodgingRegistry } from '@/drizzle/schema/lodging-registry';
import { fetchLocaldataPage, int, num, parseLastMod, regionOf, str, tmToWgs84, LOCALDATA_PAGE_SIZE, type Json } from '@/lib/localdata/client';

/** 행정안전부 문화_숙박업 조회서비스 — apis.data.go.kr/1741000/lodgings/info (58,713건, 미용업과 같은 구조) */
const ENDPOINT = 'https://apis.data.go.kr/1741000/lodgings/info';

/** 업태·상호 → 소비자 카테고리 (hotel 은 플랫폼 partner_listings.category 와 같은 키). */
export function categorizeLodging(bizType: string | null, name: string): string[] {
  const keys = new Set<string>();
  const b = bizType ?? '';
  const n = name.replace(/\s+/g, '').toLowerCase();
  if (/호텔|콘도|리조트/.test(b) || /호텔|hotel|리조트|resort|콘도/.test(n)) keys.add('hotel');
  if (/의료관광호텔/.test(b) || /메디컬|medical/.test(n)) keys.add('medical_hotel');
  if (/여관|여인숙/.test(b) || /모텔|motel|여관/.test(n)) keys.add('motel');
  if (/민박|호스텔|한옥|게스트/.test(b) || /게스트하우스|guesthouse|guest|호스텔|hostel|한옥|민박|스테이|stay/.test(n)) keys.add('guesthouse');
  if (/생활/.test(b) || /펜션|pension|레지던스|residence|풀빌라|villa/.test(n)) keys.add('pension');
  if (keys.size === 0) keys.add('other');
  return [...keys];
}

export type LodgingRow = typeof lodgingRegistry.$inferInsert;

export function mapLodgingItem(it: Json): LodgingRow | null {
  const mgtNo = str(it.MNG_NO); const name = str(it.BPLC_NM);
  if (!mgtNo || !name) return null;
  const addrRoad = str(it.ROAD_NM_ADDR); const addrLot = str(it.LOTNO_ADDR);
  const { sido, sggu } = regionOf(addrRoad ?? addrLot);
  const geo = tmToWgs84(num(it.CRD_INFO_X), num(it.CRD_INFO_Y));
  const bizType = str(it.BZSTAT_SE_NM);
  const roomsKo = int(it.KSRM_CNT); const roomsWe = int(it.WSRM_CNT); const floors = int(it.BLDG_GRND_FLR_CNT);
  return {
    mgtNo, name, bizType, sanitationType: str(it.SNTTN_BZSTAT_NM),
    categoryKeys: categorizeLodging(bizType, name),
    statusCode: str(it.SALS_STTS_CD), statusName: str(it.SALS_STTS_NM),
    openedDate: str(it.LCPMT_YMD), closedDate: str(it.CLSBIZ_YMD),
    localCode: str(it.OPN_ATMY_GRP_CD), sidoName: sido, sgguName: sggu,
    addrRoad, addrLot, zip: str(it.ROAD_NM_ZIP) ?? str(it.LCTN_ZIP), tel: str(it.TELNO),
    roomsKo, roomsWe, floors, areaM2: num(it.LCTN_AREA),
    lat: geo?.lat ?? null, lng: geo?.lng ?? null,
    details: { roomsKo: roomsKo || undefined, roomsWe: roomsWe || undefined, floors: floors || undefined, areaM2: num(it.LCTN_AREA) ?? undefined },
    lastModifiedAt: parseLastMod(it.LAST_MDFCN_PNT),
    syncedAt: new Date(),
  };
}

export async function upsertLodgingRows(rows: LodgingRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const uniq = new Map<string, LodgingRow>();
  for (const r of rows) uniq.set(r.mgtNo, r);
  const values = [...uniq.values()];
  await db.insert(lodgingRegistry).values(values).onConflictDoUpdate({
    target: lodgingRegistry.mgtNo,
    set: {
      name: sql`excluded.name`, bizType: sql`excluded.biz_type`, sanitationType: sql`excluded.sanitation_type`, categoryKeys: sql`excluded.category_keys`,
      statusCode: sql`excluded.status_code`, statusName: sql`excluded.status_name`, openedDate: sql`excluded.opened_date`, closedDate: sql`excluded.closed_date`,
      localCode: sql`excluded.local_code`, sidoName: sql`excluded.sido_name`, sgguName: sql`excluded.sggu_name`,
      addrRoad: sql`excluded.addr_road`, addrLot: sql`excluded.addr_lot`, zip: sql`excluded.zip`, tel: sql`excluded.tel`,
      roomsKo: sql`excluded.rooms_ko`, roomsWe: sql`excluded.rooms_we`, floors: sql`excluded.floors`, areaM2: sql`excluded.area_m2`,
      lat: sql`excluded.lat`, lng: sql`excluded.lng`,
      details: sql`lodging_registry.details || excluded.details`,
      lastModifiedAt: sql`excluded.last_modified_at`, syncedAt: sql`excluded.synced_at`, updatedAt: sql`now()`,
    },
  });
  return values.length;
}

export type LodgingSyncResult = { pageNo: number; fetched: number; upserted: number; totalCount: number; done: boolean; oldestModified: string | null };

export async function syncLodgingPage(pageNo: number): Promise<LodgingSyncResult> {
  const { items, totalCount } = await fetchLocaldataPage(ENDPOINT, pageNo);
  const rows = items.map(mapLodgingItem).filter((r): r is LodgingRow => r !== null);
  const upserted = await upsertLodgingRows(rows);
  const oldest = rows.reduce<string | null>((acc, r) => { const t = r.lastModifiedAt ? r.lastModifiedAt.toISOString() : null; return t && (!acc || t < acc) ? t : acc; }, null);
  return { pageNo, fetched: items.length, upserted, totalCount, done: items.length < LOCALDATA_PAGE_SIZE || pageNo * LOCALDATA_PAGE_SIZE >= totalCount, oldestModified: oldest };
}

/** 증분 갱신 — 최근 갱신 순이므로 since 이전 데이터가 나오면 중단 (크론용). */
export async function syncLodgingRecent(since: Date, maxPages = 40): Promise<{ pages: number; upserted: number }> {
  let upserted = 0; let page = 1;
  for (; page <= maxPages; page += 1) {
    const r = await syncLodgingPage(page);
    upserted += r.upserted;
    if (r.done || (r.oldestModified && new Date(r.oldestModified) < since)) break;
  }
  return { pages: page, upserted };
}
