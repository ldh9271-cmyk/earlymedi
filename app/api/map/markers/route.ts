export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { DEPT_GROUP_BY_KEY } from '@/lib/hospital-registry/departments';
import { CERTIFIED_LISTING_CATS, hospitalCatsForDept, type CertifiedListingKind } from '@/lib/certified';

/**
 * 지도 마커 API — 두 층을 합쳐 돌려준다.
 *
 *  ① 글로우 인증(컬러) — 우리 플랫폼에 직접 등록한 병원(hospitals)·업체(partner_listings). 정의는 lib/certified.
 *     좌표(hospitals.latitude/longitude, partner_listings.details.lat/lng, 없으면 연결된 레지스트리 좌표)만 있으면
 *     레지스트리 연결 여부와 무관하게 "항상 개별 마커"로 나온다 (줌이 낮아도 클러스터에 묻히지 않음).
 *  ② 공공정보(흑백) — 심평원·행안부·관광공사 레지스트리. 줌이 낮으면 격자 클러스터.
 *     ①에 연결된 레지스트리 행은 ②에서 뺀다(중복 방지). 레지스트리 claim 승인 행은 ②에서 컬러로.
 *
 *  GET /api/map/markers?sw=lat,lng&ne=lat,lng&zoom=N
 *      &kinds=hospital,beauty,lodging,food,attraction | none   (none = 종류 미선택 → ① 전 종류만)
 *      &dept=<과별 그룹키>(병원) &cat=<뷰티> &scat=<숙박> &fcat=<맛집>
 *      &foreign=1 (외국인 진료)  &listed=1 (글로우 인증만: ② 는 claim 승인 행만)
 *      &q=검색어  &locale=kr|en|zh|ja|ru|vi (상호 현지어)
 *
 *  카카오맵 줌 레벨은 숫자가 작을수록 확대(1=최대 확대). 레벨 5 이상은 ② 클러스터.
 */
type K = 'h' | 'b' | 'l' | 'f' | 'a';
type Marker = {
  k: K; id: string; key: string; name: string; lat: number; lng: number;
  listed: boolean; foreign?: boolean; type?: string | null; cats?: string[]; slug?: string | null; region?: string | null;
};
type Cluster = { lat: number; lng: number; count: number; listed: number; k: K };
type Counts = { hospital: number; beauty: number; stays: number; eats: number; attractions: number };

const LOCALES = ['kr', 'en', 'zh', 'ja', 'ru', 'vi'];
const NUM = "~ '^-?[0-9]+(\\.[0-9]+)?$'";

function parseLatLng(v: string | null): [number, number] | null {
  if (!v) return null;
  const parts = v.split(',');
  const a = Number(parts[0]); const b = Number(parts[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return [a, b];
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const p = req.nextUrl.searchParams;
  const sw = parseLatLng(p.get('sw')); const ne = parseLatLng(p.get('ne'));
  if (!sw || !ne) return NextResponse.json({ error: 'sw,ne required' }, { status: 400 });
  const zoom = Number(p.get('zoom') ?? '4') || 4;
  const kindsRaw = p.get('kinds') ?? 'hospital,beauty';
  const kinds = kindsRaw === 'none' ? [] : kindsRaw.split(',').filter(Boolean);
  // 종류를 하나도 안 골랐으면 = "글로우 인증만 보기" (전 종류)
  const certKinds = kinds.length ? kinds : ['hospital', 'beauty', 'lodging', 'food'];
  const dept = p.get('dept') ?? ''; const cat = p.get('cat') ?? '';
  const scat = p.get('scat') ?? ''; const fcat = p.get('fcat') ?? '';
  const foreign = p.get('foreign') === '1'; const listed = p.get('listed') === '1';
  const q = (p.get('q') ?? '').trim().slice(0, 40).replace(/[%_]/g, '');
  const kq = '%' + q + '%';
  const locRaw = p.get('locale') ?? 'kr';
  const loc = LOCALES.includes(locRaw) ? locRaw : 'kr';
  const en = loc !== 'kr';
  const [swLat, swLng] = sw; const [neLat, neLng] = ne;
  const cluster = zoom >= 5;
  const cell = zoom >= 11 ? 0.5 : zoom >= 9 ? 0.15 : zoom >= 7 ? 0.05 : zoom >= 6 ? 0.02 : 0.008;
  const safeKey = (v: string): boolean => /^[a-z_]+$/.test(v);

  const out: { markers: Marker[]; clusters: Cluster[]; counts: Counts } = { markers: [], clusters: [], counts: { hospital: 0, beauty: 0, stays: 0, eats: 0, attractions: 0 } };

  // ───────────────────────── ① 글로우 인증 (플랫폼 직접 등록) ─────────────────────────
  if (certKinds.includes('hospital')) {
    const lat = sql.raw(`coalesce(case when h.latitude ${NUM} then h.latitude::float end, r.lat)`);
    const lng = sql.raw(`coalesce(case when h.longitude ${NUM} then h.longitude::float end, r.lng)`);
    const name = sql.raw(en ? `coalesce(nullif(hlc.name,''), nullif(r.details->'nameI18n'->>'${loc}',''), h.name)` : 'h.name');
    const join = sql.raw(en ? `left join hospital_locale_content hlc on hlc.hospital_id = h.id and hlc.locale = '${loc}'` : '');
    const conds: SQL[] = [];
    const g = dept ? DEPT_GROUP_BY_KEY[dept] : null;
    if (g) {
      const codes = g.codes.map((c) => `'${c}'`).join(',');
      const hcats = hospitalCatsForDept(dept).map((c) => `'${c}'`).join(',');
      conds.push(sql.raw(` and (r.dept_codes && array[${codes}]::text[]${hcats ? ` or h.primary_categories ?| array[${hcats}]::text[]` : ''})`));
    }
    if (foreign) conds.push(sql.raw(` and (coalesce(r.foreign_licensed, false) or coalesce(h.foreign_patient_license_number, '') <> '')`));
    if (q) conds.push(en
      ? sql` and (h.name ilike ${kq} or h.address_json->>'line1' ilike ${kq} or hlc.name ilike ${kq} or r.details->'nameI18n'->>${loc} ilike ${kq})`
      : sql` and (h.name ilike ${kq} or h.address_json->>'line1' ilike ${kq})`);
    const rows = (await db.execute(sql`
      select h.id, h.slug as key, ${name} as name, ${lat} as lat, ${lng} as lng,
             r.cl_name as type, (coalesce(r.foreign_licensed, false) or coalesce(h.foreign_patient_license_number, '') <> '') as foreign,
             coalesce(r.sggu_name, h.address_json->>'city') as region, h.slug
        from hospitals h
        left join lateral (select r.lat, r.lng, r.cl_name, r.foreign_licensed, r.dept_codes, r.sggu_name, r.details
                             from hospital_registry r where r.contracted_hospital_id = h.id order by r.updated_at desc limit 1) r on true
        ${join}
       where h.country_code = 'KR' and h.is_active_for_matching = true
         and ${lat} between ${swLat} and ${neLat} and ${lng} between ${swLng} and ${neLng}
         ${sql.join(conds, sql``)}
       order by h.sort_order nulls last, h.name
       limit 400`)) as unknown as Array<{ id: string; key: string; name: string; lat: number; lng: number; type: string | null; foreign: boolean; region: string | null; slug: string | null }>;
    out.counts.hospital += rows.length;
    out.markers.push(...rows.map((r) => ({ k: 'h' as const, id: r.id, key: r.key, name: r.name, lat: r.lat, lng: r.lng, listed: true, foreign: r.foreign, type: r.type, slug: r.slug, region: r.region })));
  }

  const certListings = async (kind: CertifiedListingKind, table: string, k: K, sub: string, countKey: keyof Counts): Promise<void> => {
    const cats: readonly string[] = CERTIFIED_LISTING_CATS[kind];
    if (sub && !cats.includes(sub)) return; // 공공정보 세부 카테고리(예: 한식·모텔)는 직접 등록 업체엔 없음
    const lat = sql.raw(`coalesce(case when l.details->>'lat' ${NUM} then (l.details->>'lat')::float end, r.lat)`);
    const lng = sql.raw(`coalesce(case when l.details->>'lng' ${NUM} then (l.details->>'lng')::float end, r.lng)`);
    const name = sql.raw(en ? "coalesce(nullif(plc.title,''), l.title)" : 'l.title');
    const join = sql.raw(en ? `left join partner_listing_locale_content plc on plc.listing_id = l.id and plc.locale = '${loc}'` : '');
    const catList = sql.raw((sub ? [sub] : cats).map((c) => `'${c}'`).join(','));
    const qCond = q
      ? (en ? sql` and (l.title ilike ${kq} or l.location_label ilike ${kq} or l.address_json->>'line1' ilike ${kq} or plc.title ilike ${kq})`
        : sql` and (l.title ilike ${kq} or l.location_label ilike ${kq} or l.address_json->>'line1' ilike ${kq})`)
      : sql``;
    const rows = (await db.execute(sql`
      select l.id, l.slug as key, ${name} as name, ${lat} as lat, ${lng} as lng,
             r.biz_type as type, array[l.category]::text[] as cats,
             coalesce(r.sggu_name, l.address_json->>'city', l.location_label) as region, l.slug
        from partner_listings l
        left join lateral (select r.lat, r.lng, r.biz_type, r.sggu_name from ${sql.raw(table)} r
                             where r.contracted_listing_id = l.id order by r.updated_at desc limit 1) r on true
        ${join}
       where l.status = 'approved' and l.category in (${catList})
         and ${lat} between ${swLat} and ${neLat} and ${lng} between ${swLng} and ${neLng}
         ${qCond}
       order by l.featured desc, l.sort_order nulls last, l.title
       limit 400`)) as unknown as Array<{ id: string; key: string; name: string; lat: number; lng: number; type: string | null; cats: string[]; region: string | null; slug: string | null }>;
    out.counts[countKey] += rows.length;
    out.markers.push(...rows.map((r) => ({ k, id: r.id, key: r.key, name: r.name, lat: r.lat, lng: r.lng, listed: true, type: r.type, cats: r.cats, slug: r.slug, region: r.region })));
  };
  if (certKinds.includes('beauty')) await certListings('beauty', 'beauty_registry', 'b', safeKey(cat) ? cat : '', 'beauty');
  if (certKinds.includes('lodging')) await certListings('lodging', 'lodging_registry', 'l', safeKey(scat) ? scat : '', 'stays');
  if (certKinds.includes('food')) await certListings('food', 'food_registry', 'f', safeKey(fcat) ? fcat : '', 'eats');

  // ───────────────────────── ② 공공정보 레지스트리 ─────────────────────────
  if (kinds.includes('hospital')) {
    // 인증 병원에 연결된 행은 ① 에서 나가므로 제외
    const conds: string[] = [`lat between ${swLat} and ${neLat}`, `lng between ${swLng} and ${neLng}`, 'contracted_hospital_id is null'];
    const g = dept ? DEPT_GROUP_BY_KEY[dept] : null;
    if (g) conds.push(`dept_codes && array[${g.codes.map((c) => `'${c}'`).join(',')}]::text[]`);
    if (foreign) conds.push('foreign_licensed');
    if (listed) conds.push(`claim_status = 'approved'`);
    const where = sql.raw(conds.join(' and '));
    const i18n = en ? sql` or details->'nameI18n'->>${loc} ilike ${kq}` : sql``;
    const qCond = q ? sql` and (name ilike ${kq} or addr ilike ${kq}${i18n})` : sql``;
    const hospName = sql.raw(en ? `coalesce(nullif(details->'nameI18n'->>'${loc}',''), name)` : 'name');
    const [cnt] = (await db.execute(sql`select count(*)::int as n from hospital_registry where ${where}${qCond}`)) as unknown as Array<{ n: number }>;
    out.counts.hospital += cnt?.n ?? 0;
    if (cluster && (cnt?.n ?? 0) > 300) {
      const rows = (await db.execute(sql`
        select avg(lat)::float as lat, avg(lng)::float as lng, count(*)::int as count,
               count(*) filter (where claim_status = 'approved')::int as listed
          from hospital_registry where ${where}${qCond}
         group by floor(lat / ${cell}), floor(lng / ${cell})`)) as unknown as Array<{ lat: number; lng: number; count: number; listed: number }>;
      out.clusters.push(...rows.map((r) => ({ ...r, k: 'h' as const })));
    } else {
      const rows = (await db.execute(sql`
        select id, ykiho as key, ${hospName} as name, lat, lng, cl_name as type, foreign_licensed as foreign, sggu_name as region,
               (claim_status = 'approved') as listed
          from hospital_registry
         where ${where}${qCond}
         order by listed desc, foreign_licensed desc, dr_total desc
         limit 600`)) as unknown as Array<{ id: string; key: string; name: string; lat: number; lng: number; type: string | null; foreign: boolean; region: string | null; listed: boolean }>;
      out.markers.push(...rows.map((r) => ({ k: 'h' as const, id: r.id, key: r.key, name: r.name, lat: r.lat, lng: r.lng, listed: r.listed, foreign: r.foreign, type: r.type, slug: null, region: r.region })));
    }
  }

  const publicListings = async (table: string, k: K, sub: string, countKey: keyof Counts, orderBy: string): Promise<void> => {
    const conds: string[] = [`status_code = '01'`, `lat between ${swLat} and ${neLat}`, `lng between ${swLng} and ${neLng}`, 'contracted_listing_id is null'];
    if (sub && safeKey(sub)) conds.push(`category_keys @> array['${sub}']::text[]`);
    if (listed) conds.push(`claim_status = 'approved'`);
    const where = sql.raw(conds.join(' and '));
    const qCond = q ? sql` and (name ilike ${kq} or addr_road ilike ${kq})` : sql``;
    const t = sql.raw(table);
    const [cnt] = (await db.execute(sql`select count(*)::int as n from ${t} where ${where}${qCond}`)) as unknown as Array<{ n: number }>;
    out.counts[countKey] += cnt?.n ?? 0;
    if (cluster && (cnt?.n ?? 0) > 300) {
      const rows = (await db.execute(sql`
        select avg(lat)::float as lat, avg(lng)::float as lng, count(*)::int as count,
               count(*) filter (where claim_status = 'approved')::int as listed
          from ${t} where ${where}${qCond}
         group by floor(lat / ${cell}), floor(lng / ${cell})`)) as unknown as Array<{ lat: number; lng: number; count: number; listed: number }>;
      out.clusters.push(...rows.map((r) => ({ ...r, k })));
    } else {
      const rows = (await db.execute(sql`
        select id, mgt_no as key, name, lat, lng, biz_type as type, category_keys as cats, sggu_name as region,
               (claim_status = 'approved') as listed
          from ${t}
         where ${where}${qCond}
         order by listed desc, ${sql.raw(orderBy)}
         limit 600`)) as unknown as Array<{ id: string; key: string; name: string; lat: number; lng: number; type: string | null; cats: string[]; region: string | null; listed: boolean }>;
      out.markers.push(...rows.map((r) => ({ k, id: r.id, key: r.key, name: r.name, lat: r.lat, lng: r.lng, listed: r.listed, type: r.type, cats: r.cats, slug: null, region: r.region })));
    }
  };
  if (kinds.includes('beauty')) await publicListings('beauty_registry', 'b', cat, 'beauty', 'chairs desc');
  if (kinds.includes('lodging')) await publicListings('lodging_registry', 'l', scat, 'stays', '(rooms_ko + rooms_we) desc');
  if (kinds.includes('food')) await publicListings('food_registry', 'f', fcat, 'eats', 'name');

  if (kinds.includes('attraction')) {
    const conds: string[] = [`lat between ${swLat} and ${neLat}`, `lng between ${swLng} and ${neLng}`];
    const acat = p.get('acat') ?? '';
    if (acat && safeKey(acat)) conds.push(`category_keys @> array['${acat}']::text[]`);
    const where = sql.raw(conds.join(' and '));
    const qCond = q ? sql` and (title ilike ${kq} or location ilike ${kq})` : sql``;
    const [cnt] = (await db.execute(sql`select count(*)::int as n from tour_spots where ${where}${qCond}`)) as unknown as Array<{ n: number }>;
    const all = cnt?.n ?? 0;
    // 광역 줌: 격자 클러스터(시도 중심 근사 좌표 사진도 포함해 지역별 수를 보여줌).
    // 확대 줌: 카카오로 실좌표를 찾은 사진만 개별 마커 — 근사 좌표 사진이 시청 앞에 몰려 찍히는 가짜 핀 방지.
    if (cluster && all > 60) {
      out.counts.attractions = all;
      const rows = (await db.execute(sql`
        select avg(lat)::float as lat, avg(lng)::float as lng, count(*)::int as count, 0 as listed
          from tour_spots where ${where}${qCond}
         group by floor(lat / ${cell}), floor(lng / ${cell})`)) as unknown as Array<{ lat: number; lng: number; count: number; listed: number }>;
      out.clusters.push(...rows.map((r) => ({ ...r, k: 'a' as const })));
    } else {
      const rows = (await db.execute(sql`
        select r.id, r.content_id as key, coalesce(r.i18n->${loc}->>'title', r.title) as name, r.lat, r.lng, r.keyword as type, r.category_keys as cats,
               concat_ws(' ', r.sido_name, r.sggu_name) as region
          from tour_spots r where ${where}${qCond} and r.geo_source = 'kakao_kw'
         order by r.modified_time desc nulls last
         limit 400`)) as unknown as Array<{ id: string; key: string; name: string; lat: number; lng: number; type: string | null; cats: string[]; region: string | null }>;
      out.counts.attractions = rows.length;
      out.markers.push(...rows.map((r) => ({ k: 'a' as const, id: r.id, key: r.key, name: r.name, lat: r.lat, lng: r.lng, listed: false, type: r.type, cats: r.cats, slug: null, region: r.region })));
    }
  }

  return NextResponse.json(out, { headers: { 'cache-control': 'public, max-age=30, s-maxage=60' } });
}
