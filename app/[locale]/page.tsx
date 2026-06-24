import Link from 'next/link';
import { LOCALE_LABELS, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import { MainHeader } from './_components/main-header';
import { MainFooter } from './_components/main-footer';
import { fetchFeaturedListings, type ListingCard } from '@/lib/listings/query';

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

type Program = {
  name: string;
  rating: number;
  desc: string;
  place: string;
  price: string;
  featured: boolean;
  img: string;
  interest: string;
};

const PROGRAMS: Program[] = [
  {
    name: '퍼스널 컬러 진단',
    rating: 4.9,
    desc: '전문 컨설턴트 1:1 드레이핑 · 90분',
    place: '강남 스튜디오',
    price: '₩180,000',
    featured: true,
    img: `${IMG_BASE}/65b2c08d-ad5a-411e-a40e-fcbfec808c02.jpg`,
    interest: 'makeup',
  },
  {
    name: '피부 진단 케어',
    rating: 4.8,
    desc: 'AI 피부 분석 + 맞춤 케어 · 120분',
    place: '청담 클리닉',
    price: '₩240,000',
    featured: false,
    img: `${IMG_BASE}/0b3ab66a-79d6-49be-b4f6-8a626ee1fc2d.jpg`,
    interest: 'dermatology',
  },
  {
    name: '프로필 화보 촬영',
    rating: 5.0,
    desc: '헤어·메이크업 + 전문 스튜디오 · 150분',
    place: '성수 스튜디오',
    price: '₩320,000',
    featured: true,
    img: `${IMG_BASE}/10f945b3-775f-4fe8-aab6-7e434cfca9b5.jpg`,
    interest: 'photo_studio',
  },
  {
    name: 'K-뷰티 메이크업 클래스',
    rating: 4.9,
    desc: '아티스트와 1:1 셀프 레슨 · 100분',
    place: '명동 살롱',
    price: '₩150,000',
    featured: false,
    img: `${IMG_BASE}/96a7e0c2-ea2f-4549-8875-a3be3c38c523.jpg`,
    interest: 'makeup',
  },
];

const COURSE_IMG = `${IMG_BASE}/356620f6-4792-40a8-80a3-337ae86d266f.jpg`;
const HOTEL_IMG = `${IMG_BASE}/b6d9c1aa-25f5-4abd-bb32-c74099caddc0.jpg`;

const FOODS = [
  { name: '한우구이',    place: '강남 · ★ 4.9',   booked: true,  img: `${IMG_BASE}/79cf46f3-c412-4e1e-8f72-e15c9e0f609b.jpg` },
  { name: '전주 비빔밥',  place: '북촌 · ★ 4.8',   booked: false, img: `${IMG_BASE}/ee4b88ae-280f-486f-9555-2e4bd4b68131.jpg` },
  { name: '신당동 떡볶이', place: '신당동 · ★ 4.7', booked: true,  img: `${IMG_BASE}/1a4c5d2b-938c-4b65-95d2-c87d556b24a8.jpg` },
  { name: '한정식 반상',  place: '인사동 · ★ 4.9', booked: false, img: `${IMG_BASE}/c9fd4dde-ac1d-49fa-80b3-04139ec41b8c.jpg` },
];

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
}: {
  params: { locale: PublicLocale };
}): Promise<JSX.Element> {
  const { locale } = params;
  const dict = await getDictionary(locale);
  // DB-backed cards. Empty arrays = no curated listings yet → sections
  // fall back to the hardcoded PROGRAMS / FOODS / Hotel samples below
  // so the page never looks empty even before /master/listings is
  // populated.
  const [dbPrograms, dbFoods, dbHotels] = await Promise.all([
    fetchFeaturedListings({
      locale,
      categories: ['personal_color', 'hair', 'makeup', 'photo_studio'],
      limit: 4,
    }),
    fetchFeaturedListings({
      locale,
      categories: ['food', 'restaurant'],
      limit: 4,
    }),
    fetchFeaturedListings({
      locale,
      categories: ['hotel'],
      limit: 1,
    }),
  ]);
  const dbHotel = dbHotels[0] ?? null;
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
        <Programs locale={locale} dbCards={dbPrograms} t={dict.landing} />
        <Course locale={locale} t={dict.landing} />
        <Foods locale={locale} dbCards={dbFoods} t={dict.landing} />
        <KpopRow t={dict.landing} />
        <HotelAndFinalCta locale={locale} dbHotel={dbHotel} t={dict.landing} />
      </main>

      <MainFooter t={dict.siteFooter} localeNative={LOCALE_LABELS[locale].native} />
    </div>
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

// ─── 3. Programs ───────────────────────────────────────────────────
// `dbCards` (from partner_listings, status=approved+featured) takes
// precedence. When empty (migration not yet applied or no curation),
// falls back to the hardcoded PROGRAMS samples so the page stays
// populated. Shape mapping:
//   DB row → { name, rating, desc, place, price, featured, img, interest }
function Programs({
  locale,
  dbCards,
  t,
}: {
  locale: PublicLocale;
  dbCards: ListingCard[];
  t: Dictionary['landing'];
}): JSX.Element {
  const cards: Array<{
    name: string;
    rating: number;
    desc: string;
    place: string;
    price: string;
    featured: boolean;
    img: string;
    interest: string;
    slug: string | null;
  }> = dbCards.length > 0
    ? dbCards.map((d) => ({
        name: d.title,
        rating: d.rating ? d.rating / 10 : 4.9,
        desc: d.description ?? '',
        place: d.locationLabel ?? '',
        price: d.priceWon ? `₩${d.priceWon.toLocaleString('ko-KR')}` : '문의',
        featured: !!d.promoLabel,
        img: d.coverImageUrl ?? '',
        interest: d.interestKey ?? 'makeup',
        slug: d.slug,
      }))
    : PROGRAMS.map((p, i) => ({
        // i18n fallback: image + featured + interest come from the
        // local PROGRAMS table (asset + business logic), text fields
        // override from dict.landing.samplePrograms so /en /zh /ja /ru
        // /vi see translated copy when no DB row exists yet.
        ...p,
        name: t.samplePrograms[i]?.name ?? p.name,
        desc: t.samplePrograms[i]?.desc ?? p.desc,
        place: t.samplePrograms[i]?.place ?? p.place,
        slug: null,
      }));
  return (
    <section id="programs" className="m-section" style={{ padding: '56px 0 0', scrollMarginTop: 200 }}>
      <SectionHeader title={t.programsTitle} viewAllLabel={t.sectionViewAll} />
      <div
        className="m-grid-4"
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
          marginTop: 24,
        }}
      >
        {cards.map((p) => (
          <Link
            key={p.name}
            href={p.slug ? `/${locale}/listings/${p.slug}` : bookingHref(locale, p.name, p.interest)}
            style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
          >
            <div
              style={{
                position: 'relative',
                aspectRatio: '1', borderRadius: 14, overflow: 'hidden',
                background: `#f2f2f2 url(${p.img}) center / cover`,
              }}
            >
              {p.featured ? (
                <div
                  style={{
                    position: 'absolute', top: 12, left: 12,
                    background: '#fff', color: '#222',
                    fontSize: 11, fontWeight: 600,
                    borderRadius: 9999, padding: '5px 11px',
                    boxShadow: 'rgba(0,0,0,0.1) 0 2px 6px',
                  }}
                >
                  {t.programsFeaturedBadge}
                </div>
              ) : null}
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(0,0,0,0.45)" stroke="#fff" strokeWidth="1.8">
                  <path d="M12 20s-7-4.5-9.2-8.5C1.3 8.7 2.5 5.5 5.5 5.5c1.8 0 2.9 1 3.5 2 .6-1 1.7-2 3.5-2 3 0 4.2 3.2 2.7 6C19 15.5 12 20 12 20z" />
                </svg>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
              <span className="m-card-name" style={{ fontSize: 16, fontWeight: 600 }}>{p.name}</span>
              <span className="m-card-rating" style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#222">
                  <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
                </svg>
                {p.rating}
              </span>
            </div>
            <div className="m-card-desc" style={{ fontSize: 14, color: '#6a6a6a', marginTop: 3 }}>{p.desc}</div>
            <div className="m-card-place" style={{ fontSize: 14, color: '#6a6a6a' }}>{p.place}</div>
            <div className="m-card-price" style={{ fontSize: 15, marginTop: 6 }}>
              <span style={{ fontWeight: 600 }}>{p.price}</span>{' '}
              <span style={{ color: '#6a6a6a' }}>{t.programsPerSession}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── 4. Course (베스트셀러 · 올인원 코스) ────────────────────────────
function Course({
  locale,
  t,
}: {
  locale: PublicLocale;
  t: Dictionary['landing'];
}): JSX.Element {
  return (
    <section className="m-section" style={{ padding: '56px 0 0' }}>
      <SectionHeader title={t.courseTitle} viewAllLabel={t.sectionViewAll} />
      <div
        className="m-course-grid"
        style={{
          display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 40,
          marginTop: 24, alignItems: 'start',
        }}
      >
        <div>
          <div
            style={{
              aspectRatio: '16/10', borderRadius: 20, overflow: 'hidden',
              background: `#f2f2f2 url(${COURSE_IMG}) center / cover`,
            }}
          />
          <h3 className="m-course-name" style={{ fontSize: 21, fontWeight: 700, margin: '24px 0 0' }}>
            {t.courseName}
          </h3>
          <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 4 }}>
            {t.courseDesc}
          </div>
          <div style={{ height: 1, background: '#ebebeb', margin: '24px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {t.itinerary.map((d, i, arr) => (
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

        <div
          className="m-course-book"
          style={{
            position: 'sticky', top: 200,
            border: '1px solid #dddddd', borderRadius: 14, padding: 24,
            boxShadow:
              'rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <span className="m-course-price" style={{ fontSize: 21, fontWeight: 700 }}>₩1,890,000</span>{' '}
              <span style={{ fontSize: 15, color: '#6a6a6a' }}>{t.coursePerPerson}</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#222">
                <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
              </svg>
              4.9 · {t.courseReviews}
            </span>
          </div>
          <div
            style={{
              border: '1px solid #c1c1c1', borderRadius: 12,
              marginTop: 18, overflow: 'hidden',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderRight: '1px solid #c1c1c1',
                  borderBottom: '1px solid #c1c1c1',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' }}>{t.courseDeparture}</div>
                <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>{t.courseAddDate}</div>
              </div>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #c1c1c1' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' }}>{t.courseEnd}</div>
                <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>{t.courseAddDate}</div>
              </div>
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' }}>{t.coursePax}</div>
              <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>{t.courseGuest1}</div>
            </div>
          </div>
          <Link
            href={bookingHref(locale, COURSE_PROGRAM, 'beauty_tour')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', marginTop: 16,
              background: '#ff385c', color: '#fff',
              border: 'none', borderRadius: 8, height: 50,
              fontWeight: 500, fontSize: 16,
              cursor: 'pointer', textDecoration: 'none',
            }}
          >
            {t.courseBook}
          </Link>
          <div style={{ textAlign: 'center', fontSize: 14, color: '#6a6a6a', marginTop: 12 }}>
            {t.courseNotCharged}
          </div>
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
            <RowBreakdown label={`₩1,890,000 × 1 ${t.coursePersonUnit}`} value="₩1,890,000" />
            <RowBreakdown label={t.courseInterpreter} value={t.courseIncluded} />
            <RowBreakdown label={t.courseHotel4} value={t.courseIncluded} />
            <div style={{ height: 1, background: '#ebebeb', margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 16 }}>
              <span>{t.courseTotal}</span>
              <span>₩1,890,000</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 5. Foods ──────────────────────────────────────────────────────
// Same DB-first-with-fallback pattern as Programs. `dbCards` come
// from partner_listings (category in 'food','restaurant').
function Foods({
  locale,
  dbCards,
  t,
}: {
  locale: PublicLocale;
  dbCards: ListingCard[];
  t: Dictionary['landing'];
}): JSX.Element {
  const cards: Array<{
    name: string;
    place: string;
    booked: boolean;
    img: string;
    slug: string | null;
  }> = dbCards.length > 0
    ? dbCards.map((d) => ({
        name: d.title,
        place: d.locationLabel
          ?? (d.rating ? `★ ${(d.rating / 10).toFixed(1)}` : ''),
        booked: !!d.promoLabel,
        img: d.coverImageUrl ?? '',
        slug: d.slug,
      }))
    : FOODS.map((f, i) => ({
        // Same fallback-with-dict-override pattern as Programs above.
        ...f,
        name: t.sampleFoods[i]?.name ?? f.name,
        place: t.sampleFoods[i]?.place ?? f.place,
        slug: null,
      }));
  return (
    <section className="m-section" style={{ padding: '56px 0 0' }}>
      <SectionHeader title={t.foodsTitle} viewAllLabel={t.sectionViewAll} />
      <div
        className="m-grid-4"
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
          marginTop: 24,
        }}
      >
        {cards.map((f) => {
          const cardInner = (
            <>
              <div
                style={{
                  position: 'relative',
                  aspectRatio: '4/5', borderRadius: 14, overflow: 'hidden',
                  background: `#f2f2f2 url(${f.img}) center / cover`,
                }}
              >
                {f.booked ? (
                  <div
                    style={{
                      position: 'absolute', top: 12, left: 12,
                      background: '#fff', color: '#222',
                      fontSize: 8, fontWeight: 700, letterSpacing: '0.32px',
                      borderRadius: 9999, padding: '4px 8px',
                      boxShadow: 'rgba(0,0,0,0.1) 0 2px 6px',
                    }}
                  >
                    {t.foodsBookedBadge}
                  </div>
                ) : null}
                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(0,0,0,0.45)" stroke="#fff" strokeWidth="1.8">
                    <path d="M12 20s-7-4.5-9.2-8.5C1.3 8.7 2.5 5.5 5.5 5.5c1.8 0 2.9 1 3.5 2 .6-1 1.7-2 3.5-2 3 0 4.2 3.2 2.7 6C19 15.5 12 20 12 20z" />
                  </svg>
                </div>
              </div>
              <div className="m-card-name" style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>{f.name}</div>
              <div className="m-card-place" style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>{f.place}</div>
            </>
          );
          return f.slug ? (
            <Link
              key={f.name}
              href={`/${locale}/listings/${f.slug}`}
              style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
            >
              {cardInner}
            </Link>
          ) : (
            <div key={f.name} style={{ cursor: 'pointer' }}>{cardInner}</div>
          );
        })}
      </div>
    </section>
  );
}

// ─── 6. K-pop ──────────────────────────────────────────────────────
// 4-사 카드. founder 가 직접 업로드한 실제 BI 로고를 카드 중앙에
// 배치. HYBE 로고는 흰색 워드마크라 검정 배경, 나머지 3개는 컬러
// 로고라 흰색 배경. 위치 + 성지명 라벨은 카드 아래에 따로 (Programs
// /Foods 카드와 동일한 "이미지 + 텍스트 분리" 패턴).
const KPOP_HOUSES: Array<{
  brand: string;
  area: string;
  spot: string;
  logo: string;
  cardBg: string;
  logoHeightPct: number;
}> = [
  {
    brand: 'HYBE',
    area: '용산',
    spot: 'HYBE 인사이트 박물관',
    logo: '/images/kpop/hybe.png',
    cardBg: '#0c0c0c',
    logoHeightPct: 28,
  },
  {
    brand: 'SM',
    area: '성수',
    spot: 'KWANGYA@SEOUL',
    logo: '/images/kpop/sm.png',
    cardBg: '#ffffff',
    logoHeightPct: 50,
  },
  {
    brand: 'JYP',
    area: '강동',
    spot: 'JYP 사옥 + 굿즈샵',
    logo: '/images/kpop/jyp.png',
    cardBg: '#ffffff',
    logoHeightPct: 65,
  },
  {
    brand: 'YG',
    area: '합정',
    spot: 'YG 사옥 + 카페',
    logo: '/images/kpop/yg.jpg',
    cardBg: '#ffffff',
    logoHeightPct: 55,
  },
];

function KpopRow({ t }: { t: Dictionary['landing'] }): JSX.Element {
  // Brand name + logo + card background stay hardcoded (asset +
  // proper noun), but area/spot text comes from dict so non-Korean
  // visitors see "Yongsan / HYBE Insight Museum" instead of "용산".
  const houses = KPOP_HOUSES.map((h, i) => ({
    ...h,
    area: t.kpopHouses[i]?.area ?? h.area,
    spot: t.kpopHouses[i]?.spot ?? h.spot,
  }));
  return (
    <section className="m-section" style={{ padding: '40px 0 0' }}>
      <h2 className="m-section-h2" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.44px', margin: 0 }}>
        {t.kpopTitle}
      </h2>
      <div
        className="m-kpop-grid"
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
          marginTop: 24,
        }}
      >
        {houses.map((h) => (
          <div key={h.brand}>
            <div
              style={{
                aspectRatio: '16/10', borderRadius: 14, overflow: 'hidden',
                background: h.cardBg,
                border: h.cardBg === '#ffffff' ? '1px solid #ebebeb' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={h.logo}
                alt={`${h.brand} 로고`}
                style={{
                  maxWidth: '70%',
                  maxHeight: `${h.logoHeightPct}%`,
                  objectFit: 'contain',
                }}
              />
            </div>
            <div className="m-card-name" style={{ marginTop: 12, fontSize: 16, fontWeight: 600 }}>{h.brand}</div>
            <div className="m-card-place" style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>
              {h.area} · {h.spot}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── 7. Hotel + Final CTA ──────────────────────────────────────────
// Hotel block reads DB-first (category='hotel', featured=true, first
// row). Fallback values keep the hardcoded "명동 중심 프리미엄 5성
// 호텔" copy when no row is approved yet. Amenities list pulls from
// details.amenities when present (keys: spa/breakfast/rooftop/...),
// otherwise the original 3-item default.
const HOTEL_AMENITY_LABEL: Record<string, string> = {
  spa: '스파 무료 이용',
  breakfast: '조식 뷔페 포함',
  rooftop: '루프탑 무료 이용',
  fitness: '피트니스 무료 이용',
  pool: '수영장 무료 이용',
  sauna: '사우나 무료 이용',
  concierge: '컨시어지 서비스',
  parking: '주차 무료',
};

function HotelAndFinalCta({
  locale,
  dbHotel,
  t,
}: {
  locale: PublicLocale;
  dbHotel: ListingCard | null;
  t: Dictionary['landing'];
}): JSX.Element {
  const hotel = {
    title: dbHotel?.title ?? t.hotelTitle,
    img: dbHotel?.coverImageUrl ?? HOTEL_IMG,
    rating: dbHotel?.rating ? (dbHotel.rating / 10).toFixed(1) : '4.9',
    description: dbHotel?.description ?? t.hotelDescription,
    amenities: (() => {
      const fromDb = Array.isArray(dbHotel?.details.amenities)
        ? (dbHotel?.details.amenities as string[])
            .map((k) => HOTEL_AMENITY_LABEL[k] ?? k)
            .slice(0, 3)
        : [];
      if (fromDb.length > 0) return fromDb;
      return [t.hotelAmenity1, t.hotelAmenity2, t.hotelAmenity3];
    })(),
    priceWon: dbHotel?.priceWon ?? 320_000,
    priceUnit: dbHotel?.priceUnit ?? '박',
    promoLabel: dbHotel?.promoLabel ?? t.hotelPromoLabel,
  };
  return (
    <>
      <section className="m-section" style={{ padding: '56px 0 0' }}>
        <div
          className="m-hotel-grid"
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              aspectRatio: '5/4', borderRadius: 20, overflow: 'hidden',
              background: `#f2f2f2 url(${hotel.img}) center / cover`,
            }}
          />
          <div>
            <div className="m-hotel-title" style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-0.18px' }}>
              {hotel.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 24 }}>
              <svg className="m-hotel-rating-wing" width="26" height="64" viewBox="0 0 26 64" fill="none" stroke="#222" strokeWidth="1.5">
                <path d="M20 4C10 10 8 26 12 40c1.5 5 3 12 2 20" />
              </svg>
              <div style={{ textAlign: 'center' }}>
                <div className="m-hotel-rating-num" style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px' }}>
                  {hotel.rating}
                </div>
              </div>
              <svg className="m-hotel-rating-wing" width="26" height="64" viewBox="0 0 26 64" fill="none" stroke="#222" strokeWidth="1.5">
                <path d="M6 4C16 10 18 26 14 40c-1.5 5-3 12-2 20" />
              </svg>
            </div>
            <div className="m-hotel-promo" style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>{hotel.promoLabel}</div>
            <p
              className="m-hotel-desc"
              style={{
                fontSize: 16, lineHeight: 1.5, color: '#3f3f3f',
                margin: '16px 0 0', maxWidth: 440,
              }}
            >
              {hotel.description}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 20 }}>
              {hotel.amenities.map((amen, idx) => (
                <div
                  key={amen}
                  className="m-hotel-amenity"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 0',
                    borderTop: '1px solid #ebebeb',
                    borderBottom: idx === hotel.amenities.length - 1 ? '1px solid #ebebeb' : undefined,
                    fontSize: 16,
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  {amen}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 22 }}>
              <span className="m-hotel-price" style={{ fontSize: 21, fontWeight: 700 }}>
                ₩{hotel.priceWon.toLocaleString('ko-KR')}
              </span>
              <span style={{ fontSize: 15, color: '#6a6a6a' }}>
                {t.hotelPerNight}
              </span>
            </div>
          </div>
        </div>
      </section>

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
    </>
  );
}

// ─── Small reusable bits ───────────────────────────────────────────
function SectionHeader({
  title,
  viewAllLabel,
}: {
  title: string;
  viewAllLabel: string;
}): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h2 className="m-section-h2" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.44px', margin: 0 }}>{title}</h2>
      <span
        className="m-section-viewall"
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          color: '#222', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {viewAllLabel} <span style={{ fontSize: 16 }}>›</span>
      </span>
    </div>
  );
}

function RowBreakdown({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3f3f3f' }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
