import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { PublicLocale } from '@/lib/i18n/locales';
import { MainHeader } from '../../../../_components/main-header';
import { MainFooter } from '../../../../_components/main-footer';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { LOCALE_LABELS } from '@/lib/i18n/locales';
import { type PcCategoryKey } from '../../_components/pc-header';
import { CATEGORY_PRODUCTS, type CategoryProduct } from '../../_components/category-products';

export const dynamic = 'force-dynamic';

/**
 * PC category detail — Airbnb-style listing detail page rebuilt
 * 2026-06-25 against the founder's reference mockup.
 *
 * Same hardcoded CATEGORY_PRODUCTS data as before; previously rendered
 * as a 2-col hero+booking-card layout, now stacks into a single mobile
 * column with floating hero controls, a host card, a "Why this is
 * special · 이 프로그램이 특별한 이유" trio, an includes section, a
 * placeholder review, and a fixed-bottom Reserve · 예약 CTA.
 *
 * MainHeader stays at the top so the cross-category strip remains one
 * tap away; the hero's back button just routes to /glowup/pc.
 *
 * Booking still flows through /[locale]/inquiry — same agency inbox
 * pipeline as Kakao / LINE / WhatsApp inquiries.
 */

const VALID_KEYS = new Set<Exclude<PcCategoryKey, 'all'>>([
  'color', 'skin', 'photo', 'makeup', 'kpop', 'food', 'hotel',
]);

export async function generateMetadata({
  params,
}: {
  params: { locale: PublicLocale; key: string };
}) {
  if (!VALID_KEYS.has(params.key as Exclude<PcCategoryKey, 'all'>)) return {};
  const p = CATEGORY_PRODUCTS[params.key as Exclude<PcCategoryKey, 'all'>];
  return { title: `${p.title} — glow-up`, description: p.subtitle };
}

export default async function CategoryDetailPage({
  params,
}: {
  params: { locale: PublicLocale; key: string };
}): Promise<JSX.Element> {
  if (!VALID_KEYS.has(params.key as Exclude<PcCategoryKey, 'all'>)) {
    notFound();
  }
  const p = CATEGORY_PRODUCTS[params.key as Exclude<PcCategoryKey, 'all'>];
  const dict = await getDictionary(params.locale);
  const bookHref = `/${params.locale}/checkout?cat=${p.key}`;
  const titleEn = englishTitleForCategory(p.key);
  const hostName = hostNameForCategory(p.key);
  const highlights = highlightsForCategory(p);

  return (
    <div
      style={{
        background: '#ffffff',
        fontFamily: "'Inter', 'Airbnb Cereal VF', Circular, -apple-system, system-ui, sans-serif",
        color: '#222222',
        overflowX: 'clip',
        paddingBottom: 96,
      }}
    >
      <MainHeader locale={params.locale} activeKey={p.key} activeTab="glowup" t={dict.header} />

      <main style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Hero — 1:1 square with floating chrome */}
        <section
          style={{
            position: 'relative',
            aspectRatio: '1 / 1',
            maxHeight: 520,
            background: `#f2f2f2 url(${p.heroImg}) center / cover`,
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
            {titleEn}
          </h1>
          <div style={{ fontSize: 15, color: '#6a6a6a', marginTop: 4 }}>{p.title}</div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, flexWrap: 'wrap' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#222">
              <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
            </svg>
            <strong style={{ fontWeight: 600 }}>{p.rating.toFixed(2)}</strong>
            <span>·</span>
            <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
              {p.reviewCount} reviews
            </span>
            <span>·</span>
            <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>{p.metaLine}</span>
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
            <div style={{ fontSize: 15, fontWeight: 600 }}>Hosted by {hostName}</div>
            <div style={{ fontSize: 13, color: '#6a6a6a', marginTop: 2 }}>
              Verified partner · 검증 파트너 · 4 yrs
            </div>
          </div>
        </section>

        <Divider />

        {/* Why this is special */}
        <section style={{ padding: '0 22px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
            Why this is special · 이 프로그램이 특별한 이유
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

        {/* What's included — keep the original 4-bullet inclusions list. */}
        <section style={{ padding: '0 22px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>포함 사항 · What&apos;s included</h2>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 11 }}>
            {p.includes.map((line) => (
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

        {/* Reviews */}
        <section style={{ padding: '0 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 18, fontWeight: 700 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#222">
              <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
            </svg>
            <span>{p.rating.toFixed(2)} · {p.reviewCount} reviews</span>
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
            Show all {p.reviewCount} reviews
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
            <span style={{ fontWeight: 700 }}>₩{p.priceWon.toLocaleString('ko-KR')}</span>
            <span style={{ color: '#6a6a6a', fontWeight: 400 }}> / {priceUnitLabel(p)}</span>
          </div>
          <div
            style={{
              fontSize: 12, color: '#222',
              textDecoration: 'underline', textUnderlineOffset: 3,
              marginTop: 2,
            }}
          >
            날짜 선택 · 시간 안내
          </div>
        </div>
        <Link
          href={bookHref}
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

function englishTitleForCategory(key: CategoryProduct['key']): string {
  switch (key) {
    case 'color': return 'Personal color analysis';
    case 'skin': return 'Skincare diagnosis';
    case 'photo': return 'Profile portrait shoot';
    case 'makeup': return 'K-beauty makeup class';
    case 'kpop': return 'K-pop pilgrimage tour';
    case 'food': return 'Premium Korean dining';
    case 'hotel': return '5-star Myeongdong stay';
  }
}

function hostNameForCategory(key: CategoryProduct['key']): string {
  switch (key) {
    case 'color': return 'Glow Studio';
    case 'skin': return 'Cheongdam Skin Lab';
    case 'photo': return 'Seongsu Studio';
    case 'makeup': return 'Myeongdong Beauty Salon';
    case 'kpop': return 'HYBE Tour Concierge';
    case 'food': return 'Cheongdam Hanwoo House';
    case 'hotel': return 'Athere Ambassador Group';
  }
}

function priceUnitLabel(p: CategoryProduct): string {
  if (p.priceUnit === '박') return 'night · 박';
  if (p.priceUnit === '1인') return 'person · 인';
  return 'session · 세션';
}

type Highlight = { icon: 'expert' | 'concierge' | 'check'; title: string; desc: string };

function highlightsForCategory(p: CategoryProduct): Highlight[] {
  switch (p.key) {
    case 'color':
      return [
        { icon: 'expert', title: '1:1 expert consultant', desc: '90-min draping session, personal palette card included. 전문 컨설턴트 1:1 진단.' },
        { icon: 'concierge', title: 'Concierge included', desc: 'Booking, interpreter (EN/中/日) and route all handled. 예약·통역·동선 안내.' },
        { icon: 'check', title: 'No charge until confirmed', desc: 'Free cancellation up to 48h. 예약 확정 전 무료 취소.' },
      ];
    case 'skin':
      return [
        { icon: 'expert', title: 'AI skin diagnosis', desc: 'Pore · pigment · elasticity scored per zone. 모공·색소·탄력 항목별 진단.' },
        { icon: 'concierge', title: '7-day home-care follow-up', desc: 'Personal routine + product recs delivered after the visit. 진단 후 홈케어 가이드.' },
        { icon: 'check', title: 'No charge until confirmed', desc: 'Free cancellation up to 48h. 예약 확정 전 무료 취소.' },
      ];
    case 'photo':
      return [
        { icon: 'expert', title: 'Pro hair + makeup', desc: '1:1 stylist, 4 outfits, 3 concepts in a 150-min session. 헤어·메이크업 + 컨셉 3컷.' },
        { icon: 'concierge', title: '12 retouched digital files', desc: 'Full-resolution edits delivered within 7 days. 보정본 12장 디지털 전달.' },
        { icon: 'check', title: 'No charge until confirmed', desc: 'Free cancellation up to 48h. 예약 확정 전 무료 취소.' },
      ];
    case 'makeup':
      return [
        { icon: 'expert', title: '1:1 K-beauty artist', desc: 'Hands-on self-application coaching, photo allowed. 1:1 셀프 메이크업 레슨.' },
        { icon: 'concierge', title: 'Sample kit + duty-free escort', desc: 'CC cream / lip / shadow samples + optional shopping tour. 샘플 키트 + 면세점 동행 옵션.' },
        { icon: 'check', title: 'No charge until confirmed', desc: 'Free cancellation up to 48h. 예약 확정 전 무료 취소.' },
      ];
    case 'kpop':
      return [
        { icon: 'expert', title: 'HYBE Insight ticket', desc: 'Full exhibition + official goods shop. HYBE 인사이트 입장권 + 굿즈샵.' },
        { icon: 'concierge', title: 'Private van + interpreter', desc: 'HYBE / SM / JYP / YG circuit with photo spots. 4사 성지 동행 + 통역.' },
        { icon: 'check', title: 'No charge until confirmed', desc: 'Free cancellation up to 48h. 예약 확정 전 무료 취소.' },
      ];
    case 'food':
      return [
        { icon: 'expert', title: 'Michelin-listed Hanwoo', desc: '1++ grade beef course with seasonal pairings. 한우 1++ 등급 모듬 코스.' },
        { icon: 'concierge', title: 'Interpreter + reservation', desc: 'EN/中/日 menu interpretation + booking handled. 예약 대행 + 메뉴 통역.' },
        { icon: 'check', title: 'Hotel pickup option', desc: 'Optional private car from Gangnam hotels. 강남권 호텔 픽업·드롭 옵션.' },
      ];
    case 'hotel':
      return [
        { icon: 'expert', title: '5-star Myeongdong location', desc: 'Walking distance to Myeongdong, Namsan, Dongdaemun. 명동·남산·동대문 도보 접근.' },
        { icon: 'concierge', title: 'Spa · rooftop · breakfast included', desc: 'Rooftop pool, sauna, full breakfast buffet for 2. 루프탑 풀 + 사우나 + 조식 2인.' },
        { icon: 'check', title: 'No charge until confirmed', desc: 'Free cancellation up to 48h. 예약 확정 전 무료 취소.' },
      ];
  }
}

function HighlightIcon({ kind }: { kind: Highlight['icon'] }): JSX.Element {
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
