import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { db } from '@/lib/db/client';
import { tourSpots } from '@/drizzle/schema/tour-spots';
import { tourCatLabels, TourCard, type TourCardRow } from '../_registry/shared';

export const dynamic = 'force-dynamic';

async function load(contentId: string) {
  const [row] = await db.select().from(tourSpots).where(eq(tourSpots.contentId, contentId)).limit(1);
  return row ?? null;
}

export async function generateMetadata({ params }: { params: { locale: string; contentId: string } }): Promise<Metadata> {
  if (!isPublicLocale(params.locale)) return {};
  const row = await load(decodeURIComponent(params.contentId)).catch(() => null);
  if (!row) return {};
  const title = localizedTitle(row, params.locale);
  return { title: `${title} · GlowUpTour`, description: [row.location, row.keyword].filter(Boolean).join(' · '), openGraph: row.imageUrl ? { images: [row.imageUrl] } : undefined };
}

/** 관광공사 영·일·중 TourAPI 매칭 제목(i18n) 우선, 없으면 한국어 제목. */
function localizedTitle(row: { title: string; i18n: Record<string, { title?: string }> }, locale: string): string {
  return row.i18n?.[locale]?.title?.trim() || row.title;
}

/** 관광지(관광사진) 상세 — 큰 사진 + 촬영지·키워드·촬영자 + 같은 지역 사진 + 지도로 보기. */
export default async function AttractionDetailPage({ params }: { params: { locale: string; contentId: string } }): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) notFound();
  const locale = params.locale as PublicLocale;
  const dict = await getDictionary(locale);
  const t = dict.attractionsPage;
  const tr = dict.clinicsPage.registry;
  const row = await load(decodeURIComponent(params.contentId)).catch(() => null);
  if (!row) notFound();
  const title = localizedTitle(row, locale);

  const labels = tourCatLabels(row.categoryKeys, t);
  const keywords = (row.keyword ?? '').split(',').map((k) => k.trim()).filter(Boolean).slice(0, 12);
  const nearby = row.sidoName
    ? ((await db
        .select({
          id: tourSpots.id, contentId: tourSpots.contentId, title: sql<string>`coalesce(${tourSpots.i18n}->${locale}->>'title', ${tourSpots.title})`, imageUrl: tourSpots.imageUrl, thumbUrl: tourSpots.thumbUrl,
          location: tourSpots.location, sidoName: tourSpots.sidoName, sgguName: tourSpots.sgguName, keyword: tourSpots.keyword, categoryKeys: tourSpots.categoryKeys,
        })
        .from(tourSpots)
        .where(and(eq(tourSpots.sidoName, row.sidoName), ne(tourSpots.id, row.id)))
        .orderBy(desc(tourSpots.modifiedTime))
        .limit(8)
        .catch(() => [])) as TourCardRow[])
    : [];

  const mapHref = `/${locale}/map?kinds=attraction${row.sidoName ? '' : ''}`;
  const searchLoc = encodeURIComponent(`${row.title} ${row.location ?? ''}`); // 지도 검색은 한국어 원제목(카카오맵)

  return (
    <section style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 40px 80px' }}>
      <style dangerouslySetInnerHTML={{ __html: '@media (max-width:1024px){ .m-atd-grid{grid-template-columns:repeat(3,1fr) !important} } @media (max-width:768px){ .m-atd-page{padding:16px 16px 80px !important} .m-atd-grid{grid-template-columns:repeat(2,1fr) !important;gap:10px !important} }' }} />
      <Link href={`/${locale}/attractions/all`} style={{ fontSize: 12, color: '#6a6a6a' }}>← {t.title}</Link>

      {row.imageUrl ? (
        <img src={row.imageUrl} alt={title} style={{ width: '100%', maxHeight: 560, objectFit: 'cover', borderRadius: 16, marginTop: 10, background: '#f2f2f2' }} loading="eager" />
      ) : null}

      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {labels.map((l) => <span key={l} style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '2px 8px' }}>{l}</span>)}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: '8px 0 0' }}>{title}</h1>
        {title !== row.title ? <p style={{ fontSize: 13, color: '#9c9c9c', margin: '4px 0 0' }}>{row.title}</p> : null}
        <p style={{ fontSize: 14, color: '#6a6a6a', margin: '6px 0 0' }}>
          {[row.location, row.photoMonth ? `${t.photoMonth} ${row.photoMonth}` : null, row.photographer ? `ⓒ ${row.photographer}` : null].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <a href={`https://www.google.com/maps/search/?api=1&query=${searchLoc}`} target="_blank" rel="noreferrer"
          style={{ border: '1px solid #dddddd', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#222', textDecoration: 'none' }}>📍 {tr.mapBtn}</a>
        <Link href={mapHref} style={{ border: '1px solid #dddddd', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#222', textDecoration: 'none' }}>🗺️ {t.mapLink}</Link>
        <Link href={`/${locale}/inquiry?memo=${searchLoc}`} style={{ background: '#ff385c', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>💬 {t.planTrip}</Link>
      </div>

      {keywords.length ? (
        <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
          {keywords.map((k) => (
            <Link key={k} href={`/${locale}/attractions/all?q=${encodeURIComponent(k)}`} style={{ fontSize: 12, color: '#6a6a6a', background: '#f5f5f5', border: '1px solid #ececec', borderRadius: 999, padding: '4px 10px', textDecoration: 'none' }}>#{k}</Link>
          ))}
        </div>
      ) : null}

      {nearby.length ? (
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 14px' }}>{row.sidoName} {t.nearbyTitle}</h2>
          <div className="m-atd-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {nearby.map((r) => <TourCard key={r.id} r={r} locale={locale} t={t} />)}
          </div>
        </div>
      ) : null}

      <p style={{ fontSize: 11, color: '#9c9c9c', marginTop: 28, lineHeight: 1.6 }}>{t.dataSource}<br />{t.keywordNote}</p>
    </section>
  );
}
