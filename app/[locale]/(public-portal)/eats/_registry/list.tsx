import Link from 'next/link';
import { and, desc, eq, ilike, isNotNull, or, sql, type SQL } from 'drizzle-orm';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import { db } from '@/lib/db/client';
import { foodRegistry } from '@/drizzle/schema/food-registry';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { CERTIFIED_LISTING_CATS, sidoMatches } from '@/lib/certified';
import { EAT_CATS, EatCard, type EatCardRow } from './shared';

export type EatsSearch = { q?: string; sido?: string; cat?: string; listed?: string; page?: string };

const PAGE_SIZE = 24;
const CSS =
  '.m-ea-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }'
  + '@media (max-width: 1024px) { .m-ea-grid { grid-template-columns: repeat(3, 1fr); } }'
  + '@media (max-width: 768px) { .m-ea-page { padding: 20px 16px 80px !important; } .m-ea-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; } .m-ea-title { font-size: 22px !important; } }';

/**
 * 전국 맛집 찾기 목록 — 검색·지역·세부 카테고리 칩·글로우 인증 토글·카드·페이지네이션.
 * /eats/all 과 메인메뉴 맛집 카테고리(/glowup/pc/c/food)가 함께 쓴다 (전국 병원 찾기와 같은 형태).
 *
 *  컬러 = 글로우 인증(플랫폼 직접 등록 찐맛집, 정의 lib/certified) — 레지스트리 연결 여부와 무관하게 먼저 노출.
 *  흑백 = 공공정보(행안부 일반음식점 레지스트리, 영업 중만).
 *
 *  basePath   링크·검색 폼의 기준 경로
 *  defaultCat 진입 시 기본 세부 카테고리 ('' = 전체; 값이 있으면 '전체' 칩은 ?cat=all)
 *  heading    제목·부제(전국 맛집 찾기)를 이 컴포넌트가 그릴지 (카테고리 페이지는 자체 히어로가 있어 false)
 */
export async function EatsRegistryList({ locale, dict, searchParams, basePath, defaultCat = '', heading = true }: {
  locale: PublicLocale; dict: Dictionary; searchParams: EatsSearch; basePath: string; defaultCat?: string; heading?: boolean;
}): Promise<JSX.Element> {
  const t = dict.eatsRegistry;
  const tr = dict.clinicsPage.registry; // 공통 라벨(검색·지역·결과·이전/다음 등) 재사용

  const q = (searchParams.q ?? '').trim().slice(0, 60);
  const sido = (searchParams.sido ?? '').trim();
  const rawCat = searchParams.cat;
  const cat = rawCat == null ? defaultCat : (EAT_CATS as readonly string[]).includes(rawCat) ? rawCat : '';
  const listed = searchParams.listed === '1';
  const page = Math.max(1, Number(searchParams.page) || 1);

  const conds: SQL[] = [eq(foodRegistry.statusCode, '01')];
  if (q) {
    const like = `%${q.replace(/[%_]/g, '')}%`;
    conds.push(or(ilike(foodRegistry.name, like), ilike(foodRegistry.addrRoad, like), ilike(foodRegistry.addrLot, like)) as SQL);
  }
  if (sido) conds.push(eq(foodRegistry.sidoName, sido));
  if (cat) conds.push(sql`${foodRegistry.categoryKeys} @> ${sql.raw(`array['${cat}']::text[]`)}`);
  if (listed) conds.push(or(isNotNull(foodRegistry.contractedListingId), eq(foodRegistry.claimStatus, 'approved')) as SQL);
  const where = and(...conds);

  let rows: EatCardRow[] = [];
  let total = 0;
  let sidoOptions: string[] = [];
  let error: string | null = null;
  try {
    const [cnt] = await db.select({ n: sql<number>`count(*)::int` }).from(foodRegistry).where(where);
    total = cnt?.n ?? 0;
    const listedRank = sql`case when ${foodRegistry.contractedListingId} is not null or ${foodRegistry.claimStatus} = 'approved' then 0 else 1 end`;
    const found = await db
      .select({
        id: foodRegistry.id, mgtNo: foodRegistry.mgtNo, name: foodRegistry.name, bizType: foodRegistry.bizType, categoryKeys: foodRegistry.categoryKeys,
        sidoName: foodRegistry.sidoName, sgguName: foodRegistry.sgguName, addrRoad: foodRegistry.addrRoad, addrLot: foodRegistry.addrLot,
        statusCode: foodRegistry.statusCode, contractedListingId: foodRegistry.contractedListingId, claimStatus: foodRegistry.claimStatus, details: foodRegistry.details,
        partnerSlug: partnerListings.slug, partnerCover: partnerListings.coverImageUrl,
      })
      .from(foodRegistry)
      .leftJoin(partnerListings, eq(partnerListings.id, foodRegistry.contractedListingId))
      .where(where)
      .orderBy(listedRank, desc(foodRegistry.openedDate), foodRegistry.name)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);
    rows = found as EatCardRow[];
    // 첫 페이지(세부 카테고리 없을 때): 글로우 인증(플랫폼 직접 등록) 찐맛집 중 음식점 레지스트리에 아직 연결 안 된 것도 컬러 카드로 (정의 lib/certified)
    if (page === 1 && !cat) {
      const plist = await db
        .select({ id: partnerListings.id, title: partnerListings.title, slug: partnerListings.slug, cover: partnerListings.coverImageUrl, category: partnerListings.category, addressJson: partnerListings.addressJson, locationLabel: partnerListings.locationLabel })
        .from(partnerListings)
        .where(sql`${partnerListings.status} = 'approved' and ${partnerListings.category} in (${sql.raw(CERTIFIED_LISTING_CATS.food.map((c) => `'${c}'`).join(','))}) and not exists (select 1 from food_registry r where r.contracted_listing_id = ${partnerListings.id})`)
        .limit(100);
      const like = q.toLowerCase();
      const extras: EatCardRow[] = plist
        .filter((l) => sidoMatches(sido, l.addressJson) || (!!sido && (l.locationLabel ?? '').includes(sido.slice(0, 2))))
        .filter((l) => !like || l.title.toLowerCase().includes(like))
        .map((l) => ({
          id: `plist:${l.id}`, mgtNo: l.slug, name: l.title, bizType: null, categoryKeys: [],
          sidoName: (l.addressJson as { city?: string } | null)?.city ?? null, sgguName: l.locationLabel, addrRoad: (l.addressJson as { line1?: string } | null)?.line1 ?? null, addrLot: null,
          statusCode: '01', contractedListingId: l.id, claimStatus: 'approved', details: null,
          partnerSlug: l.slug, partnerCover: l.cover,
        }));
      if (extras.length) { rows = [...extras, ...rows]; total += extras.length; }
    }
    const sidos = await db.selectDistinct({ s: foodRegistry.sidoName }).from(foodRegistry).where(isNotNull(foodRegistry.sidoName)).orderBy(foodRegistry.sidoName);
    sidoOptions = sidos.map((r) => r.s).filter((s): s is string => Boolean(s));
  } catch (err) {
    error = err instanceof Error ? err.message : 'db_error';
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (patch: Partial<EatsSearch>): string => {
    const p = new URLSearchParams();
    const merged: EatsSearch = { q, sido, cat, listed: listed ? '1' : '', ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    const s = p.toString();
    return `${basePath}${s ? `?${s}` : ''}`;
  };
  const allCatHref = qs({ cat: defaultCat ? 'all' : '', page: '' });
  const chip = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', padding: '7px 13px', borderRadius: 9999, fontSize: 13, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
    border: `1px solid ${active ? '#222' : '#dddddd'}`, background: active ? '#222' : '#fff', color: active ? '#fff' : '#222',
  });

  const body = (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {heading ? (
        <>
          <h1 className="m-ea-title" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>{t.title}</h1>
          <p style={{ fontSize: 14, color: '#6a6a6a', margin: '6px 0 0', lineHeight: 1.6 }}>{t.subtitle}</p>
        </>
      ) : null}

      <form action={basePath} method="get" style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
        <input type="hidden" name="cat" value={cat || (defaultCat ? 'all' : '')} />
        {listed ? <input type="hidden" name="listed" value="1" /> : null}
        <input name="q" defaultValue={q} placeholder={t.searchPlaceholder}
          style={{ flex: 1, minWidth: 220, border: '1px solid #dddddd', borderRadius: 999, padding: '11px 16px', fontSize: 14, fontFamily: 'inherit' }} />
        <select name="sido" defaultValue={sido} style={{ border: '1px solid #dddddd', borderRadius: 999, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', background: '#fff' }}>
          <option value="">{tr.region}</option>
          {sidoOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" style={{ background: '#ff385c', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{tr.search}</button>
      </form>

      {/* 세부 카테고리 칩 — 가로 스크롤이면 잘려 보이므로 줄바꿈으로 전부 노출 (전국 병원 찾기와 같은 형태) */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Link href={allCatHref} style={chip(!cat)}>{tr.filterAll}</Link>
        {EAT_CATS.map((k) => <Link key={k} href={qs({ cat: k, page: '' })} style={chip(cat === k)}>{t.cats[k]}</Link>)}
        <Link href={qs({ listed: listed ? '' : '1', page: '' })} style={{ ...chip(listed), marginLeft: 8 }}>{tr.filterContracted}</Link>
        <span style={{ fontSize: 13, color: '#6a6a6a', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{tr.results} <b style={{ color: '#222' }}>{total.toLocaleString(locale === 'kr' ? 'ko-KR' : 'en-US')}</b>{tr.countSuffix}</span>
      </div>

      {error ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 16 }}>{error}</p> : null}
      {rows.length === 0 && !error ? (
        <p style={{ fontSize: 14, color: '#6a6a6a', border: '1px dashed #dddddd', borderRadius: 14, padding: 28, marginTop: 20, textAlign: 'center' }}>{tr.noResultsBiz}</p>
      ) : (
        <div className="m-ea-grid" style={{ marginTop: 20 }}>
          {rows.map((r) => <EatCard key={r.id} r={r} locale={locale} t={t} listedLabel={tr.listedBadgeBiz} publicLabel={tr.publicBadge} />)}
        </div>
      )}

      {pages > 1 ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 28, alignItems: 'center', fontSize: 13 }}>
          {page > 1 ? <Link href={qs({ page: String(page - 1) })} style={chip(false)}>← {tr.prev}</Link> : null}
          <span style={{ color: '#6a6a6a' }}>{page} / {pages}</span>
          {page < pages ? <Link href={qs({ page: String(page + 1) })} style={chip(false)}>{tr.next} →</Link> : null}
        </div>
      ) : null}

      <p style={{ fontSize: 11, color: '#9c9c9c', marginTop: 28, lineHeight: 1.6 }}>{t.dataSource}<br />{t.keywordNote}</p>
    </>
  );

  return heading
    ? <section className="m-ea-page" style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px 80px' }}>{body}</section>
    : <div>{body}</div>;
}
