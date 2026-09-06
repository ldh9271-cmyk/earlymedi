import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { tourSpots } from '@/drizzle/schema/tour-spots';
import { str, type Json } from '@/lib/localdata/client';
import { kakaoPlaces } from '@/lib/geo/geocode';

/**
 * 한국관광공사 포토코리아(관광사진) — apis.data.go.kr/B551011/PhotoGalleryService1/galleryList1
 *  - 인증키는 data.go.kr 계정 공용(HIRA_SERVICE_KEY).
 *  - 사진 목록(제목·촬영지·키워드·웹 이미지 URL). GPS 좌표는 제공하지 않으므로
 *    ① 적재 시 촬영지 텍스트 → 시도/시군구 파싱 후 시도 중심 좌표(근사, geo_source null)
 *    ② 이후 geocodeTourSpots 가 카카오 키워드 검색으로 실좌표를 찾아 채운다(geo_source 'kakao_kw', 실패 'centroid').
 */
const BASE = 'https://apis.data.go.kr/B551011/PhotoGalleryService1';
export const TOUR_PAGE_SIZE = 100;

/** 시도(축약형) → 광역 중심 좌표. 실좌표를 못 찾은 사진의 region-level 근사. */
const SIDO_CENTROID: Record<string, { lat: number; lng: number }> = {
  '서울': { lat: 37.5665, lng: 126.9780 }, '부산': { lat: 35.1796, lng: 129.0756 }, '대구': { lat: 35.8714, lng: 128.6014 },
  '인천': { lat: 37.4563, lng: 126.7052 }, '광주': { lat: 35.1595, lng: 126.8526 }, '대전': { lat: 36.3504, lng: 127.3845 },
  '울산': { lat: 35.5384, lng: 129.3114 }, '세종': { lat: 36.4800, lng: 127.2890 }, '경기': { lat: 37.4138, lng: 127.5183 },
  '강원': { lat: 37.8228, lng: 128.1555 }, '충북': { lat: 36.6357, lng: 127.4917 }, '충남': { lat: 36.5184, lng: 126.8000 },
  '전북': { lat: 35.7175, lng: 127.1530 }, '전남': { lat: 34.8161, lng: 126.4630 }, '경북': { lat: 36.4919, lng: 128.8889 },
  '경남': { lat: 35.4606, lng: 128.2132 }, '제주': { lat: 33.4996, lng: 126.5312 },
};

/** 촬영지 원문 첫 토큰 → 시도 축약. 정식명·구어체(강원도·제주도·서울시·부산)·옛 이름을 모두 받는다. */
const SIDO_ALIAS: Record<string, string> = {
  서울특별시: '서울', 서울시: '서울', 서울: '서울', 부산광역시: '부산', 부산시: '부산', 부산: '부산', 대구광역시: '대구', 대구시: '대구', 대구: '대구',
  인천광역시: '인천', 인천시: '인천', 인천: '인천', 광주광역시: '광주', 광주시: '광주', 광주: '광주', 대전광역시: '대전', 대전시: '대전', 대전: '대전',
  울산광역시: '울산', 울산시: '울산', 울산: '울산', 세종특별자치시: '세종', 세종시: '세종', 세종: '세종', 경기도: '경기', 경기: '경기',
  강원특별자치도: '강원', 강원도: '강원', 강원: '강원', 충청북도: '충북', 충북: '충북', 충청남도: '충남', 충남: '충남',
  전북특별자치도: '전북', 전라북도: '전북', 전북: '전북', 전라남도: '전남', 전남: '전남', 경상북도: '경북', 경북: '경북', 경상남도: '경남', 경남: '경남',
  제주특별자치도: '제주', 제주도: '제주', 제주: '제주',
};
/** 2026 통합특별시 — 광역시 자치구면 광역시, 그 외 시군이면 도로 나눈다 (예: 전남광주통합특별시 강진군 → 전남). */
const MERGED: Record<string, { metro: string; province: string; metroDistricts: string[] }> = {
  전남광주통합특별시: { metro: '광주', province: '전남', metroDistricts: ['동구', '서구', '남구', '북구', '광산구'] },
};
/** 시도 없이 시군구만 적힌 촬영지 → 시도. */
const SGGU_TO_SIDO: Record<string, string> = {
  전주시: '전북', 군산시: '전북', 익산시: '전북', 남원시: '전북', 정읍시: '전북', 목포시: '전남', 여수시: '전남', 순천시: '전남', 나주시: '전남', 광양시: '전남',
  보성군: '전남', 강진군: '전남', 고흥군: '전남', 해남군: '전남', 담양군: '전남', 완도군: '전남', 신안군: '전남', 진도군: '전남', 구례군: '전남',
  서천군: '충남', 보령시: '충남', 공주시: '충남', 부여군: '충남', 태안군: '충남', 천안시: '충남', 아산시: '충남', 청주시: '충북', 충주시: '충북', 단양군: '충북',
  경주시: '경북', 안동시: '경북', 포항시: '경북', 영주시: '경북', 문경시: '경북', 울릉군: '경북', 통영시: '경남', 거제시: '경남', 남해군: '경남', 진주시: '경남', 창원시: '경남',
  강릉시: '강원', 속초시: '강원', 춘천시: '강원', 원주시: '강원', 평창군: '강원', 정선군: '강원', 양양군: '강원', 서귀포시: '제주', 제주시: '제주',
  수원시: '경기', 용인시: '경기', 가평군: '경기', 양평군: '경기', 파주시: '경기', 포천시: '경기',
};

/** 관광사진 촬영지 원문 → { 시도 축약, 시군구 }. */
export function tourRegionOf(location: string | null): { sido: string | null; sggu: string | null } {
  if (!location) return { sido: null, sggu: null };
  const parts = location.replace(/[,，·]/g, ' ').split(/\s+/).filter(Boolean).filter((p) => !/^대한민국(\(한국\))?$/.test(p));
  const first = parts[0];
  if (!first) return { sido: null, sggu: null };
  const joinSggu = (i: number): string | null => {
    const a = parts[i]; if (!a) return null;
    const b = parts[i + 1];
    return /시$/.test(a) && b && /(구|군)$/.test(b) ? `${a} ${b}` : a;
  };
  const merged = MERGED[first];
  if (merged) {
    const d = parts[1] ?? '';
    return merged.metroDistricts.includes(d) ? { sido: merged.metro, sggu: d || null } : { sido: merged.province, sggu: joinSggu(1) };
  }
  const alias = SIDO_ALIAS[first];
  if (alias) return { sido: alias, sggu: joinSggu(1) };
  const bySggu = SGGU_TO_SIDO[first];
  if (bySggu) return { sido: bySggu, sggu: joinSggu(0) };
  const g = parts.find((p) => SGGU_TO_SIDO[p]);
  if (g) return { sido: SGGU_TO_SIDO[g] ?? null, sggu: g };
  return { sido: null, sggu: /(시|군|구)$/.test(first) ? first : null };
}

/** 키워드·제목 → 소비자 카테고리. */
export function categorizeTour(keyword: string | null, title: string): string[] {
  const s = `${keyword ?? ''} ${title}`.toLowerCase();
  const keys = new Set<string>();
  if (/산|바다|계곡|폭포|호수|섬|숲|해변|해안|강|들판|하늘|일출|일몰|자연|국립공원|습지|동굴/.test(s)) keys.add('nature');
  if (/해변|해수욕장|바다|항구|포구|등대|해안/.test(s)) keys.add('coast');
  if (/사찰|사원|절|궁|궁궐|문화재|유적|전통|한옥|서원|향교|고택|성곽|왕릉|박물관/.test(s)) keys.add('heritage');
  if (/도심|거리|빌딩|시장|도시|타워|다리|광장/.test(s)) keys.add('city');
  if (/야경|야간|불빛|조명|일루미네이션/.test(s)) keys.add('night');
  if (/축제|테마파크|체험|공원|정원|수목원|놀이/.test(s)) keys.add('theme');
  if (keys.size === 0) keys.add('other');
  return [...keys];
}

function key(): string {
  const raw = (process.env.HIRA_SERVICE_KEY ?? '').trim();
  if (!raw) throw new Error('HIRA_SERVICE_KEY 가 설정되지 않았습니다');
  return raw.includes('%') ? raw : encodeURIComponent(raw);
}

export async function fetchGalleryPage(pageNo: number, numOfRows = TOUR_PAGE_SIZE): Promise<{ items: Json[]; totalCount: number }> {
  const url = `${BASE}/galleryList1?serviceKey=${key()}&numOfRows=${numOfRows}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=GlowUpTour&arrange=A&_type=json`;
  let res: Response | null = null; let lastErr: unknown = null;
  for (let attempt = 0; attempt < 4 && !res; attempt += 1) {
    try { res = await fetch(url, { cache: 'no-store' }); } catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 1500 * (attempt + 1))); }
  }
  if (!res) throw new Error(`TourAPI 연결 실패: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`TourAPI HTTP ${res.status}: ${text.slice(0, 160)}`);
  let json: Json;
  try { json = JSON.parse(text) as Json; } catch { throw new Error(`TourAPI 비JSON: ${text.slice(0, 160)}`); }
  const body = ((json.response as Json | undefined)?.body ?? {}) as Json;
  const wrap = body.items as Json | undefined;
  const it = wrap && typeof wrap === 'object' ? (wrap as Json).item : undefined;
  const items = Array.isArray(it) ? (it as Json[]) : it ? [it as Json] : [];
  return { items, totalCount: Number(body.totalCount ?? 0) || 0 };
}

export type TourRow = typeof tourSpots.$inferInsert;

export function mapGalleryItem(it: Json): TourRow | null {
  const contentId = str(it.galContentId); const title = str(it.galTitle);
  if (!contentId || !title) return null;
  const location = str(it.galPhotographyLocation);
  const { sido, sggu } = tourRegionOf(location);
  const keyword = str(it.galSearchKeyword);
  const centroid = sido ? SIDO_CENTROID[sido] : undefined;
  const img = str(it.galWebImageUrl);
  return {
    contentId, title,
    imageUrl: img, thumbUrl: str(it.galWebThumbnailUrl) ?? img,
    location, sidoName: sido, sgguName: sggu, keyword,
    categoryKeys: categorizeTour(keyword, title),
    photographer: str(it.galPhotographer), photoMonth: str(it.galPhotographyMonth),
    lat: centroid?.lat ?? null, lng: centroid?.lng ?? null,
    createdTime: str(it.galCreatedtime), modifiedTime: str(it.galModifiedtime),
    syncedAt: new Date(),
  };
}

export async function upsertTourRows(rows: TourRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const uniq = new Map<string, TourRow>();
  for (const r of rows) uniq.set(r.contentId, r);
  const values = [...uniq.values()];
  await db.insert(tourSpots).values(values).onConflictDoUpdate({
    target: tourSpots.contentId,
    set: {
      title: sql`excluded.title`, imageUrl: sql`excluded.image_url`, thumbUrl: sql`excluded.thumb_url`, location: sql`excluded.location`,
      sidoName: sql`excluded.sido_name`, sgguName: sql`excluded.sggu_name`, keyword: sql`excluded.keyword`, categoryKeys: sql`excluded.category_keys`,
      photographer: sql`excluded.photographer`, photoMonth: sql`excluded.photo_month`,
      // 카카오로 찾은 실좌표는 재동기화해도 시도 중심값으로 덮지 않는다
      lat: sql`case when tour_spots.geo_source = 'kakao_kw' then tour_spots.lat else excluded.lat end`,
      lng: sql`case when tour_spots.geo_source = 'kakao_kw' then tour_spots.lng else excluded.lng end`,
      createdTime: sql`excluded.created_time`, modifiedTime: sql`excluded.modified_time`, syncedAt: sql`excluded.synced_at`, updatedAt: sql`now()`,
    },
  });
  return values.length;
}

export type TourSyncResult = { pageNo: number; fetched: number; upserted: number; totalCount: number; done: boolean };

export async function syncGalleryPage(pageNo: number): Promise<TourSyncResult> {
  const { items, totalCount } = await fetchGalleryPage(pageNo);
  const rows = items.map(mapGalleryItem).filter((r): r is TourRow => r !== null);
  const upserted = await upsertTourRows(rows);
  return { pageNo, fetched: items.length, upserted, totalCount, done: items.length < TOUR_PAGE_SIZE || pageNo * TOUR_PAGE_SIZE >= totalCount };
}

/** 최신순 앞 N페이지 갱신 (크론용). */
export async function syncGalleryRecent(maxPages = 5): Promise<{ pages: number; upserted: number }> {
  let upserted = 0; let page = 1;
  for (; page <= maxPages; page += 1) {
    const r = await syncGalleryPage(page);
    upserted += r.upserted;
    if (r.done) break;
  }
  return { pages: page, upserted };
}

// ───────────────────────── 실좌표 찾기 (카카오 키워드 검색) ─────────────────────────

/** 사진 제목으로 장소를 찾되, 파싱한 시군구(없으면 시도)가 결과 주소와 맞아야 채택 — 동명 장소 오매칭 방지. */
export async function findTourSpotPlace(title: string, sido: string | null, sggu: string | null): Promise<{ lat: number; lng: number; matched: string } | null> {
  const clean = title.replace(/\(.*?\)/g, ' ').replace(/[「」『』[\]#]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  const sgguCore = sggu ? (sggu.split(' ')[0] ?? '').replace(/(시|군|구)$/, '') : '';
  const okAddr = (addr: string): boolean => (sgguCore ? addr.includes(sgguCore) : sido ? addr.startsWith(sido) : true);
  const queries = [clean, sgguCore ? `${sgguCore} ${clean}` : sido ? `${sido} ${clean}` : ''].filter((q, i, a) => q && a.indexOf(q) === i);
  for (const q of queries) {
    const cands = await kakaoPlaces(q, 5);
    const hit = cands.find((c) => okAddr(c.address));
    if (hit) return { lat: hit.lat, lng: hit.lng, matched: `${hit.name} | ${hit.address}` };
  }
  return null;
}

/**
 * 아직 시도해 보지 않은(geo_source null) 관광사진에 실좌표를 채운다 (크론·백필용).
 * 성공 → geo_source 'kakao_kw', 실패 → 'centroid'(시도 중심 좌표 유지, 지도에서는 클러스터에만 포함).
 */
export async function geocodeTourSpots(limit = 30): Promise<{ geocoded: number; centroid: number }> {
  const out = { geocoded: 0, centroid: 0 };
  if (!process.env.KAKAO_REST_API_KEY?.trim()) return out;
  const rows = (await db.execute(sql`
    select id, title, sido_name, sggu_name from tour_spots
     where geo_source is null
     order by modified_time desc nulls last
     limit ${limit}`)) as unknown as Array<{ id: string; title: string; sido_name: string | null; sggu_name: string | null }>;
  for (const r of rows) {
    const hit = await findTourSpotPlace(r.title, r.sido_name, r.sggu_name).catch(() => null);
    if (hit) {
      await db.execute(sql`update tour_spots set lat = ${hit.lat}, lng = ${hit.lng}, geo_source = 'kakao_kw', geo_matched = ${hit.matched}, updated_at = now() where id = ${r.id}`);
      out.geocoded += 1;
    } else {
      await db.execute(sql`update tour_spots set geo_source = 'centroid', updated_at = now() where id = ${r.id}`);
      out.centroid += 1;
    }
  }
  return out;
}

/** 기존 행의 시도/시군구·중심 좌표를 현재 파싱 규칙으로 다시 계산 (실좌표가 있는 행의 좌표는 유지). */
export async function renormalizeTourRegions(): Promise<number> {
  const rows = (await db.execute(sql`select id, location, sido_name, sggu_name, geo_source from tour_spots`)) as unknown as Array<{ id: string; location: string | null; sido_name: string | null; sggu_name: string | null; geo_source: string | null }>;
  let changed = 0;
  for (const r of rows) {
    const { sido, sggu } = tourRegionOf(r.location);
    if (sido === r.sido_name && sggu === r.sggu_name) continue;
    const c = sido ? SIDO_CENTROID[sido] : undefined;
    if (r.geo_source === 'kakao_kw') await db.execute(sql`update tour_spots set sido_name = ${sido}, sggu_name = ${sggu}, updated_at = now() where id = ${r.id}`);
    else await db.execute(sql`update tour_spots set sido_name = ${sido}, sggu_name = ${sggu}, lat = ${c?.lat ?? null}, lng = ${c?.lng ?? null}, updated_at = now() where id = ${r.id}`);
    changed += 1;
  }
  return changed;
}
