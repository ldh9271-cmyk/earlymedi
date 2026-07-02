import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';

export const dynamic = 'force-dynamic';

/**
 * 뷰티 회복 숙소 — 프리미엄 회복 숙박 상품 상세 페이지.
 *
 * Claude Design 프로젝트에서 임포트한 "뷰티 회복 숙소.dc.html" 을
 * EarlyMedi 앱 구조에 맞춰 재구현. Airbnb-style 5-panel 갤러리 +
 * 타이틀 + 가격 카드. 실제 이미지는 stock 파스텔 그라디언트로
 * 대체(디자인 원본과 동일한 톤). 나중에 파트너 사진 확보되면
 * 배경만 교체하면 됨.
 *
 * 라우트: /{locale}/programs/beauty-recovery
 * 링크: 카테고리 strip 의 호텔/여행 slot 에서 프로모션으로 연결 예정.
 */

const SCENES: ReadonlyArray<{
  key: string;
  caption: string;
  gradient: string;
  stroke: string;
  path: string;
}> = [
  {
    key: 'skincare',
    caption: '스킨케어 화장대',
    gradient: 'linear-gradient(150deg, #f7eaf0 0%, #f0d7e1 100%)',
    stroke: '#b47695',
    path: 'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z',
  },
  {
    key: 'spa',
    caption: '스파 & 욕조 공간',
    gradient: 'linear-gradient(150deg, #e6efe6 0%, #d2e3d2 100%)',
    stroke: '#6f9070',
    path: 'M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z M6 12V6a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2 M20 19l1 2M4 19l-1 2',
  },
  {
    key: 'amenity',
    caption: '웰컴 어메니티',
    gradient: 'linear-gradient(150deg, #f6efe0 0%, #efe1c7 100%)',
    stroke: '#b79a5f',
    path: 'M4 9h16v11H4z M4 12h16 M12 9V5.5',
  },
  {
    key: 'lounge',
    caption: '라운지 & 휴식 공간',
    gradient: 'linear-gradient(150deg, #e6eef5 0%, #d1e0ec 100%)',
    stroke: '#6f8ba6',
    path: 'M4 14v-2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2 M3 14h18v4H3z M6 18v2M18 18v2',
  },
];

// Airbnb-style 반응형 오버라이드. 인라인 백틱 + CSS 중괄호 조합이
// SWC 파서를 깨뜨리므로 문자열 concat 으로 조립 (feedback_swc_inline_css).
const RESPONSIVE_CSS =
  '@media (max-width: 900px) {'
  + '.br-gallery { flex-direction: column !important; height: auto !important; gap: 12px !important; }'
  + '.br-main { flex: 0 0 auto !important; aspect-ratio: 16/10; }'
  + '.br-grid { grid-template-columns: 1fr 1fr !important; grid-template-rows: 1fr 1fr !important; aspect-ratio: 16/10; }'
  + '.br-title-row { flex-direction: column !important; gap: 20px !important; align-items: stretch !important; }'
  + '.br-price-card { flex: 0 0 auto !important; width: 100% !important; }'
  + '.br-page { padding: 20px 16px 64px !important; }'
  + '.br-h1 { font-size: 22px !important; }'
  + '}'
  + '.br-btn { transition: background 200ms ease, transform 120ms ease; }'
  + '.br-btn:hover { background: #f7f7f7; }'
  + '.br-btn:active { transform: scale(0.94); }';

export default function BeautyRecoveryPage({
  params,
}: {
  params: { locale: PublicLocale };
}): JSX.Element {
  return (
    <section
      className="br-page"
      style={{
        maxWidth: 1120,
        margin: '0 auto',
        padding: '32px 24px 56px',
        fontFamily: 'var(--font-sans, Inter, sans-serif)',
        color: '#222222',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: RESPONSIVE_CSS }} />

      {/* Gallery — 5 panels: 1 main (left, 48%) + 2x2 grid (right) */}
      <div
        className="br-gallery"
        style={{ position: 'relative', display: 'flex', gap: 8, height: 520 }}
      >
        {/* Main panel — 은은한 조명의 회복 침실 */}
        <div
          className="br-main"
          style={{
            position: 'relative',
            overflow: 'hidden',
            flex: '0 0 48%',
            borderRadius: 14,
            background: 'linear-gradient(150deg, #ede2fc 0%, #d9c3f5 58%, #cbb0ef 100%)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(120% 90% at 78% 20%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 55%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '46%',
              background: 'linear-gradient(180deg, rgba(150,110,205,0) 0%, rgba(120,84,175,0.16) 100%)',
            }}
          />
          {/* Bed silhouette shapes */}
          <div
            style={{
              position: 'absolute',
              left: '12%',
              right: '12%',
              bottom: '20%',
              height: '26%',
              borderRadius: '12px 12px 4px 4px',
              background: 'rgba(255,255,255,0.5)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '16%',
              right: '16%',
              bottom: '40%',
              height: '12%',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.6)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '20%',
              bottom: '44%',
              width: '16%',
              height: '8%',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.85)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '20%',
              bottom: '44%',
              width: '16%',
              height: '8%',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.85)',
            }}
          />
          <SceneCaption>은은한 조명의 회복 침실</SceneCaption>

          {/* Back button */}
          <Link
            href={`/${params.locale}`}
            className="br-btn"
            aria-label="뒤로"
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              width: 40,
              height: 40,
              borderRadius: 9999,
              background: '#ffffff',
              boxShadow: 'rgba(0,0,0,0.15) 0 1px 3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#222" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        </div>

        {/* Right 2x2 grid */}
        <div
          className="br-grid"
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: 8,
          }}
        >
          {SCENES.map((s, i) => (
            <div
              key={s.key}
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 14,
                background: s.gradient,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  style={{
                    width: 46,
                    height: 46,
                    strokeWidth: 1.4,
                    fill: 'none',
                    stroke: s.stroke,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                  }}
                >
                  <path d={s.path} />
                </svg>
              </div>
              <SceneCaption>{s.caption}</SceneCaption>
              {/* Pagination badge on the last panel — 1/1 (single set for now). */}
              {i === SCENES.length - 1 ? (
                <div
                  style={{
                    position: 'absolute',
                    right: 12,
                    bottom: 12,
                    padding: '4px 11px',
                    borderRadius: 9999,
                    background: 'rgba(34,34,34,0.72)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  1 / 1
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Share + Save */}
        <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="br-btn"
            aria-label="공유"
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              border: 'none',
              background: '#ffffff',
              boxShadow: 'rgba(0,0,0,0.15) 0 1px 3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15V4" />
              <path d="M8 8l4-4 4 4" />
              <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
            </svg>
          </button>
          <button
            type="button"
            className="br-btn"
            aria-label="저장"
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              border: 'none',
              background: '#ffffff',
              boxShadow: 'rgba(0,0,0,0.15) 0 1px 3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Title + price row */}
      <div
        className="br-title-row"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 40,
          marginTop: 28,
        }}
      >
        <div>
          <h1
            className="br-h1"
            style={{
              margin: '0 0 4px',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            뷰티 회복 숙소 - 1박 (2인 1실 기준)
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: '#717171' }}>프리미엄 숙박</p>
        </div>
        <div
          className="br-price-card"
          style={{
            flex: '0 0 340px',
            border: '1px solid #dddddd',
            borderRadius: 14,
            padding: '22px 24px',
            boxShadow:
              'rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>₩150,000</span>
            <span style={{ fontSize: 15, color: '#717171' }}>/ 인</span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#717171' }}>세금·서비스 수수료 별도</p>
          <Link
            href={`/${params.locale}/inquiry?program=beauty_recovery&interest=hotel`}
            style={{
              display: 'block',
              marginTop: 18,
              padding: '12px 16px',
              borderRadius: 8,
              background: '#ff385c',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            예약 문의
          </Link>
        </div>
      </div>
    </section>
  );
}

function SceneCaption({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div
      style={{
        position: 'absolute',
        left: 16,
        bottom: 14,
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '-0.01em',
        padding: '5px 11px',
        borderRadius: 9999,
        background: 'rgba(255,255,255,0.78)',
        color: '#222222',
      }}
    >
      {children}
    </div>
  );
}
