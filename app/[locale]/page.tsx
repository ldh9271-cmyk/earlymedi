import Link from 'next/link';
import { LOCALE_LABELS, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import { MainHeader } from './_components/main-header';
import { MainFooter } from './_components/main-footer';
import CourseBookingCard from './_components/course-booking-card';
import { LOCALE_TO_BCP47 } from '@/lib/i18n/locales';
import { localizeKoLabel } from '@/lib/i18n/ko-label';
import { localizePriceUnit } from '@/lib/i18n/price-unit';
import { ListingCardPlaceholder, LISTING_PLACEHOLDER_BG } from './_components/listing-card-placeholder';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { hospitalLocaleContent } from '@/drizzle/schema/hospital-locale-content';
import { fetchFeaturedListings, fetchListingsForSurface, type ListingCard } from '@/lib/listings/query';
import { parseSurfaceFilters } from '@/lib/listings/filters';

// force-dynamic because MainHeader (client) uses useSearchParams() for
// the filter pill — Next.js's static prerender refuses that without a
// Suspense boundary. The page already does a DB call per request via
// fetchFeaturedListings, so static prerender was never a win here.
export const dynamic = 'force-dynamic';

/**
 * Patient portal landing — Airbnb design language. Founder-ordered
 * sections (see chat 2026-06-23). "관심 분야를 선택하세요" Categories
 * grid was dropped 2026-06-23 to declutter the home — category entry
 * still lives in the MainHeader sticky strip, so users haven't lost
 * the way in.
 *
 *   1. Hero            — 서울에서 놀면서, 예뻐지는 4박 5일 (crossfade)
 *   2. Programs        — 서울의 인기 뷰티 프로그램 (4 카드)
 *   3. Course          — 베스트셀러 · 올인원 코스 (5단계 일정 + sticky 예약)
 *   4. Foods           — 현지인만 아는 찐맛집 (4 카드)
 *   5. K-pop           — K-팝 성지 탐방 (HYBE/SM/JYP/YG)
 *   6. Hotel + Final CTA — 명동 5성 호텔 + 지금, 가장 빛나는 여행을 시작하세요
 *
 * Every booking CTA (Programs/Course/Hotel/Final) lands in the existing
 * /[locale]/inquiry form, which prefills program/interest and routes
 * the resulting message into /agency/inbox — so Glow-up looks like a
 * standalone marketplace but every lead reaches the agency staff queue
 * through the same channel as Kakao/LINE/WhatsApp inquiries.
 *
 * Korean copy is hardcoded for now (the chat-ordered carousel sections
 * have no existing dict keys); /en /zh /ja still render the same KR
 * strings on this page until dict entries are added in a follow-up.
 * The Categories section is the exception — it uses `dict.categories`
 * which already exists in all four languages.
 */

const IMG_BASE = '/images/glowup-pc';

const HERO_LAYERS = [
  `${IMG_BASE}/79dac510-b190-481f-bff3-acd40a97ced6.jpg`,
  `${IMG_BASE}/00c1f04c-fb00-44c7-b991-2af98bddd6e2.jpg`,
  `${IMG_BASE}/b2e666ae-08b3-480c-8739-f31a1292573b.jpg`,
  `${IMG_BASE}/dd5e57b8-0e0a-4154-8174-8c3c2593a905.jpg`,
];


const COURSE_IMG = `${IMG_BASE}/356620f6-4792-40a8-80a3-337ae86d266f.jpg`;


// Itinerary copy now lives in dict.landing.itinerary (6 locale).
// We just inject the step number at render time.

const COURSE_PROGRAM = '4박 5일 글로우업 코스';

/** Hero crossfade keyframes + mobile responsive overrides. Stored
 *  as a plain string (concatenated lines) instead of a template
 *  literal — SWC's JSX parser occasionally mis-counts braces when a
 *  backtick + CSS `{…}` block sits inside `dangerouslySetInnerHTML`,
 *  which throws a spurious "Unexpected token" on the next JSX tag. */
const PAGE_CSS =
  '@keyframes heroFade { 0% { opacity: 0; } 5% { opacity: 1; } 25% { opacity: 1; } 30% { opacity: 0; } 100% { opacity: 0; } }'
  + '.glowup-hero-layer { position: absolute; inset: 0; background-size: cover; background-position: center; animation: heroFade 24s infinite; }'

  + '@media (max-width: 768px) {'
  + '.m-main { padding: 0 16px !important; }'
  + '.m-section { padding: 32px 0 0 !important; }'
  + '.m-section-h2 { font-size: 18px !important; letter-spacing: -0.3px !important; }'
  + '.m-section-viewall { font-size: 13px !important; }'

  + '.m-hero-wrap { padding: 20px 0 4px !important; }'
  + '.m-hero-card { height: 280px !important; border-radius: 14px !important; }'
  + '.m-hero-text { left: 20px !important; right: 20px !important; top: 50% !important; max-width: none !important; }'
  + '.m-hero-badge { font-size: 11px !important; padding: 5px 10px !important; }'
  + '.m-hero-h1 { font-size: 26px !important; margin-top: 12px !important; letter-spacing: -0.5px !important; line-height: 1.2 !important; }'
  + '.m-hero-p { font-size: 14px !important; margin-top: 10px !important; }'
  + '.m-hero-cta { margin-top: 16px !important; height: 44px !important; line-height: 44px !important; font-size: 15px !important; padding: 0 20px !important; }'

  + '.m-grid-4 { grid-template-columns: repeat(2, 1fr) !important; gap: 14px !important; margin-top: 16px !important; }'
  + '.m-card-name { font-size: 14px !important; }'
  + '.m-card-rating { font-size: 12px !important; }'
  + '.m-card-desc { font-size: 12px !important; line-height: 1.4 !important; }'
  + '.m-card-place { font-size: 12px !important; }'
  + '.m-card-price { font-size: 13px !important; }'

  + '.m-course-grid { grid-template-columns: 1fr !important; gap: 24px !important; }'
  + '.m-course-book { position: static !important; padding: 18px !important; }'
  + '.m-course-name { font-size: 18px !important; }'
  + '.m-course-price { font-size: 18px !important; }'

  + '.m-kpop-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 14px !important; margin-top: 16px !important; }'

  + '.m-hotel-grid { grid-template-columns: 1fr !important; gap: 20px !important; }'
  + '.m-hotel-title { font-size: 18px !important; }'
  + '.m-hotel-rating-num { font-size: 44px !important; }'
  + '.m-hotel-rating-wing { width: 18px !important; height: 44px !important; }'
  + '.m-hotel-amenity { font-size: 14px !important; padding: 10px 0 !important; }'
  + '.m-hotel-promo { font-size: 14px !important; }'
  + '.m-hotel-desc { font-size: 14px !important; }'
  + '.m-hotel-price { font-size: 18px !important; }'
  + '.m-final-cta-section { padding: 44px 0 8px !important; }'
  + '.m-final-cta-h2 { font-size: 22px !important; letter-spacing: -0.3px !important; }'
  + '.m-final-cta-p { font-size: 14px !important; }'
  + '.m-final-cta-actions { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; }'
  + '.m-final-cta-actions > a { width: 100% !important; text-align: center; height: 46px !important; line-height: 44px !important; font-size: 15px !important; padding: 0 !important; }'
  + '}'

  + '@media (min-width: 769px) and (max-width: 1023px) {'
  + '.m-main { padding: 0 24px !important; }'
  + '.m-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }'
  + '.m-kpop-grid { grid-template-columns: repeat(2, 1fr) !important; }'
  + '.m-course-grid { grid-template-columns: 1.4fr 1fr !important; }'
  + '}';

const bookingHref = (locale: PublicLocale, program: string, interest: string): string =>
  `/${locale}/inquiry?program=${encodeURIComponent(program)}&interest=${interest}`;

export default async function PublicLandingPage({
  params,
  searchParams,
}: {
  params: { locale: PublicLocale };
  searchParams: { priceMin?: string; priceMax?: string; minRating?: string; loc?: string };
}): Promise<JSX.Element> {
  const { locale } = params;
  const dict = await getDictionary(locale);
  // 헤더 필터 pill 값 — 모든 카테고리 행에 그대로 적용.
  const flt = parseSurfaceFilters(searchParams);
  const F = { priceMin: flt.priceMin, priceMax: flt.priceMax, minRating: flt.minRating, cities: flt.cities };
  // DB-backed cards. Empty arrays = no curated listings yet → sections
  // fall back to the hardcoded PROGRAMS / FOODS / Hotel samples below
  // so the page never looks empty even before /master/listings is
  // populated.
  // 메인 카테고리 행 구성 (founder 2026-07-24): 카테고리별 대표상품
  // 4개씩 — 패키지여행 → 병원 → 호텔 → 맛집 → 퍼스널컬러 → 헤어샵 →
  // 메이크업샵 → 네일 → 반영구 → 사진 스튜디오 → K팝 순서로 노출.
  // fetchFeaturedListings 는 featured 우선 + 커버 사진 우선 정렬.
  const [
    pkgAll, rowHospitals, rowHotel, rowFood, rowColor, rowHair,
    rowMakeup, rowNail, rowPmu, rowPhoto, rowKpop,
  ] = await Promise.all([
    fetchListingsForSurface({ locale, categories: ['travel_package'], subType: 'package', ...F }),
    fetchLandingHospitals(locale, flt.minRating),
    fetchFeaturedListings({ locale, categories: ['hotel'], limit: 4, ...F }),
    fetchFeaturedListings({ locale, categories: ['food', 'restaurant'], limit: 4, ...F }),
    fetchFeaturedListings({ locale, categories: ['personal_color'], limit: 4, ...F }),
    fetchFeaturedListings({ locale, categories: ['hair'], limit: 4, ...F }),
    fetchFeaturedListings({ locale, categories: ['makeup'], limit: 4, ...F }),
    fetchFeaturedListings({ locale, categories: ['nail'], limit: 4, ...F }),
    fetchFeaturedListings({ locale, categories: ['pmu'], limit: 4, ...F }),
    fetchFeaturedListings({ locale, categories: ['photo_studio'], limit: 4, ...F }),
    fetchFeaturedListings({ locale, categories: ['kpop_tour'], limit: 4, ...F }),
  ]);
  const rowPackage = pkgAll.slice(0, 4);
  // 베스트셀러 코스(예약 위젯) — 패키지 sortOrder 1순위 상품.
  const dbCourse = pkgAll[0] ?? null;
  const d = dict.detail;
  const rows: Array<{ title: string; href: string; cards: RowCard[] }> = [
    { title: dict.travel.package.title, href: `/${locale}/travel/package`, cards: rowPackage.map((l) => listingRowCard(locale, l, d)) },
    { title: dict.header.catHospital, href: `/${locale}/clinics`, cards: rowHospitals.map((h) => hospitalRowCard(locale, h)) },
    { title: dict.pcCategory.hotel.title, href: `/${locale}/glowup/pc/c/hotel`, cards: rowHotel.map((l) => listingRowCard(locale, l, d)) },
    { title: dict.pcCategory.food.title, href: `/${locale}/glowup/pc/c/food`, cards: rowFood.map((l) => listingRowCard(locale, l, d)) },
    { title: dict.pcCategory.color.title, href: `/${locale}/glowup/pc/c/color`, cards: rowColor.map((l) => listingRowCard(locale, l, d)) },
    { title: dict.pcCategory.hair.title, href: `/${locale}/glowup/pc/c/hair`, cards: rowHair.map((l) => listingRowCard(locale, l, d)) },
    { title: dict.pcCategory.makeup.title, href: `/${locale}/glowup/pc/c/makeup`, cards: rowMakeup.map((l) => listingRowCard(locale, l, d)) },
    { title: dict.pcCategory.nail.title, href: `/${locale}/glowup/pc/c/nail`, cards: rowNail.map((l) => listingRowCard(locale, l, d)) },
    { title: dict.pcCategory.pmu.title, href: `/${locale}/glowup/pc/c/pmu`, cards: rowPmu.map((l) => listingRowCard(locale, l, d)) },
    { title: dict.pcCategory.photo.title, href: `/${locale}/glowup/pc/c/photo`, cards: rowPhoto.map((l) => listingRowCard(locale, l, d)) },
    { title: dict.pcCategory.kpop.title, href: `/${locale}/glowup/pc/c/kpop`, cards: rowKpop.map((l) => listingRowCard(locale, l, d)) },
  ];
  return (
    <div
      style={{
        background: '#ffffff',
        fontFamily: "'Inter', 'Airbnb Cereal VF', Circular, -apple-system, system-ui, sans-serif",
        color: '#222222',
        // `overflow-x: clip` instead of hidden so PcHeader's
        // `position: sticky` keeps working — same gotcha as /glowup/pc.
        overflowX: 'clip',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />

      <MainHeader locale={locale} activeKey="all" t={dict.header} />

      <main className="m-main" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px' }}>
        <Hero t={dict.landing} />
        {rows.map((row) =>
          row.cards.length > 0 ? (
            <CategoryRow
              key={row.href}
              title={row.title}
              href={row.href}
              viewAllLabel={dict.landing.sectionViewAll}
              cards={row.cards}
            />
          ) : null,
        )}
        <Course locale={locale} dbCourse={dbCourse} t={dict.landing} />
        <FinalCta locale={locale} t={dict.landing} />
      </main>

      <MainFooter t={dict.siteFooter} localeNative={LOCALE_LABELS[locale].native} locale={locale} />
    </div>
  );
}

// ─── 카테고리 행 (2026-07-24 메인 재구성) ──────────────────────────
// 카테고리별 대표상품 4개 카드 행. 상품/병원 공통 카드 셰이프.
type RowCard = {
  key: string;
  href: string;
  img: string | null;
  name: string;
  rating: string | null;
  sub: string | null;
  price: string | null;
  unit: string;
};

function listingRowCard(locale: PublicLocale, l: ListingCard, d: Dictionary['detail']): RowCard {
  const freeform = typeof l.details.priceRange === 'string' ? (l.details.priceRange as string) : null;
  const price = l.priceWon
    ? `₩${l.priceWon.toLocaleString('ko-KR')}`
    : freeform
      ? localizeKoLabel(freeform, locale)
      : null;
  const unit = l.priceWon ? localizePriceUnit(l.priceUnit, l.category, d.units, locale) : '';
  return {
    key: l.id,
    href: `/${locale}/listings/${l.slug}`,
    img: l.coverImageUrl,
    name: l.title,
    rating: l.rating ? (l.rating / 10).toFixed(1) : null,
    sub: l.locationLabel,
    price,
    unit,
  };
}

type LandingHospital = {
  id: string;
  slug: string;
  name: string;
  coverImageUrl: string | null;
  rating: number | null;
};

function hospitalRowCard(locale: PublicLocale, h: LandingHospital): RowCard {
  return {
    key: h.id,
    href: `/${locale}/clinics/${h.slug}`,
    img: h.coverImageUrl,
    name: h.name,
    rating: h.rating ? (h.rating / 10).toFixed(1) : null,
    sub: null,
    price: null,
    unit: '',
  };
}

/** 병원 행 — hospitals 테이블에서 커버 사진 우선 + 노출순서로 4곳. */
async function fetchLandingHospitals(locale: PublicLocale, minRating: number | null = null): Promise<LandingHospital[]> {
  try {
    const rows = await db
      .select({
        id: hospitals.id,
        slug: hospitals.slug,
        name: hospitals.name,
        coverImageUrl: hospitals.coverImageUrl,
        rating: hospitals.rating,
      })
      .from(hospitals)
      .where(
        minRating && minRating > 0
          ? and(eq(hospitals.countryCode, 'KR'), sql`${hospitals.rating} >= ${minRating}`)
          : eq(hospitals.countryCode, 'KR'),
      )
      .orderBy(sql`(${hospitals.coverImageUrl} IS NULL), ${hospitals.sortOrder} asc, ${hospitals.createdAt} desc`)
      .limit(4);
    if (rows.length === 0) return [];
    const overrides = new Map<string, { name: string | null; coverImageUrl: string | null }>();
    try {
      const lc = await db
        .select({
          hospitalId: hospitalLocaleContent.hospitalId,
          name: hospitalLocaleContent.name,
          coverImageUrl: hospitalLocaleContent.coverImageUrl,
        })
        .from(hospitalLocaleContent)
        .where(
          and(
            inArray(hospitalLocaleContent.hospitalId, rows.map((r) => r.id)),
            eq(hospitalLocaleContent.locale, locale),
          ),
        );
      for (const o of lc) overrides.set(o.hospitalId, o);
    } catch {
      /* locale table missing — keep base */
    }
    return rows.map((r) => {
      const o = overrides.get(r.id);
      return {
        ...r,
        name: o?.name?.trim() || r.name,
        coverImageUrl: o?.coverImageUrl || r.coverImageUrl,
      };
    });
  } catch {
    return [];
  }
}

function CategoryRow({
  title,
  viewAllLabel,
  href,
  cards,
}: {
  title: string;
  viewAllLabel: string;
  href: string;
  cards: RowCard[];
}): JSX.Element {
  return (
    <section className="m-section" style={{ padding: '48px 0 0' }}>
      <SectionHeader title={title} viewAllLabel={viewAllLabel} href={href} />
      <div
        className="m-grid-4"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginTop: 24 }}
      >
        {cards.map((c) => (
          <Link key={c.key} href={c.href} style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
            <div
              style={{
                position: 'relative',
                aspectRatio: '1', borderRadius: 14, overflow: 'hidden',
                background: c.img
                  ? `#f2f2f2 url(${c.img}) center / cover`
                  : LISTING_PLACEHOLDER_BG,
              }}
            >
              {!c.img ? <ListingCardPlaceholder name={c.name} /> : null}
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(0,0,0,0.45)" stroke="#fff" strokeWidth="1.8">
                  <path d="M12 20s-7-4.5-9.2-8.5C1.3 8.7 2.5 5.5 5.5 5.5c1.8 0 2.9 1 3.5 2 .6-1 1.7-2 3.5-2 3 0 4.2 3.2 2.7 6C19 15.5 12 20 12 20z" />
                </svg>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
              <span className="m-card-name" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>{c.name}</span>
              {c.rating ? (
                <span className="m-card-rating" style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#222">
                    <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
                  </svg>
                  {c.rating}
                </span>
              ) : null}
            </div>
            {c.sub ? (
              <div className="m-card-place" style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>{c.sub}</div>
            ) : null}
            {c.price ? (
              <div className="m-card-price" style={{ fontSize: 15, marginTop: 6 }}>
                <span style={{ fontWeight: 600 }}>{c.price}</span>
                {c.unit ? <span style={{ color: '#6a6a6a' }}> / {c.unit}</span> : null}
              </div>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

// 최종 CTA — 기존 HotelAndFinalCta 의 하단 섹션만 분리 (호텔 스포트라이트는
// 카테고리 행으로 대체).
function FinalCta({ locale, t }: { locale: PublicLocale; t: Dictionary['landing'] }): JSX.Element {
  return (
    <section className="m-final-cta-section" style={{ padding: '64px 0 8px', textAlign: 'center' }}>
      <h2 className="m-final-cta-h2" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>
        {t.finalCtaTitle}
      </h2>
      <p
        className="m-final-cta-p"
        style={{
          fontSize: 16, color: '#6a6a6a',
          margin: '12px auto 0', maxWidth: 480, lineHeight: 1.5,
        }}
      >
        {t.finalCtaSubtitle}
      </p>
      <div
        className="m-final-cta-actions"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 12, marginTop: 24,
        }}
      >
        <Link
          href={bookingHref(locale, COURSE_PROGRAM, 'beauty_tour')}
          style={{
            background: '#ff385c', color: '#fff',
            border: 'none', borderRadius: 8,
            height: 48, lineHeight: '48px', padding: '0 28px',
            fontWeight: 500, fontSize: 16,
            cursor: 'pointer', textDecoration: 'none',
          }}
        >
          {t.finalCtaStart}
        </Link>
        <Link
          href={`/${locale}/inquiry`}
          style={{
            background: '#fff', color: '#222',
            border: '1px solid #222', borderRadius: 8,
            height: 48, lineHeight: '46px', padding: '0 26px',
            fontWeight: 500, fontSize: 16,
            cursor: 'pointer', textDecoration: 'none',
          }}
        >
          {t.finalCtaConsult}
        </Link>
      </div>
    </section>
  );
}

// ─── 1. Hero ───────────────────────────────────────────────────────
// CTA jumps to in-page #programs anchor — no locale needed.
function Hero({ t }: { t: Dictionary['landing'] }): JSX.Element {
  return (
    <section className="m-hero-wrap" style={{ padding: '40px 0 8px' }}>
      <div
        className="m-hero-card"
        style={{
          position: 'relative',
          borderRadius: 20,
          overflow: 'hidden',
          height: 360,
          background: `#222 url(${HERO_LAYERS[0]}) center / cover`,
        }}
      >
        {HERO_LAYERS.map((src, i) => (
          <div
            key={i}
            className="glowup-hero-layer"
            style={{ backgroundImage: `url(${src})`, animationDelay: `${i * 6}s` }}
          />
        ))}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 100%)',
          }}
        />
        <div
          className="m-hero-text"
          style={{
            position: 'absolute',
            left: 48, top: '50%', transform: 'translateY(-50%)',
            maxWidth: 520, color: '#fff',
          }}
        >
          <div
            className="m-hero-badge"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#fff', color: '#222',
              fontSize: 13, fontWeight: 600,
              borderRadius: 9999, padding: '6px 12px',
            }}
          >
            <span style={{ color: '#ff385c' }}>★</span> {t.heroBadge}
          </div>
          <h1
            className="m-hero-h1"
            style={{
              fontSize: 40, fontWeight: 700, lineHeight: 1.15,
              margin: '18px 0 0', letterSpacing: '-1px',
            }}
          >
            {t.heroTitleLine1}<br />{t.heroTitleLine2}
          </h1>
          <p
            className="m-hero-p"
            style={{
              fontSize: 16, fontWeight: 400, lineHeight: 1.5,
              margin: '14px 0 0', color: 'rgba(255,255,255,0.92)',
            }}
          >
            {t.heroSubtitle}
          </p>
          <Link
            href={`#programs`}
            className="m-hero-cta"
            style={{
              display: 'inline-block', marginTop: 24,
              background: '#ff385c', color: '#fff',
              border: 'none', borderRadius: 8,
              height: 48, lineHeight: '48px', padding: '0 24px',
              fontWeight: 500, fontSize: 16,
              cursor: 'pointer', textDecoration: 'none',
            }}
          >
            {t.heroCta}
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── 4. Course (베스트셀러 · 올인원 코스) ────────────────────────────
function Course({
  locale,
  dbCourse,
  t,
}: {
  locale: PublicLocale;
  dbCourse: ListingCard | null;
  t: Dictionary['landing'];
}): JSX.Element {
  // 실상품 우선 — 패키지여행 첫 상품(sortOrder ASC)의 제목·이미지·가격·
  // 일정으로 렌더. 예약하기는 해당 상품 checkout 으로 직결. 등록된
  // 패키지가 없으면 기존 가상 코스 콘텐츠로 fallback.
  const detailHref = dbCourse ? `/${locale}/listings/${dbCourse.slug}` : null;
  const courseName = dbCourse?.title ?? t.courseName;
  const courseDesc = dbCourse?.promoLabel
    ? localizeKoLabel(dbCourse.promoLabel, locale)
    : t.courseDesc;
  const courseImg = dbCourse?.coverImageUrl || COURSE_IMG;
  const priceLabel = dbCourse
    ? (dbCourse.priceWon ? `₩${dbCourse.priceWon.toLocaleString('ko-KR')}` : '—')
    : '₩1,890,000';
  const rating = dbCourse?.rating ? (dbCourse.rating / 10).toFixed(1) : '4.9';
  const steps: Array<{ title: string; desc: string }> = (() => {
    if (dbCourse) {
      const i18n = dbCourse.details.itineraryI18n as Record<string, unknown[]> | undefined;
      const raw =
        locale !== 'kr' && i18n && Array.isArray(i18n[locale])
          ? i18n[locale]
          : dbCourse.details.itinerary;
      if (Array.isArray(raw)) {
        const days = raw
          .map((d) => {
            const o = d as { day?: string; title?: string; items?: unknown[] };
            const items = Array.isArray(o.items)
              ? o.items.filter((x): x is string => typeof x === 'string')
              : [];
            return {
              title: [o.day, o.title].filter(Boolean).join(' — '),
              desc: items.slice(0, 2).join(' · '),
            };
          })
          .filter((s) => s.title);
        if (days.length > 0) return days;
      }
    }
    return t.itinerary;
  })();
  const bookHref = dbCourse
    ? '/' + locale + '/checkout?slug=' + encodeURIComponent(dbCourse.slug)
    : bookingHref(locale, COURSE_PROGRAM, 'beauty_tour');
  // 시작일 선택 시 종료일 자동 계산에 쓰는 여행 일수 (3박4일 → 4)
  const durationDays = (() => {
    const raw = dbCourse?.details?.durationDays;
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) && n >= 2 ? n : 5;
  })();
  return (
    <section className="m-section" style={{ padding: '56px 0 0' }}>
      <SectionHeader title={t.courseTitle} viewAllLabel={t.sectionViewAll} href={`/${locale}/travel/package`} />
      <div
        className="m-course-grid"
        style={{
          display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 40,
          marginTop: 24, alignItems: 'start',
        }}
      >
        <div>
          {detailHref ? (
            <Link
              href={detailHref}
              style={{
                display: 'block',
                aspectRatio: '16/10', borderRadius: 20, overflow: 'hidden',
                background: `#f2f2f2 url(${courseImg}) center / cover`,
              }}
            />
          ) : (
            <div
              style={{
                aspectRatio: '16/10', borderRadius: 20, overflow: 'hidden',
                background: `#f2f2f2 url(${courseImg}) center / cover`,
              }}
            />
          )}
          {detailHref ? (
            <Link
              href={detailHref}
              className="m-course-name"
              style={{
                display: 'block',
                fontSize: 21, fontWeight: 700, margin: '24px 0 0',
                color: 'inherit', textDecoration: 'none',
              }}
            >
              {courseName}
            </Link>
          ) : (
            <h3 className="m-course-name" style={{ fontSize: 21, fontWeight: 700, margin: '24px 0 0' }}>
              {courseName}
            </h3>
          )}
          <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 4 }}>
            {courseDesc}
          </div>
          <div style={{ height: 1, background: '#ebebeb', margin: '24px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {steps.map((d, i, arr) => (
              <div key={i} style={{ display: 'flex', gap: 18 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: 9999,
                      background: i === arr.length - 1 ? '#ff385c' : '#222',
                      color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 600, flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  {i < arr.length - 1 ? (
                    <div style={{ width: 2, flex: 1, background: '#ebebeb' }} />
                  ) : null}
                </div>
                <div style={{ paddingBottom: i === arr.length - 1 ? 0 : 22 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{d.title}</div>
                  <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 4, lineHeight: 1.5 }}>
                    {d.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <CourseBookingCard
          bcp47={LOCALE_TO_BCP47[locale]}
          priceLabel={priceLabel}
          priceWon={dbCourse ? dbCourse.priceWon : 1890000}
          durationDays={durationDays}
          bookHref={bookHref}
          labels={{
            perPerson: t.coursePerPerson,
            startDate: t.courseStartDate,
            pax: t.coursePax,
            guest1: t.courseGuest1,
            guestN: t.courseGuestN,
            book: t.courseBook,
            notCharged: t.courseNotCharged,
            interpreter: t.courseInterpreter,
            included: t.courseIncluded,
            thirdRow: dbCourse ? courseDesc : t.courseHotel4,
            total: t.courseTotal,
            rating: dbCourse ? rating : `4.9 · ${t.courseReviews}`,
          }}
        />
      </div>
    </section>
  );
}

// ─── Small reusable bits ───────────────────────────────────────────
function SectionHeader({
  title,
  viewAllLabel,
  href,
}: {
  title: string;
  viewAllLabel: string;
  /** 전체보기 목적지 — 해당 카테고리 목록 페이지. 없으면 라벨 숨김. */
  href?: string;
}): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h2 className="m-section-h2" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.44px', margin: 0 }}>{title}</h2>
      {href ? (
        <Link
          href={href}
          className="m-section-viewall"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            color: '#222', fontSize: 14, fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          {viewAllLabel} <span style={{ fontSize: 16 }}>›</span>
        </Link>
      ) : null}
    </div>
  );
}

