import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { and, desc, eq, ilike, isNotNull, or, sql, type SQL } from 'drizzle-orm';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { db } from '@/lib/db/client';
import { beautyRegistry } from '@/drizzle/schema/beauty-registry';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { SHOP_CATS, ShopCard, type ShopCardRow } from '../_registry/shared';
import { CERTIFIED_LISTING_CATS, sidoMatches } from '@/lib/certified';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;
const CSS =
  '.m-sh-hscroll::-webkit-scrollbar { display: none; }'
  + '.m-sh-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }'
  + '@media (max-width: 1024px) { .m-sh-grid { grid-template-columns: repeat(3, 1fr); } }'
  + '@media (max-width: 768px) { .m-sh-page { padding: 20px 16px 80px !important; } .m-sh-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; } .m-sh-title { font-size: 22px !important; } }';

type Search = { q?: string; sido?: string; cat?: string; listed?: string; page?: string };

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  if (!isPublicLocale(params.locale)) return {};
  const dict = await getDictionary(params.locale);
  return { title: `${dict.shopsRegistry.title} · GlowUpTour`, description: dict.shopsRegistry.subtitle };
}

/**
 * 전국 뷰티샵 찾기 — 행안부 미용업 레지스트리 전체 (영업 중만).
 * 컬러 = 글로우업 등록(계약 연결/직접 등록 승인), 흑백 = 공공정보만.
 */
export default async function ShopsListPage({ params, searchParams }: { params: { locale: string }; searchParams: Search }): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) notFound();
  const locale = params.locale as PublicLocale;
  const dict = await getDictionary(locale);
  const t = dict.shopsRegistry;
  const tr = dict.clinicsPage.registry; // 공통 라벨(검색·지역·결과·이전/다음 등) 재사용

  const q = (searchParams.q ?? '').trim().slice(0, 60);
  const sido = (searchParams.sido ?? '').trim();
  const cat = searchParams.cat && (SHOP_CATS as readonly string[]).includes(searchParams.cat) ? searchParams.cat : '';
  const listed = searchParams.listed === '1';
  const page = Math.max(1, Number(searchParams.page) || 1);

  const conds: SQL[] = [eq(beautyRegistry.statusCode, '01')];
  if (q) {
    const like = `%${q.replace(/[%_]/g, '')}%`;
    conds.push(or(ilike(beautyRegistry.name, like), ilike(beautyRegistry.addrRoad, like), ilike(beautyRegistry.addrLot, like)) as SQL);
  }
  if (sido) conds.push(eq(beautyRegistry.sidoName, sido));
  if (cat) conds.push(sql`${beautyRegistry.categoryKeys} @> ${sql.raw(`array['${cat}']::text[]`)}`);
  if (listed) conds.push(or(isNotNull(beautyRegistry.contractedListingId), eq(beautyRegistry.claimStatus, 'approved')) as SQL);
  const where = and(...conds);

  let rows: ShopCardRow[] = [];
  let total = 0;
  let sidoOptions: string[] = [];
  let error: string | null = null;
  try {
    const [cnt] = await db.select({ n: sql<number>`count(*)::int` }).from(beautyRegistry).where(where);
    total = cnt?.n ?? 0;
    const listedRank = sql`case when ${beautyRegistry.contractedListingId} is not null or ${beautyRegistry.claimStatus} = 'approved' then 0 else 1 end`;
    const found = await db
      .select({
        id: beautyRegistry.id, mgtNo: beautyRegistry.mgtNo, name: beautyRegistry.name, bizType: beautyRegistry.bizType, categoryKeys: beautyRegistry.categoryKeys,
        sidoName: beautyRegistry.sidoName, sgguName: beautyRegistry.sgguName, addrRoad: beautyRegistry.addrRoad, addrLot: beautyRegistry.addrLot,
        statusCode: beautyRegistry.statusCode, chairs: beautyRegistry.chairs, beds: beautyRegistry.beds,
        contractedListingId: beautyRegistry.contractedListingId, claimStatus: beautyRegistry.claimStatus, details: beautyRegistry.details,
        partnerSlug: partnerListings.slug, partnerCover: partnerListings.coverImageUrl,
      })
      .from(beautyRegistry)
      .leftJoin(partnerListings, eq(partnerListings.id, beautyRegistry.contractedListingId))
      .where(where)
      .orderBy(listedRank, desc(beautyRegistry.chairs), desc(beautyRegistry.openedDate), beautyRegistry.name)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);
    rows = found as ShopCardRow[];
    // 첫 페이지: 글로우 인증(플랫폼 직접 등록) 뷰티샵 중 아직 미용업 레지스트리에 연결 안 된 것도
    // 컬러 카드로 함께 노출 (글로우 인증 필터에서도 보이도록). 카테고리 정의는 lib/certified.
    if (page === 1) {
      const BEAUTY_PLIST_CATS: readonly string[] = CERTIFIED_LISTING_CATS.beauty;
      const catsToInclude = cat ? (BEAUTY_PLIST_CATS.includes(cat) ? [cat] : []) : [...BEAUTY_PLIST_CATS];
      if (catsToInclude.length > 0) {
        const plist = await db
          .select({ id: partnerListings.id, title: partnerListings.title, slug: partnerListings.slug, cover: partnerListings.coverImageUrl, category: partnerListings.category, addressJson: partnerListings.addressJson })
          .from(partnerListings)
          .where(sql`${partnerListings.status} = 'approved' and ${partnerListings.category} in (${sql.raw(BEAUTY_PLIST_CATS.map((c) => `'${c}'`).join(','))}) and not exists (select 1 from beauty_registry b where b.contracted_listing_id = ${partnerListings.id})`)
          .limit(200);
        const extras: ShopCardRow[] = plist
          .filter((l) => catsToInclude.includes(l.category as string))
          .filter((l) => sidoMatches(sido, l.addressJson))
          .map((l) => ({
            id: `plist:${l.id}`, mgtNo: l.slug, name: l.title, bizType: null, categoryKeys: [l.category as string],
            sidoName: ((l.addressJson as { city?: string } | null)?.city ?? null), sgguName: null, addrRoad: null, addrLot: null,
            statusCode: '01', chairs: 0, beds: 0, contractedListingId: l.id, claimStatus: 'approved', details: null,
            partnerSlug: l.slug, partnerCover: l.cover,
          }));
        if (extras.length) { rows = [...extras, ...rows]; total += extras.length; }
      }
    }
    const sidos = await db.selectDistinct({ s: beautyRegistry.sidoName }).from(beautyRegistry).where(isNotNull(beautyRegistry.sidoName)).orderBy(beautyRegistry.sidoName);
    sidoOptions = sidos.map((r) => r.s).filter((s): s is string => Boolean(s));
  } catch (err) {
    error = err instanceof Error ? err.message : 'db_error';
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (patch: Partial<Search>): string => {
    const p = new URLSearchParams();
    const merged: Search = { q, sido, cat, listed: listed ? '1' : '', ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    const s = p.toString();
    return `/${locale}/shops/all${s ? `?${s}` : ''}`;
  };
  const chip = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', padding: '7px 13px', borderRadius: 9999, fontSize: 13, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
    border: `1px solid ${active ? '#222' : '#dddddd'}`, background: active ? '#222' : '#fff', color: active ? '#fff' : '#222',
  });

  return (
    <section className="m-sh-page" style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px 80px' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h1 className="m-sh-title" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>{t.title}</h1>
      <p style={{ fontSize: 14, color: '#6a6a6a', margin: '6px 0 0', lineHeight: 1.6 }}>{t.subtitle}</p>

      <form action={`/${locale}/shops/all`} method="get" style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
        {cat ? <input type="hidden" name="cat" value={cat} /> : null}
        {listed ? <input type="hidden" name="listed" value="1" /> : null}
        <input name="q" defaultValue={q} placeholder={t.searchPlaceholder}
          style={{ flex: 1, minWidth: 220, border: '1px solid #dddddd', borderRadius: 999, padding: '11px 16px', fontSize: 14, fontFamily: 'inherit' }} />
        <select name="sido" defaultValue={sido} style={{ border: '1px solid #dddddd', borderRadius: 999, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', background: '#fff' }}>
          <option value="">{tr.region}</option>
          {sidoOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" style={{ background: '#ff385c', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{tr.search}</button>
      </form>

      <div className="m-sh-hscroll" style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', alignItems: 'center' }}>
        <Link href={qs({ cat: '', page: '' })} style={chip(!cat)}>{tr.filterAll}</Link>
        {SHOP_CATS.map((k) => <Link key={k} href={qs({ cat: k, page: '' })} style={chip(cat === k)}>{t.cats[k]}</Link>)}
        <Link href={qs({ listed: listed ? '' : '1', page: '' })} style={{ ...chip(listed), marginLeft: 8 }}>{tr.filterContracted}</Link>
        <span style={{ fontSize: 13, color: '#6a6a6a', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{tr.results} <b style={{ color: '#222' }}>{total.toLocaleString(locale === 'kr' ? 'ko-KR' : 'en-US')}</b>{tr.countSuffix}</span>
      </div>

      {error ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 16 }}>{error}</p> : null}
      {rows.length === 0 && !error ? (
        <p style={{ fontSize: 14, color: '#6a6a6a', border: '1px dashed #dddddd', borderRadius: 14, padding: 28, marginTop: 20, textAlign: 'center' }}>{tr.noResultsBiz}</p>
      ) : (
        <div className="m-sh-grid" style={{ marginTop: 20 }}>
          {rows.map((r) => <ShopCard key={r.id} r={r} locale={locale} t={t} listedLabel={tr.listedBadgeBiz} publicLabel={tr.publicBadge} />)}
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
    </section>
  );
}
