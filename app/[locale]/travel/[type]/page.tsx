import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { PublicLocale } from '@/lib/i18n/locales';
import { MainHeader } from '../../_components/main-header';
import { MainFooter } from '../../_components/main-footer';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { LOCALE_LABELS } from '@/lib/i18n/locales';

export const dynamic = 'force-dynamic';

type TravelType = 'free' | 'package' | 'training';
const VALID_TYPES = new Set<TravelType>(['free', 'package', 'training']);

type TravelTypeContent = {
  key: TravelType;
  titleEn: string;
  titleKr: string;
  metaLine: string;
  rating: number;
  reviewsCount: number;
  hostName: string;
  heroImg: string;
  priceWon: number;
  priceUnitEn: string;
  priceUnitKr: string;
  priceNote: string;
  highlights: ReadonlyArray<{ icon: 'expert' | 'concierge' | 'check'; title: string; desc: string }>;
  includes: ReadonlyArray<string>;
  checkoutHref: (locale: PublicLocale) => string;
};

const IMG_BASE = '/images/glowup-pc';

const TRAVEL_CONTENT: Record<TravelType, TravelTypeContent> = {
  free: {
    key: 'free',
    titleEn: 'Free travel',
    titleKr: '자유여행',
    metaLine: '서울 전역 · 드라이빙 가이드 포함',
    rating: 4.92,
    reviewsCount: 268,
    hostName: 'KoreaGlowUp Concierge',
    heroImg: `${IMG_BASE}/00c1f04c-fb00-44c7-b991-2af98bddd6e2.jpg`,
    priceWon: 350_000,
    priceUnitEn: 'day',
    priceUnitKr: '일',
    priceNote: '드라이빙 가이드 포함 · 1일 이용 기준',
    highlights: [
      { icon: 'concierge', title: 'Driving guide included', desc: '전용 차량 + 가이드 1일 동행. 시술·맛집·호텔 이동 한 번에. 차량·기사 포함가.' },
      { icon: 'expert', title: 'Flexible itinerary', desc: '원하는 시술·맛집·호텔만 골라 일정은 자유롭게. 컨시어지가 예약·통역만 지원.' },
      { icon: 'check', title: 'No charge until confirmed', desc: 'Free cancellation up to 48h. 예약 확정 전 무료 취소.' },
    ],
    includes: [
      '드라이빙 가이드 + 전용 차량 (1일 8시간 기준)',
      '시술·맛집·호텔 통역 (EN / 中 / 日)',
      '예약 대행 (시술 · 식당 · 액티비티)',
      '공항-호텔 픽업·드롭 옵션',
    ],
    checkoutHref: (locale) => `/${locale}/checkout?cat=hotel&sub=free`,
  },
  package: {
    key: 'package',
    titleEn: 'Package travel',
    titleKr: '패키지여행',
    metaLine: '2박 3일~ · 2–4인 1팀 · 명동·강남·청담',
    rating: 4.95,
    reviewsCount: 412,
    hostName: 'KoreaGlowUp Concierge',
    heroImg: `${IMG_BASE}/79dac510-b190-481f-bff3-acd40a97ced6.jpg`,
    priceWon: 2_000_000,
    priceUnitEn: 'team',
    priceUnitKr: '2박 3일 · 1팀',
    priceNote: '2박 3일 기준 · 2–4인 1팀 운영가',
    highlights: [
      { icon: 'expert', title: 'From 2 nights, all-inclusive', desc: '2박 3일부터 호텔·시술·맛집·K-팝이 한 패키지로. 일정 늘리면 추가 비용으로 연장 가능.' },
      { icon: 'concierge', title: '2–4 guests · 1 team', desc: '최소 2인 ~ 최대 4인까지 1팀으로 운영. 전담 컨시어지가 통역·이동·예약·후속 케어를 1팀에 한 명 배정.' },
      { icon: 'check', title: 'No charge until confirmed', desc: 'Free cancellation up to 48h. 예약 확정 전 무료 취소.' },
    ],
    includes: [
      '명동 / 강남 4–5성 호텔 2박 (조식 포함, 연장 시 추가)',
      '퍼스널 컬러 + 피부 진단 + 화보 촬영 중 택 2',
      '한우구이 + 한정식 등 미슐랭 다이닝 2회',
      'HYBE / SM / JYP / YG K-팝 성지 반일 투어',
      '공항 픽업·드롭 + 전 일정 통역 가이드 1명 동행',
    ],
    checkoutHref: (locale) => `/${locale}/checkout?cat=hotel&sub=package`,
  },
  training: {
    key: 'training',
    titleEn: 'Training package',
    titleKr: '연수패키지',
    metaLine: '2박 3일~ · 강남·청담 클리닉 견학',
    rating: 4.9,
    reviewsCount: 87,
    hostName: 'KoreaGlowUp Medical',
    heroImg: `${IMG_BASE}/65b2c08d-ad5a-411e-a40e-fcbfec808c02.jpg`,
    priceWon: 3_000_000,
    priceUnitEn: 'person',
    priceUnitKr: '1인',
    priceNote: '2박 3일 기준 · 1인 (숙박 포함)',
    highlights: [
      { icon: 'expert', title: 'Clinic immersion', desc: '국내 톱티어 성형·피부·치과 클리닉 직접 견학. 실제 시술 시연 + Q&A 세션.' },
      { icon: 'concierge', title: 'Workshop + certification', desc: 'K-뷰티 / K-메디컬 전문가 워크숍과 수료증 발급까지 한 번에.' },
      { icon: 'check', title: 'Customizable from 2 nights', desc: '2박 3일부터 시작, 5일 / 7일 / 10일 연장 가능. 단체·기업 맞춤 커리큘럼.' },
    ],
    includes: [
      '클리닉 견학 2–4곳 (성형 · 피부 · 치과 · 모발 등)',
      '전문가 워크숍 + 수료증',
      '4성급 이상 숙박 2박 + 조식 (연장 시 추가)',
      '의료 통역 전담 (EN / 中 / 日 / 露)',
      '공항 픽업·드롭 + 단체 차량 이동',
    ],
    checkoutHref: (locale) => `/${locale}/checkout?cat=hotel&sub=training`,
  },
};

export async function generateMetadata({
  params,
}: {
  params: { type: string };
}) {
  if (!VALID_TYPES.has(params.type as TravelType)) return {};
  const c = TRAVEL_CONTENT[params.type as TravelType];
  return {
    title: `${c.titleEn} · ${c.titleKr} · glow-up`,
    description: c.priceNote,
  };
}

export default async function TravelTypeDetailPage({
  params,
}: {
  params: { locale: PublicLocale; type: string };
}): Promise<JSX.Element> {
  if (!VALID_TYPES.has(params.type as TravelType)) {
    notFound();
  }
  const c = TRAVEL_CONTENT[params.type as TravelType];
  const dict = await getDictionary(params.locale);

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
            background: `#f2f2f2 url(${c.heroImg}) center / cover`,
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
            {c.titleEn}
          </h1>
          <div style={{ fontSize: 15, color: '#6a6a6a', marginTop: 4 }}>{c.titleKr}</div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, flexWrap: 'wrap' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#222">
              <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
            </svg>
            <strong style={{ fontWeight: 600 }}>{c.rating.toFixed(2)}</strong>
            <span>·</span>
            <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
              {c.reviewsCount} reviews
            </span>
            <span>·</span>
            <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>{c.metaLine}</span>
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
            <div style={{ fontSize: 15, fontWeight: 600 }}>Hosted by {c.hostName}</div>
            <div style={{ fontSize: 13, color: '#6a6a6a', marginTop: 2 }}>
              Verified partner · 검증 파트너 · 4 yrs
            </div>
          </div>
        </section>

        <Divider />

        {/* Why this is special */}
        <section style={{ padding: '0 22px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
            Why this is special · 이 여행이 특별한 이유
          </h2>
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {c.highlights.map((h, i) => (
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

        {/* What's included */}
        <section style={{ padding: '0 22px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>포함 사항 · What&apos;s included</h2>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 11 }}>
            {c.includes.map((line) => (
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
            <span>{c.rating.toFixed(2)} · {c.reviewsCount} reviews</span>
          </div>
          <div
            style={{
              marginTop: 14,
              border: '1px solid #ebebeb',
              borderRadius: 12,
              padding: 18,
            }}
          >
            <p style={{ margin: 0, fontSize: 15, color: '#222', lineHeight: 1.5 }}>
              &ldquo;The consultant was so thorough — I finally know my colors. The concierge even
              booked my next appointment.&rdquo;
            </p>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 30, height: 30, borderRadius: 9999,
                  background: 'linear-gradient(135deg, #ffd5b8, #ffe7d0)',
                }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Sarah</div>
                <div style={{ fontSize: 12, color: '#6a6a6a' }}>United States · March 2026</div>
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
            Show all {c.reviewsCount} reviews
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
            <span style={{ fontWeight: 700 }}>₩{c.priceWon.toLocaleString('ko-KR')}</span>
            <span style={{ color: '#6a6a6a', fontWeight: 400 }}>
              {' '}/ {c.priceUnitEn} · {c.priceUnitKr}
            </span>
          </div>
          <div
            style={{
              fontSize: 12, color: '#6a6a6a',
              marginTop: 2,
            }}
          >
            {c.priceNote}
          </div>
        </div>
        <Link
          href={c.checkoutHref(params.locale)}
          style={{
            background: '#ff385c', color: '#fff',
            fontSize: 15, fontWeight: 700,
            padding: '12px 22px', borderRadius: 12,
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          Reserve · 예약
        </Link>
      </div>

      <MainFooter t={dict.siteFooter} localeNative={LOCALE_LABELS[params.locale].native} />
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
