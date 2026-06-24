import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { PublicLocale } from '@/lib/i18n/locales';
import { MainHeader } from '../../../../_components/main-header';
import { MainFooter } from '../../../../_components/main-footer';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { type PcCategoryKey } from '../../_components/pc-header';
import { CATEGORY_PRODUCTS } from '../../_components/category-products';

export const dynamic = 'force-dynamic';

/**
 * Single dynamic route for every PC category detail page.
 *
 * Resolves URL pattern `/[locale]/glowup/pc/c/{color|skin|photo|makeup
 * |kpop|food|hotel}` against the static CATEGORY_PRODUCTS map. Each
 * key renders the same listing-detail layout (hero band on the left,
 * sticky reservation card on the right) with category-specific copy
 * and image.
 *
 * "예약하기" button routes through the existing patient inquiry flow
 * (/[locale]/inquiry?program=…&interest=…), which already prefills
 * the form and lands the message in /agency/inbox. So even though
 * Glow-up looks like a standalone marketplace, every booking gets
 * picked up by the same agency staff workflow as Kakao/LINE/WhatsApp
 * inquiries.
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
  return {
    title: `${p.title} — glow-up`,
    description: p.subtitle,
  };
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
  const bookHref = `/${params.locale}/inquiry?program=${encodeURIComponent(p.title)}&interest=${p.interest}`;
  const dict = await getDictionary(params.locale);

  return (
    <div
      style={{
        background: '#ffffff',
        fontFamily: "'Inter', 'Airbnb Cereal VF', Circular, -apple-system, system-ui, sans-serif",
        color: '#222222',
        overflowX: 'clip',
      }}
    >
      <MainHeader locale={params.locale} activeKey="all" activeTab="glowup" t={dict.header} />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px 80px' }}>
        {/* Breadcrumb-ish back link */}
        <Link
          href={`/${params.locale}/glowup/pc`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            color: '#222', fontSize: 14, fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          ← 모든 카테고리
        </Link>

        <h1
          style={{
            margin: '14px 0 4px',
            fontSize: 26, fontWeight: 700,
            letterSpacing: '-0.5px',
          }}
        >
          {p.title}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#222">
              <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
            </svg>
            {p.rating}
          </span>
          <span style={{ color: '#6a6a6a' }}>· 후기 {p.reviewCount}개</span>
          <span style={{ color: '#6a6a6a' }}>· {p.metaLine}</span>
        </div>

        {/* Hero + reservation card */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 1fr',
            gap: 40,
            marginTop: 24,
            alignItems: 'start',
          }}
        >
          <div>
            <div
              style={{
                aspectRatio: '16/10',
                borderRadius: 20,
                overflow: 'hidden',
                background: `#f2f2f2 url(${p.heroImg}) center / cover`,
              }}
            />
            <h2 style={{ margin: '28px 0 4px', fontSize: 21, fontWeight: 700 }}>
              이 프로그램이 특별한 이유
            </h2>
            <p style={{ marginTop: 6, fontSize: 15, lineHeight: 1.6, color: '#3f3f3f' }}>
              {p.subtitle}. 전담 컨시어지가 예약 · 통역 · 동선 안내까지 한 번에 챙겨드려 해외 환자도
              부담 없이 이용하실 수 있어요.
            </p>

            <div style={{ height: 1, background: '#ebebeb', margin: '24px 0' }} />

            <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 14 }}>포함 사항</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {p.includes.map((line) => (
                <div
                  key={line}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    fontSize: 15, color: '#3f3f3f',
                  }}
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
          </div>

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
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 21, fontWeight: 700 }}>
                  ₩{p.priceWon.toLocaleString('ko-KR')}
                </span>{' '}
                <span style={{ fontSize: 15, color: '#6a6a6a' }}>/ {p.priceUnit}</span>
              </div>
              <span
                style={{
                  fontSize: 14, fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 3,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#222">
                  <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
                </svg>
                {p.rating}
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
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' }}>방문 날짜</div>
                  <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>날짜 추가</div>
                </div>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #c1c1c1' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' }}>시간</div>
                  <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>오전/오후 선택</div>
                </div>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' }}>인원</div>
                <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 2 }}>게스트 1명</div>
              </div>
            </div>

            <Link
              href={bookHref}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', marginTop: 16,
                background: '#ff385c', color: '#fff',
                border: 'none', borderRadius: 8, height: 50,
                fontWeight: 500, fontSize: 16, cursor: 'pointer', textDecoration: 'none',
              }}
            >
              예약하기
            </Link>
            <div
              style={{
                textAlign: 'center', fontSize: 14, color: '#6a6a6a', marginTop: 12,
              }}
            >
              예약 확정 전에는 요금이 청구되지 않습니다
            </div>

            <div
              style={{
                marginTop: 18, display: 'flex', flexDirection: 'column',
                gap: 10, fontSize: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3f3f3f' }}>
                <span>
                  ₩{p.priceWon.toLocaleString('ko-KR')} × 1{p.priceUnit === '박' ? '박' : '인'}
                </span>
                <span>₩{p.priceWon.toLocaleString('ko-KR')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3f3f3f' }}>
                <span>통역 가이드 동행</span>
                <span>포함</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3f3f3f' }}>
                <span>예약 수수료</span>
                <span>무료</span>
              </div>
              <div style={{ height: 1, background: '#ebebeb', margin: '6px 0' }} />
              <div
                style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontWeight: 600, fontSize: 16,
                }}
              >
                <span>총 합계</span>
                <span>₩{p.priceWon.toLocaleString('ko-KR')}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
