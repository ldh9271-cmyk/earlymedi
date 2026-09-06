import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { tourSpots } from '@/drizzle/schema/tour-spots';
import { regionOf, str, type Json } from '@/lib/localdata/client';

/**
 * 한국관광공사 포토코리아(관광사진) — apis.data.go.kr/B551011/PhotoGalleryService1/galleryList1
 *  - 인증키는 data.go.kr 계정 공용(HIRA_SERVICE_KEY).
 *  - 사진 목록(제목·촬영지·키워드·웹 이미지 URL). GPS 좌표는 제공하지 않으므로
 *    촬영지 텍스트 → 시도/시군구 파싱 후 시도 중심 좌표로 지도에 근사 노출.
 */
const BASE = 'https://apis.data.go.kr/B551011/PhotoGalleryService1';
export const TOUR_PAGE_SIZE = 100;

/** 시도(축약형) → 광역 중심 좌표. 관광사진 API 무좌표 → region-level 지도. */
const SIDO_CENTROID: Record<string, { lat: number; lng: number }> = {
  '서울': { lat: 37.5665, lng: 126.9780 }, '부산': { lat: 35.1796, lng: 129.0756 }, '대구': { lat: 35.8714, lng: 128.6014 },
  '인천': { lat: 37.4563, lng: 126.7052 }, '광주': { lat: 35.1595, lng: 126.8526 }, '대전': { lat: 36.3504, lng: 127.3845 },
  '울산': { lat: 35.5384, lng: 129.3114 }, '세종': { lat: 36.4800, lng: 127.2890 }, '경기': { lat: 37.4138, lng: 127.5183 },
  '강원': { lat: 37.8228, lng: 128.1555 }, '충북': { lat: 36.6357, lng: 127.4917 }, '충남': { lat: 36.5184, lng: 126.8000 },
  '전북': { lat: 35.7175, lng: 127.1530 }, '전남': { lat: 34.8161, lng: 126.4630 }, '경북': { lat: 36.4919, lng: 128.8889 },
  '경남': { lat: 35.4606, lng: 128.2132 }, '제주': { lat: 33.4996, lng: 126.5312 },
};

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
  const { sido, sggu } = regionOf(location);
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
      photographer: sql`excluded.photographer`, photoMonth: sql`excluded.photo_month`, lat: sql`excluded.lat`, lng: sql`excluded.lng`,
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
