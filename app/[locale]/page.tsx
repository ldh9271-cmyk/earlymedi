import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
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

const ITINERARY: Array<{ n: number; title: string; desc: string }> = [
  { n: 1, title: '도착 · 퍼스널 컬러 진단', desc: '전용 차량 픽업 · 통역 가이드 · 명동 5성 호텔 체크인' },
  { n: 2, title: '피부 진단 케어 · 한우 다이닝', desc: '스킨 진단 프로그램 · 현지인 추천 한우구이·간장게장' },
  { n: 3, title: 'K-팝 성지 투어 · 화보 촬영', desc: 'HYBE·SM·JYP·YG 탐방 · 프로필 화보 스튜디오' },
  { n: 4, title: '경복궁 · 한강 · 성수 쇼핑', desc: '필수 명소 투어 · 청담·성수 감성 쇼핑' },
  { n: 5, title: '롯데월드 · 출국', desc: '아쿠아리움 · 면세 쇼핑 · 공항 샌딩' },
];

const COURSE_PROGRAM = '4박 5일 글로우업 코스';

const bookingHref = (locale: PublicLocale, program: string, interest: string): string =>
  `/${locale}/inquiry?program=${encodeURIComponent(program)}&interest=${interest}`;

export default async function PublicLandingPage({
  params,
}: {
  params: { locale: PublicLocale };
}): Promise<JSX.Element> {
  const { locale } = params;
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

      <MainHeader locale={locale} activeKey="all" />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px' }}>
        <Hero />
        <Programs locale={locale} dbCards={dbPrograms} />
        <Course locale={locale} />
        <Foods locale={locale} dbCards={dbFoods} />
        <KpopRow />
        <HotelAndFinalCta locale={locale} dbHotel={dbHotel} />
      </main>

      <MainFooter />
    </div>
  );
}

// ─── 1. Hero ───────────────────────────────────────────────────────
// CTA jumps to in-page #programs anchor — no locale needed.
function Hero(): JSX.Element {
  return (
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
          style={{
            position: 'absolute',
            left: 48, top: '50%', transform: 'translateY(-50%)',
            maxWidth: 520, color: '#fff',
          }}
        >
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#fff', color: '#222',
              fontSize: 13, fontWeight: 600,
              borderRadius: 9999, padding: '6px 12px',
            }}
          >
            <span style={{ color: '#ff385c' }}>★</span> 게스트 선호 · 평점 4.9
          </div>
          <h1
            style={{
              fontSize: 40, fontWeight: 700, lineHeight: 1.15,
              margin: '18px 0 0', letterSpacing: '-1px',
            }}
          >
            서울에서 놀면서,<br />예뻐지는 4박 5일
          </h1>
          <p
            style={{
              fontSize: 16, fontWeight: 400, lineHeight: 1.5,
              margin: '14px 0 0', color: 'rgba(255,255,255,0.92)',
            }}
          >
            퍼스널 컬러 진단부터 K-팝 성지, 현지인 찐맛집까지. 노는 사이 더 예뻐지는 올인원 K-뷰티 여행.
          </p>
          <Link
            href={`#programs`}
            style={{
              display: 'inline-block', marginTop: 24,
              background: '#ff385c', color: '#fff',
              border: 'none', borderRadius: 8,
              height: 48, lineHeight: '48px', padding: '0 24px',
              fontWeight: 500, fontSize: 16,
              cursor: 'pointer', textDecoration: 'none',
            }}
          >
            여행 둘러보기
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
}: {
  locale: PublicLocale;
  dbCards: ListingCard[];
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
      }))
    : PROGRAMS;
  return (
    <section id="programs" style={{ padding: '56px 0 0', scrollMarginTop: 200 }}>
      <SectionHeader title="서울의 인기 뷰티 프로그램" />
      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
          marginTop: 24,
        }}
      >
        {cards.map((p) => (
          <Link
            key={p.name}
            href={bookingHref(locale, p.name, p.interest)}
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
                  게스트 선호
                </div>
              ) : null}
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(0,0,0,0.45)" stroke="#fff" strokeWidth="1.8">
                  <path d="M12 20s-7-4.5-9.2-8.5C1.3 8.7 2.5 5.5 5.5 5.5c1.8 0 2.9 1 3.5 2 .6-1 1.7-2 3.5-2 3 0 4.2 3.2 2.7 6C19 15.5 12 20 12 20z" />
                </svg>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{p.name}</span>
              <span style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
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
              <span style={{ color: '#6a6a6a' }}>세션</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── 4. Course (베스트셀러 · 올인원 코스) ────────────────────────────
function Course({ locale }: { locale: PublicLocale }): JSX.Element {
  return (
    <section style={{ padding: '56px 0 0' }}>
      <SectionHeader title="베스트셀러 · 올인원 코스" />
      <div
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
          <h3 style={{ fontSize: 21, fontWeight: 700, margin: '24px 0 0' }}>
            4박 5일 글로우업 코스
          </h3>
          <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 4 }}>
            뷰티 케어 · 찐맛집 · K-팝 성지 · 명소 · 5성 호텔
          </div>
          <div style={{ height: 1, background: '#ebebeb', margin: '24px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {ITINERARY.map((d, i) => (
              <div key={d.n} style={{ display: 'flex', gap: 18 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: 9999,
                      background: i === ITINERARY.length - 1 ? '#ff385c' : '#222',
                      color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 600, flexShrink: 0,
                    }}
                  >
                    {d.n}
                  </div>
                  {i < ITINERARY.length - 1 ? (
                    <div style={{ width: 2, flex: 1, background: '#ebebeb' }} />
                  ) : null}
                </div>
                <div style={{ paddingBottom: i === ITINERARY.length - 1 ? 0 : 22 }}>
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
          style={{
            position: 'sticky', top: 200,
            border: '1px solid #dddddd', borderRadius: 14, padding: 24,
            boxShadow:
              'rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 21, fontWeight: 700 }}>₩1,890,000</span>{' '}
              <span style={{ fontSize: 15, color: '#6a6a6a' }}>/ 1인</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#222">
                <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
              </svg>
              4.9 · 후기 318개
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
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' }}>출발일</div>
                <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>날짜 추가</div>
              </div>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #c1c1c1' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' }}>종료일</div>
                <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>날짜 추가</div>
              </div>
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' }}>인원</div>
              <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>게스트 1명</div>
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
            예약하기
          </Link>
          <div style={{ textAlign: 'center', fontSize: 14, color: '#6a6a6a', marginTop: 12 }}>
            예약 확정 전에는 요금이 청구되지 않습니다
          </div>
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
            <RowBreakdown label="₩1,890,000 × 1인" value="₩1,890,000" />
            <RowBreakdown label="통역 가이드 동행" value="포함" />
            <RowBreakdown label="5성 호텔 4박" value="포함" />
            <div style={{ height: 1, background: '#ebebeb', margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 16 }}>
              <span>총 합계</span>
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
  locale: _locale,
  dbCards,
}: {
  locale: PublicLocale;
  dbCards: ListingCard[];
}): JSX.Element {
  const cards: Array<{
    name: string;
    place: string;
    booked: boolean;
    img: string;
  }> = dbCards.length > 0
    ? dbCards.map((d) => ({
        name: d.title,
        place: d.locationLabel
          ?? (d.rating ? `★ ${(d.rating / 10).toFixed(1)}` : ''),
        booked: !!d.promoLabel,
        img: d.coverImageUrl ?? '',
      }))
    : FOODS;
  return (
    <section style={{ padding: '56px 0 0' }}>
      <SectionHeader title="현지인만 아는 찐맛집" />
      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
          marginTop: 24,
        }}
      >
        {cards.map((f) => (
          <div key={f.name} style={{ cursor: 'pointer' }}>
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
                  예약 대행
                </div>
              ) : null}
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(0,0,0,0.45)" stroke="#fff" strokeWidth="1.8">
                  <path d="M12 20s-7-4.5-9.2-8.5C1.3 8.7 2.5 5.5 5.5 5.5c1.8 0 2.9 1 3.5 2 .6-1 1.7-2 3.5-2 3 0 4.2 3.2 2.7 6C19 15.5 12 20 12 20z" />
                </svg>
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>{f.name}</div>
            <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>{f.place}</div>
          </div>
        ))}
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

function KpopRow(): JSX.Element {
  return (
    <section style={{ padding: '40px 0 0' }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.44px', margin: 0 }}>
        K-팝 성지 탐방
      </h2>
      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
          marginTop: 24,
        }}
      >
        {KPOP_HOUSES.map((h) => (
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
            <div style={{ marginTop: 12, fontSize: 16, fontWeight: 600 }}>{h.brand}</div>
            <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>
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
}: {
  locale: PublicLocale;
  dbHotel: ListingCard | null;
}): JSX.Element {
  const hotel = {
    title: dbHotel?.title ?? '명동 중심 프리미엄 5성 호텔',
    img: dbHotel?.coverImageUrl ?? HOTEL_IMG,
    rating: dbHotel?.rating ? (dbHotel.rating / 10).toFixed(1) : '4.9',
    description:
      dbHotel?.description ??
      '스파·루프탑·조식 뷔페까지 갖춘 명동 중심 호텔에서 4박. 모든 코스 일정의 이동 동선을 가장 가깝게 설계했습니다.',
    amenities: (() => {
      const fromDb = Array.isArray(dbHotel?.details.amenities)
        ? (dbHotel?.details.amenities as string[])
            .map((k) => HOTEL_AMENITY_LABEL[k] ?? k)
            .slice(0, 3)
        : [];
      if (fromDb.length > 0) return fromDb;
      return [
        '스파 · 루프탑 · 피트니스 무료 이용',
        '조식 뷔페 4일 포함',
        '명동·남산·동대문 도보 이동권',
      ];
    })(),
    priceWon: dbHotel?.priceWon ?? 320_000,
    priceUnit: dbHotel?.priceUnit ?? '박',
    promoLabel: dbHotel?.promoLabel ?? '게스트 선호',
  };
  return (
    <>
      <section style={{ padding: '56px 0 0' }}>
        <div
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
            <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-0.18px' }}>
              {hotel.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 24 }}>
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

      <section style={{ padding: '64px 0 8px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>
          지금, 가장 빛나는 여행을 시작하세요
        </h2>
        <p
          style={{
            fontSize: 16, color: '#6a6a6a',
            margin: '12px auto 0', maxWidth: 480, lineHeight: 1.5,
          }}
        >
          날짜와 인원만 정하면, 나머지는 통역 가이드와 함께 완벽하게 준비해 드립니다.
        </p>
        <div
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
            여행 시작하기
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
            1:1 상담
          </Link>
        </div>
      </section>
    </>
  );
}

// ─── Small reusable bits ───────────────────────────────────────────
function SectionHeader({ title }: { title: string }): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.44px', margin: 0 }}>{title}</h2>
      <span
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          color: '#222', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}
      >
        전체 보기 <span style={{ fontSize: 16 }}>›</span>
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
