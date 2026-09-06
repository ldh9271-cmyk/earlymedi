import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { and, desc, eq, ilike, isNotNull, or, sql, type SQL } from 'drizzle-orm';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { db } from '@/lib/db/client';
import { tourSpots } from '@/drizzle/schema/tour-spots';
import { TOUR_CATS, TourCard, type TourCardRow } from '../_registry/shared';
import MapView from '../../map/_components/map-view';
import { DEPT_GROUPS } from '@/lib/hospital-registry/departments';
import { SHOP_CATS } from '../../shops/_registry/shared';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;
const CSS =
  '.m-at-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }'
  + '@media (max-width: 1024px) { .m-at-grid { grid-template-columns: repeat(3, 1fr); } }'
  + '@media (max-width: 768px) { .m-at-page { padding: 20px 16px 80px !important; } .m-at-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; } .m-at-title { font-size: 22px !important; } }';

type Search = { q?: string; sido?: string; cat?: string; page?: string };

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  if (!isPublicLocale(params.locale)) return {};
  const dict = await getDictionary(params.locale);
  return { title: `${dict.attractionsPage.title} · GlowUpTour`, description: dict.attractionsPage.subtitle };
}

/** 전국 관광지 찾기 — 한국관광공사 포토코리아(관광사진) 기반. 사진 카드 리스트 + 지역·카테고리 필터. */
export default async function AttractionsListPage({ params, searchParams }: { params: { locale: string }; searchParams: Search }): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) notFound();
  const locale = params.locale as PublicLocale;
  const dict = await getDictionary(locale);
  const t = dict.attractionsPage;
  const tr = dict.clinicsPage.registry;
  const mapDepts = DEPT_GROUPS.map((g) => ({ key: g.key, label: (dict.clinicsPage.depts as Record<string, string>)[g.key] ?? g.ko }));
  const mapCats = SHOP_CATS.map((k) => ({ key: k, label: dict.shopsRegistry.cats[k] }));

  const q = (searchParams.q ?? '').trim().slice(0, 60);
  const sido = (searchParams.sido ?? '').trim();
  const cat = searchParams.cat && (TOUR_CATS as readonly string[]).includes(searchParams.cat) ? searchParams.cat : '';
  const page = Math.max(1, Number(searchParams.page) || 1);

  const conds: SQL[] = [];
  if (q) {
    const like = `%${q.replace(/[%_]/g, '')}%`;
    conds.push(or(ilike(tourSpots.title, like), ilike(tourSpots.location, like), ilike(tourSpots.keyword, like)) as SQL);
  }
  if (sido) conds.push(eq(tourSpots.sidoName, sido));
  if (cat) conds.push(sql`${tourSpots.categoryKeys} @> ${sql.raw(`array['${cat}']::text[]`)}`);
  const where = conds.length ? and(...conds) : undefined;

  let rows: TourCardRow[] = [];
  let total = 0;
  let sidoOptions: string[] = [];
  let error: string | null = null;
  try {
    const [cnt] = await db.select({ n: sql<number>`count(*)::int` }).from(tourSpots).where(where);
    total = cnt?.n ?? 0;
    const found = await db
      .select({
        id: tourSpots.id, contentId: tourSpots.contentId, title: tourSpots.title, imageUrl: tourSpots.imageUrl, thumbUrl: tourSpots.thumbUrl,
        location: tourSpots.location, sidoName: tourSpots.sidoName, sgguName: tourSpots.sgguName, keyword: tourSpots.keyword, categoryKeys: tourSpots.categoryKeys,
      })
      .from(tourSpots)
      .where(where)
      .orderBy(desc(tourSpots.modifiedTime), tourSpots.title)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);
    rows = found as TourCardRow[];
    const sidos = await db.selectDistinct({ s: tourSpots.sidoName }).from(tourSpots).where(isNotNull(tourSpots.sidoName)).orderBy(tourSpots.sidoName);
    sidoOptions = sidos.map((r) => r.s).filter((s): s is string => Boolean(s));
  } catch (err) {
    error = err instanceof Error ? err.message : 'db_error';
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (patch: Partial<Search>): string => {
    const p = new URLSearchParams();
    const merged: Search = { q, sido, cat, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    const s = p.toString();
    return `/${locale}/attractions/all${s ? `?${s}` : ''}`;
  };
  const chip = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', padding: '7px 13px', borderRadius: 9999, fontSize: 13, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
    border: `1px solid ${active ? '#222' : '#dddddd'}`, background: active ? '#222' : '#fff', color: active ? '#fff' : '#222',
  });

  return (
    <section className="m-at-page" style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px 80px' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 className="m-at-title" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>{t.title}</h1>
        <Link href={`/${locale}/map?kinds=attraction`} style={{ fontSize: 13, color: '#c2143c', fontWeight: 700, textDecoration: 'none' }}>🗺️ {t.mapLink}</Link>
      </div>
      <p style={{ fontSize: 14, color: '#6a6a6a', margin: '6px 0 0', lineHeight: 1.6 }}>{t.subtitle}</p>

      {/* 관광지 지도 — 시·도 중심 근사 좌표 기준. 검색창 바로 아래에 바로 노출 */}
      <div style={{ marginTop: 18, border: '1px solid #ebebeb', borderRadius: 16, overflow: 'hidden' }}>
        <MapView
          locale={locale}
          kakaoKey={process.env.NEXT_PUBLIC_KAKAO_MAP_KEY?.trim() || null}
          googleKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY?.trim() || null}
          labels={{ ...dict.mapPage, contractedBadge: tr.listedBadgeBiz, foreignBadge: tr.foreignBadge }}
          depts={mapDepts}
          cats={mapCats}
          initial={{ lat: 36.2, lng: 127.9, level: 12, kinds: 'attraction', dept: '', cat: '', foreign: false, listed: false, q: '' }}
        />
      </div>

      <form action={`/${locale}/attractions/all`} method="get" style={{ display: 'flex', gap: 8, marginTop: 22, flexWrap: 'wrap' }}>
        {cat ? <input type="hidden" name="cat" value={cat} /> : null}
        <input name="q" defaultValue={q} placeholder={t.searchPlaceholder}
          style={{ flex: 1, minWidth: 220, border: '1px solid #dddddd', borderRadius: 999, padding: '11px 16px', fontSize: 14, fontFamily: 'inherit' }} />
        <select name="sido" defaultValue={sido} style={{ border: '1px solid #dddddd', borderRadius: 999, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', background: '#fff' }}>
          <option value="">{tr.region}</option>
          {sidoOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" style={{ background: '#ff385c', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{tr.search}</button>
      </form>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Link href={qs({ cat: '', page: '' })} style={chip(!cat)}>{tr.filterAll}</Link>
        {TOUR_CATS.map((k) => <Link key={k} href={qs({ cat: k, page: '' })} style={chip(cat === k)}>{t.cats[k]}</Link>)}
        <span style={{ fontSize: 13, color: '#6a6a6a', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{tr.results} <b style={{ color: '#222' }}>{total.toLocaleString(locale === 'kr' ? 'ko-KR' : 'en-US')}</b>{tr.countSuffix}</span>
      </div>

      {error ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 16 }}>{error}</p> : null}
      {rows.length === 0 && !error ? (
        <p style={{ fontSize: 14, color: '#6a6a6a', border: '1px dashed #dddddd', borderRadius: 14, padding: 28, marginTop: 20, textAlign: 'center' }}>{t.empty}</p>
      ) : (
        <div className="m-at-grid" style={{ marginTop: 20 }}>
          {rows.map((r) => <TourCard key={r.id} r={r} locale={locale} t={t} />)}
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
