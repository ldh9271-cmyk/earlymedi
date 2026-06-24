import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { PublicLocale } from '@/lib/i18n/locales';
import { fetchListingBySlug } from '@/lib/listings/query';
import { CATEGORY_PRODUCTS } from '../glowup/pc/_components/category-products';
import type { PcCategoryKey } from '../glowup/pc/_components/pc-header';
import { getDictionary } from '@/lib/i18n/get-dictionary';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'KoreaGlowUp' };

/**
 * Confirm-and-pay screen — Airbnb-style listing checkout based on the
 * founder's 2026-06-25 reference mockup.
 *
 * Resolves the target listing from one of two sources, in this order:
 *   1. `?slug=<…>` → fetchListingBySlug against partner_listings
 *      (DB-backed marketplace inventory; route /listings/[slug]).
 *   2. `?cat=<color|skin|photo|makeup|kpop|food|hotel>` → the
 *      hardcoded CATEGORY_PRODUCTS sample (route /glowup/pc/c/[key]).
 *
 * Anything else 404s so we don't render an empty checkout. Reservation
 * context (date / time / guests) defaults to the next reasonable slot
 * when missing — the URL still accepts ?date=, ?time=, ?guests= so a
 * future date-picker on the detail page can pre-populate this screen.
 *
 * "Confirm and pay · 결제하기" deep-links into the existing inquiry
 * flow with the full context as query params so the agency inbox sees
 * the reservation as a structured lead. Real PG (KCP/Toss/Stripe)
 * integration lands in a follow-up — this v1 is UI parity with the
 * reference, not actual money movement.
 */
export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: { locale: PublicLocale };
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<JSX.Element> {
  const summary = await resolveSummary({ locale: params.locale, searchParams });
  if (!summary) {
    notFound();
  }
  const dict = await getDictionary(params.locale);
  const c = dict.checkout;
  const { title, thumbBg, rating, location, priceWon, priceUnitLabel } = summary;

  const date = stringParam(searchParams.date) || c.defaultDate;
  const time = stringParam(searchParams.time) || c.defaultTime;
  const guests = stringParam(searchParams.guests) || c.oneGuest;

  const lineLabel = c.lineSession
    .replace('{price}', `₩${priceWon.toLocaleString('ko-KR')}`)
    .replace('{unit}', priceUnitLabel);
  const lineAmount = priceWon;
  const serviceFee = Math.round((priceWon * 0.1) / 1000) * 1000;
  const total = lineAmount + serviceFee;

  const confirmHref = buildInquiryHref({
    locale: params.locale,
    title,
    interest: summary.interest,
    date,
    time,
    guests,
    total,
  });
  const backHref = summary.source === 'slug'
    ? `/${params.locale}/listings/${summary.id}`
    : `/${params.locale}/glowup/pc/c/${summary.id}`;

  return (
    <div
      style={{
        background: '#ffffff',
        color: '#222',
        fontFamily: "'Inter', 'Pretendard Variable', system-ui, sans-serif",
        // Sticky CTA bar lives outside <main>; reserve room so the page
        // can scroll all the way to the bottom of "you won't be charged".
        paddingBottom: 140,
      }}
    >
      <header
        style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: '#fff',
          borderBottom: '1px solid #ebebeb',
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <Link
          href={backHref}
          aria-label="Back"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, color: '#222', textDecoration: 'none',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
          {c.title}
        </h1>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Listing summary card */}
        <section style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 22px' }}>
          <div
            style={{
              width: 84, height: 84, borderRadius: 14, flexShrink: 0,
              background: thumbBg,
              boxShadow: 'rgba(0,0,0,0.04) 0 1px 2px',
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>{title}</div>
            <div style={{ fontSize: 13, color: '#222', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#222" style={{ flexShrink: 0 }}>
                <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
              </svg>
              <span style={{ fontWeight: 600 }}>{rating}</span>
              <span>·</span>
              <span>{location}</span>
            </div>
          </div>
        </section>

        <Divider />

        {/* Your trip */}
        <section style={{ padding: '0 22px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 14px' }}>{c.yourTrip}</h2>
          <TripRow label={c.date} value={date} editLabel={c.edit} />
          <TripRow label={c.time} value={time} editLabel={c.edit} />
          <TripRow label={c.guests} value={guests} editLabel={c.edit} />
        </section>

        <Divider />

        {/* Price details */}
        <section style={{ padding: '0 22px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 14px' }}>{c.priceDetails}</h2>
          <PriceRow
            label={lineLabel}
            value={`₩${lineAmount.toLocaleString('ko-KR')}`}
          />
          <PriceRow
            label={c.serviceFee}
            labelUnderlined
            value={`₩${serviceFee.toLocaleString('ko-KR')}`}
          />
          <div style={{ height: 1, background: '#ebebeb', margin: '14px 0' }} />
          <div
            style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              fontSize: 16, fontWeight: 700,
            }}
          >
            <span>{c.total} (KRW)</span>
            <span>₩{total.toLocaleString('ko-KR')}</span>
          </div>
        </section>

        <Divider />

        {/* Pay with */}
        <section style={{ padding: '0 22px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 14px' }}>{c.payWith}</h2>
          <button
            type="button"
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              border: '1px solid #dddddd', borderRadius: 12, background: '#fff',
              cursor: 'pointer', fontFamily: 'inherit', color: '#222',
              fontSize: 15,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.6">
              <rect x="2" y="6" width="20" height="13" rx="2" />
              <path d="M2 10h20" />
            </svg>
            <span style={{ flex: 1, textAlign: 'left' }}>{c.cardPlaceholder}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div style={{ fontSize: 12, color: '#9c9c9c', marginTop: 8 }}>
            {c.paymentNote}
          </div>
        </section>
      </main>

      {/* Sticky confirm bar */}
      <div
        style={{
          position: 'fixed',
          left: 0, right: 0, bottom: 0,
          background: '#fff',
          borderTop: '1px solid #ebebeb',
          padding: '14px 16px calc(14px + env(safe-area-inset-bottom))',
          zIndex: 40,
        }}
      >
        <Link
          href={confirmHref}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: 52,
            background: '#ff385c', color: '#fff',
            borderRadius: 12,
            fontSize: 16, fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          {c.confirmCta}
        </Link>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#6a6a6a', marginTop: 8 }}>
          {c.notChargedNote}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-pieces ─────────────────────────────────────────────── */

function Divider(): JSX.Element {
  return <div style={{ height: 1, background: '#ebebeb', margin: '20px 22px' }} />;
}

function TripRow({ label, value, editLabel }: { label: string; value: string; editLabel: string }): JSX.Element {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 12, padding: '4px 0 14px',
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>{value}</div>
      </div>
      <button
        type="button"
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', color: '#222', fontSize: 14, fontWeight: 600,
          textDecoration: 'underline', textUnderlineOffset: 3,
          padding: 0,
        }}
      >
        {editLabel}
      </button>
    </div>
  );
}

function PriceRow({
  label,
  value,
  labelUnderlined,
}: {
  label: string;
  value: string;
  labelUnderlined?: boolean;
}): JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
      <span
        style={{
          fontSize: 14, color: '#222',
          textDecoration: labelUnderlined ? 'underline' : 'none',
          textUnderlineOffset: 3,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 14, color: '#222' }}>{value}</span>
    </div>
  );
}

/* ─── Resolution helpers ─────────────────────────────────────── */

type Summary = {
  source: 'slug' | 'cat';
  /** slug or category key — used to build the back link. */
  id: string;
  title: string;
  thumbBg: string;
  rating: string;
  location: string;
  priceWon: number;
  priceUnitLabel: string;
  interest: string;
};

async function resolveSummary({
  locale,
  searchParams,
}: {
  locale: PublicLocale;
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<Summary | null> {
  const slug = stringParam(searchParams.slug);
  if (slug) {
    const listing = await fetchListingBySlug({ locale, slug });
    if (!listing) return null;
    return {
      source: 'slug',
      id: slug,
      // Listing's own locale-aware title (DB locale override applied
      // upstream in fetchListingBySlug). Keep it as the single line —
      // no more bilingual EN+KR stacking.
      title: listing.title,
      thumbBg: listing.coverImageUrl
        ? `#f2f2f2 url(${listing.coverImageUrl}) center / cover`
        : 'linear-gradient(135deg, #d8c7f5, #e7d6fb)',
      rating: listing.rating ? (listing.rating / 10).toFixed(2) : '4.92',
      location: listing.locationLabel ?? 'Seoul',
      priceWon: listing.priceWon ?? 180_000,
      priceUnitLabel: priceUnitLabel(listing.priceUnit, listing.category),
      interest: listing.interestKey ?? listing.category,
    };
  }

  const cat = stringParam(searchParams.cat);
  if (cat) {
    const validKeys = new Set<Exclude<PcCategoryKey, 'all'>>([
      'color', 'skin', 'photo', 'makeup', 'kpop', 'food', 'hotel',
    ]);
    if (!validKeys.has(cat as Exclude<PcCategoryKey, 'all'>)) return null;
    const p = CATEGORY_PRODUCTS[cat as Exclude<PcCategoryKey, 'all'>];
    return {
      source: 'cat',
      id: cat,
      // CATEGORY_PRODUCTS titles are Korean today. When non-KR sample
      // copy lands they should flow through dict per locale; for now
      // we surface what the data has.
      title: p.title,
      thumbBg: `#f2f2f2 url(${p.heroImg}) center / cover`,
      rating: p.rating.toFixed(2),
      location: p.metaLine.split('·')[0]?.trim() || 'Seoul',
      priceWon: p.priceWon,
      priceUnitLabel: p.priceUnit || '세션',
      interest: p.interest,
    };
  }

  return null;
}

function priceUnitLabel(unit: string | null, category: string): string {
  if (unit && unit.trim()) return unit;
  if (category === 'hotel') return '박';
  if (category === 'food' || category === 'restaurant') return '인';
  return '세션';
}

function buildInquiryHref({
  locale,
  title,
  interest,
  date,
  time,
  guests,
  total,
}: {
  locale: PublicLocale;
  title: string;
  interest: string;
  date: string;
  time: string;
  guests: string;
  total: number;
}): string {
  const qs = new URLSearchParams({
    program: title,
    interest,
    date,
    time,
    guests,
    total: String(total),
    source: 'checkout',
  });
  return `/${locale}/inquiry?${qs.toString()}`;
}

function stringParam(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}
