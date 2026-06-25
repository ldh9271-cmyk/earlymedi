import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LOCALE_LABELS, type PublicLocale } from '@/lib/i18n/locales';
import { MainHeader } from '../../_components/main-header';
import { MainFooter } from '../../_components/main-footer';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { fetchListingsForSurface, type ListingCard } from '@/lib/listings/query';

export const dynamic = 'force-dynamic';

type TravelType = 'free' | 'package' | 'training';
const VALID_TYPES = new Set<TravelType>(['free', 'package', 'training']);

/**
 * Travel sub-type landing — lists every approved partner_listings row
 * tagged category='travel_package' + details.subType=<type>. Replaces
 * the old dict-driven single-listing detail layout (which surfaced a
 * fake sample even when no real listing existed).
 *
 *   - 0 rows  → empty state with inquiry CTA. No fake content.
 *   - 1+ rows → Airbnb-style card grid (mobile 1-col, tablet 2-col,
 *               desktop 3-col). Each card links to /listings/[slug]
 *               for the real detail page.
 *
 * Hero section title/subtitle still comes from dict.travel.<type> so
 * each locale shows its own language.
 */

const LIST_CSS =
  '@media (max-width: 768px) {'
  + '.m-tl-section { padding: 24px 16px 96px !important; }'
  + '.m-tl-h1 { font-size: 24px !important; }'
  + '.m-tl-sub { font-size: 13px !important; }'
  + '.m-tl-grid { grid-template-columns: 1fr !important; gap: 18px !important; margin-top: 20px !important; }'
  + '}'
  + '@media (min-width: 769px) and (max-width: 1199px) {'
  + '.m-tl-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 28px !important; }'
  + '}';

export async function generateMetadata({
  params,
}: {
  params: { locale: PublicLocale; type: string };
}) {
  if (!VALID_TYPES.has(params.type as TravelType)) return {};
  const dict = await getDictionary(params.locale);
  const t = dict.travel[params.type as TravelType];
  return { title: `${t.title} · KoreaGlowUp`, description: t.priceNote };
}

export default async function TravelTypeListPage({
  params,
}: {
  params: { locale: PublicLocale; type: string };
}): Promise<JSX.Element> {
  if (!VALID_TYPES.has(params.type as TravelType)) {
    notFound();
  }
  const dict = await getDictionary(params.locale);
  const t = dict.travel[params.type as TravelType];
  const listings = await fetchListingsForSurface({
    locale: params.locale,
    categories: ['travel_package'],
    subType: params.type as TravelType,
  });

  return (
    <div
      style={{
        background: '#ffffff',
        color: '#222',
        fontFamily: "'Inter', 'Pretendard Variable', system-ui, sans-serif",
        overflowX: 'clip',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <MainHeader locale={params.locale} activeKey="travel" activeTab="glowup" t={dict.header} />

      <style dangerouslySetInnerHTML={{ __html: LIST_CSS }} />
      <section
        className="m-tl-section"
        style={{
          flex: 1,
          maxWidth: 1280,
          width: '100%',
          margin: '0 auto',
          padding: '40px 56px 96px',
        }}
      >
        <h1
          className="m-tl-h1"
          style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '-0.6px',
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          {t.title}
        </h1>
        <p
          className="m-tl-sub"
          style={{
            fontSize: 15,
            color: '#6a6a6a',
            margin: '8px 0 0',
            maxWidth: 720,
            lineHeight: 1.55,
          }}
        >
          {t.cardDesc}
        </p>

        {listings.length === 0 ? (
          <EmptyState locale={params.locale} />
        ) : (
          <div
            className="m-tl-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 28,
              marginTop: 28,
            }}
          >
            {listings.map((l) => (
              <ListingCardLink key={l.id} locale={params.locale} listing={l} />
            ))}
          </div>
        )}
      </section>

      <MainFooter t={dict.siteFooter} localeNative={LOCALE_LABELS[params.locale].native} />
    </div>
  );
}

function ListingCardLink({
  locale,
  listing,
}: {
  locale: PublicLocale;
  listing: ListingCard;
}): JSX.Element {
  const rating = listing.rating ? (listing.rating / 10).toFixed(2) : null;
  const price = listing.priceWon
    ? `₩${listing.priceWon.toLocaleString('ko-KR')}`
    : '문의';
  const unit = listing.priceUnit || '';
  return (
    <Link
      href={`/${locale}/listings/${listing.slug}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #ebebeb',
        borderRadius: 18,
        overflow: 'hidden',
        background: '#fff',
        color: 'inherit',
        textDecoration: 'none',
        boxShadow: 'rgba(0,0,0,0.02) 0 1px 2px, rgba(0,0,0,0.06) 0 4px 12px',
      }}
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: '16/10',
          background: listing.coverImageUrl
            ? `#f2f2f2 url(${listing.coverImageUrl}) center / cover`
            : 'linear-gradient(135deg, #f7f7f7 0%, #ebebeb 100%)',
        }}
      >
        {listing.promoLabel ? (
          <div
            style={{
              position: 'absolute', top: 12, left: 12,
              background: '#fff', color: '#222',
              fontSize: 11, fontWeight: 600,
              borderRadius: 9999, padding: '5px 11px',
              boxShadow: 'rgba(0,0,0,0.1) 0 2px 6px',
            }}
          >
            {listing.promoLabel}
          </div>
        ) : null}
      </div>
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.25 }}>
            {listing.title}
          </span>
          {rating ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#222">
                <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
              </svg>
              {rating}
            </span>
          ) : null}
        </div>
        {listing.locationLabel ? (
          <div style={{ fontSize: 13, color: '#6a6a6a', marginTop: 4 }}>{listing.locationLabel}</div>
        ) : null}
        {listing.description ? (
          <p
            style={{
              fontSize: 14, color: '#3f3f3f', lineHeight: 1.55,
              margin: '12px 0 0',
              flex: 1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {listing.description}
          </p>
        ) : null}
        <div
          style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            marginTop: 16, paddingTop: 14, borderTop: '1px solid #ebebeb',
          }}
        >
          <span style={{ fontSize: 12, color: '#6a6a6a' }}>
            {listing.reviewsCount > 0 ? `후기 ${listing.reviewsCount}개` : '신규'}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>
            {price}
            {unit ? <span style={{ color: '#6a6a6a', fontWeight: 400 }}> / {unit}</span> : null}
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ locale }: { locale: PublicLocale }): JSX.Element {
  return (
    <div
      style={{
        marginTop: 32,
        border: '1px dashed #dddddd',
        background: '#fafafa',
        borderRadius: 16,
        padding: '56px 24px',
        textAlign: 'center',
      }}
    >
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#bcbcbc" strokeWidth="1.5" style={{ display: 'inline-block' }}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 13h18" />
      </svg>
      <h3 style={{ fontSize: 18, fontWeight: 700, margin: '14px 0 0' }}>
        지금 큐레이션 중입니다
      </h3>
      <p style={{ fontSize: 14, color: '#6a6a6a', margin: '6px 0 0', maxWidth: 360, marginInline: 'auto' }}>
        이 분류의 상품은 곧 공개됩니다. 원하시는 일정·예산을 알려주시면 컨시어지가 직접 안내드려요.
      </p>
      <Link
        href={`/${locale}/inquiry`}
        style={{
          display: 'inline-block',
          marginTop: 20,
          background: '#ff385c', color: '#fff',
          padding: '10px 22px',
          borderRadius: 10,
          fontSize: 14, fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        1:1 상담 시작하기
      </Link>
    </div>
  );
}
