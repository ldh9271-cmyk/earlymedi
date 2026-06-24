import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { PublicLocale } from '@/lib/i18n/locales';
import { MainHeader } from '../../_components/main-header';
import { MainFooter } from '../../_components/main-footer';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { LOCALE_LABELS } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

export const dynamic = 'force-dynamic';

type TravelType = 'free' | 'package' | 'training';
const VALID_TYPES = new Set<TravelType>(['free', 'package', 'training']);

/**
 * Per-type travel detail page (자유여행 / 패키지여행 / 연수패키지).
 * Pulls all copy from dict.travel.<type> + dict.detail so each locale
 * shows only its own language — no more bilingual "EN · KR" labels.
 *
 * Static per-type business numbers stay local because they're not
 * translation candidates:
 *   - hero image (asset path)
 *   - rating + reviewsCount (placeholder numbers)
 *   - priceWon (KRW amount)
 *   - host name (English brand, same across locales)
 *   - highlight icon kind (visual category)
 *   - checkout sub-route key
 *
 * Booking still flows through /[locale]/checkout?cat=hotel&sub=<key>.
 */

type TravelTypeMeta = {
  key: TravelType;
  rating: number;
  reviewsCount: number;
  hostName: string;
  heroImg: string;
  priceWon: number;
  highlightIcons: ReadonlyArray<'expert' | 'concierge' | 'check'>;
};

const IMG_BASE = '/images/glowup-pc';

const TRAVEL_META: Record<TravelType, TravelTypeMeta> = {
  free: {
    key: 'free',
    rating: 4.92,
    reviewsCount: 268,
    hostName: 'KoreaGlowUp Concierge',
    heroImg: `${IMG_BASE}/00c1f04c-fb00-44c7-b991-2af98bddd6e2.jpg`,
    priceWon: 350_000,
    highlightIcons: ['concierge', 'expert', 'check'],
  },
  package: {
    key: 'package',
    rating: 4.95,
    reviewsCount: 412,
    hostName: 'KoreaGlowUp Concierge',
    heroImg: `${IMG_BASE}/79dac510-b190-481f-bff3-acd40a97ced6.jpg`,
    priceWon: 2_000_000,
    highlightIcons: ['expert', 'concierge', 'check'],
  },
  training: {
    key: 'training',
    rating: 4.9,
    reviewsCount: 87,
    hostName: 'KoreaGlowUp Medical',
    heroImg: `${IMG_BASE}/65b2c08d-ad5a-411e-a40e-fcbfec808c02.jpg`,
    priceWon: 3_000_000,
    highlightIcons: ['expert', 'concierge', 'check'],
  },
};

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

export default async function TravelTypeDetailPage({
  params,
}: {
  params: { locale: PublicLocale; type: string };
}): Promise<JSX.Element> {
  if (!VALID_TYPES.has(params.type as TravelType)) {
    notFound();
  }
  const dict = await getDictionary(params.locale);
  const t = dict.travel[params.type as TravelType];
  const m = TRAVEL_META[params.type as TravelType];

  const reviewsLabel = dict.detail.reviewsCount.replace('{n}', String(m.reviewsCount));
  const hostedByLabel = dict.detail.hostedBy.replace('{name}', m.hostName);
  const yearsLabel = dict.detail.years.replace('{n}', '4');
  const showAllLabel = dict.detail.showAllReviews.replace('{n}', String(m.reviewsCount));

  return (
    <div
      style={{
        background: '#ffffff',
        color: '#222',
        fontFamily: "'Inter', 'Pretendard Variable', system-ui, sans-serif",
        overflowX: 'clip',
        paddingBottom: 96,
      }}
    >
      <MainHeader locale={params.locale} activeKey="travel" activeTab="glowup" t={dict.header} />

      <main style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Hero square + floating chrome */}
        <section
          style={{
            position: 'relative',
            aspectRatio: '1 / 1',
            maxHeight: 520,
            background: `#f2f2f2 url(${m.heroImg}) center / cover`,
          }}
        >
          <Link
            href={`/${params.locale}/glowup/pc`}
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
            1 / 5
          </div>
        </section>

        {/* Title + meta */}
        <section style={{ padding: '20px 22px 0' }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: 0, lineHeight: 1.2 }}>
            {t.title}
          </h1>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, flexWrap: 'wrap' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#222">
              <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
            </svg>
            <strong style={{ fontWeight: 600 }}>{m.rating.toFixed(2)}</strong>
            <span>·</span>
            <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
              {reviewsLabel}
            </span>
            <span>·</span>
            <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>{t.meta}</span>
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
            <div style={{ fontSize: 15, fontWeight: 600 }}>{hostedByLabel}</div>
            <div style={{ fontSize: 13, color: '#6a6a6a', marginTop: 2 }}>
              {dict.detail.verifiedPartner} · {yearsLabel}
            </div>
          </div>
        </section>

        <Divider />

        {/* Why this is special */}
        <section style={{ padding: '0 22px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
            {dict.travel.whySpecial}
          </h2>
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {t.highlights.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <span style={{ flexShrink: 0, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HighlightIcon kind={m.highlightIcons[i] ?? 'check'} />
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

        {/* What's included */}
        <section style={{ padding: '0 22px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{dict.detail.whatsIncluded}</h2>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 11 }}>
            {t.includes.map((line) => (
              <div
                key={line}
                style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: '#3f3f3f' }}
              >
                <div
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, flexShrink: 0,
                    borderRadius: 9999, background: '#fce4ea', color: '#ff385c',
                    fontSize: 12, fontWeight: 700,
                  }}
                >
                  ✓
                </div>
                {line}
              </div>
            ))}
          </div>
        </section>

        <Divider />

        {/* Reviews placeholder */}
        <section style={{ padding: '0 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 18, fontWeight: 700 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#222">
              <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
            </svg>
            <span>{m.rating.toFixed(2)} · {reviewsLabel}</span>
          </div>
          <SampleReview detail={dict.detail} />
          <Link
            href="#"
            style={{
              display: 'inline-block', marginTop: 14,
              fontSize: 14, color: '#222', fontWeight: 600,
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >
            {showAllLabel}
          </Link>
        </section>
      </main>

      {/* Sticky reserve bar */}
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
            <span style={{ fontWeight: 700 }}>₩{m.priceWon.toLocaleString('ko-KR')}</span>
            <span style={{ color: '#6a6a6a', fontWeight: 400 }}>
              {' '}/ {t.priceUnit}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#6a6a6a', marginTop: 2 }}>
            {t.priceNote}
          </div>
        </div>
        <Link
          href={`/${params.locale}/checkout?cat=hotel&sub=${m.key}`}
          style={{
            background: '#ff385c', color: '#fff',
            fontSize: 15, fontWeight: 700,
            padding: '12px 22px', borderRadius: 12,
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          {dict.detail.reserve}
        </Link>
      </div>

      <MainFooter t={dict.siteFooter} localeNative={LOCALE_LABELS[params.locale].native} />
    </div>
  );
}

function SampleReview({ detail }: { detail: Dictionary['detail'] }): JSX.Element {
  return (
    <div
      style={{
        marginTop: 14,
        border: '1px solid #ebebeb',
        borderRadius: 12,
        padding: 18,
      }}
    >
      <p style={{ margin: 0, fontSize: 15, color: '#222', lineHeight: 1.5 }}>
        “{detail.sampleReviewBody}”
      </p>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 30, height: 30, borderRadius: 9999,
            background: 'linear-gradient(135deg, #ffd5b8, #ffe7d0)',
          }}
        />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{detail.sampleReviewerName}</div>
          <div style={{ fontSize: 12, color: '#6a6a6a' }}>{detail.sampleReviewerMeta}</div>
        </div>
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
          <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}
