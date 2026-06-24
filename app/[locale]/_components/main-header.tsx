'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicLocale } from '@/lib/i18n/locales';
import { BrandLockup } from './brand-mark';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';

/**
 * Patient-portal main header — sticky Airbnb-style nav for /[locale].
 *
 * Used by every B2C surface (the /kr landing, every (public-portal)
 * route via layout, and /glowup/pc + /c/[key] via their own page
 * wrappers). 80px top row with logo + 3 product tabs + utilities,
 * underneath a horizontal strip of category entry points.
 *
 * The category strip merges two product worlds into one bar:
 *   1. "병원" — single dropdown that fans out into 8 medical
 *      sub-categories (성형외과 / 피부과 / 치과 / 모발 / 건강검진 /
 *      줄기세포 / 한방병원 / 파트너병원). Each sub leads to
 *      /clinics?category=<key>. Keeping these behind one icon clears
 *      space in the strip and gives the medical IA its own grouping.
 *   2. Glow-up lifestyle categories (퍼스널컬러 / 피부케어 / 화보촬영 /
 *      메이크업 / K-팝성지 / 맛집 / 호텔) — each links to its detail
 *      page under /glowup/pc/c/<key>, which already exists with sample
 *      products and the same Airbnb shell.
 *
 * Client component because the dropdown needs open/close state. Click-
 * outside-to-close via a documented mousedown listener.
 */

type HospitalSubKey =
  | 'plastic_surgery'
  | 'dermatology'
  | 'dental'
  | 'hair'
  | 'health_checkup'
  | 'stem_cell'
  | 'oriental'
  | 'partner';

const HOSPITAL_SUBS: Array<{ key: HospitalSubKey; label: string }> = [
  { key: 'plastic_surgery', label: '성형외과' },
  { key: 'dermatology',     label: '피부과' },
  { key: 'dental',          label: '치과' },
  { key: 'hair',            label: '모발' },
  { key: 'health_checkup',  label: '건강검진' },
  { key: 'stem_cell',       label: '줄기세포' },
  { key: 'oriental',        label: '한방병원' },
  { key: 'partner',         label: '파트너병원' },
];

/**
 * Travel sub-types — surfaced under the 여행 dropdown. Keys match
 * partner_listings.details.subType so /glowup/pc?sub=<key> can filter
 * the listings page directly when the user picks one. Aligned with
 * lib/listings/categories.ts → TRAVEL_PACKAGE_SUB_TYPES.
 */
type TravelSubKey = 'free' | 'package' | 'training';

const TRAVEL_SUBS: Array<{ key: TravelSubKey; label: string }> = [
  { key: 'free',     label: '자유여행' },
  { key: 'package',  label: '패키지여행' },
  { key: 'training', label: '연수패키지' },
];

/**
 * Strip-level keys. `hospital` is the dropdown trigger; everything
 * else is a flat link. `all` is the leftmost reset (전체) that
 * lands on the unfiltered /clinics list.
 */
export type MainCategoryKey =
  | 'all'
  | 'travel'
  | 'hospital'
  | 'color' | 'skin' | 'photo' | 'makeup' | 'kpop' | 'food' | 'hotel';

const MAIN_CATEGORIES: Array<{ key: MainCategoryKey; label: string }> = [
  { key: 'all',      label: '전체' },
  { key: 'travel',   label: '여행' },
  { key: 'hospital', label: '병원' },
  { key: 'color',    label: '퍼스널컬러' },
  { key: 'skin',     label: '피부케어' },
  { key: 'photo',    label: '화보촬영' },
  { key: 'makeup',   label: '메이크업' },
  { key: 'kpop',     label: 'K-팝성지' },
  { key: 'food',     label: '맛집' },
  { key: 'hotel',    label: '호텔' },
];

function hrefForCategory(locale: PublicLocale, key: MainCategoryKey): string {
  switch (key) {
    case 'all':      return `/${locale}/clinics`;
    case 'hospital': return `/${locale}/clinics`;
    // 여행 → 글로우업 PC 페이지 (코스·호텔·맛집·K팝 종합)
    case 'travel':   return `/${locale}/glowup/pc`;
    // glow-up lifestyle categories → their existing detail pages
    default:         return `/${locale}/glowup/pc/c/${key}`;
  }
}

export function MainHeader({
  locale,
  activeKey = 'all',
  activeTab = 'clinics',
}: {
  locale: PublicLocale;
  activeKey?: MainCategoryKey;
  activeTab?: 'clinics' | 'ai' | 'glowup';
}): JSX.Element {
  const router = useRouter();
  const [hospitalOpen, setHospitalOpen] = useState(false);
  const [travelOpen, setTravelOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const hospitalRef = useRef<HTMLDivElement | null>(null);
  const travelRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);

  // Auth state — null = unknown (initial), undefined = signed out,
  // string = signed in (email). Subscribed via Supabase auth listener so
  // the header updates immediately on login/logout without a refresh.
  const [userEmail, setUserEmail] = useState<string | null | undefined>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setUserEmail(undefined);
      return;
    }
    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserEmail(data.user?.email ?? undefined);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? undefined);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSignOut(): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setAccountOpen(false);
    router.replace(`/${locale}`);
    router.refresh();
  }

  // Click-outside-to-close for all three dropdowns. One shared mousedown
  // listener — checks each open dropdown's ref independently so they
  // can be open simultaneously (though UX-wise only one usually is).
  useEffect(() => {
    if (!hospitalOpen && !travelOpen && !accountOpen) return;
    function onDown(e: MouseEvent): void {
      const t = e.target as Node;
      if (hospitalOpen && hospitalRef.current && !hospitalRef.current.contains(t)) {
        setHospitalOpen(false);
      }
      if (travelOpen && travelRef.current && !travelRef.current.contains(t)) {
        setTravelOpen(false);
      }
      if (accountOpen && accountRef.current && !accountRef.current.contains(t)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [hospitalOpen, travelOpen, accountOpen]);

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
          style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          aria-label="glow-up 홈"
        >
          <BrandLockup height={30} color="#ff385c" />
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 8, justifySelf: 'center' }}>
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
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifySelf: 'end' }}>
          {/* Logged-out: "로그인" link. Logged-in: nothing here (email
              dropdown takes its place in the pill below). */}
          {userEmail === undefined ? (
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
          ) : userEmail ? (
            <span style={{ fontSize: 13, color: '#6a6a6a', padding: '0 6px' }}>
              {userEmail}
            </span>
          ) : null}

          <div style={{
            width: 40, height: 40, borderRadius: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.6">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
            </svg>
          </div>

          {/* Account pill — anchors a small dropdown when logged in
              (sign-out + future profile/inquiries links). When signed
              out, clicking jumps to /login. The avatar circle inside
              the pill shows the user's first-letter initial when
              logged in for instant visual confirmation. */}
          <div ref={accountRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                if (userEmail) {
                  setAccountOpen((v) => !v);
                } else {
                  router.push(`/${locale}/login`);
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                border: '1px solid #dddddd', borderRadius: 9999,
                padding: '6px 8px 6px 14px',
                cursor: 'pointer', background: '#fff',
                boxShadow: 'rgba(0,0,0,0.04) 0 1px 2px',
                fontFamily: 'inherit',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8">
                <path d="M3 7h18M3 12h18M3 17h18" />
              </svg>
              <div style={{
                width: 30, height: 30, borderRadius: 9999,
                background: userEmail ? '#ff385c' : '#717171',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 600, fontSize: 13,
              }}>
                {userEmail ? (
                  userEmail.charAt(0).toUpperCase()
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                    <circle cx="12" cy="9" r="4" />
                    <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6z" />
                  </svg>
                )}
              </div>
            </button>
            {accountOpen && userEmail ? (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)', right: 0,
                  minWidth: 240,
                  background: '#fff',
                  border: '1px solid #ebebeb',
                  borderRadius: 14,
                  boxShadow:
                    'rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.08) 0 8px 24px',
                  padding: 8,
                  zIndex: 60,
                }}
              >
                <div
                  style={{
                    padding: '10px 14px 12px',
                    fontSize: 13, color: '#6a6a6a',
                    borderBottom: '1px solid #ebebeb',
                    marginBottom: 6,
                  }}
                >
                  로그인됨<br />
                  <span style={{ color: '#222', fontWeight: 600 }}>{userEmail}</span>
                </div>
                <Link
                  href={`/${locale}/inquiry`}
                  onClick={() => setAccountOpen(false)}
                  style={{
                    display: 'block', padding: '10px 14px',
                    fontSize: 14, color: '#222',
                    borderRadius: 8, textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = '#f7f7f7'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
                >
                  내 문의
                </Link>
                <button
                  type="button"
                  onClick={onSignOut}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '10px 14px',
                    fontSize: 14, color: '#222',
                    border: 'none', background: 'transparent',
                    borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f7f7f7'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  로그아웃
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Category strip — 전체 + 병원(dropdown) + 7 lifestyle */}
      <div style={{ borderTop: '1px solid #ebebeb', background: '#ffffff' }}>
        <div
          style={{
            position: 'relative',
            maxWidth: 1280, margin: '0 auto', padding: '0 40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 34,
          }}
        >
          {MAIN_CATEGORIES.map((c) => {
            const isActive = c.key === activeKey;
            const stroke = isActive ? '#222' : '#6a6a6a';

            // "병원" and "여행" both get click-toggle dropdown panels.
            // Everything else is a flat <Link>.
            if (c.key === 'hospital' || c.key === 'travel') {
              const isHospital = c.key === 'hospital';
              const open = isHospital ? hospitalOpen : travelOpen;
              const setOpen = isHospital ? setHospitalOpen : setTravelOpen;
              const panelRef = isHospital ? hospitalRef : travelRef;
              const subs = isHospital
                ? HOSPITAL_SUBS.map((s) => ({
                    key: s.key,
                    label: s.label,
                    href: `/${locale}/clinics?category=${s.key}`,
                  }))
                : TRAVEL_SUBS.map((s) => ({
                    key: s.key,
                    label: s.label,
                    href: `/${locale}/glowup/pc?sub=${s.key}`,
                  }));
              return (
                <div
                  key={c.key}
                  ref={panelRef}
                  style={{ position: 'relative', flexShrink: 0 }}
                >
                  <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 8,
                      padding: '14px 0',
                      borderBottom: isActive || open
                        ? '2px solid #222'
                        : '2px solid transparent',
                      color: stroke, background: 'transparent', border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <MainCategoryIcon kind={c.key} stroke={stroke} />
                    <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 500 }}>
                      {c.label}
                    </span>
                  </button>
                  {open ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)', left: '50%',
                        transform: 'translateX(-50%)',
                        minWidth: 200,
                        background: '#fff',
                        border: '1px solid #ebebeb',
                        borderRadius: 14,
                        boxShadow:
                          'rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.08) 0 8px 24px',
                        padding: 8,
                        zIndex: 60,
                      }}
                    >
                      {subs.map((sub) => (
                        <Link
                          key={sub.key}
                          href={sub.href}
                          onClick={() => setOpen(false)}
                          style={{
                            display: 'block',
                            padding: '10px 14px',
                            fontSize: 14, color: '#222',
                            borderRadius: 8,
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLAnchorElement).style.background = '#f7f7f7';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                          }}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <Link
                key={c.key}
                href={hrefForCategory(locale, c.key)}
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
                <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 500 }}>
                  {c.label}
                </span>
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
    case 'travel':
      // Suitcase with handle
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M3 13h18" />
        </svg>
      );
    case 'hospital':
      // Hospital building with medical cross
      return (
        <svg {...common}>
          <path d="M4 21V8l8-5 8 5v13" />
          <path d="M3 21h18" />
          <path d="M11 9h2M12 8v2" />
          <path d="M9 21v-5h6v5" />
        </svg>
      );
    case 'color':
      // Palette with color dots
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="9" cy="9" r="1.4" fill={stroke} />
          <circle cx="15" cy="9" r="1.4" fill={stroke} />
          <circle cx="9.5" cy="15" r="1.4" fill={stroke} />
        </svg>
      );
    case 'skin':
      // Skincare droplet
      return (
        <svg {...common}>
          <path d="M12 3c3 4 5 6.5 5 9.5A5 5 0 0 1 7 12.5C7 9.5 9 7 12 3z" />
        </svg>
      );
    case 'photo':
      // Camera
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2.5" />
          <circle cx="12" cy="13.5" r="3.5" />
        </svg>
      );
    case 'makeup':
      // Crossed brushes
      return (
        <svg {...common}>
          <path d="M5 19l9-9M11 7l3-3 4 4-3 3M14 10l4 4-3 3-4-4" />
        </svg>
      );
    case 'kpop':
      // Music note + stage
      return (
        <svg {...common}>
          <path d="M9 18V6l11-2v12" />
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="17" cy="16" r="2.5" />
        </svg>
      );
    case 'food':
      // Fork + knife
      return (
        <svg {...common}>
          <path d="M6 3v8a2 2 0 0 0 2 2v8M6 3v5M9 3v5M16 3c-1.5 0-2 3-2 6s.5 3 2 3v9" />
        </svg>
      );
    case 'hotel':
      // House outline
      return (
        <svg {...common}>
          <path d="M3 20V9l9-5 9 5v11M3 20h18M9 20v-5h6v5" />
        </svg>
      );
  }
}
