import Link from 'next/link';
import { LOCALE_LABELS, type PublicLocale } from '@/lib/i18n/locales';
import { MainHeader } from '../../_components/main-header';
import { MainFooter } from '../../_components/main-footer';
import { fetchFeaturedListings } from '@/lib/listings/query';
import { getDictionary } from '@/lib/i18n/get-dictionary';

export const metadata = {
  title: 'glow-up — 서울에서 놀면서, 예뻐지는 4박 5일',
  description:
    '퍼스널 컬러 진단부터 K-팝 성지, 현지인 찐맛집까지. 노는 사이 더 예뻐지는 올인원 K-뷰티 여행.',
};

// force-dynamic for the same reason as /[locale]/page.tsx — MainHeader's
// filter pill calls useSearchParams() which is incompatible with static
// prerender unless wrapped in Suspense. DB calls here also benefit.
export const dynamic = 'force-dynamic';

/**
 * Glow-up PC landing — Airbnb-style desktop home page.
 *
 * Imported from the second claude.ai design (Korea Glow-up Challenge -
 * Airbnb Style.dc). Counterpart to the existing mobile-first Atelier
 * design at /[locale]/glowup (10-screen phone mockup flow). This route
 * targets desktop viewports (1280px max-width) with sticky header,
 * Airbnb-style search pill, category strip, hero, programs grid,
 * sticky-sidebar course detail, food + K-pop, hotel rating moment,
 * inspiration CTA, and 3-column footer.
 *
 * Fidelity-first port:
 *   - All inline styles preserved verbatim from the design HTML.
 *   - UUID image refs replaced with neutral gradient placeholders so
 *     the layout doesn't break (real photos land in a follow-up).
 *   - Hero crossfade animation injected as a scoped <style> block.
 *   - Korean copy preserved exactly — translation comes later.
 *
 * Inter font is loaded via Google Fonts in the (public-portal) layout
 * already; we ensure the same family by inlining the family stack on
 * the root <div>.
 */

// Image assets extracted from the original design's bundled manifest
// (claude.ai standalone HTML → base64+gzip decoded). Served from
// /public/images/glowup-pc/ so they ship with the Next.js build.
// UUIDs preserved as filenames for easy traceability back to the
// design source.
const IMG_BASE = '/images/glowup-pc';

/**
 * Travel-type chooser surfaced at the top of /glowup/pc — what the
 * 여행 header tap was supposed to drill into. Each card maps to a
 * partner_listings.details.subType key so the existing
 * /glowup/pc?sub=<key> param still filters when wired in a follow-up.
 *
 * Click currently routes through /checkout?cat=hotel as a stand-in
 * package so the reservation flow remains demoable; richer per-type
 * landing pages can land later without changing this surface.
 */
const TRAVEL_TYPES: ReadonlyArray<{
  key: 'free' | 'package' | 'training';
  titleKr: string;
  titleEn: string;
  desc: string;
  img: string;
  duration: string;
  priceFromWon: number;
}> = [
  {
    key: 'free',
    titleKr: '자유여행',
    titleEn: 'Free travel',
    desc: '원하는 시술·맛집·호텔만 골라 일정은 자유롭게. 컨시어지가 예약·통역만 지원해요.',
    img: `${IMG_BASE}/00c1f04c-fb00-44c7-b991-2af98bddd6e2.jpg`,
    duration: '3–7박 · 유연 일정',
    priceFromWon: 480_000,
  },
  {
    key: 'package',
    titleKr: '패키지여행',
    titleEn: 'Package travel',
    desc: '4박 5일 호텔·시술·맛집·K-팝 투어 풀패키지. 도착부터 귀국까지 전담 케어.',
    img: `${IMG_BASE}/79dac510-b190-481f-bff3-acd40a97ced6.jpg`,
    duration: '4박 5일 · 고정 일정',
    priceFromWon: 1_890_000,
  },
  {
    key: 'training',
    titleKr: '연수패키지',
    titleEn: 'Training package',
    desc: '의료진·전문가 대상 K-뷰티 · K-메디컬 연수. 클리닉 견학 + 워크숍 + 자격 인증.',
    img: `${IMG_BASE}/65b2c08d-ad5a-411e-a40e-fcbfec808c02.jpg`,
    duration: '5–10일 · 견학+워크숍',
    priceFromWon: 2_400_000,
  },
];

const TRAVEL_TYPES_CSS =
  '@media (max-width: 768px) {'
  + '.m-tt-section { padding: 24px 16px 0 !important; }'
  + '.m-tt-h2 { font-size: 20px !important; }'
  + '.m-tt-sub { font-size: 13px !important; }'
  + '.m-tt-grid { grid-template-columns: 1fr !important; gap: 14px !important; margin-top: 18px !important; }'
  + '.m-tt-card-img { aspect-ratio: 16/10 !important; }'
  + '.m-tt-card-titleEn { font-size: 17px !important; }'
  + '}';

const HERO_LAYERS = [
  `${IMG_BASE}/79dac510-b190-481f-bff3-acd40a97ced6.jpg`,
  `${IMG_BASE}/00c1f04c-fb00-44c7-b991-2af98bddd6e2.jpg`,
  `${IMG_BASE}/b2e666ae-08b3-480c-8739-f31a1292573b.jpg`,
  `${IMG_BASE}/dd5e57b8-0e0a-4154-8174-8c3c2593a905.jpg`,
];

const PROGRAMS = [
  {
    name: '퍼스널 컬러 진단',
    rating: 4.9,
    desc: '전문 컨설턴트 1:1 드레이핑 · 90분',
    place: '강남 스튜디오',
    price: '₩180,000',
    featured: true,
    img: `${IMG_BASE}/65b2c08d-ad5a-411e-a40e-fcbfec808c02.jpg`,
  },
  {
    name: '피부 진단 케어',
    rating: 4.8,
    desc: 'AI 피부 분석 + 맞춤 케어 · 120분',
    place: '청담 클리닉',
    price: '₩240,000',
    featured: false,
    img: `${IMG_BASE}/0b3ab66a-79d6-49be-b4f6-8a626ee1fc2d.jpg`,
  },
  {
    name: '프로필 화보 촬영',
    rating: 5.0,
    desc: '헤어·메이크업 + 전문 스튜디오 · 150분',
    place: '성수 스튜디오',
    price: '₩320,000',
    featured: true,
    img: `${IMG_BASE}/10f945b3-775f-4fe8-aab6-7e434cfca9b5.jpg`,
  },
  {
    name: 'K-뷰티 메이크업 클래스',
    rating: 4.9,
    desc: '아티스트와 1:1 셀프 레슨 · 100분',
    place: '명동 살롱',
    price: '₩150,000',
    featured: false,
    img: `${IMG_BASE}/96a7e0c2-ea2f-4549-8875-a3be3c38c523.jpg`,
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
// We just add the step number `n` at render time.

// Resolve filter pill query into the shape fetchFeaturedListings
// understands. Mirrors the /clinics page's parsing — keep the
// loc→city map in sync.
const LOC_TO_CITY_LISTING: Record<string, string> = {
  gangnam: '강남',
  myeongdong: '명동',
  seongsu: '성수',
  cheongdam: '청담',
  hongdae: '홍대',
  itaewon: '이태원',
};

export default async function GlowupPcPage({
  params,
  searchParams,
}: {
  params: { locale: PublicLocale };
  searchParams: {
    sub?: string;
    priceMin?: string;
    priceMax?: string;
    minRating?: string;
    loc?: string;
  };
}): Promise<JSX.Element> {
  const priceMin = Number(searchParams.priceMin) || null;
  const priceMax = Number(searchParams.priceMax) || null;
  const minRating = Number(searchParams.minRating) || null;
  const cities = (searchParams.loc ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((k) => LOC_TO_CITY_LISTING[k])
    .filter((v): v is string => typeof v === 'string');
  // DB-backed cards — same pattern as /[locale]/page.tsx. Empty
  // arrays fall through to the hardcoded PROGRAMS/FOODS samples so
  // the page never looks empty before /master/listings is populated.
  const dict = await getDictionary(params.locale);
  const filterOpts = { priceMin, priceMax, minRating, cities };
  const [dbPrograms, dbFoods, dbHotels] = await Promise.all([
    fetchFeaturedListings({
      locale: params.locale,
      categories: ['personal_color', 'hair', 'makeup', 'photo_studio'],
      limit: 4,
      ...filterOpts,
    }),
    fetchFeaturedListings({
      locale: params.locale,
      categories: ['food', 'restaurant'],
      limit: 4,
      ...filterOpts,
    }),
    fetchFeaturedListings({
      locale: params.locale,
      categories: ['hotel'],
      limit: 1,
      ...filterOpts,
    }),
  ]);
  const dbHotel = dbHotels[0] ?? null;

  const programs = dbPrograms.length > 0
    ? dbPrograms.map((d) => ({
        name: d.title,
        rating: d.rating ? d.rating / 10 : 4.9,
        desc: d.description ?? '',
        place: d.locationLabel ?? '',
        price: d.priceWon ? `₩${d.priceWon.toLocaleString('ko-KR')}` : '문의',
        featured: !!d.promoLabel,
        img: d.coverImageUrl ?? '',
      }))
    : PROGRAMS.map((p, i) => ({
        // dict fallback for text fields when DB is empty
        ...p,
        name: dict.landing.samplePrograms[i]?.name ?? p.name,
        desc: dict.landing.samplePrograms[i]?.desc ?? p.desc,
        place: dict.landing.samplePrograms[i]?.place ?? p.place,
      }));

  const foods = dbFoods.length > 0
    ? dbFoods.map((d) => ({
        name: d.title,
        place: d.locationLabel
          ?? (d.rating ? `★ ${(d.rating / 10).toFixed(1)}` : ''),
        booked: !!d.promoLabel,
        img: d.coverImageUrl ?? '',
      }))
    : FOODS.map((f, i) => ({
        ...f,
        name: dict.landing.sampleFoods[i]?.name ?? f.name,
        place: dict.landing.sampleFoods[i]?.place ?? f.place,
      }));

  const hotel = {
    title: dbHotel?.title ?? dict.landing.hotelTitle,
    img: dbHotel?.coverImageUrl ?? HOTEL_IMG,
    rating: dbHotel?.rating ? (dbHotel.rating / 10).toFixed(1) : '4.9',
    description:
      dbHotel?.description ??
      dict.landing.hotelDescription,
    priceWon: dbHotel?.priceWon ?? 320_000,
    priceUnit: dbHotel?.priceUnit ?? '박',
    promoLabel: dbHotel?.promoLabel ?? dict.landing.hotelPromoLabel,
  };

  return (
    <div
      style={{
        background: '#ffffff',
        fontFamily:
          "'Inter', 'Airbnb Cereal VF', Circular, -apple-system, system-ui, sans-serif",
        color: '#222222',
        // overflow-x: 'clip' instead of 'hidden' because 'hidden' creates
        // a new scroll container, which kills `position: sticky` on
        // descendants — the header would scroll away with the page
        // instead of pinning to the top. `clip` clips visually without
        // creating a scroll container, so sticky positioning works.
        overflowX: 'clip',
      }}
    >
      {/* Hero crossfade keyframes — scoped to this page via inline <style>. */}
      <style>{`
        @keyframes heroFade {
          0% { opacity: 0; }
          5% { opacity: 1; }
          25% { opacity: 1; }
          30% { opacity: 0; }
          100% { opacity: 0; }
        }
        .glowup-hero-layer {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          animation: heroFade 24s infinite;
        }
      `}</style>

      {/* ===== TOP NAV + CATEGORY STRIP =====
       * Sticky header + category strip extracted to <PcHeader> so the
       * category detail pages (/glowup/pc/c/[key]) get the same shell.
       * The inline implementation below was kept temporarily during
       * refactor — gated under `false &&` so it never renders. Once
       * /c/[key] proves out the shared header we can remove the gated
       * block entirely. */}
      <MainHeader locale={params.locale} activeKey="travel" activeTab="glowup" t={dict.header} />

      {/* ===== TRAVEL TYPE CHOOSER =====
          여행 헤더 탭의 진입점. 자유여행 / 패키지여행 / 연수패키지
          3개 카드로 사용자가 첫 분기를 명확히 선택하게 한다. */}
      <style dangerouslySetInnerHTML={{ __html: TRAVEL_TYPES_CSS }} />
      <section
        className="m-tt-section"
        style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px 0' }}
      >
        <h2 className="m-tt-h2" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>
          여행 종류 · Pick your trip style
        </h2>
        <p className="m-tt-sub" style={{ fontSize: 14, color: '#6a6a6a', margin: '6px 0 0' }}>
          3가지 여행 스타일 중 하나를 골라 시작하세요. 컨시어지가 도착부터 귀국까지 한 번에 챙겨드립니다.
        </p>
        <div
          className="m-tt-grid"
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24,
            marginTop: 24,
          }}
        >
          {TRAVEL_TYPES.map((t) => (
            <Link
              key={t.key}
              href={`/${params.locale}/checkout?cat=hotel&sub=${t.key}`}
              style={{
                display: 'block',
                border: '1px solid #ebebeb', borderRadius: 16,
                overflow: 'hidden', background: '#fff',
                color: 'inherit', textDecoration: 'none',
                boxShadow: 'rgba(0,0,0,0.02) 0 1px 2px, rgba(0,0,0,0.06) 0 4px 12px',
              }}
            >
              <div
                className="m-tt-card-img"
                style={{
                  aspectRatio: '4/3',
                  background: `#f2f2f2 url(${t.img}) center / cover`,
                }}
              />
              <div style={{ padding: 18 }}>
                <div className="m-tt-card-titleEn" style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.3px' }}>
                  {t.titleEn}
                </div>
                <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>{t.titleKr}</div>
                <p style={{ fontSize: 14, color: '#3f3f3f', lineHeight: 1.5, margin: '12px 0 0' }}>
                  {t.desc}
                </p>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: 14, paddingTop: 12, borderTop: '1px solid #ebebeb',
                  }}
                >
                  <span style={{ fontSize: 13, color: '#6a6a6a' }}>{t.duration}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>
                    ₩{t.priceFromWon.toLocaleString('ko-KR')}~
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px' }}>
        {/* ===== HERO STRIP ===== */}
        <section style={{ padding: '40px 0 8px' }}>
          <div
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
                style={{
                  backgroundImage: `url(${src})`,
                  animationDelay: `${i * 6}s`,
                }}
              />
            ))}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 48,
                top: '50%',
                transform: 'translateY(-50%)',
                maxWidth: 520,
                color: '#fff',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#fff',
                  color: '#222',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 9999,
                  padding: '6px 12px',
                }}
              >
                <span style={{ color: '#ff385c' }}>★</span> {dict.landing.heroBadge}
              </div>
              <h1
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  lineHeight: 1.15,
                  margin: '18px 0 0',
                  letterSpacing: '-1px',
                }}
              >
                {dict.landing.heroTitleLine1}<br />{dict.landing.heroTitleLine2}
              </h1>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 400,
                  lineHeight: 1.5,
                  margin: '14px 0 0',
                  color: 'rgba(255,255,255,0.92)',
                }}
              >
                {dict.landing.heroSubtitle}
              </p>
              <Link
                href={`/${params.locale}/glowup`}
                style={{
                  display: 'inline-block',
                  marginTop: 24,
                  background: '#ff385c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  height: 48,
                  lineHeight: '48px',
                  padding: '0 24px',
                  fontWeight: 500,
                  fontSize: 16,
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >
                {dict.landing.heroCta}
              </Link>
            </div>
          </div>
        </section>

        {/* ===== PROGRAMS GRID ===== */}
        <section id="programs" style={{ padding: '48px 0 0' }}>
          <SectionHeader title={dict.landing.programsTitle} viewAllLabel={dict.landing.sectionViewAll} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 24,
              marginTop: 24,
            }}
          >
            {programs.map((p) => (
              <Link
                key={p.name}
                href={`/${params.locale}/glowup/programs`}
                style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: `#f2f2f2 url(${p.img}) center / cover`,
                  }}
                >
                  {p.featured ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        background: '#fff',
                        color: '#222',
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 9999,
                        padding: '5px 11px',
                        boxShadow: 'rgba(0,0,0,0.1) 0 2px 6px',
                      }}
                    >
                      {dict.landing.programsFeaturedBadge}
                    </div>
                  ) : null}
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      width: 30,
                      height: 30,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="rgba(0,0,0,0.45)"
                      stroke="#fff"
                      strokeWidth="1.8"
                    >
                      <path d="M12 20s-7-4.5-9.2-8.5C1.3 8.7 2.5 5.5 5.5 5.5c1.8 0 2.9 1 3.5 2 .6-1 1.7-2 3.5-2 3 0 4.2 3.2 2.7 6C19 15.5 12 20 12 20z" />
                    </svg>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 12,
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{p.name}</span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#222">
                      <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
                    </svg>
                    {p.rating}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 3 }}>{p.desc}</div>
                <div style={{ fontSize: 14, color: '#6a6a6a' }}>{p.place}</div>
                <div style={{ fontSize: 15, marginTop: 6 }}>
                  <span style={{ fontWeight: 600 }}>{p.price}</span>{' '}
                  <span style={{ color: '#6a6a6a' }}>{dict.landing.programsPerSession}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ===== SIGNATURE COURSE ===== */}
        <section id="course" style={{ padding: '56px 0 0' }}>
          <SectionHeader title={dict.landing.courseTitle} viewAllLabel={dict.landing.sectionViewAll} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 1fr',
              gap: 40,
              marginTop: 24,
              alignItems: 'start',
            }}
          >
            {/* left: photo + itinerary */}
            <div>
              <div
                style={{
                  aspectRatio: '16/10',
                  borderRadius: 20,
                  overflow: 'hidden',
                  background: `#f2f2f2 url(${COURSE_IMG}) center / cover`,
                }}
              />
              <h3 style={{ fontSize: 21, fontWeight: 700, margin: '24px 0 0' }}>
                {dict.landing.courseName}
              </h3>
              <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 4 }}>
                {dict.landing.courseDesc}
              </div>
              <div style={{ height: 1, background: '#ebebeb', margin: '24px 0' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {dict.landing.itinerary.map((d, i, arr) => (
                  <div key={i} style={{ display: 'flex', gap: 18 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 9999,
                          background: i === arr.length - 1 ? '#ff385c' : '#222',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 15,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </div>
                      {i < arr.length - 1 ? (
                        <div style={{ width: 2, flex: 1, background: '#ebebeb' }} />
                      ) : null}
                    </div>
                    <div
                      style={{
                        paddingBottom: i === arr.length - 1 ? 0 : 22,
                      }}
                    >
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{d.title}</div>
                      <div
                        style={{
                          fontSize: 14,
                          color: '#6a6a6a',
                          marginTop: 4,
                          lineHeight: 1.5,
                        }}
                      >
                        {d.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* right: sticky reservation card */}
            <div
              style={{
                position: 'sticky',
                top: 200,
                border: '1px solid #dddddd',
                borderRadius: 14,
                padding: 24,
                boxShadow:
                  'rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: 21, fontWeight: 700 }}>₩1,890,000</span>{' '}
                  <span style={{ fontSize: 15, color: '#6a6a6a' }}>{dict.landing.coursePerPerson}</span>
                </div>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#222">
                    <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
                  </svg>
                  4.9 · {dict.landing.courseReviews}
                </span>
              </div>
              <div
                style={{
                  border: '1px solid #c1c1c1',
                  borderRadius: 12,
                  marginTop: 18,
                  overflow: 'hidden',
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
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' }}>{dict.landing.courseDeparture}</div>
                    <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>{dict.landing.courseAddDate}</div>
                  </div>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #c1c1c1',
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' }}>{dict.landing.courseEnd}</div>
                    <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>{dict.landing.courseAddDate}</div>
                  </div>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' }}>{dict.landing.coursePax}</div>
                  <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>{dict.landing.courseGuest1}</div>
                </div>
              </div>
              <Link
                href={`/${params.locale}/glowup/checkout`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  marginTop: 16,
                  background: '#ff385c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  height: 50,
                  fontWeight: 500,
                  fontSize: 16,
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >
                {dict.landing.courseBook}
              </Link>
              <div
                style={{
                  textAlign: 'center',
                  fontSize: 14,
                  color: '#6a6a6a',
                  marginTop: 12,
                }}
              >
                {dict.landing.courseNotCharged}
              </div>
              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                <RowBreakdown label={`₩1,890,000 × 1 ${dict.landing.coursePersonUnit}`} value="₩1,890,000" />
                <RowBreakdown label={dict.landing.courseInterpreter} value={dict.landing.courseIncluded} />
                <RowBreakdown label={dict.landing.courseHotel4} value={dict.landing.courseIncluded} />
                <div style={{ height: 1, background: '#ebebeb', margin: '6px 0' }} />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 600,
                    fontSize: 16,
                  }}
                >
                  <span>{dict.landing.courseTotal}</span>
                  <span>₩1,890,000</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FOOD & K-POP ===== */}
        <section id="explore" style={{ padding: '56px 0 0' }}>
          <SectionHeader title={dict.landing.foodsTitle} viewAllLabel={dict.landing.sectionViewAll} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 24,
              marginTop: 24,
            }}
          >
            {foods.map((f) => (
              <div key={f.name} style={{ cursor: 'pointer' }}>
                <div
                  style={{
                    position: 'relative',
                    aspectRatio: '4/5',
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: `#f2f2f2 url(${f.img}) center / cover`,
                  }}
                >
                  {f.booked ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        background: '#fff',
                        color: '#222',
                        fontSize: 8,
                        fontWeight: 700,
                        letterSpacing: '0.32px',
                        borderRadius: 9999,
                        padding: '4px 8px',
                        boxShadow: 'rgba(0,0,0,0.1) 0 2px 6px',
                      }}
                    >
                      {dict.landing.foodsBookedBadge}
                    </div>
                  ) : null}
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="rgba(0,0,0,0.45)"
                      stroke="#fff"
                      strokeWidth="1.8"
                    >
                      <path d="M12 20s-7-4.5-9.2-8.5C1.3 8.7 2.5 5.5 5.5 5.5c1.8 0 2.9 1 3.5 2 .6-1 1.7-2 3.5-2 3 0 4.2 3.2 2.7 6C19 15.5 12 20 12 20z" />
                    </svg>
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>{f.name}</div>
                <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>{f.place}</div>
              </div>
            ))}
          </div>

          {/* K-pop entertainment row */}
          <h2
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: '-0.44px',
              margin: '40px 0 0',
            }}
          >
            {dict.landing.kpopTitle}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 24,
              marginTop: 24,
            }}
          >
            {['HYBE', 'SM', 'JYP', 'YG'].map((label) => (
              <div
                key={label}
                style={{
                  aspectRatio: '16/10',
                  borderRadius: 14,
                  background: '#222',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 26,
                  letterSpacing: 1,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </section>

        {/* ===== HOTEL ===== */}
        <section id="hotel" style={{ padding: '56px 0 0' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 48,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                aspectRatio: '5/4',
                borderRadius: 20,
                overflow: 'hidden',
                background: `#f2f2f2 url(${hotel.img}) center / cover`,
              }}
            />
            <div>
              <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-0.18px' }}>
                {hotel.title}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  marginTop: 24,
                }}
              >
                <svg width="26" height="64" viewBox="0 0 26 64" fill="none" stroke="#222" strokeWidth="1.5">
                  <path d="M20 4C10 10 8 26 12 40c1.5 5 3 12 2 20" />
                </svg>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px' }}>
                    {hotel.rating}
                  </div>
                </div>
                <svg width="26" height="64" viewBox="0 0 26 64" fill="none" stroke="#222" strokeWidth="1.5">
                  <path d="M6 4C16 10 18 26 14 40c-1.5 5-3 12-2 20" />
                </svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>{hotel.promoLabel}</div>
              <p
                style={{
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: '#3f3f3f',
                  margin: '16px 0 0',
                  maxWidth: 440,
                }}
              >
                {hotel.description}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 20 }}>
                {[
                  dict.landing.hotelAmenity1,
                  dict.landing.hotelAmenity2,
                  dict.landing.hotelAmenity3,
                ].map((amen, idx) => (
                  <div
                    key={amen}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '12px 0',
                      borderTop: '1px solid #ebebeb',
                      borderBottom: idx === 2 ? '1px solid #ebebeb' : undefined,
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
                <span style={{ fontSize: 21, fontWeight: 700 }}>
                  ₩{hotel.priceWon.toLocaleString('ko-KR')}
                </span>
                <span style={{ fontSize: 15, color: '#6a6a6a' }}>
                  / {hotel.priceUnit} · 코스 포함가
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== INSPIRATION CTA ===== */}
        <section style={{ padding: '64px 0 8px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>
            {dict.landing.finalCtaTitle}
          </h2>
          <p
            style={{
              fontSize: 16,
              color: '#6a6a6a',
              margin: '12px auto 0',
              maxWidth: 480,
              lineHeight: 1.5,
            }}
          >
            {dict.landing.finalCtaSubtitle}
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginTop: 24,
            }}
          >
            <Link
              href={`/${params.locale}/glowup`}
              style={{
                background: '#ff385c',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                height: 48,
                lineHeight: '48px',
                padding: '0 28px',
                fontWeight: 500,
                fontSize: 16,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              {dict.landing.finalCtaStart}
            </Link>
            <Link
              href={`/${params.locale}/inquiry`}
              style={{
                background: '#fff',
                color: '#222',
                border: '1px solid #222',
                borderRadius: 8,
                height: 48,
                lineHeight: '46px',
                padding: '0 26px',
                fontWeight: 500,
                fontSize: 16,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              {dict.landing.finalCtaConsult}
            </Link>
          </div>
        </section>
      </main>

      <MainFooter t={dict.siteFooter} localeNative={LOCALE_LABELS[params.locale].native} />
    </div>
  );
}

function SectionHeader({
  title,
  viewAllLabel,
}: {
  title: string;
  viewAllLabel: string;
}): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.44px', margin: 0 }}>{title}</h2>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          color: '#222',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
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
