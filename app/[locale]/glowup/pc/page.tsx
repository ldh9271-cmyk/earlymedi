import Link from 'next/link';
import { LOCALE_LABELS, type PublicLocale } from '@/lib/i18n/locales';
import { MainHeader } from '../../_components/main-header';
import { MainFooter } from '../../_components/main-footer';
import { getDictionary } from '@/lib/i18n/get-dictionary';

export const metadata = {
  title: '여행 종류 · glow-up',
  description:
    '자유여행 · 패키지여행 · 연수패키지 — 3가지 K-뷰티 여행 스타일 중 하나를 골라 시작하세요.',
};

// MainHeader uses useSearchParams() for the filter pill which is
// incompatible with static prerender unless wrapped in Suspense.
export const dynamic = 'force-dynamic';

/**
 * 여행 진입 페이지 — 자유여행 / 패키지여행 / 연수패키지 3카드 선택.
 *
 * 2026-06-25 founder 지시로 기존 /glowup/pc 의 hero · programs ·
 * course · foods · k-pop · hotel · final CTA 블록을 모두 제거하고
 * "여행 종류 · Pick your trip style" 한 섹션만 남김. 더 상세한
 * 콘텐츠는 각 카드 클릭 → /checkout?cat=hotel&sub=<key> 흐름에서
 * 이어지고, 추후 sub-key별 전용 랜딩이 생기면 라우팅만 갈아끼우면
 * 된다.
 */

const IMG_BASE = '/images/glowup-pc';

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

export default async function GlowupPcPage({
  params,
}: {
  params: { locale: PublicLocale };
}): Promise<JSX.Element> {
  const dict = await getDictionary(params.locale);
  return (
    <div
      style={{
        background: '#ffffff',
        fontFamily:
          "'Inter', 'Airbnb Cereal VF', Circular, -apple-system, system-ui, sans-serif",
        color: '#222222',
        overflowX: 'clip',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <MainHeader locale={params.locale} activeKey="travel" activeTab="glowup" t={dict.header} />

      <style dangerouslySetInnerHTML={{ __html: TRAVEL_TYPES_CSS }} />
      <section
        className="m-tt-section"
        style={{ flex: 1, maxWidth: 1280, width: '100%', margin: '0 auto', padding: '32px 40px 80px' }}
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

      <MainFooter t={dict.siteFooter} localeNative={LOCALE_LABELS[params.locale].native} />
    </div>
  );
}
