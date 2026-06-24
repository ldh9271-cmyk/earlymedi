'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/** Mobile (≤ 768px) overrides. Pulled out of JSX as a plain const to
 *  avoid SWC mis-parsing an inline template literal that contains
 *  both backticks and CSS braces inside dangerouslySetInnerHTML. */
const MOBILE_CSS = '@media (max-width: 768px) {'
  + '.m-mh-top { height: 60px !important; padding: 0 12px !important; grid-template-columns: 1fr auto !important; }'
  + '.m-mh-tabs { display: none !important; }'
  + '.m-mh-util-gap { gap: 2px !important; }'
  + '.m-mh-login { padding: 8px 10px !important; font-size: 13px !important; }'
  + '.m-mh-globe-btn { width: 36px !important; height: 36px !important; }'
  + '.m-mh-account-pill { padding: 4px 6px 4px 10px !important; }'
  + '.m-mh-account-avatar { width: 26px !important; height: 26px !important; }'

  // Search pill row — shows ONLY on mobile (default display:none in
  // the off-media CSS below; activated here). Airbnb-style 56px tall
  // rounded pill with magnifier icon + main label + subtitle on the
  // left, separate circular filter button on the right. Both link
  // to /clinics for v1; richer search modal lands in a follow-up.
  + '.m-mh-search-row { display: flex !important; align-items: center; gap: 8px; padding: 8px 12px 6px; }'
  + '.m-mh-search-pill { flex: 1 1 auto; display: flex; align-items: center; gap: 12px; height: 56px; padding: 0 18px; border-radius: 9999px; border: 1px solid #ebebeb; background: #fff; box-shadow: rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.06) 0 1px 2px; color: #222; text-decoration: none; }'
  + '.m-mh-search-main { font-size: 14px; font-weight: 600; line-height: 1.2; }'
  + '.m-mh-search-sub { font-size: 12px; color: #6a6a6a; line-height: 1.2; margin-top: 2px; }'
  + '.m-mh-search-filter { flex-shrink: 0; width: 42px; height: 42px; border-radius: 9999px; border: 1px solid #ebebeb; background: #fff; display: flex; align-items: center; justify-content: center; color: #222; text-decoration: none; box-shadow: rgba(0,0,0,0.04) 0 2px 6px; }'

  // Category strip — single horizontal-scroll row with the same
  // icon-over-label items. Active item gets a 2px underline like
  // the Airbnb mobile reference (border already toggles via the
  // inline isActive style; we just need the row to scroll).
  + '.m-mh-cat-strip { display: flex !important; flex-wrap: nowrap !important; justify-content: flex-start !important; gap: 26px !important; padding: 4px 16px 0 !important; overflow-x: auto !important; overflow-y: hidden; -webkit-overflow-scrolling: touch; scrollbar-width: none; }'
  + '.m-mh-cat-strip::-webkit-scrollbar { display: none; }'
  + '.m-mh-cat-item { flex-shrink: 0 !important; padding: 10px 0 12px !important; gap: 4px !important; min-width: 0 !important; }'
  + '.m-mh-cat-icon { width: 24px !important; height: 24px !important; }'
  + '.m-mh-cat-label { font-size: 12px !important; line-height: 1.2 !important; text-align: center; word-break: keep-all; white-space: nowrap; }'

  + '.m-mh-filter { display: none !important; }'
  + '.m-mh-account-email { display: none !important; }'
  + '}'

  // Desktop default — search pill hidden, only appears on mobile via
  // the @media block above.
  + '.m-mh-search-row { display: none; }';
import {
  LOCALE_LABELS,
  PUBLIC_LOCALES,
  isPublicLocale,
  type PublicLocale,
} from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
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

// Founder-ordered strip (2026-06-25): row 1 = travel / hospital /
// food / hotel (the high-intent "trip" anchors), row 2 = skin /
// photo / makeup / kpop (the K-beauty + culture exploration row).
// '전체' was dropped earlier (lifestyle categories imply the union);
// 'color' (퍼스널컬러) is hidden from the strip but its key + dict
// + /glowup/pc/c/color route stay live so deep-links still work.
const MAIN_CATEGORY_KEYS: ReadonlyArray<MainCategoryKey> = [
  'travel', 'hospital', 'food', 'hotel',
  'skin', 'photo', 'makeup', 'kpop',
];

// Narrow to only the `cat*` keys (which are always plain strings).
// Using `keyof Dictionary['header']` here would include nested object
// keys like 'hospitalSubs', and TS would refuse to render the union
// as ReactNode.
type CatDictKey =
  | 'catAll' | 'catTravel' | 'catHospital' | 'catColor' | 'catSkin'
  | 'catPhoto' | 'catMakeup' | 'catKpop' | 'catFood' | 'catHotel';

const MAIN_CATEGORY_DICT_KEY: Record<MainCategoryKey, CatDictKey> = {
  all: 'catAll',
  travel: 'catTravel',
  hospital: 'catHospital',
  color: 'catColor',
  skin: 'catSkin',
  photo: 'catPhoto',
  makeup: 'catMakeup',
  kpop: 'catKpop',
  food: 'catFood',
  hotel: 'catHotel',
};

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
  t,
}: {
  locale: PublicLocale;
  activeKey?: MainCategoryKey;
  activeTab?: 'clinics' | 'ai' | 'glowup';
  t: Dictionary['header'];
}): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [accountOpen, setAccountOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const langRef = useRef<HTMLDivElement | null>(null);

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
    if (!accountOpen && !filterOpen && !langOpen) return;
    function onDown(e: MouseEvent): void {
      const t = e.target as Node;
      if (accountOpen && accountRef.current && !accountRef.current.contains(t)) {
        setAccountOpen(false);
      }
      if (filterOpen && filterRef.current && !filterRef.current.contains(t)) {
        setFilterOpen(false);
      }
      if (langOpen && langRef.current && !langRef.current.contains(t)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [accountOpen, filterOpen, langOpen]);

  /**
   * Swap the locale prefix in the current pathname. Falls back to
   * pushing `/${nextLocale}` if the current path doesn't start with a
   * known locale segment (shouldn't happen since this header is only
   * mounted under /[locale], but defensive).
   */
  function switchLocale(nextLocale: PublicLocale): void {
    const segments = pathname.split('/').filter(Boolean);
    const first = segments[0];
    if (first && isPublicLocale(first)) {
      segments[0] = nextLocale;
    } else {
      segments.unshift(nextLocale);
    }
    const qs = searchParams.toString();
    const target = `/${segments.join('/')}${qs ? `?${qs}` : ''}`;
    setLangOpen(false);
    router.push(target);
  }

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
      {/* Mobile responsive overrides — see MOBILE_CSS const above. */}
      <style dangerouslySetInnerHTML={{ __html: MOBILE_CSS }} />

      {/* Top row — logo + product tabs + utilities */}
      <div
        className="m-mh-top"
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
          aria-label={t.account.logoAlt}
        >
          <BrandLockup height={30} color="#ff385c" />
        </Link>

        <nav className="m-mh-tabs" style={{ display: 'flex', alignItems: 'center', gap: 8, justifySelf: 'center' }}>
          <TopTab
            href={`/${locale}/glowup/pc`}
            label={t.tabGlowup}
            active={activeTab === 'glowup'}
            badge={t.badgeNew}
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
            label={t.tabAi}
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
            label={t.tabClinics}
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

        <div className="m-mh-util-gap" style={{ display: 'flex', alignItems: 'center', gap: 6, justifySelf: 'end' }}>
          {/* Logged-out: "로그인" link. Logged-in: nothing here (email
              dropdown takes its place in the pill below). */}
          {userEmail === undefined ? (
            <Link
              href={`/${locale}/login`}
              className="m-mh-login"
              style={{
                fontSize: 14, fontWeight: 600, color: '#222',
                padding: '12px 14px', borderRadius: 9999, cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              {t.account.login}
            </Link>
          ) : userEmail ? (
            <span className="m-mh-account-email" style={{ fontSize: 13, color: '#6a6a6a', padding: '0 6px' }}>
              {userEmail}
            </span>
          ) : null}

          {/* Language switcher — globe icon opens a dropdown listing
              every public locale. Clicking an item swaps the locale
              segment of the current pathname and preserves query
              params, so the user stays on the same page in a new
              language. */}
          <div ref={langRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              aria-label={t.account.langSelect}
              className="m-mh-globe-btn"
              style={{
                width: 40, height: 40, borderRadius: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: 'transparent', border: 'none',
                padding: 0, fontFamily: 'inherit',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.6">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
              </svg>
            </button>
            {langOpen ? (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)', right: 0,
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
                {PUBLIC_LOCALES.map((l) => {
                  const meta = LOCALE_LABELS[l];
                  const active = l === locale;
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => switchLocale(l)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', textAlign: 'left',
                        padding: '10px 14px',
                        border: 'none',
                        borderRadius: 8,
                        background: active ? '#f7f7f7' : 'transparent',
                        cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: 14,
                        color: '#222',
                        fontWeight: active ? 600 : 500,
                      }}
                      onMouseEnter={(e) => {
                        if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#f7f7f7';
                      }}
                      onMouseLeave={(e) => {
                        if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: 18, lineHeight: 1 }}>{meta.flag}</span>
                      <span style={{ flex: 1 }}>{meta.native}</span>
                      {active ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff385c" strokeWidth="2.5">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
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
              className="m-mh-account-pill"
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
              <div className="m-mh-account-avatar" style={{
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
                  {t.account.signedIn}<br />
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
                  {t.account.myInquiry}
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
                  {t.account.signOut}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile search-pill row — between top utilities and the
          category strip. Hidden on desktop (CSS default), shown on
          phones via the @media block. Tap the pill or filter circle
          to go to /clinics where filter chips live. */}
      <div className="m-mh-search-row">
        <Link href={`/${locale}/clinics`} className="m-mh-search-pill">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <span>
            <span className="m-mh-search-main">{t.search.main}</span>
            <span className="m-mh-search-sub" style={{ display: 'block' }}>{t.search.subtitle}</span>
          </span>
        </Link>
        <Link
          href={`/${locale}/clinics`}
          className="m-mh-search-filter"
          aria-label={t.search.filterCircle}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8">
            <path d="M3 6h18M6 12h12M10 18h4" />
          </svg>
        </Link>
      </div>

      {/* Category strip — 8 lifestyle entries (전체/병원 dropdown + travel/lifestyle). */}
      <div className="m-mh-cat-strip-row" style={{ borderTop: '1px solid #ebebeb', background: '#ffffff' }}>
        <div
          className="m-mh-cat-strip"
          style={{
            position: 'relative',
            maxWidth: 1280, margin: '0 auto', padding: '0 40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 34,
          }}
        >
          {MAIN_CATEGORY_KEYS.map((cKey) => {
            const isActive = cKey === activeKey;
            const stroke = isActive ? '#222' : '#6a6a6a';
            const cLabel = t[MAIN_CATEGORY_DICT_KEY[cKey]];
            // 병원 / 여행 used to open click-toggle dropdowns, but the
            // mobile category strip's overflow-y: hidden clipped the
            // panel below the row — the dropdown rendered but was
            // invisible, making the tap feel broken. Flat <Link>s now
            // route to /clinics and /glowup/pc respectively; the
            // sub-category chips that used to live in the dropdown
            // surface on those landing pages instead.
            return (
              <Link
                key={cKey}
                href={hrefForCategory(locale, cKey)}
                className="m-mh-cat-item"
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 8,
                  padding: '14px 0',
                  borderBottom: isActive ? '2px solid #222' : '2px solid transparent',
                  color: stroke, textDecoration: 'none',
                  flexShrink: 0,
                }}
              >
                <MainCategoryIcon kind={cKey} stroke={stroke} />
                <span className="m-mh-cat-label" style={{ fontSize: 12, fontWeight: isActive ? 600 : 500 }}>
                  {cLabel}
                </span>
              </Link>
            );
          })}
          <FilterPill
            open={filterOpen}
            setOpen={setFilterOpen}
            wrapperRef={filterRef}
            pathname={pathname}
            searchParams={searchParams}
            router={router}
            t={t}
          />
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
    className: 'm-mh-cat-icon',
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

/**
 * Filter pill — sticky-right of the category strip. Click toggles a
 * dropdown panel with price / rating / location fields. "적용" writes
 * the chosen values as query params on the CURRENT pathname (so the
 * surface page — /clinics or /glowup/pc — can read them and filter
 * its own SQL).
 *
 * Query param convention (consumed by the page-side filter logic):
 *   ?priceMin=80000&priceMax=500000&minRating=45&loc=gangnam,myeongdong
 *
 * `minRating` is integer × 10 (45 = 4.5+) to match
 * partner_listings.rating which is stored in the same encoding.
 * `loc` is a comma-separated list of district keys.
 */
type SearchParamsLike = {
  get: (key: string) => string | null;
};

const LOCATION_KEYS: ReadonlyArray<keyof Dictionary['header']['locations']> = [
  'gangnam', 'myeongdong', 'seongsu', 'cheongdam', 'hongdae', 'itaewon',
];

function FilterPill({
  open,
  setOpen,
  wrapperRef,
  pathname,
  searchParams,
  router,
  t,
}: {
  open: boolean;
  setOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  wrapperRef: React.RefObject<HTMLDivElement>;
  pathname: string;
  searchParams: SearchParamsLike;
  router: ReturnType<typeof useRouter>;
  t: Dictionary['header'];
}): JSX.Element {
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [minRating, setMinRating] = useState('');
  const [locs, setLocs] = useState<string[]>([]);

  // Hydrate from URL on every open so the panel reflects the active filter.
  useEffect(() => {
    if (!open) return;
    setPriceMin(searchParams.get('priceMin') ?? '');
    setPriceMax(searchParams.get('priceMax') ?? '');
    setMinRating(searchParams.get('minRating') ?? '');
    const locParam = searchParams.get('loc') ?? '';
    setLocs(locParam ? locParam.split(',').filter(Boolean) : []);
  }, [open, searchParams]);

  const activeCount =
    (priceMin ? 1 : 0) +
    (priceMax ? 1 : 0) +
    (minRating ? 1 : 0) +
    (locs.length > 0 ? 1 : 0);

  function toggleLoc(k: string): void {
    setLocs((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  function apply(): void {
    const usp = new URLSearchParams();
    // Preserve existing non-filter params (e.g. category=…, sub=…).
    for (const k of ['category', 'sub', 'procedure']) {
      const v = searchParams.get(k);
      if (v) usp.set(k, v);
    }
    if (priceMin) usp.set('priceMin', priceMin);
    if (priceMax) usp.set('priceMax', priceMax);
    if (minRating) usp.set('minRating', minRating);
    if (locs.length > 0) usp.set('loc', locs.join(','));
    const qs = usp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
  }

  function reset(): void {
    setPriceMin('');
    setPriceMax('');
    setMinRating('');
    setLocs([]);
  }

  const inputStyle: React.CSSProperties = {
    height: 38, width: '100%',
    border: '1px solid #dddddd', borderRadius: 8,
    padding: '0 12px', fontSize: 14, color: '#222',
    background: '#fff', outline: 'none', fontFamily: 'inherit',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: '#222', marginBottom: 6,
  };

  return (
    <div
      ref={wrapperRef}
      className="m-mh-filter"
      style={{
        position: 'absolute',
        right: 40, top: '50%', transform: 'translateY(-50%)',
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="m-mh-filter-btn"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: `1px solid ${activeCount > 0 ? '#222' : '#dddddd'}`,
          borderRadius: 12,
          padding: '10px 14px', cursor: 'pointer',
          background: '#fff', fontFamily: 'inherit',
          color: '#222',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.6">
          <path d="M3 6h18M6 12h12M10 18h4" />
        </svg>
        <span className="m-mh-filter-label" style={{ fontSize: 12, fontWeight: 600, color: '#222' }}>{t.filter.label}</span>
        {activeCount > 0 ? (
          <span
            style={{
              background: '#ff385c', color: '#fff',
              fontSize: 10, fontWeight: 700,
              borderRadius: 9999, padding: '1px 6px',
              minWidth: 16, textAlign: 'center',
              marginLeft: 2,
            }}
          >
            {activeCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)', right: 0,
            width: 340,
            background: '#fff',
            border: '1px solid #ebebeb',
            borderRadius: 14,
            boxShadow:
              'rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.12) 0 12px 32px',
            padding: 20,
            zIndex: 60,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#222' }}>
            {t.filter.title}
          </div>

          {/* Price range */}
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>{t.filter.price}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 16px 1fr', gap: 6, alignItems: 'center' }}>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={10000}
                value={priceMin}
                placeholder={t.filter.priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                style={inputStyle}
              />
              <span style={{ textAlign: 'center', color: '#9c9c9c' }}>—</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={10000}
                value={priceMax}
                placeholder={t.filter.priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Minimum rating */}
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>{t.filter.rating}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { key: '',   label: t.filter.ratingAll },
                { key: '40', label: '4.0+' },
                { key: '45', label: '4.5+' },
                { key: '50', label: '5.0' },
              ].map((opt) => {
                const active = minRating === opt.key;
                return (
                  <button
                    key={opt.key || 'all'}
                    type="button"
                    onClick={() => setMinRating(opt.key)}
                    style={{
                      border: `1px solid ${active ? '#222' : '#dddddd'}`,
                      background: active ? '#222' : '#fff',
                      color: active ? '#fff' : '#222',
                      borderRadius: 9999,
                      padding: '6px 12px',
                      fontSize: 12, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Locations */}
          <div style={{ marginBottom: 18 }}>
            <div style={labelStyle}>{t.filter.location}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {LOCATION_KEYS.map((locKey) => {
                const active = locs.includes(locKey);
                return (
                  <button
                    key={locKey}
                    type="button"
                    onClick={() => toggleLoc(locKey)}
                    style={{
                      border: `1px solid ${active ? '#ff385c' : '#dddddd'}`,
                      background: active ? '#ff385c' : '#fff',
                      color: active ? '#fff' : '#222',
                      borderRadius: 9999,
                      padding: '6px 12px',
                      fontSize: 12, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {t.locations[locKey]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #ebebeb', paddingTop: 14 }}>
            <button
              type="button"
              onClick={reset}
              style={{
                fontSize: 13, color: '#222', fontWeight: 600,
                background: 'transparent', border: 'none',
                cursor: 'pointer', padding: 0,
                textDecoration: 'underline', textUnderlineOffset: 3,
                fontFamily: 'inherit',
              }}
            >
              {t.filter.reset}
            </button>
            <button
              type="button"
              onClick={apply}
              style={{
                background: '#ff385c', color: '#fff',
                border: 'none', borderRadius: 8,
                padding: '9px 18px', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {t.filter.apply}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
