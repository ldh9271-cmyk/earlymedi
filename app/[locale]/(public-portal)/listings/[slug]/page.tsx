import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { PublicLocale } from '@/lib/i18n/locales';
import { fetchListingBySlug, type ListingDetail } from '@/lib/listings/query';
import { getDictionary } from '@/lib/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

// Next.js 14 가끔 dynamic param 을 percent-encoded 상태로 넘기는
// 사례가 있다 (특히 한글이 들어간 slug). DB 의 slug 컬럼은 한글
// 그대로 저장되어 있으니, 두 형태 모두 시도해 본다.
function decodedSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { locale: PublicLocale; slug: string };
}): Promise<{ title: string }> {
  const listing = await fetchListingBySlug({
    locale: params.locale,
    slug: decodedSlug(params.slug),
  });
  return { title: listing ? `${listing.title} · KoreaGlowUp` : 'Listing · KoreaGlowUp' };
}

/**
 * Individual listing detail page — Airbnb-style mobile design from
 * the founder's 2026-06-25 reference. Bilingual EN + KR labels are
 * hardcoded to match the mockup; per-listing strings (title, location,
 * description) come from the DB row and respect the per-locale
 * override table.
 *
 * Layout, top → bottom:
 *   1. Hero square (cover image) — back button left, share/save right,
 *      counter "1 / N" bottom-right derived from gallery length.
 *   2. Title + Korean subtitle + rating/reviews/location meta.
 *   3. Host card — placeholder name derived from category until the
 *      partners table grows a public-name field.
 *   4. "Why this is special" — 3 reasons. Pulls strings from
 *      details.highlights when present (shape: [{ titleEn, titleKr,
 *      desc }]) and falls back to category-tuned defaults so every
 *      listing renders something meaningful.
 *   5. Reviews — when reviewsCount > 0, shows one placeholder review
 *      + a "Show all N reviews" link. When 0, a single muted line.
 *   6. Sticky bottom — price + unit, suggested next slot, primary
 *      "Reserve · 예약" CTA that lands in the existing inquiry flow.
 */
export default async function ListingDetailPage({
  params,
}: {
  params: { locale: PublicLocale; slug: string };
}): Promise<JSX.Element> {
  const listing = await fetchListingBySlug({
    locale: params.locale,
    slug: decodedSlug(params.slug),
  });
  if (!listing) {
    notFound();
  }
  const dict = await getDictionary(params.locale);
  const d = dict.detail;

  const heroSrc = listing.coverImageUrl ?? listing.galleryImageUrls[0] ?? '';
  const galleryCount = Math.max(1, listing.galleryImageUrls.length || (listing.coverImageUrl ? 1 : 0));
  const rating = listing.rating ? (listing.rating / 10).toFixed(2) : '4.92';
  const reviewsCount = listing.reviewsCount > 0 ? listing.reviewsCount : 0;
  const reviewsLabel = d.reviewsCount.replace('{n}', String(reviewsCount));
  const subtitleKr = subtitleForCategory(listing.category, listing.title);
  const hostName = hostNameForCategory(listing.category);
  const highlights = pickHighlights(listing);
  const priceLabel = listing.priceWon
    ? `₩${listing.priceWon.toLocaleString('ko-KR')}`
    : '문의';
  const priceUnit = priceUnitLabel(listing.priceUnit, listing.category);
  // String concat instead of template literal — SWC's JSX parser
  // mis-counts braces when ${encodeURIComponent(...)} sits before
  // the next <div> and throws "Unexpected token `div`". See memory
  // feedback_swc_inline_css for the same family of bug.
  const reserveHref = '/' + params.locale + '/checkout?slug=' + encodeURIComponent(listing.slug);

  return (
    <div
      style={{
        background: '#ffffff',
        color: '#222',
        fontFamily: "'Inter', 'Pretendard Variable', system-ui, sans-serif",
        // Reserve room at the bottom so sticky CTA doesn't hide content.
        paddingBottom: 96,
      }}
    >
      {/* All content scoped to a centered max-width 760 column so the
          page reads the same on phone and desktop (no awkward
          left-anchored hero on PC). */}
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Hero square + floating controls */}
      <section
        style={{
          position: 'relative',
          aspectRatio: '1 / 1',
          maxHeight: 460,
          background: heroSrc
            ? `#f2f2f2 url(${heroSrc}) center / cover`
            : 'linear-gradient(135deg, #d8c7f5, #e7d6fb)',
        }}
      >
        <Link
          href={`/${params.locale}`}
          aria-label="Back"
          style={floatingBtn({ left: 14 })}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 8 }}>
          <button type="button" aria-label="Share" style={floatingBtn({})}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8">
              <path d="M4 12v8h16v-8M12 3v13M8 7l4-4 4 4" />
            </svg>
          </button>
          <button type="button" aria-label="Save" style={floatingBtn({})}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8">
              <path d="M12 20s-7-4.5-9.2-8.5C1.3 8.7 2.5 5.5 5.5 5.5c1.8 0 2.9 1 3.5 2 .6-1 1.7-2 3.5-2 3 0 4.2 3.2 2.7 6C19 15.5 12 20 12 20z" />
            </svg>
          </button>
        </div>
        <div
          style={{
            position: 'absolute', bottom: 14, right: 14,
            background: 'rgba(0,0,0,0.65)', color: '#fff',
            fontSize: 12, fontWeight: 600,
            padding: '4px 10px', borderRadius: 9999,
          }}
        >
          1 / {galleryCount}
        </div>
      </section>

      {/* Title + meta */}
      <section style={{ padding: '20px 22px 0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.4px', margin: 0, lineHeight: 1.2 }}>
          {listing.title}
        </h1>
        {subtitleKr ? (
          <div style={{ fontSize: 15, color: '#6a6a6a', marginTop: 4 }}>{subtitleKr}</div>
        ) : null}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#222', flexWrap: 'wrap' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#222">
            <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
          </svg>
          <strong style={{ fontWeight: 600 }}>{rating}</strong>
          <span style={{ color: '#222' }}>·</span>
          <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {reviewsLabel}
          </span>
          {listing.locationLabel ? (
            <>
              <span style={{ color: '#222' }}>·</span>
              <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
                {listing.locationLabel}
              </span>
            </>
          ) : null}
        </div>
      </section>

      <Divider />

      {/* Host card */}
      <section style={{ padding: '0 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 50, height: 50, borderRadius: 9999, flexShrink: 0,
            background: 'linear-gradient(135deg, #f3d6f1, #d6c7f5)',
          }}
        />
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{d.hostedBy.replace('{name}', hostName)}</div>
          <div style={{ fontSize: 13, color: '#6a6a6a', marginTop: 2 }}>
            {d.verifiedPartner} · {d.years.replace('{n}', '4')}
          </div>
        </div>
      </section>

      <Divider />

      {/* Why this is special */}
      <section style={{ padding: '0 22px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
          {d.whySpecial}
        </h2>
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {highlights.map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <span style={{ flexShrink: 0, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HighlightIcon kind={h.icon} />
              </span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{h.title}</div>
                <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 3, lineHeight: 1.5 }}>
                  {h.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* Reviews */}
      <section style={{ padding: '0 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 18, fontWeight: 700 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#222">
            <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
          </svg>
          <span>{rating} · {reviewsLabel}</span>
        </div>
        {reviewsCount > 0 ? (
          <>
            <div
              style={{
                marginTop: 14,
                border: '1px solid #ebebeb',
                borderRadius: 12,
                padding: 18,
              }}
            >
              <p style={{ margin: 0, fontSize: 15, color: '#222', lineHeight: 1.5 }}>
                &ldquo;{d.sampleReviewBody}&rdquo;
              </p>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 30, height: 30, borderRadius: 9999,
                    background: 'linear-gradient(135deg, #ffd5b8, #ffe7d0)',
                  }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{d.sampleReviewerName}</div>
                  <div style={{ fontSize: 12, color: '#6a6a6a' }}>{d.sampleReviewerMeta}</div>
                </div>
              </div>
            </div>
            <Link
              href="#"
              style={{
                display: 'inline-block', marginTop: 14,
                fontSize: 14, color: '#222', fontWeight: 600,
                textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >
              {d.showAllReviews.replace('{n}', String(reviewsCount))}
            </Link>
          </>
        ) : (
          <p style={{ fontSize: 14, color: '#6a6a6a', marginTop: 10 }}>
            첫 리뷰의 주인공이 되어보세요 — 시술 후 30일 내 리뷰 작성 시 다음 예약 5% 할인.
          </p>
        )}
      </section>
      </div>{/* close maxWidth wrapper — sticky bar below stays full-bleed */}

      {/* Sticky reserve bar — full-bleed, safe-area aware. */}
      <div
        style={{
          position: 'fixed',
          left: 0, right: 0, bottom: 0,
          background: '#fff',
          borderTop: '1px solid #ebebeb',
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, zIndex: 40,
        }}
      >
        <div>
          <div style={{ fontSize: 15 }}>
            <span style={{ textDecoration: listing.priceWon ? undefined : 'line-through', fontWeight: 700 }}>
              {priceLabel}
            </span>
            <span style={{ color: '#6a6a6a', fontWeight: 400 }}> / {priceUnit}</span>
          </div>
          <div style={{ fontSize: 12, color: '#222', textDecoration: 'underline', textUnderlineOffset: 3, marginTop: 2 }}>
            날짜 선택 · 시간 안내
          </div>
        </div>
        <Link
          href={reserveHref}
          style={{
            background: '#ff385c', color: '#fff',
            fontSize: 15, fontWeight: 700,
            padding: '12px 22px', borderRadius: 12,
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          {d.reserve}
        </Link>
      </div>
    </div>
  );
}

function Divider(): JSX.Element {
  return <div style={{ height: 1, background: '#ebebeb', margin: '24px 22px' }} />;
}

function floatingBtn(p: { left?: number }): React.CSSProperties {
  return {
    position: 'absolute',
    top: 14,
    ...(p.left !== undefined ? { left: p.left } : {}),
    width: 36, height: 36, borderRadius: 9999,
    background: '#fff', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: 'rgba(0,0,0,0.15) 0 2px 6px',
    textDecoration: 'none',
  };
}

type Highlight = { icon: 'expert' | 'concierge' | 'check'; title: string; desc: string };

/**
 * Read details.highlights when present (founder-curated per listing),
 * otherwise fall back to category-tuned defaults so the section
 * never renders empty.
 */
function pickHighlights(listing: ListingDetail): Highlight[] {
  const fromDb = Array.isArray(listing.details.highlights)
    ? (listing.details.highlights as Array<{ icon?: string; title?: string; desc?: string }>)
        .map((h) => ({
          icon: (h.icon === 'concierge' || h.icon === 'check' ? h.icon : 'expert') as Highlight['icon'],
          title: typeof h.title === 'string' ? h.title : '',
          desc: typeof h.desc === 'string' ? h.desc : '',
        }))
        .filter((h) => h.title && h.desc)
        .slice(0, 3)
    : [];
  if (fromDb.length === 3) return fromDb;

  // Category-tuned default trios.
  switch (listing.category) {
    case 'hotel':
      return [
        { icon: 'expert', title: '4성·5성 등급 객실', desc: '검증된 럭셔리 호텔만 큐레이션. Premium 4–5★ properties.' },
        { icon: 'concierge', title: '컨시어지 픽업 포함', desc: '공항·시술 동선 일정 조율. Airport + clinic shuttle handled.' },
        { icon: 'check', title: '무료 취소 최대 48h', desc: '예약 확정 전 무료 취소. Free cancellation up to 48h.' },
      ];
    case 'food':
    case 'restaurant':
      return [
        { icon: 'expert', title: '현지 시그니처 메뉴', desc: '현지인 사이에서 검증된 인기 코스. Locals’ favorite course.' },
        { icon: 'concierge', title: '통역 예약 동행', desc: '예약·통역 즉시 처리. Booking + interpreter handled.' },
        { icon: 'check', title: '식이 알러지 사전 안내', desc: '알러지·식이 제한 사전 공유. Allergy briefing pre-visit.' },
      ];
    case 'personal_color':
    case 'makeup':
    case 'hair':
    case 'photo_studio':
      return [
        { icon: 'expert', title: '1:1 expert consultant', desc: '90-min draping session, personal palette card included. 전문 컨설턴트 1:1 진단.' },
        { icon: 'concierge', title: 'Concierge included', desc: 'Booking, interpreter (EN/中/日) and route all handled. 예약·통역·동선 안내.' },
        { icon: 'check', title: 'No charge until confirmed', desc: 'Free cancellation up to 48h. 예약 확정 전 무료 취소.' },
      ];
    default:
      return [
        { icon: 'expert', title: '검증된 파트너', desc: '글로우업 큐레이션 기준 통과. Curated, verified partner.' },
        { icon: 'concierge', title: '컨시어지 동행', desc: '예약·통역·동선 한 번에. Booking, interpreter + route handled.' },
        { icon: 'check', title: '확정 전 무료 취소', desc: 'Free cancellation up to 48h. 예약 확정 전 무료 취소.' },
      ];
  }
}

function HighlightIcon({ kind }: { kind: 'expert' | 'concierge' | 'check' }): JSX.Element {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' as const, stroke: '#222', strokeWidth: 1.6 };
  switch (kind) {
    case 'expert':
      return (
        <svg {...common}>
          <circle cx="12" cy="9" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
      );
    case 'concierge':
      return (
        <svg {...common}>
          <rect x="3" y="9" width="13" height="8" rx="2" />
          <path d="M16 12h3l2 3v2h-5" />
          <circle cx="7" cy="18" r="1.6" />
          <circle cx="17" cy="18" r="1.6" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="M5 12l5 5 9-9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

function subtitleForCategory(category: string, _title: string): string {
  switch (category) {
    case 'personal_color': return '퍼스널 컬러 진단';
    case 'makeup': return 'K-뷰티 메이크업';
    case 'hair': return '헤어 스타일링';
    case 'photo_studio': return '프로필 화보 촬영';
    case 'hotel': return '프리미엄 숙박';
    case 'food': return '서울 맛집';
    case 'restaurant': return '서울 맛집';
    case 'dermatology': return '피부과 시술';
    case 'plastic_surgery': return '성형외과';
    default: return '글로우업 큐레이션';
  }
}

function hostNameForCategory(category: string): string {
  switch (category) {
    case 'personal_color': return 'Glow Studio';
    case 'makeup': return 'Seoul Beauty Lab';
    case 'hair': return 'Cheongdam Hair House';
    case 'photo_studio': return 'Seongsu Studio';
    case 'hotel': return 'Premium Stay Group';
    case 'food': case 'restaurant': return 'Local Taste';
    case 'dermatology': return 'Cheongdam Derma';
    case 'plastic_surgery': return 'Gangnam Aesthetic';
    default: return 'KoreaGlowUp Partner';
  }
}

function priceUnitLabel(unit: string | null, category: string): string {
  if (unit && unit.trim()) return unit;
  if (category === 'hotel') return 'night · 박';
  if (category === 'food' || category === 'restaurant') return 'person · 인';
  return 'session · 세션';
}
