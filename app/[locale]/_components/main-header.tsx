import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';

/**
 * Patient-portal main header — Airbnb-style sticky nav for /[locale].
 *
 * Visually a sibling of /glowup/pc/_components/pc-header.tsx (same
 * 80px row + sticky category strip + #ff385c accent), but the *links*
 * and *categories* belong to the patient-portal world:
 *
 *   - Logo  → /[locale]                          (B2C home)
 *   - Tabs  → /[locale]/clinics                  (병원 찾기 — default)
 *             /[locale]/ai-consult               (AI 상담)
 *             /[locale]/glowup/pc                (여행 패키지 NEW)
 *   - Strip → /[locale]/clinics
 *             /[locale]/clinics?category=<key>   (8 medical categories)
 *
 * /glowup/pc and its detail pages keep using PcHeader so their
 * category strip still surfaces the wellness/entertainment lineup
 * (퍼스널컬러 / 피부케어 / 화보촬영 / 메이크업 / K-팝성지 / 맛집 /
 * 호텔). Two headers for two product surfaces — same look, different
 * IA — instead of one ambiguous shared strip.
 */
export type MainCategoryKey =
  | 'all'
  | 'plastic_surgery'
  | 'dermatology'
  | 'dental'
  | 'hair'
  | 'health_checkup'
  | 'beauty_tour'
  | 'makeup'
  | 'photo_studio';

const MAIN_CATEGORIES: Array<{ key: MainCategoryKey; label: string }> = [
  { key: 'all',             label: '전체' },
  { key: 'plastic_surgery', label: '성형외과' },
  { key: 'dermatology',     label: '피부과' },
  { key: 'dental',          label: '치과' },
  { key: 'hair',            label: '모발' },
  { key: 'health_checkup',  label: '건강검진' },
  { key: 'beauty_tour',     label: '뷰티 투어' },
  { key: 'makeup',          label: '메이크업' },
  { key: 'photo_studio',    label: '사진 스튜디오' },
];

export function MainHeader({
  locale,
  activeKey = 'all',
  activeTab = 'clinics',
}: {
  locale: PublicLocale;
  activeKey?: MainCategoryKey;
  /** Which top-row tab gets the underline + dark text. */
  activeTab?: 'clinics' | 'ai' | 'glowup';
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
          maxWidth: 1280, margin: '0 auto', padding: '0 40px',
          height: 80,
          display: 'grid', gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
        }}
      >
        <Link
          href={`/${locale}`}
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
          <TopTab
            href={`/${locale}/clinics`}
            label="병원 찾기"
            active={activeTab === 'clinics'}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.6">
                <path d="M4 21V8l8-5 8 5v13" />
                <path d="M9 21v-6h6v6" />
                <path d="M11 9h2M12 8v2" />
              </svg>
            }
          />
          <TopTab
            href={`/${locale}/ai-consult`}
            label="AI 상담"
            active={activeTab === 'ai'}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.6">
                <path d="M12 3l1.6 3.6 3.6 1.6-3.6 1.6L12 13.4 10.4 9.8 6.8 8.2l3.6-1.6z" />
                <path d="M5 17l.8 1.8L7.6 19.6 5.8 20.4 5 22.2 4.2 20.4 2.4 19.6l1.8-.8z" />
              </svg>
            }
          />
          <TopTab
            href={`/${locale}/glowup/pc`}
            label="여행 패키지"
            active={activeTab === 'glowup'}
            badge="NEW"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.6">
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M3 13h18" />
              </svg>
            }
          />
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifySelf: 'end' }}>
          <Link
            href={`/${locale}/login`}
            style={{
              fontSize: 14, fontWeight: 600, color: '#222',
              padding: '12px 14px', borderRadius: 9999, cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            로그인
          </Link>
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

      {/* Category strip — 8 medical categories + 전체.
          Centered; 필터 button absolutely positioned at right edge. */}
      <div style={{ borderTop: '1px solid #ebebeb', background: '#ffffff' }}>
        <div
          style={{
            position: 'relative',
            maxWidth: 1280, margin: '0 auto', padding: '0 40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 34, overflowX: 'auto',
          }}
        >
          {MAIN_CATEGORIES.map((c) => {
            const isActive = c.key === activeKey;
            const stroke = isActive ? '#222' : '#6a6a6a';
            const href = c.key === 'all'
              ? `/${locale}/clinics`
              : `/${locale}/clinics?category=${c.key}`;
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
                <MainCategoryIcon kind={c.key} stroke={stroke} />
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

function TopTab({
  href,
  label,
  active,
  icon,
  badge,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: JSX.Element;
  badge?: string;
}): JSX.Element {
  const color = active ? '#222222' : '#6a6a6a';
  return (
    <Link
      href={href}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 8,
        textDecoration: 'none', color,
        fontWeight: 600, fontSize: 16,
        padding: '8px 14px',
        borderBottom: active ? '2px solid #222222' : '2px solid transparent',
        stroke: color,
      }}
    >
      {icon}
      {label}
      {badge ? (
        <span
          style={{
            position: 'absolute', top: 0, right: -2,
            background: '#222222', color: '#fff',
            fontSize: 8, fontWeight: 700, letterSpacing: '0.32px',
            borderRadius: 9999, padding: '2px 5px',
          }}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function MainCategoryIcon({
  kind,
  stroke,
}: {
  kind: MainCategoryKey;
  stroke: string;
}): JSX.Element {
  const common = {
    width: 22, height: 22, viewBox: '0 0 24 24',
    fill: 'none' as const, stroke, strokeWidth: 1.5,
  };
  switch (kind) {
    case 'all':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      );
    case 'plastic_surgery':
      // Side face profile silhouette
      return (
        <svg {...common}>
          <path d="M9 4 C6 6 5 10 6 13 C6.5 15 7 17 8 18 V21" />
          <path d="M9 4 C13 3 16 5 17 9 C17.5 11 17 13 16 14 L14 14 L14 17 L11 17" />
          <circle cx="12" cy="10" r="0.6" fill={stroke} />
        </svg>
      );
    case 'dermatology':
      // Skincare droplet
      return (
        <svg {...common}>
          <path d="M12 3c3 4 5 6.5 5 9.5A5 5 0 0 1 7 12.5C7 9.5 9 7 12 3z" />
        </svg>
      );
    case 'dental':
      // Tooth
      return (
        <svg {...common}>
          <path d="M7 4 C5 4 4 6 4.5 9 C5 11 5.5 13 6 16 C6.3 18 7 20 8 20 C9 20 9.3 18 9.6 16 C9.8 15 10.5 14.5 12 14.5 C13.5 14.5 14.2 15 14.4 16 C14.7 18 15 20 16 20 C17 20 17.7 18 18 16 C18.5 13 19 11 19.5 9 C20 6 19 4 17 4 C15.5 4 14 4.5 12 4.5 C10 4.5 8.5 4 7 4 Z" />
        </svg>
      );
    case 'hair':
      // Comb + flowing hair
      return (
        <svg {...common}>
          <path d="M4 5 C7 7 11 9 12 12 C13 15 12 18 10 21" />
          <path d="M9 5 C11 7 14 10 15 13 C16 16 15 19 13 21" />
          <path d="M14 5 C15 7 17 10 18 13" />
        </svg>
      );
    case 'health_checkup':
      // Heart + pulse line
      return (
        <svg {...common}>
          <path d="M3 13h3l2-4 2 8 2-5h2" />
          <path d="M14 4 a3 3 0 0 1 6 3 c0 4-4 7-6 9c-2-2-6-5-6-9 a3 3 0 0 1 6-3" opacity="0.55" transform="translate(0 1) scale(0.6) translate(8 4)" />
        </svg>
      );
    case 'beauty_tour':
      // Suitcase
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M3 13h18" />
        </svg>
      );
    case 'makeup':
      // Lipstick
      return (
        <svg {...common}>
          <path d="M9 3h6l-1 5h-4z" />
          <rect x="8.5" y="8" width="7" height="3" rx="0.5" />
          <rect x="9" y="11" width="6" height="10" rx="0.8" />
        </svg>
      );
    case 'photo_studio':
      // Camera
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2.5" />
          <circle cx="12" cy="13.5" r="3.5" />
          <path d="M9 7l1.5-2h3L15 7" />
        </svg>
      );
  }
}
