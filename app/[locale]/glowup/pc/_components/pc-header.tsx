import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import { MobileCategoryIcon } from '../../_components/category-icon';

/**
 * Sticky top navigation + search pill + category strip — shared by the
 * /glowup/pc landing and every /glowup/pc/c/[key] detail page.
 *
 * Lives in pc/_components/ instead of one folder up so the mobile
 * routes don't accidentally import it (mobile uses BottomTabBar
 * instead, totally different IA).
 *
 * `activeKey` controls which category gets the underline + dark text;
 * pass null on pages that aren't category-scoped (or pass 'all').
 */
export type PcCategoryKey =
  | 'all' | 'color' | 'skin' | 'photo' | 'makeup' | 'kpop' | 'food' | 'hotel';

export const PC_CATEGORIES: Array<{ key: PcCategoryKey; label: string }> = [
  { key: 'all',    label: '전체' },
  { key: 'color',  label: '퍼스널컬러' },
  { key: 'skin',   label: '피부케어' },
  { key: 'photo',  label: '화보촬영' },
  { key: 'makeup', label: '메이크업' },
  { key: 'kpop',   label: 'K-팝성지' },
  { key: 'food',   label: '맛집' },
  { key: 'hotel',  label: '호텔' },
];

export function PcHeader({
  locale,
  activeKey = 'all',
}: {
  locale: PublicLocale;
  activeKey?: PcCategoryKey;
}): JSX.Element {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#ffffff',
        borderBottom: '1px solid #ebebeb',
      }}
    >
      {/* Top row — logo + product tabs + utilities */}
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 40px',
          height: 80,
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
        }}
      >
        <Link
          href={`/${locale}/glowup/pc`}
          style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#ff385c">
            <path d="M12 2c2.5 0 4 2 5.4 4.7 1.3 2.6 2.6 6 2.6 8.1 0 2.8-2 4.2-4 4.2-1.5 0-2.8-.8-4-2.5-1.2 1.7-2.5 2.5-4 2.5-2 0-4-1.4-4-4.2 0-2.1 1.3-5.5 2.6-8.1C8 4 9.5 2 12 2zm0 2.3C10.7 4.3 9.6 5.8 8.5 8c-1.2 2.4-2.3 5.4-2.3 6.8 0 1.6 1 2.2 1.9 2.2 1 0 1.9-.8 2.9-2.6l1 .0c1 1.8 1.9 2.6 2.9 2.6.9 0 1.9-.6 1.9-2.2 0-1.4-1.1-4.4-2.3-6.8C14.4 5.8 13.3 4.3 12 4.3z" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.5px', color: '#ff385c' }}>
            glow-up
          </span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 8, justifySelf: 'center' }}>
          <Link
            href={`/${locale}/glowup/pc#programs`}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              textDecoration: 'none', color: '#222222',
              fontWeight: 600, fontSize: 16,
              padding: '8px 14px', borderBottom: '2px solid #222222',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.6">
              <circle cx="12" cy="9" r="4" />
              <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
            </svg>
            뷰티 프로그램
          </Link>
          <Link
            href={`/${locale}/glowup/pc#course`}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              textDecoration: 'none', color: '#6a6a6a',
              fontWeight: 600, fontSize: 16, padding: '8px 14px',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" strokeWidth="1.6">
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
            코스 패키지
          </Link>
          <Link
            href={`/${locale}/glowup/pc#explore`}
            style={{
              position: 'relative',
              display: 'flex', alignItems: 'center', gap: 8,
              textDecoration: 'none', color: '#6a6a6a',
              fontWeight: 600, fontSize: 16, padding: '8px 14px',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" strokeWidth="1.6">
              <path d="M9 18V6l11-2v12" />
              <circle cx="6" cy="18" r="2.5" />
              <circle cx="17" cy="16" r="2.5" />
            </svg>
            맛집·K-팝
            <span
              style={{
                position: 'absolute', top: 0, right: -2,
                background: '#222222', color: '#fff',
                fontSize: 8, fontWeight: 700, letterSpacing: '0.32px',
                borderRadius: 9999, padding: '2px 5px',
              }}
            >
              NEW
            </span>
          </Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifySelf: 'end' }}>
          <span style={{
            fontSize: 14, fontWeight: 600, color: '#222',
            padding: '12px 14px', borderRadius: 9999, cursor: 'pointer',
          }}>
            호스트 되기
          </span>
          <div style={{
            width: 40, height: 40, borderRadius: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.6">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
            </svg>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            border: '1px solid #dddddd', borderRadius: 9999,
            padding: '6px 8px 6px 14px', cursor: 'pointer',
            boxShadow: 'rgba(0,0,0,0.04) 0 1px 2px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8">
              <path d="M3 7h18M3 12h18M3 17h18" />
            </svg>
            <div style={{
              width: 30, height: 30, borderRadius: 9999, background: '#717171',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                <circle cx="12" cy="9" r="4" />
                <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Category strip — each icon links to /glowup/pc/c/<key>.
          Categories are centered horizontally; 필터 button sits at the
          right edge via absolute positioning so it doesn't push the
          icon row off-center. */}
      <div style={{ borderTop: '1px solid #ebebeb', background: '#ffffff' }}>
        <div
          style={{
            position: 'relative',
            maxWidth: 1280, margin: '0 auto', padding: '0 40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 34, overflowX: 'auto',
          }}
        >
          {PC_CATEGORIES.map((c) => {
            const isActive = c.key === activeKey;
            const stroke = isActive ? '#222' : '#6a6a6a';
            const href = c.key === 'all' ? `/${locale}/glowup/pc` : `/${locale}/glowup/pc/c/${c.key}`;
            return (
              <Link
                key={c.key}
                href={href}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 8,
                  padding: '14px 0',
                  borderBottom: isActive ? '2px solid #222' : '2px solid transparent',
                  color: stroke, textDecoration: 'none',
                  flexShrink: 0,
                }}
              >
                <MobileCategoryIcon kind={c.key === 'all' ? 'all' : c.key as 'color' | 'skin' | 'photo' | 'makeup' | 'kpop' | 'food' | 'hotel'} stroke={stroke} />
                <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 500 }}>{c.label}</span>
              </Link>
            );
          })}
          <div
            style={{
              position: 'absolute',
              right: 40, top: '50%', transform: 'translateY(-50%)',
              display: 'flex', alignItems: 'center', gap: 8,
              border: '1px solid #dddddd', borderRadius: 12,
              padding: '10px 14px', cursor: 'pointer', flexShrink: 0,
              background: '#ffffff',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.6">
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#222' }}>필터</span>
          </div>
        </div>
      </div>
    </header>
  );
}
