import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { db } from '@/lib/db/client';
import { foodRegistry } from '@/drizzle/schema/food-registry';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { eatCatLabels, eatTone, isEatListed } from '../../_registry/shared';

export const dynamic = 'force-dynamic';

const CSS =
  '.m-ed-body { display: grid; grid-template-columns: 1fr 340px; gap: 28px; }'
  + '.m-ed-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }'
  + '.m-ed-bottom { display: none; }'
  + '@media (max-width: 1024px) { .m-ed-body { grid-template-columns: 1fr; } .m-ed-side { position: static !important; } }'
  + '@media (max-width: 768px) { .m-ed-page { padding: 16px 16px 110px !important; } .m-ed-title { font-size: 21px !important; }'
  + '  .m-ed-bottom { display: flex; position: fixed; left: 0; right: 0; bottom: 0; background: #fff; border-top: 1px solid #ebebeb; padding: 10px 14px; gap: 8px; z-index: 40; } }';

async function load(mgtNo: string) {
  const [row] = await db
    .select({
      id: foodRegistry.id, mgtNo: foodRegistry.mgtNo, name: foodRegistry.name, bizType: foodRegistry.bizType, sanitationType: foodRegistry.sanitationType,
      categoryKeys: foodRegistry.categoryKeys, statusCode: foodRegistry.statusCode, statusName: foodRegistry.statusName, openedDate: foodRegistry.openedDate,
      sidoName: foodRegistry.sidoName, sgguName: foodRegistry.sgguName, addrRoad: foodRegistry.addrRoad, addrLot: foodRegistry.addrLot, zip: foodRegistry.zip, tel: foodRegistry.tel,
      lat: foodRegistry.lat, lng: foodRegistry.lng,
      contractedListingId: foodRegistry.contractedListingId, claimStatus: foodRegistry.claimStatus, details: foodRegistry.details,
      lastModifiedAt: foodRegistry.lastModifiedAt, syncedAt: foodRegistry.syncedAt,
      partnerSlug: partnerListings.slug, partnerCover: partnerListings.coverImageUrl,
    })
    .from(foodRegistry)
    .leftJoin(partnerListings, eq(partnerListings.id, foodRegistry.contractedListingId))
    .where(eq(foodRegistry.mgtNo, mgtNo))
    .limit(1);
  return row ?? null;
}

export async function generateMetadata({ params }: { params: { locale: string; mgtNo: string } }): Promise<Metadata> {
  if (!isPublicLocale(params.locale)) return {};
  const row = await load(decodeURIComponent(params.mgtNo)).catch(() => null);
  if (!row) return {};
  return { title: `${row.name} · GlowUpTour`, description: [row.bizType, row.addrRoad ?? row.addrLot].filter(Boolean).join(' · ') };
}

/** 공공정보 맛집 상세 — 헤더 → 전화/지도/문의 → 소개(직접 등록) → 위치 → 기본정보 → 직접 등록 CTA. */
export default async function EatDetailPage({ params }: { params: { locale: string; mgtNo: string } }): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) notFound();
  const locale = params.locale as PublicLocale;
  const dict = await getDictionary(locale);
  const t = dict.eatsRegistry;
  const tr = dict.clinicsPage.registry;
  const row = await load(decodeURIComponent(params.mgtNo)).catch(() => null);
  if (!row) notFound();

  const listed = isEatListed(row);
  const tone = eatTone(row.categoryKeys);
  const labels = eatCatLabels(row.categoryKeys, t);
  const photos = listed ? (row.details.photos ?? []) : [];
  const cover = row.partnerCover || photos[0] || null;
  const addr = row.addrRoad ?? row.addrLot;
  const mapQuery = encodeURIComponent(`${row.name} ${addr ?? ''}`);
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  const inquiryHref = `/${locale}/inquiry?memo=${encodeURIComponent(row.name)}`;
  const claimHref = `/signup?claimEat=${encodeURIComponent(row.mgtNo)}`;
  const fmtDate = (d: Date | null): string => (d ? new Date(d).toISOString().slice(0, 10) : '—');

  const section: React.CSSProperties = { border: '1px solid #ebebeb', borderRadius: 14, padding: 18, background: '#fff' };
  const h2: React.CSSProperties = { fontSize: 16, fontWeight: 700, margin: '0 0 10px' };
  const actionBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid #dddddd', borderRadius: 10, padding: '10px 8px', fontSize: 13, fontWeight: 600, color: '#222', textDecoration: 'none', background: '#fff' };
  const cell = (c: string, w?: number): React.CSSProperties => ({ padding: '8px 10px', color: c, fontWeight: w });

  return (
    <section className="m-ed-page" style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 40px 80px', filter: listed ? 'none' : 'grayscale(1)' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Link href={`/${locale}/eats/all`} style={{ fontSize: 12, color: '#6a6a6a' }}>← {t.title}</Link>

      <div style={{ marginTop: 10, borderRadius: 16, overflow: 'hidden', background: cover ? `#f2f2f2 url(${cover}) center / cover` : tone.bg, aspectRatio: cover ? '21/9' : 'auto', minHeight: cover ? undefined : 96, display: 'flex', alignItems: 'flex-end', padding: cover ? 0 : '18px 20px' }}>
        {!cover ? <span style={{ fontSize: 14, fontWeight: 800, color: tone.fg }}>{labels[0] ?? row.bizType ?? ''}</span> : null}
      </div>
      {photos.length > 1 ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto' }}>
          {photos.slice(1, 8).map((p) => <div key={p} style={{ width: 120, height: 80, flexShrink: 0, borderRadius: 10, background: `#f2f2f2 url(${p}) center / cover` }} />)}
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: listed ? '#c2143c' : '#6a6a6a', background: listed ? '#fff0f3' : '#f5f5f5', border: `1px solid ${listed ? '#fecdd3' : '#e5e5e5'}`, borderRadius: 999, padding: '2px 8px' }}>{listed ? tr.contractedBadge : tr.publicBadge}</span>
          {labels.map((l) => <span key={l} style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '2px 8px' }}>{l}</span>)}
          {row.claimStatus === 'pending' ? <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 999, padding: '2px 8px' }}>{tr.claimPending}</span> : null}
        </div>
        <h1 className="m-ed-title" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: '8px 0 0' }}>{row.name}</h1>
        <p style={{ fontSize: 14, color: '#6a6a6a', margin: '6px 0 0' }}>
          {[row.bizType, [row.sidoName, row.sgguName].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
          {row.openedDate ? ` · ${t.opened} ${row.openedDate.slice(0, 7).replace('-', '.')}` : ''}
        </p>
      </div>

      <div className="m-ed-body" style={{ marginTop: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="m-ed-actions">
            {row.tel ? <a href={`tel:${row.tel.replace(/[^0-9+]/g, '')}`} style={actionBtn}>📞 {tr.callBtn}</a> : <span style={{ ...actionBtn, color: '#bbb' }}>📞 {tr.callBtn}</span>}
            <a href={mapHref} target="_blank" rel="noreferrer" style={actionBtn}>📍 {tr.mapBtn}</a>
            <Link href={row.contractedListingId && row.partnerSlug ? `/${locale}/listings/${row.partnerSlug}` : inquiryHref} style={{ ...actionBtn, background: '#ff385c', color: '#fff', border: 'none' }}>
              💬 {row.contractedListingId && row.partnerSlug ? tr.viewPartnerPage : tr.inquireBtn}
            </Link>
          </div>

          {listed && row.details.intro ? (
            <div style={section}>
              <h2 style={h2}>{tr.intro}</h2>
              <p style={{ fontSize: 14, color: '#3f3f3f', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>{row.details.intro}</p>
              {row.details.menu?.length ? <p style={{ fontSize: 13, color: '#6a6a6a', margin: '10px 0 0' }}>{row.details.menu.join(' · ')}</p> : null}
              {row.details.languages?.length ? <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0' }}><b>{tr.languages}</b> · {row.details.languages.join(', ')}</p> : null}
              {row.details.hours ? <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0' }}><b>{t.hours}</b> · {row.details.hours}</p> : null}
              {row.details.priceNote ? <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0' }}>{row.details.priceNote}</p> : null}
            </div>
          ) : null}

          <div style={section}>
            <h2 style={h2}>{tr.address}</h2>
            <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>{row.addrRoad ?? '—'}{row.zip ? <span style={{ color: '#9c9c9c' }}> ({row.zip})</span> : null}</p>
            {row.addrLot && row.addrLot !== row.addrRoad ? <p style={{ fontSize: 12, color: '#9c9c9c', margin: '4px 0 0' }}>{row.addrLot}</p> : null}
            {addr ? (
              <iframe
                title="map"
                src={`https://www.google.com/maps?q=${row.lat && row.lng ? `${row.lat},${row.lng}` : mapQuery}&output=embed&hl=${locale === 'kr' ? 'ko' : locale}`}
                style={{ width: '100%', height: 240, border: 0, borderRadius: 12, marginTop: 12 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : null}
          </div>
        </div>

        <aside className="m-ed-side" style={{ position: 'sticky', top: 90, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={section}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={cell('#6a6a6a')}>{t.category}</td><td style={cell('#222', 600)}>{labels.join(' · ') || '—'}</td></tr>
                <tr><td style={cell('#6a6a6a')}>{t.bizType}</td><td style={cell('#222', 600)}>{row.bizType ?? '—'}{row.sanitationType && row.sanitationType !== row.bizType ? <span style={{ color: '#9c9c9c' }}> · {row.sanitationType}</span> : null}</td></tr>
                <tr><td style={cell('#6a6a6a')}>{t.status}</td><td style={cell(row.statusCode === '01' ? '#047857' : '#b45309', 600)}>{row.statusName ?? '—'}</td></tr>
                <tr><td style={cell('#6a6a6a')}>{tr.phone}</td><td style={cell('#222', 600)}>{row.tel ?? '—'}</td></tr>
                {row.openedDate ? <tr><td style={cell('#6a6a6a')}>{t.opened}</td><td style={cell('#222', 600)}>{row.openedDate}</td></tr> : null}
              </tbody>
            </table>
          </div>

          {!listed ? (
            <div style={{ ...section, borderColor: '#fecdd3', background: '#fffafb', filter: 'none' }}>
              <h2 style={{ ...h2, margin: '0 0 6px' }}>{t.claimTitle}</h2>
              <p style={{ fontSize: 13, color: '#3f3f3f', lineHeight: 1.65, margin: 0 }}>{t.claimBody}</p>
              {row.claimStatus === 'pending' ? (
                <p style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: '#b45309' }}>{tr.claimPending}</p>
              ) : (
                <Link href={claimHref} style={{ display: 'block', marginTop: 12, textAlign: 'center', background: '#ff385c', color: '#fff', borderRadius: 10, padding: '11px 14px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>{t.claimCta} →</Link>
              )}
            </div>
          ) : null}

          <p style={{ fontSize: 11, color: '#9c9c9c', margin: 0, lineHeight: 1.6 }}>{t.dataSource} · {tr.synced} {fmtDate(row.syncedAt)}<br />{t.keywordNote}</p>
        </aside>
      </div>

      <div className="m-ed-bottom">
        {row.tel ? <a href={`tel:${row.tel.replace(/[^0-9+]/g, '')}`} style={{ ...actionBtn, flex: 1 }}>📞 {tr.callBtn}</a> : null}
        <Link href={listed ? inquiryHref : claimHref} style={{ ...actionBtn, flex: 2, background: '#ff385c', color: '#fff', border: 'none' }}>{listed ? tr.inquireBtn : t.claimCta}</Link>
      </div>
    </section>
  );
}
