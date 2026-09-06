import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { foodRegistry } from '@/drizzle/schema/food-registry';
import { fetchLocaldataPage, num, parseLastMod, regionOf, str, tmToWgs84, LOCALDATA_PAGE_SIZE, type Json } from '@/lib/localdata/client';

/** 행정안전부 식품_일반음식점 조회서비스 — apis.data.go.kr/1741000/general_restaurants (미용업/숙박업과 같은 구조) */
const ENDPOINT = 'https://apis.data.go.kr/1741000/general_restaurants/info';

/** 업태·상호 → 소비자 카테고리. */
export function categorizeFood(bizType: string | null, name: string): string[] {
  const keys = new Set<string>();
  const b = bizType ?? '';
  const n = name.replace(/\s+/g, '').toLowerCase();
  if (/한식|백반|한정식|국밥|냉면|해장국|찌개|분식|김밥|떡볶이/.test(b) || /한식|국밥|냉면|백반|한정식/.test(n)) keys.add('korean');
  if (/분식|김밥|떡볶이/.test(b)) keys.add('bunsik');
  if (/식육|구이|갈비|삼겹|숯불|바베큐|bbq|곱창|정육/.test(b) || /구이|갈비|삼겹|숯불|bbq|곱창|한우|막창/.test(n)) keys.add('bbq');
  if (/횟집|일식|초밥|스시|참치|회/.test(b) || /스시|초밥|sushi|오마카세|이자카야|일식|참치|회집/.test(n)) keys.add('japanese');
  if (/중국식|중식|짜장|짬뽕/.test(b) || /중식|훠궈|마라|짜장|짬뽕|양꼬치/.test(n)) keys.add('chinese');
  if (/경양식|서양식|패스트푸드|뷔페|피자|파스타|스테이크|햄버거/.test(b) || /피자|pizza|파스타|pasta|스테이크|버거|burger|양식/.test(n)) keys.add('western');
  if (/외국|인도|태국|베트남|아시아|이태리|프랑스/.test(b) || /타이|thai|베트남|쌀국수|인도|india|kebab|케밥|아시안/.test(n)) keys.add('asian');
  if (/카페|다방|제과|커피|과자점|아이스크림|빵/.test(b) || /카페|cafe|coffee|커피|베이커리|bakery|디저트|dessert|브런치/.test(n)) keys.add('cafe');
  if (/통닭|치킨|호프|통닭\(치킨\)|맥주|바|펍/.test(b) || /치킨|chicken|호프|펍|pub|맥주|비어|beer/.test(n)) keys.add('chicken_pub');
  if (/주점|소주방|대포집|정종|감성주점|라이브|바\(bar\)|칵테일|와인|막걸리|전통주/.test(b) || /포차|주점|와인|wine|칵테일|막걸리|양조장|이자카야/.test(n)) keys.add('bar');
  if (keys.size === 0) keys.add('other');
  return [...keys];
}

export type FoodRow = typeof foodRegistry.$inferInsert;

export function mapFoodItem(it: Json): FoodRow | null {
  const mgtNo = str(it.MNG_NO); const name = str(it.BPLC_NM);
  if (!mgtNo || !name) return null;
  const addrRoad = str(it.ROAD_NM_ADDR); const addrLot = str(it.LOTNO_ADDR);
  const { sido, sggu } = regionOf(addrRoad ?? addrLot);
  const geo = tmToWgs84(num(it.CRD_INFO_X), num(it.CRD_INFO_Y));
  const bizType = str(it.BZSTAT_SE_NM);
  return {
    mgtNo, name, bizType, sanitationType: str(it.SNTTN_BZSTAT_NM),
    categoryKeys: categorizeFood(bizType, name),
    statusCode: str(it.SALS_STTS_CD), statusName: str(it.SALS_STTS_NM),
    openedDate: str(it.LCPMT_YMD), closedDate: str(it.CLSBIZ_YMD),
    localCode: str(it.OPN_ATMY_GRP_CD), sidoName: sido, sgguName: sggu,
    addrRoad, addrLot, zip: str(it.ROAD_NM_ZIP) ?? str(it.LCTN_ZIP), tel: str(it.TELNO),
    lat: geo?.lat ?? null, lng: geo?.lng ?? null,
    details: bizType ? { cuisine: bizType } : {},
    lastModifiedAt: parseLastMod(it.LAST_MDFCN_PNT),
    syncedAt: new Date(),
  };
}

export async function upsertFoodRows(rows: FoodRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const uniq = new Map<string, FoodRow>();
  for (const r of rows) uniq.set(r.mgtNo, r);
  const values = [...uniq.values()];
  await db.insert(foodRegistry).values(values).onConflictDoUpdate({
    target: foodRegistry.mgtNo,
    set: {
      name: sql`excluded.name`, bizType: sql`excluded.biz_type`, sanitationType: sql`excluded.sanitation_type`, categoryKeys: sql`excluded.category_keys`,
      statusCode: sql`excluded.status_code`, statusName: sql`excluded.status_name`, openedDate: sql`excluded.opened_date`, closedDate: sql`excluded.closed_date`,
      localCode: sql`excluded.local_code`, sidoName: sql`excluded.sido_name`, sgguName: sql`excluded.sggu_name`,
      addrRoad: sql`excluded.addr_road`, addrLot: sql`excluded.addr_lot`, zip: sql`excluded.zip`, tel: sql`excluded.tel`,
      lat: sql`excluded.lat`, lng: sql`excluded.lng`,
      details: sql`food_registry.details || excluded.details`,
      lastModifiedAt: sql`excluded.last_modified_at`, syncedAt: sql`excluded.synced_at`, updatedAt: sql`now()`,
    },
  });
  return values.length;
}

export type FoodSyncResult = { pageNo: number; fetched: number; upserted: number; totalCount: number; done: boolean; oldestModified: string | null };

export async function syncFoodPage(pageNo: number): Promise<FoodSyncResult> {
  const { items, totalCount } = await fetchLocaldataPage(ENDPOINT, pageNo);
  const rows = items.map(mapFoodItem).filter((r): r is FoodRow => r !== null);
  const upserted = await upsertFoodRows(rows);
  const oldest = rows.reduce<string | null>((acc, r) => { const t = r.lastModifiedAt ? r.lastModifiedAt.toISOString() : null; return t && (!acc || t < acc) ? t : acc; }, null);
  return { pageNo, fetched: items.length, upserted, totalCount, done: items.length < LOCALDATA_PAGE_SIZE || pageNo * LOCALDATA_PAGE_SIZE >= totalCount, oldestModified: oldest };
}

/** 증분 갱신 — 최근 갱신 순이므로 since 이전 데이터가 나오면 중단 (크론용). */
export async function syncFoodRecent(since: Date, maxPages = 40): Promise<{ pages: number; upserted: number }> {
  let upserted = 0; let page = 1;
  for (; page <= maxPages; page += 1) {
    const r = await syncFoodPage(page);
    upserted += r.upserted;
    if (r.done || (r.oldestModified && new Date(r.oldestModified) < since)) break;
  }
  return { pages: page, upserted };
}
