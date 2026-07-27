import Link from 'next/link';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import type { PublicLocale } from '@/lib/i18n/locales';

/** Mobile responsive overrides — keep inline desktop styles intact;
 *  stack 3-col link grid into 1 col, tighten padding, add safe-area
 *  inset on the bottom strip for iPhone home-indicator clearance. */
const MOBILE_CSS = '@media (max-width: 768px) {'
  + '.m-mf-cols { grid-template-columns: 1fr !important; padding: 32px 16px !important; gap: 18px !important; }'
  + '.m-mf-col-title { font-size: 15px !important; }'
  + '.m-mf-col-items { gap: 8px !important; margin-top: 10px !important; font-size: 13px !important; }'
  + '.m-mf-bottom { padding: 16px 16px calc(16px + env(safe-area-inset-bottom)) !important; font-size: 12px !important; gap: 8px !important; }'
  + '.m-mf-locale-currency { gap: 12px !important; }'
  + '}';

/**
 * Patient-portal main footer — Airbnb-style 3-col link bar.
 *
 * Mirrors the look extracted from /glowup/pc into /[locale] and
 * shared with the (public-portal) layout so every B2C page (/kr,
 * /clinics, /clinics/[slug], /inquiry, /ai-consult, /login, /signup,
 * etc.) ends with the same surface — light grey bar, three columns,
 * locale + currency badges in the bottom strip.
 *
 * All labels come from dict.siteFooter (resolved server-side and
 * passed via the `t` prop) so the footer renders in the active
 * locale.
 *
 * `localeNative` is the active locale's display name (e.g. "한국어",
 * "English", "Tiếng Việt") shown on the right-hand badge in the
 * bottom strip. Sourced from LOCALE_LABELS at the caller.
 */
export function MainFooter({
  t,
  localeNative,
  locale = 'kr',
}: {
  t: Dictionary['siteFooter'];
  localeNative: string;
  /** 링크 목적지에 붙일 로케일 프리픽스. 미지정 시 kr. */
  locale?: PublicLocale;
}): JSX.Element {
  // 각 라벨을 실제 페이지로 연결 (2026-07-26). 아직 전용 페이지가 없는
  // 항목은 가장 가까운 실제 surface 로 보낸다 — 죽은 링크를 만들지 않기 위함.
  const L = (p: string): string => `/${locale}${p}`;
  const cols: Array<{ title: string; items: Array<{ label: string; href: string }> }> = [
    {
      title: t.colSupport,
      items: [
        { label: t.support1, href: L('/inquiry') },              // 도움말 센터 → 1:1 문의
        { label: t.support2, href: '/legal/medical-ad' },        // 안전 정보 → 의료광고·안전 고지
        { label: t.support3, href: '/legal/terms' },             // 취소 옵션 → 이용약관(취소·환불)
        { label: t.support4, href: L('/inquiry') },              // 예약 문의
      ],
    },
    {
      title: t.colPrograms,
      items: [
        { label: t.program1, href: L('/glowup/pc/c/color') },
        { label: t.program2, href: L('/clinics?category=dermatology') },
        { label: t.program3, href: L('/glowup/pc/c/photo') },
        { label: t.program4, href: L('/travel/package') },
      ],
    },
    {
      title: t.colBrand,
      items: [
        { label: t.brand1, href: '/about' },
        { label: t.brand2, href: L('/glowup/pc/c/food') },
        { label: t.brand3, href: L('/glowup/pc/c/kpop') },
        { label: t.brand4, href: '/signup' },                    // 호스트 되기 → 파트너 가입
      ],
    },
  ];
  return (
    <footer
      style={{
        background: '#f7f7f7',
        borderTop: '1px solid #ebebeb',
        marginTop: 56,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: MOBILE_CSS }} />
      <div
        className="m-mf-cols"
        style={{
          maxWidth: 1280, margin: '0 auto', padding: '48px 40px',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24,
        }}
      >
        {cols.map((col) => (
          <div key={col.title}>
            <div className="m-mf-col-title" style={{ fontSize: 16, fontWeight: 600, color: '#222' }}>{col.title}</div>
            <div
              className="m-mf-col-items"
              style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                marginTop: 16, fontSize: 14, color: '#222',
              }}
            >
              {col.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  style={{ color: 'inherit', textDecoration: 'none', width: 'fit-content' }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid #dddddd' }}>
        <div
          className="m-mf-bottom"
          style={{
            maxWidth: 1280, margin: '0 auto', padding: '24px 40px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 13, color: '#6a6a6a', flexWrap: 'wrap', gap: 12,
          }}
        >
          {/* 저작권 줄 — 개인정보처리방침 / 이용약관을 실제 법적 고지
              페이지로 연결. dict.copy 는 "… · A · B" 형태라 마지막 두
              토큰만 링크로 치환한다. */}
          <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {(() => {
              const parts = t.copy.split('·').map((s) => s.trim());
              const head = parts.slice(0, Math.max(1, parts.length - 2)).join(' · ');
              const privacy = parts[parts.length - 2];
              const terms = parts[parts.length - 1];
              return (
                <>
                  <span>{head}</span>
                  {privacy ? (
                    <>
                      <span>·</span>
                      <Link href="/legal/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>
                        {privacy}
                      </Link>
                    </>
                  ) : null}
                  {terms ? (
                    <>
                      <span>·</span>
                      <Link href="/legal/terms" style={{ color: 'inherit', textDecoration: 'underline' }}>
                        {terms}
                      </Link>
                    </>
                  ) : null}
                </>
              );
            })()}
          </span>
          <div className="m-mf-locale-currency" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#222', fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.6">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
              </svg>
              {localeNative}
            </span>
            <span style={{ color: '#222', fontWeight: 600 }}>₩ KRW</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
