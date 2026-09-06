export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { DEPT_GROUP_BY_KEY } from '@/lib/hospital-registry/departments';

/**
 * 지도 마커 API — 뷰포트(bbox) 안의 병원(심평원 레지스트리)·뷰티샵(행안부 미용업)을 돌려준다.
 *
 *  GET /api/map/markers?sw=lat,lng&ne=lat,lng&zoom=N
 *      &kinds=hospital,beauty,lodging (기본 병원+뷰티; lodging = 숙박업 레지스트리)
 *      &dept=<과별 그룹키>          (병원)   &cat=<hair|nail|…>   (뷰티)
 *      &foreign=1                  (외국인 진료 가능)   &listed=1 (글로우업 등록만)
 *      &q=검색어
 *
 *  줌이 낮으면(광역) 격자 클러스터(count·중심), 높으면 개별 마커(최대 600).
 *  카카오맵 줌 레벨은 숫자가 작을수록 확대(1=최대 확대). 레벨 6 이상은 클러스터.
 */
type Marker = {
  k: 'h' | 'b' | 'l' | 'f' | 'a'; id: string; key: string; name: string; lat: number; lng: number;
  listed: boolean; foreign?: boolean; type?: string | null; cats?: string[]; slug?: string | null; region?: string | null;
};
type Cluster = { lat: number; lng: number; count: number; listed: number; k: 'h' | 'b' | 'l' | 'f' | 'a' };

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
  const kinds = (p.get('kinds') ?? 'hospital,beauty').split(',');
  const dept = p.get('dept') ?? ''; const cat = p.get('cat') ?? '';
  const foreign = p.get('foreign') === '1'; const listed = p.get('listed') === '1';
  const q = (p.get('q') ?? '').trim().slice(0, 40).replace(/[%_]/g, '');
  const locRaw = p.get('locale') ?? 'kr';
  const loc = ['kr', 'en', 'zh', 'ja', 'ru', 'vi'].includes(locRaw) ? locRaw : 'kr';
  const en = loc !== 'kr';
  const hospName = sql.raw(en ? `coalesce(nullif(hlc.name,''), nullif(r.details->'nameI18n'->>'${loc}',''), r.name)` : 'r.name');
  const hospJoin = sql.raw(en ? `left join hospital_locale_content hlc on hlc.hospital_id = h.id and hlc.locale = '${loc}'` : '');
  const listName = sql.raw(en ? "coalesce(nullif(plc.title,''), r.name)" : 'r.name');
  const listJoin = sql.raw(en ? `left join partner_listing_locale_content plc on plc.listing_id = l.id and plc.locale = '${loc}'` : '');
  const [swLat, swLng] = sw; const [neLat, neLng] = ne;
  // 너무 넓은 영역은 클러스터로만
  // 레벨 5 이상(서울 몇 개 구가 한 화면)부터는 격자 클러스터 — 개별 말풍선은 레벨 1~4
  const cluster = zoom >= 5;
  // 격자 크기(도) — 줌에 따라
  const cell = zoom >= 11 ? 0.5 : zoom >= 9 ? 0.15 : zoom >= 7 ? 0.05 : zoom >= 6 ? 0.02 : 0.008;

  const out: { markers: Marker[]; clusters: Cluster[]; counts: { hospital: number; beauty: number; stays: number; eats: number; attractions: number } } = { markers: [], clusters: [], counts: { hospital: 0, beauty: 0, stays: 0, eats: 0, attractions: 0 } };

  if (kinds.includes('hospital')) {
    const conds: string[] = [
      `lat between ${swLat} and ${neLat}`, `lng between ${swLng} and ${neLng}`,
    ];
    const g = dept ? DEPT_GROUP_BY_KEY[dept] : null;
    if (g) conds.push(`dept_codes && array[${g.codes.map((c) => `'${c}'`).join(',')}]::text[]`);
    if (foreign) conds.push('foreign_licensed');
    if (listed) conds.push(`(contracted_hospital_id is not null or claim_status = 'approved')`);
    const where = sql.raw(conds.join(' and '));
    const kq = '%' + q + '%';
    const i18nU = en ? sql` or details->'nameI18n'->>${loc} ilike ${kq}` : sql``;
    const i18nR = en ? sql` or r.details->'nameI18n'->>${loc} ilike ${kq}` : sql``;
    const qCond = q ? sql` and (name ilike ${kq} or addr ilike ${kq}${i18nU})` : sql``;
    const qCondR = q ? sql` and (r.name ilike ${kq} or r.addr ilike ${kq}${i18nR})` : sql``;
    const [cnt] = (await db.execute(sql`select count(*)::int as n from hospital_registry where ${where}${qCond}`)) as unknown as Array<{ n: number }>;
    out.counts.hospital = cnt?.n ?? 0;
    if (cluster && out.counts.hospital > 300) {
      const rows = (await db.execute(sql`
        select avg(lat)::float as lat, avg(lng)::float as lng, count(*)::int as count,
               count(*) filter (where contracted_hospital_id is not null or claim_status = 'approved')::int as listed
          from hospital_registry where ${where}${qCond}
         group by floor(lat / ${cell}), floor(lng / ${cell})`)) as unknown as Array<{ lat: number; lng: number; count: number; listed: number }>;
      out.clusters.push(...rows.map((r) => ({ ...r, k: 'h' as const })));
    } else {
      const rows = (await db.execute(sql`
        select r.id, r.ykiho as key, ${hospName} as name, r.lat, r.lng, r.cl_name as type, r.foreign_licensed as foreign, r.sggu_name as region,
               (r.contracted_hospital_id is not null or r.claim_status = 'approved') as listed, h.slug
          from hospital_registry r left join hospitals h on h.id = r.contracted_hospital_id ${hospJoin}
         where ${where}${qCondR}
         order by listed desc, r.foreign_licensed desc, r.dr_total desc
         limit 600`)) as unknown as Array<{ id: string; key: string; name: string; lat: number; lng: number; type: string | null; foreign: boolean; region: string | null; listed: boolean; slug: string | null }>;
      out.markers.push(...rows.map((r) => ({ k: 'h' as const, id: r.id, key: r.key, name: r.name, lat: r.lat, lng: r.lng, listed: r.listed, foreign: r.foreign, type: r.type, slug: r.slug, region: r.region })));
    }
  }

  if (kinds.includes('beauty')) {
    const conds: string[] = [`status_code = '01'`, `lat between ${swLat} and ${neLat}`, `lng between ${swLng} and ${neLng}`];
    if (cat && /^[a-z_]+$/.test(cat)) conds.push(`category_keys @> array['${cat}']::text[]`);
    if (listed) conds.push(`(contracted_listing_id is not null or claim_status = 'approved')`);
    const where = sql.raw(conds.join(' and '));
    const qCond = q ? sql` and (name ilike ${'%' + q + '%'} or addr_road ilike ${'%' + q + '%'})` : sql``;
    const [cnt] = (await db.execute(sql`select count(*)::int as n from beauty_registry where ${where}${qCond}`)) as unknown as Array<{ n: number }>;
    out.counts.beauty = cnt?.n ?? 0;
    if (cluster && out.counts.beauty > 300) {
      const rows = (await db.execute(sql`
        select avg(lat)::float as lat, avg(lng)::float as lng, count(*)::int as count,
               count(*) filter (where contracted_listing_id is not null or claim_status = 'approved')::int as listed
          from beauty_registry where ${where}${qCond}
         group by floor(lat / ${cell}), floor(lng / ${cell})`)) as unknown as Array<{ lat: number; lng: number; count: number; listed: number }>;
      out.clusters.push(...rows.map((r) => ({ ...r, k: 'b' as const })));
    } else {
      const rows = (await db.execute(sql`
        select r.id, r.mgt_no as key, ${listName} as name, r.lat, r.lng, r.biz_type as type, r.category_keys as cats, r.sggu_name as region,
               (r.contracted_listing_id is not null or r.claim_status = 'approved') as listed, l.slug
          from beauty_registry r left join partner_listings l on l.id = r.contracted_listing_id ${listJoin}
         where ${where}${qCond}
         order by listed desc, r.chairs desc
         limit 600`)) as unknown as Array<{ id: string; key: string; name: string; lat: number; lng: number; type: string | null; cats: string[]; region: string | null; listed: boolean; slug: string | null }>;
      out.markers.push(...rows.map((r) => ({ k: 'b' as const, id: r.id, key: r.key, name: r.name, lat: r.lat, lng: r.lng, listed: r.listed, type: r.type, cats: r.cats, slug: r.slug, region: r.region })));
    }
  }

  if (kinds.includes('lodging')) {
    const conds: string[] = [`status_code = '01'`, `lat between ${swLat} and ${neLat}`, `lng between ${swLng} and ${neLng}`];
    const scat = p.get('scat') ?? '';
    if (scat && /^[a-z_]+$/.test(scat)) conds.push(`category_keys @> array['${scat}']::text[]`);
    if (listed) conds.push(`(contracted_listing_id is not null or claim_status = 'approved')`);
    const where = sql.raw(conds.join(' and '));
    const qCond = q ? sql` and (name ilike ${'%' + q + '%'} or addr_road ilike ${'%' + q + '%'})` : sql``;
    const [cnt] = (await db.execute(sql`select count(*)::int as n from lodging_registry where ${where}${qCond}`)) as unknown as Array<{ n: number }>;
    out.counts.stays = cnt?.n ?? 0;
    if (cluster && out.counts.stays > 300) {
      const rows = (await db.execute(sql`
        select avg(lat)::float as lat, avg(lng)::float as lng, count(*)::int as count,
               count(*) filter (where contracted_listing_id is not null or claim_status = 'approved')::int as listed
          from lodging_registry where ${where}${qCond}
         group by floor(lat / ${cell}), floor(lng / ${cell})`)) as unknown as Array<{ lat: number; lng: number; count: number; listed: number }>;
      out.clusters.push(...rows.map((r) => ({ ...r, k: 'l' as const })));
    } else {
      const rows = (await db.execute(sql`
        select r.id, r.mgt_no as key, ${listName} as name, r.lat, r.lng, r.biz_type as type, r.category_keys as cats, r.sggu_name as region,
               (r.contracted_listing_id is not null or r.claim_status = 'approved') as listed, l.slug
          from lodging_registry r left join partner_listings l on l.id = r.contracted_listing_id ${listJoin}
         where ${where}${qCond}
         order by listed desc, (r.rooms_ko + r.rooms_we) desc
         limit 600`)) as unknown as Array<{ id: string; key: string; name: string; lat: number; lng: number; type: string | null; cats: string[]; region: string | null; listed: boolean; slug: string | null }>;
      out.markers.push(...rows.map((r) => ({ k: 'l' as const, id: r.id, key: r.key, name: r.name, lat: r.lat, lng: r.lng, listed: r.listed, type: r.type, cats: r.cats, slug: r.slug, region: r.region })));
    }
  }

  if (kinds.includes('food')) {
    const conds: string[] = [`status_code = '01'`, `lat between ${swLat} and ${neLat}`, `lng between ${swLng} and ${neLng}`];
    const fcat = p.get('fcat') ?? '';
    if (fcat && /^[a-z_]+$/.test(fcat)) conds.push(`category_keys @> array['${fcat}']::text[]`);
    if (listed) conds.push(`(contracted_listing_id is not null or claim_status = 'approved')`);
    const where = sql.raw(conds.join(' and '));
    const qCond = q ? sql` and (name ilike ${'%' + q + '%'} or addr_road ilike ${'%' + q + '%'})` : sql``;
    const [cnt] = (await db.execute(sql`select count(*)::int as n from food_registry where ${where}${qCond}`)) as unknown as Array<{ n: number }>;
    out.counts.eats = cnt?.n ?? 0;
    if (cluster && out.counts.eats > 300) {
      const rows = (await db.execute(sql`
        select avg(lat)::float as lat, avg(lng)::float as lng, count(*)::int as count,
               count(*) filter (where contracted_listing_id is not null or claim_status = 'approved')::int as listed
          from food_registry where ${where}${qCond}
         group by floor(lat / ${cell}), floor(lng / ${cell})`)) as unknown as Array<{ lat: number; lng: number; count: number; listed: number }>;
      out.clusters.push(...rows.map((r) => ({ ...r, k: 'f' as const })));
    } else {
      const rows = (await db.execute(sql`
        select r.id, r.mgt_no as key, ${listName} as name, r.lat, r.lng, r.biz_type as type, r.category_keys as cats, r.sggu_name as region,
               (r.contracted_listing_id is not null or r.claim_status = 'approved') as listed, l.slug
          from food_registry r left join partner_listings l on l.id = r.contracted_listing_id ${listJoin}
         where ${where}${qCond}
         order by listed desc, r.name
         limit 600`)) as unknown as Array<{ id: string; key: string; name: string; lat: number; lng: number; type: string | null; cats: string[]; region: string | null; listed: boolean; slug: string | null }>;
      out.markers.push(...rows.map((r) => ({ k: 'f' as const, id: r.id, key: r.key, name: r.name, lat: r.lat, lng: r.lng, listed: r.listed, type: r.type, cats: r.cats, slug: r.slug, region: r.region })));
    }
  }

  if (kinds.includes('attraction')) {
    const conds: string[] = [`lat between ${swLat} and ${neLat}`, `lng between ${swLng} and ${neLng}`];
    const acat = p.get('acat') ?? '';
    if (acat && /^[a-z_]+$/.test(acat)) conds.push(`category_keys @> array['${acat}']::text[]`);
    const where = sql.raw(conds.join(' and '));
    const qCond = q ? sql` and (title ilike ${'%' + q + '%'} or location ilike ${'%' + q + '%'})` : sql``;
    const [cnt] = (await db.execute(sql`select count(*)::int as n from tour_spots where ${where}${qCond}`)) as unknown as Array<{ n: number }>;
    out.counts.attractions = cnt?.n ?? 0;
    // 관광사진은 좌표가 시도 중심(근사)이라 항상 격자 클러스터로 노출
    if (out.counts.attractions > 60) {
      const rows = (await db.execute(sql`
        select avg(lat)::float as lat, avg(lng)::float as lng, count(*)::int as count, 0 as listed
          from tour_spots where ${where}${qCond}
         group by floor(lat / ${cell}), floor(lng / ${cell})`)) as unknown as Array<{ lat: number; lng: number; count: number; listed: number }>;
      out.clusters.push(...rows.map((r) => ({ ...r, k: 'a' as const })));
    } else {
      const rows = (await db.execute(sql`
        select r.id, r.content_id as key, r.title as name, r.lat, r.lng, r.keyword as type, r.category_keys as cats, r.sggu_name as region
          from tour_spots r where ${where}${qCond}
         order by r.modified_time desc nulls last
         limit 400`)) as unknown as Array<{ id: string; key: string; name: string; lat: number; lng: number; type: string | null; cats: string[]; region: string | null }>;
      out.markers.push(...rows.map((r) => ({ k: 'a' as const, id: r.id, key: r.key, name: r.name, lat: r.lat, lng: r.lng, listed: false, type: r.type, cats: r.cats, slug: null, region: r.region })));
    }
  }

  return NextResponse.json(out, { headers: { 'cache-control': 'public, max-age=30, s-maxage=60' } });
}
