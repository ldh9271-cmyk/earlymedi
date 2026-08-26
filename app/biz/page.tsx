import Link from 'next/link';
import { BrandLockup } from '../[locale]/_components/brand-mark';

// glowuptour.com/biz — 사업자(파트너) 랜딩.
//
// B2C 포털과 같은 디자인 언어(로즈 #ff385c · Inter · 라운드 카드)로,
// 글로우업투어에 "입점·제휴하려는 사업자" 관점에서 구성한다. 예전의
// SaaS 기능 나열(app/page.tsx)은 earlymedi.vercel.app 루트/로컬 전용으로
// 남고, 브랜드 도메인의 B2B 얼굴은 이 페이지다.

export const metadata = {
  title: '파트너 센터 — 글로우업투어 for Business',
  description:
    '병원·뷰티샵·호텔·여행사·총판을 위한 글로우업투어 파트너 센터. 6개 언어 플랫폼이 외국인 고객의 모객·예약·결제·통역을 대신합니다.',
};

const ROSE = '#ff385c';
const INK = '#222222';
const MUTED = '#6a6a6a';
const LINE = '#ebebeb';
const TINT = '#f7f7f7';
const ROSE_SOFT = '#fff5f7';

const FONT = "'Inter', 'Airbnb Cereal VF', Circular, -apple-system, system-ui, sans-serif";

const CSS = `
  .bz-wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
  .bz-grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .bz-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .bz-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .bz-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .bz-hero-title { font-size: 44px; }
  @media (max-width: 960px) {
    .bz-grid4 { grid-template-columns: repeat(2, 1fr); }
    .bz-grid3 { grid-template-columns: repeat(2, 1fr); }
    .bz-steps { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .bz-wrap { padding: 0 16px; }
    .bz-grid4, .bz-grid3, .bz-grid2, .bz-steps { grid-template-columns: 1fr; }
    .bz-hero-title { font-size: 30px; }
    .bz-hide-m { display: none; }
  }
`;

// ── 콘텐츠 데이터 ─────────────────────────────────────────────

const STATS: Array<[string, string]> = [
  ['113', '제휴 병원·클리닉'],
  ['118', '뷰티·여행 상품'],
  ['6', '개 언어 서비스'],
  ['24/7', 'AI 컨시어지 상담'],
];

const PARTNER_TYPES = [
  {
    emoji: '🏥',
    title: '병원 · 클리닉',
    sub: '성형외과 · 피부과 · 치과 · 검진 · 한방',
    points: [
      '외국인 환자를 6개 언어로 유치 — 상담·통역·예약을 플랫폼이 대신',
      '시술 완료 기준으로만 유치 수수료 정산 (선불·광고비 없음)',
      '의료광고 규정을 지키는 승인 콘텐츠로만 노출',
    ],
    cta: '입점 문의',
  },
  {
    emoji: '💇',
    title: '뷰티 · 라이프스타일',
    sub: '헤어 · 메이크업 · 스튜디오 · 네일 · 퍼스널컬러',
    points: [
      '상품을 등록하면 한·영·중·일·러·베 6개 언어 페이지로 자동 노출',
      '외국인 고객의 예약·결제(다국어 카드결제)를 사이트가 처리',
      'K-뷰티 투어 일정에 편입되어 단체 고객 수요 연결',
    ],
    cta: '입점 문의',
  },
  {
    emoji: '🏨',
    title: '호텔 · 여행 · 맛집',
    sub: '숙박 · 투어 · 다이닝 · 교통',
    points: [
      'K-뷰티 패키지(4박 5일 등)의 구성 상품으로 편입',
      '시술 일정과 회복 기간에 맞춘 일정 연동',
      '패키지 단위 정산으로 개별 모객 부담 없음',
    ],
    cta: '제휴 문의',
  },
  {
    emoji: '🌏',
    title: '총판 · 에이전시',
    sub: '국내·해외 모객 파트너',
    points: [
      '배당 이익(유치 수수료)을 100으로 보고 총판 70% : 회사 30% 정산',
      '전용 QR로 유입 고객이 총판에 영구 귀속 — 실적이 자동 집계',
      '여행상품 판매가의 10% 마진 (결제 시 예비 → 출발일 확정)',
    ],
    cta: '총판 프로그램',
    href: '#distributor',
  },
];

const STEPS = [
  ['입점 신청', '아래 문의로 사업자 정보를 보내면 담당자가 1영업일 내 연락드립니다.'],
  ['상품 · 정보 등록', '전용 콘솔에서 상품·가격·사진을 등록하면 승인 후 게시됩니다.'],
  ['6개 언어 자동 노출', '한 번 등록으로 6개 언어 페이지 생성 + AI 상담이 24시간 응대합니다.'],
  ['예약 · 결제 · 정산', '예약과 다국어 카드결제를 플랫폼이 처리하고 월 1회 정산합니다.'],
];

const PLATFORM_FEATURES = [
  ['🌐', '6개 언어 사이트', '한·영·중·일·러·베 — 등록 한 번으로 전 언어 동시 게시'],
  ['🤖', 'AI 상담 24/7', '언어·시차 상관없이 첫 문의를 받아 사람 컨시어지로 연결'],
  ['🧑‍✈️', '컨시어지 동행', '통역·픽업·일정 확정은 글로우업투어가 직접 수행'],
  ['💳', '다국어 결제창', '영어·일본어·중국어 카드결제(Visa·Master·JCB·UnionPay)'],
  ['📊', '파트너 대시보드', '유입·예약·실적·수당을 실시간 조회, 월 정산서 PDF'],
  ['🛡️', '컴플라이언스', '등록 유치업자 운영 · 의료광고 규정 준수 콘텐츠만 게시'],
];

const TRUST = [
  '보건복지부 등록 외국인환자 유치업자',
  'KOIHA 등록 의료기관만 제휴',
  '의료법 27조 · 의료광고 가이드 준수',
];

// ── 페이지 ────────────────────────────────────────────────────

export default function BizPage(): JSX.Element {
  return (
    <div style={{ background: '#ffffff', color: INK, fontFamily: FONT, minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── 헤더 ── */}
      <header
        style={{
          position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(8px)', borderBottom: `1px solid ${LINE}`,
        }}
      >
        <div className="bz-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <Link href="/kr" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }} aria-label="글로우업투어">
              <BrandLockup height={28} color={ROSE} />
            </Link>
            <span style={{ fontSize: 13, fontWeight: 700, color: MUTED, letterSpacing: 0.3 }}>for Business</span>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/kr" className="bz-hide-m" style={{ fontSize: 14, color: INK, textDecoration: 'none', padding: '8px 12px', borderRadius: 9999 }}>
              고객 사이트
            </Link>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: INK, textDecoration: 'none', padding: '8px 14px', borderRadius: 9999, border: `1px solid ${LINE}` }}>
              파트너 로그인
            </Link>
            <a
              href="#contact"
              style={{
                fontSize: 14, fontWeight: 700, color: '#fff', background: ROSE, textDecoration: 'none',
                padding: '10px 18px', borderRadius: 9999,
              }}
            >
              입점 문의
            </a>
          </nav>
        </div>
      </header>

      {/* ── 히어로 ── */}
      <section style={{ borderBottom: `1px solid ${LINE}`, background: `linear-gradient(180deg, ${ROSE_SOFT} 0%, #ffffff 70%)` }}>
        <div className="bz-wrap" style={{ padding: '72px 24px 64px', textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-block', background: '#fff', border: `1px solid #fecdd3`, color: '#c81e42',
              borderRadius: 9999, padding: '7px 16px', fontSize: 12.5, fontWeight: 700,
            }}
          >
            글로우업투어 파트너 센터
          </span>
          <h1 className="bz-hero-title" style={{ fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.15, margin: '18px auto 0', maxWidth: 760 }}>
            외국인 고객은
            <br />
            글로우업투어가 데려다드립니다
          </h1>
          <p style={{ fontSize: 17, color: MUTED, lineHeight: 1.65, margin: '16px auto 0', maxWidth: 640 }}>
            6개 언어 사이트와 AI 상담, 컨시어지가 모객부터 예약·결제·통역까지 대신합니다.
            사업자님은 <b style={{ color: INK }}>서비스에만 집중</b>하세요 — 정산은 실적이 생길 때만.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
            <a
              href="#contact"
              style={{ background: ROSE, color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 9999 }}
            >
              입점·제휴 문의하기
            </a>
            <a
              href="#distributor"
              style={{ background: '#fff', color: INK, textDecoration: 'none', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 9999, border: `1px solid ${INK}` }}
            >
              총판 프로그램 (70:30)
            </a>
          </div>
          {/* 숫자 밴드 */}
          <div className="bz-grid4" style={{ marginTop: 52, maxWidth: 860, marginLeft: 'auto', marginRight: 'auto' }}>
            {STATS.map(([n, label]) => (
              <div key={label} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, padding: '18px 12px' }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: ROSE }}>{n}</div>
                <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 파트너 유형 ── */}
      <section style={{ borderBottom: `1px solid ${LINE}` }}>
        <div className="bz-wrap" style={{ padding: '64px 24px' }}>
          <SectionHead
            eyebrow="누구를 위한 플랫폼인가"
            title="네 가지 파트너, 하나의 플랫폼"
            lead="고객 사이트의 카테고리 그대로 — 병원부터 총판까지 같은 고객 여정 안에서 함께 일합니다."
          />
          <div className="bz-grid2" style={{ marginTop: 36 }}>
            {PARTNER_TYPES.map((p) => (
              <div key={p.title} style={{ border: `1px solid ${LINE}`, borderRadius: 20, padding: 26, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 30, width: 52, height: 52, borderRadius: 14, background: ROSE_SOFT, display: 'grid', placeItems: 'center' }}>{p.emoji}</div>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 800 }}>{p.title}</div>
                    <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{p.sub}</div>
                  </div>
                </div>
                <ul style={{ margin: '16px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 9, flex: 1 }}>
                  {p.points.map((pt) => (
                    <li key={pt} style={{ fontSize: 14, color: INK, lineHeight: 1.55, display: 'flex', gap: 8 }}>
                      <span style={{ color: ROSE, fontWeight: 800 }}>✓</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={p.href ?? '#contact'}
                  style={{
                    marginTop: 18, alignSelf: 'flex-start', fontSize: 13.5, fontWeight: 700, color: ROSE,
                    textDecoration: 'none', border: `1px solid #fecdd3`, background: ROSE_SOFT, borderRadius: 9999, padding: '9px 18px',
                  }}
                >
                  {p.cta} →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 이용 절차 ── */}
      <section style={{ borderBottom: `1px solid ${LINE}`, background: TINT }}>
        <div className="bz-wrap" style={{ padding: '64px 24px' }}>
          <SectionHead
            eyebrow="이용 절차"
            title="등록 한 번, 나머지는 플랫폼이"
            lead="복잡한 세팅 없이 4단계로 시작합니다."
          />
          <div className="bz-steps" style={{ marginTop: 36 }}>
            {STEPS.map(([title, body], i) => (
              <div key={title} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, padding: 22 }}>
                <div
                  style={{
                    width: 34, height: 34, borderRadius: 9999, background: ROSE, color: '#fff',
                    display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 800,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 14 }}>{title}</div>
                <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.6, margin: '6px 0 0' }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 총판 프로그램 ── */}
      <section id="distributor" style={{ borderBottom: `1px solid ${LINE}` }}>
        <div className="bz-wrap" style={{ padding: '64px 24px' }}>
          <div style={{ background: INK, borderRadius: 24, padding: '44px 34px', color: '#fff', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: ROSE }}>MASTER DISTRIBUTOR · 총판 프로그램</span>
              <h2 style={{ fontSize: 30, fontWeight: 800, margin: '10px 0 0', letterSpacing: '-0.5px' }}>
                배당 이익을 100으로, <span style={{ color: ROSE }}>총판 70 : 회사 30</span>
              </h2>
              <p style={{ fontSize: 15, color: '#b8b0bc', lineHeight: 1.65, margin: '12px 0 0', maxWidth: 640 }}>
                시술 정산 비용(병원 유치 수수료)을 배당 이익 100%로 보고 딱 한 번 나눕니다.
                배분표 없이 숫자 하나 — 하위 추천인 보상은 총판이 70% 안에서 자유롭게 설계합니다.
              </p>
              <div className="bz-grid3" style={{ marginTop: 26 }}>
                {[
                  ['70%', '시술 정산 비용 중 총판 몫', '성형 수수료 30% · 피부 20% 기준, 시술 완료 + 14일 확정'],
                  ['10%', '여행상품 판매 마진', '패키지 판매가 기준 — 결제 시 예비 적립, 출발일 확정'],
                  ['QR', '고객 영구 귀속', '전용 QR로 가입한 고객의 실적이 총판에 자동 집계'],
                ].map(([big, t, b]) => (
                  <div key={t} style={{ background: '#2a252f', borderRadius: 16, padding: 20 }}>
                    <div style={{ fontSize: 30, fontWeight: 800, color: ROSE }}>{big}</div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 6 }}>{t}</div>
                    <div style={{ fontSize: 12.5, color: '#b8b0bc', lineHeight: 1.55, marginTop: 4 }}>{b}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 26 }}>
                <a
                  href="#contact"
                  style={{ background: ROSE, color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14.5, padding: '12px 24px', borderRadius: 9999 }}
                >
                  총판 상담 신청
                </a>
                <span style={{ fontSize: 12.5, color: '#b8b0bc' }}>제안서 제공: 한국어 · English · 日本語 · 中文 · Русский · Tiếng Việt</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 플랫폼 제공 기능 ── */}
      <section style={{ borderBottom: `1px solid ${LINE}` }}>
        <div className="bz-wrap" style={{ padding: '64px 24px' }}>
          <SectionHead
            eyebrow="플랫폼이 대신하는 일"
            title="사업자가 하기 어려운 일만 골라서"
            lead="다국어·결제·통역·컴플라이언스 — 혼자 갖추기 어려운 것들을 플랫폼이 제공합니다."
          />
          <div className="bz-grid3" style={{ marginTop: 36 }}>
            {PLATFORM_FEATURES.map(([emoji, t, b]) => (
              <div key={t} style={{ border: `1px solid ${LINE}`, borderRadius: 16, padding: 22 }}>
                <div style={{ fontSize: 26 }}>{emoji}</div>
                <div style={{ fontSize: 15.5, fontWeight: 800, marginTop: 10 }}>{t}</div>
                <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.6, margin: '5px 0 0' }}>{b}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
            {TRUST.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 12.5, fontWeight: 600, color: '#1f7a5c', background: '#e7f4ee',
                  borderRadius: 9999, padding: '7px 14px',
                }}
              >
                ✓ {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 문의 CTA ── */}
      <section id="contact">
        <div className="bz-wrap" style={{ padding: '72px 24px 80px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>
            글로우업투어와 함께 시작하세요
          </h2>
          <p style={{ fontSize: 15.5, color: MUTED, margin: '12px auto 0', maxWidth: 520, lineHeight: 1.65 }}>
            업종과 연락처를 보내주시면 담당자가 <b style={{ color: INK }}>1영업일 내</b> 입점 절차와 정산 조건을 안내드립니다.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 26 }}>
            <a
              href="mailto:hello@koreaglowup.com?subject=%5B%EC%9E%85%EC%A0%90%C2%B7%EC%A0%9C%ED%9C%B4%20%EB%AC%B8%EC%9D%98%5D&body=%EC%97%85%EC%B2%B4%EB%AA%85%3A%0A%EC%97%85%EC%A2%85(%EB%B3%91%EC%9B%90%2F%EB%B7%B0%ED%8B%B0%2F%ED%98%B8%ED%85%94%C2%B7%EC%97%AC%ED%96%89%2F%EC%B4%9D%ED%8C%90)%3A%0A%EC%97%B0%EB%9D%BD%EC%B2%98%3A%0A%EB%AC%B8%EC%9D%98%20%EB%82%B4%EC%9A%A9%3A%0A"
              style={{ background: ROSE, color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 15, padding: '14px 30px', borderRadius: 9999 }}
            >
              이메일로 문의하기
            </a>
            <Link
              href="/login"
              style={{ background: '#fff', color: INK, textDecoration: 'none', fontWeight: 700, fontSize: 15, padding: '14px 30px', borderRadius: 9999, border: `1px solid ${LINE}` }}
            >
              기존 파트너 로그인
            </Link>
          </div>
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer style={{ borderTop: `1px solid ${LINE}`, background: TINT }}>
        <div
          className="bz-wrap"
          style={{ padding: '28px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', fontSize: 12.5, color: MUTED }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrandLockup height={20} color={ROSE} />
            <span>© {new Date().getFullYear()} 글로우업투어 (KoreaGlowUp) · 파트너 센터</span>
          </div>
          <nav style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <Link href="/kr" style={{ color: MUTED, textDecoration: 'none' }}>고객 사이트</Link>
            <Link href="/legal/privacy" style={{ color: MUTED, textDecoration: 'none' }}>개인정보처리방침</Link>
            <Link href="/legal/terms" style={{ color: MUTED, textDecoration: 'none' }}>이용약관</Link>
            <a href="mailto:hello@koreaglowup.com" style={{ color: MUTED, textDecoration: 'none' }}>hello@koreaglowup.com</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }): JSX.Element {
  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: ROSE, textTransform: 'uppercase' }}>{eyebrow}</div>
      <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: '8px 0 0' }}>{title}</h2>
      <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.65, margin: '10px 0 0' }}>{lead}</p>
    </div>
  );
}
