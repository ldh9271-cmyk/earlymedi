/**
 * Patient-portal main footer — Airbnb-style 3-col link bar.
 *
 * Mirrors the look extracted from /glowup/pc into /[locale] and
 * shared with the (public-portal) layout so every B2C page (/kr,
 * /clinics, /clinics/[slug], /inquiry, /ai-consult, /login, /signup,
 * etc.) ends with the same surface — light grey bar, three columns,
 * locale + currency badges in the bottom strip.
 */
export function MainFooter(): JSX.Element {
  return (
    <footer
      style={{
        background: '#f7f7f7',
        borderTop: '1px solid #ebebeb',
        marginTop: 56,
      }}
    >
      <div
        style={{
          maxWidth: 1280, margin: '0 auto', padding: '48px 40px',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24,
        }}
      >
        {[
          { title: '지원',     items: ['도움말 센터', '안전 정보', '취소 옵션', '예약 문의'] },
          { title: '프로그램', items: ['퍼스널 컬러 진단', '피부 진단 케어', '프로필 화보 촬영', '4박 5일 글로우업 코스'] },
          { title: 'glow-up',  items: ['소개', '찐맛집 가이드', 'K-팝 성지', '호스트 되기'] },
        ].map((col) => (
          <div key={col.title}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#222' }}>{col.title}</div>
            <div
              style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                marginTop: 16, fontSize: 14, color: '#222',
              }}
            >
              {col.items.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid #dddddd' }}>
        <div
          style={{
            maxWidth: 1280, margin: '0 auto', padding: '24px 40px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 13, color: '#6a6a6a', flexWrap: 'wrap', gap: 12,
          }}
        >
          <span>© 2026 Korea Glow-up Challenge · 개인정보처리방침 · 이용약관</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#222', fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.6">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
              </svg>
              한국어 (KR)
            </span>
            <span style={{ color: '#222', fontWeight: 600 }}>₩ KRW</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
