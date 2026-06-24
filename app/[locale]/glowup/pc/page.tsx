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
 * 카드 텍스트 (제목·설명·기간) 는 dict.travel.<key> 에서, 이미지·
 * 가격·라우트는 페이지 로컬 TRAVEL_VISUAL 에서 가져온다. 로케일
 * 마다 한국어/영어/중국어/일본어/러시아어/베트남어로 자동 표시.
 */

const IMG_BASE = '/images/glowup-pc';

const TRAVEL_VISUAL: ReadonlyArray<{
  key: 'free' | 'package' | 'training';
  img: string;
  priceFromWon: number;
}> = [
  { key: 'free',     img: `${IMG_BASE}/00c1f04c-fb00-44c7-b991-2af98bddd6e2.jpg`, priceFromWon: 350_000 },
  { key: 'package',  img: `${IMG_BASE}/79dac510-b190-481f-bff3-acd40a97ced6.jpg`, priceFromWon: 2_000_000 },
  { key: 'training', img: `${IMG_BASE}/65b2c08d-ad5a-411e-a40e-fcbfec808c02.jpg`, priceFromWon: 3_000_000 },
];

// Mobile drops to 1-col with tighter spacing; desktop default styles
// below (inline on each element) deliver the wider Airbnb-style PC
// layout — larger hero header, 16:10 cinematic card images, bigger
// type, generous gutters. Tablet (769-1199) sits between: 2-col grid
// with the desktop type scale.
const TRAVEL_TYPES_CSS =
  '@media (max-width: 768px) {'
  + '.m-tt-section { padding: 24px 16px 0 !important; }'
  + '.m-tt-h2 { font-size: 20px !important; letter-spacing: -0.3px !important; }'
  + '.m-tt-sub { font-size: 13px !important; max-width: none !important; }'
  + '.m-tt-grid { grid-template-columns: 1fr !important; gap: 14px !important; margin-top: 18px !important; }'
  + '.m-tt-card-img { aspect-ratio: 16/10 !important; }'
  + '.m-tt-card-body { padding: 18px !important; }'
  + '.m-tt-card-title { font-size: 17px !important; }'
  + '.m-tt-card-desc { font-size: 13px !important; }'
  + '.m-tt-card-foot-row { font-size: 12px !important; }'
  + '}'
  + '@media (min-width: 769px) and (max-width: 1199px) {'
  + '.m-tt-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 28px !important; }'
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
        style={{
          flex: 1,
          maxWidth: 1280,
          width: '100%',
          margin: '0 auto',
          padding: '56px 56px 96px',
        }}
      >
        <h2
          className="m-tt-h2"
          style={{
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: '-0.8px',
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          {dict.travel.sectionTitle}
        </h2>
        <p
          className="m-tt-sub"
          style={{
            fontSize: 16,
            color: '#6a6a6a',
            margin: '12px 0 0',
            maxWidth: 640,
            lineHeight: 1.55,
          }}
        >
          {dict.travel.sectionSubtitle}
        </p>
        <div
          className="m-tt-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 32,
            marginTop: 36,
          }}
        >
          {TRAVEL_VISUAL.map((v) => {
            const t = dict.travel[v.key];
            return (
              <Link
                key={v.key}
                href={`/${params.locale}/travel/${v.key}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid #ebebeb',
                  borderRadius: 18,
                  overflow: 'hidden',
                  background: '#fff',
                  color: 'inherit',
                  textDecoration: 'none',
                  boxShadow: 'rgba(0,0,0,0.02) 0 1px 2px, rgba(0,0,0,0.06) 0 4px 12px',
                  transition: 'box-shadow 160ms ease, transform 160ms ease',
                }}
              >
                <div
                  className="m-tt-card-img"
                  style={{
                    aspectRatio: '16/10',
                    background: `#f2f2f2 url(${v.img}) center / cover`,
                  }}
                />
                <div
                  className="m-tt-card-body"
                  style={{
                    padding: 26,
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                  }}
                >
                  <div
                    className="m-tt-card-title"
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: '-0.3px',
                      lineHeight: 1.2,
                    }}
                  >
                    {t.title}
                  </div>
                  <p
                    className="m-tt-card-desc"
                    style={{
                      fontSize: 15,
                      color: '#3f3f3f',
                      lineHeight: 1.6,
                      margin: '14px 0 0',
                      flex: 1,
                    }}
                  >
                    {t.cardDesc}
                  </p>
                  <div
                    className="m-tt-card-foot-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      marginTop: 20,
                      paddingTop: 16,
                      borderTop: '1px solid #ebebeb',
                      fontSize: 14,
                    }}
                  >
                    <span style={{ color: '#6a6a6a' }}>{t.duration}</span>
                    <span style={{ fontWeight: 700, color: '#222' }}>
                      ₩{v.priceFromWon.toLocaleString('ko-KR')}~
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <MainFooter t={dict.siteFooter} localeNative={LOCALE_LABELS[params.locale].native} />
    </div>
  );
}
