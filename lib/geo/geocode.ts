import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { CERTIFIED_PLACE_LISTING_CATS } from '@/lib/certified';

/**
 * 주소 → 좌표 (서버). 글로우 인증(플랫폼 직접 등록) 병원·업체가 지도에 나오려면 좌표가 필요하다.
 *
 *  1) KAKAO_REST_API_KEY 가 있으면 카카오 로컬 API (주소 검색 → 키워드 검색). 국내 정확도 최고.
 *  2) 없으면 Nominatim(OSM) 폴백 — 키 불필요, 1초 1건 제한, 도로명주소는 대체로 맞고 상호 검색은 약함.
 *
 *  `geocodeMissingPlatformPlaces` 는 크론에서 돌려 좌표 없는 등록 병원·업체를 조금씩 채운다.
 *  (실패한 것은 details.geoTriedAt 에 기록해 7일 뒤에 다시 시도)
 */
export type GeoHit = { lat: number; lng: number; source: 'kakao_addr' | 'kakao_kw' | 'osm'; matched: string };

/** 도로명/지번 주소에서 층·호·건물명 같은 뒤꼬리를 떼어 지오코더 적중률을 높인다. */
export function simplifyAddress(addr: string): string {
  const a = addr.replace(/\s+/g, ' ').trim();
  const m = a.match(/^(.*?(?:대로|로|길)\s*\d+(?:-\d+)?)/) ?? a.match(/^(.*?(?:동|가|리)\s*\d+(?:-\d+)?)/);
  return m?.[1] ?? a;
}

/** 상호에서 괄호(영문 병기·과명) 제거. */
export function simplifyName(name: string): string {
  return name.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 결과 주소가 원 주소의 시·구와 같은지 (엉뚱한 지역 매칭 방지). */
export function sameDistrict(expected: string, matched: string): boolean {
  // 주의: JS 의 \b 는 한글에 안 걸리므로 공백/끝 lookahead 로 토큰 경계를 잡는다. 시도('서울특별시')는 제외.
  const gu = (expected.match(/[가-힣]+(?:구|군|시)(?=\s|$)/g) ?? []).filter((g) => !/(특별시|광역시|특별자치시|특별자치도)$/.test(g));
  if (gu.length === 0) return true;
  return gu.some((g) => matched.includes(g));
}

const GENERIC_TOKENS = new Set(['서울', '서울특별시', '강남', '강남구', '서초', '서초구', '청담', '청담동', '신사', '신사동', '압구정', '역삼', '역삼동', '삼성동', '논현', '논현동', '명동', '홍대', '성수', '여의도',
  '호텔', '의원', '병원', '한의원', '치과', '클리닉', '헤어', '네일', '뷰티', '스튜디오', '사진관', '메이크업', '반영구', '점', '본점', '지점', '강남점', '청담점', '서초점', '서울점', '앤', '더', '바이', '&']);

/**
 * 키워드(상호) 검색 결과가 정말 그 업체인지 — 상호의 고유 토큰(지역·업종 같은 일반어 제외) 중 하나가
 * 결과 place_name 에 들어 있어야 한다. 예: '강남한방병원' → '치휴한방병원 강남점' 은 거부.
 */
export function nameMatches(name: string, placeName: string): boolean {
  const norm = (s: string): string => s.replace(/\(.*?\)/g, ' ').toLowerCase().replace(/[^가-힣0-9a-z]/g, '');
  const place = norm(placeName);
  // '강남제이에스의원' vs '강남제이에스병원' 처럼 업종 접미사만 다른 경우를 같은 곳으로 보도록 접미사를 뗀 핵심어로 비교
  const core = (t: string): string => { const c = t.replace(/(한의원|한방병원|의원|병원|치과|클리닉|호텔|스튜디오|사진관|본점|지점|점)$/, ''); return c.length >= 2 ? c : t; };
  const tokens = name.replace(/\(.*?\)/g, ' ').toLowerCase().split(/[^가-힣0-9a-z]+/).filter((t) => t.length >= 2 && !GENERIC_TOKENS.has(t)).map(core);
  if (tokens.length === 0) return place.includes(norm(name).slice(0, 2));
  return tokens.some((t) => place.includes(t));
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function kakaoLocal(path: 'address' | 'keyword', query: string, key: string): Promise<GeoHit | null> {
  const res = await fetch(`https://dapi.kakao.com/v2/local/search/${path}.json?size=1&query=${encodeURIComponent(query)}`, {
    headers: { Authorization: `KakaoAK ${key}` }, cache: 'no-store',
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { documents?: Array<{ x: string; y: string; address_name?: string; place_name?: string }> };
  const d = j.documents?.[0];
  if (!d) return null;
  return { lat: Number(d.y), lng: Number(d.x), source: path === 'address' ? 'kakao_addr' : 'kakao_kw', matched: [d.place_name, d.address_name].filter(Boolean).join(' | ') };
}

let lastOsm = 0;
async function osm(query: string): Promise<GeoHit | null> {
  const wait = 1100 - (Date.now() - lastOsm);
  if (wait > 0) await sleep(wait);
  lastOsm = Date.now();
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kr&q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'GlowUpTour/1.0 (+https://www.glowuptour.com)' }, cache: 'no-store',
  });
  if (!res.ok) return null;
  const j = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  const d = j[0];
  if (!d) return null;
  return { lat: Number(d.lat), lng: Number(d.lon), source: 'osm', matched: d.display_name };
}

/** 주소(우선) → 상호(보조) 순으로 좌표를 찾는다. 시·구가 다른 결과는 버린다. */
export async function geocode(addr: string | null | undefined, name?: string | null): Promise<GeoHit | null> {
  const key = process.env.KAKAO_REST_API_KEY?.trim();
  const full = (addr ?? '').trim();
  const simple = full ? simplifyAddress(full) : '';
  const nm = name ? simplifyName(name) : '';
  // 시·구가 다르면 거부. 상호 검색 결과는 상호까지 같아야 채택 (엉뚱한 동명·유사 업체 방지)
  const accept = (h: GeoHit | null, byName = false): GeoHit | null => {
    if (!h) return null;
    if (full && !sameDistrict(full, h.matched)) return null;
    if (byName && !nameMatches(name ?? '', h.matched.split(' | ')[0] ?? '')) return null;
    return h;
  };
  if (key) {
    if (simple && /\d/.test(simple)) { const h = accept(await kakaoLocal('address', simple, key)); if (h) return h; }
    if (nm) { const h = accept(await kakaoLocal('keyword', full ? `${nm} ${full.split(' ').slice(0, 2).join(' ')}` : nm, key), true); if (h) return h; }
    return null;
  }
  if (simple && /\d/.test(simple)) { const h = accept(await osm(simple)); if (h) return h; }
  if (nm) { const h = accept(await osm(full ? `${nm} ${full.split(' ').slice(0, 2).join(' ')}` : nm), true); if (h) return h; }
  return null;
}

/**
 * 좌표 없는 글로우 인증 병원·업체를 조금씩 채운다 (크론용).
 *  - hospitals.latitude/longitude (text) ← address_json.line1 / name
 *  - partner_listings.details.lat/lng  ← address_json.line1 / title (장소 카테고리만)
 */
export async function geocodeMissingPlatformPlaces(limit = 15): Promise<{ hospitals: number; listings: number; failed: number }> {
  const out = { hospitals: 0, listings: 0, failed: 0 };
  // details 가 객체가 아닌 행(과거 시드가 배열/문자열로 넣은 경우)은 `||` 로 키를 못 붙이므로 legacy 로 감싸 객체화
  const DETAILS_OBJ = sql.raw("(case when jsonb_typeof(details) = 'object' then details when details is null then '{}'::jsonb else jsonb_build_object('legacy', details) end)");
  const retryBefore = sql.raw("now() - interval '7 days'");

  const hs = (await db.execute(sql`
    select id, name, address_json->>'line1' as addr
      from hospitals
     where country_code = 'KR' and is_active_for_matching = true
       and (latitude is null or latitude = '' or longitude is null or longitude = '')
       and coalesce((details->>'geoTriedAt')::timestamptz, 'epoch'::timestamptz) < ${retryBefore}
     order by updated_at desc
     limit ${limit}`)) as unknown as Array<{ id: string; name: string; addr: string | null }>;
  for (const h of hs) {
    const hit = await geocode(h.addr, h.name).catch(() => null);
    if (hit) {
      await db.execute(sql`update hospitals set latitude = ${String(hit.lat)}, longitude = ${String(hit.lng)},
        details = ${DETAILS_OBJ} ||${JSON.stringify({ geo: { source: hit.source, matched: hit.matched, at: new Date().toISOString() } })}::jsonb, updated_at = now() where id = ${h.id}`);
      out.hospitals += 1;
    } else {
      await db.execute(sql`update hospitals set details = ${DETAILS_OBJ} ||${JSON.stringify({ geoTriedAt: new Date().toISOString() })}::jsonb where id = ${h.id}`);
      out.failed += 1;
    }
  }

  const cats = sql.raw(CERTIFIED_PLACE_LISTING_CATS.map((c) => `'${c}'`).join(','));
  const ls = (await db.execute(sql`
    select id, title as name, address_json->>'line1' as addr, location_label as loc
      from partner_listings
     where status = 'approved' and category in (${cats})
       and (details->>'lat') is null
       and coalesce((details->>'geoTriedAt')::timestamptz, 'epoch'::timestamptz) < ${retryBefore}
     order by updated_at desc
     limit ${limit}`)) as unknown as Array<{ id: string; name: string; addr: string | null; loc: string | null }>;
  for (const l of ls) {
    const hit = await geocode(l.addr || l.loc, l.name).catch(() => null);
    if (hit) {
      await db.execute(sql`update partner_listings set details = ${DETAILS_OBJ} ||${JSON.stringify({ lat: hit.lat, lng: hit.lng, geoSource: hit.source, geoMatched: hit.matched })}::jsonb, updated_at = now() where id = ${l.id}`);
      out.listings += 1;
    } else {
      await db.execute(sql`update partner_listings set details = ${DETAILS_OBJ} ||${JSON.stringify({ geoTriedAt: new Date().toISOString() })}::jsonb where id = ${l.id}`);
      out.failed += 1;
    }
  }
  return out;
}
