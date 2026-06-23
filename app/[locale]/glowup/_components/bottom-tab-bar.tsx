import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';

/**
 * 5-tab bottom navigation reused across screens 1/3/4.
 *
 * Active tab gets the red (#ff385c) accent matching the Airbnb spec;
 * inactive tabs stay neutral gray. Each tab links to a real route in
 * this app — wishlists/trips/messages don't have dedicated pages yet,
 * so they point to the existing patient-portal equivalents (clinics,
 * inquiry, etc.) until those screens land.
 */
export type GlowupTab = 'explore' | 'wishlist' | 'trips' | 'messages' | 'profile';

export function BottomTabBar({
  locale,
  active,
}: {
  locale: PublicLocale;
  active: GlowupTab;
}): JSX.Element {
  const TABS: Array<{
    key: GlowupTab;
    label: string;
    href: string;
    icon: (color: string) => JSX.Element;
  }> = [
    {
      key: 'explore',
      label: '둘러보기',
      href: `/${locale}/glowup`,
      icon: (c) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" />
        </svg>
      ),
    },
    {
      key: 'wishlist',
      label: '위시리스트',
      href: `/${locale}/glowup/categories`,
      icon: (c) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6">
          <path d="M12 20s-7-4.5-9.2-8.5C1.3 8.7 2.5 5.5 5.5 5.5c1.8 0 2.9 1 3.5 2 .6-1 1.7-2 3.5-2 3 0 4.2 3.2 2.7 6C19 15.5 12 20 12 20z" />
        </svg>
      ),
    },
    {
      key: 'trips',
      label: '여행',
      href: `/${locale}/glowup/explore`,
      icon: (c) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6">
          <path d="M3 7h18v13H3zM3 7l3-4h12l3 4M8 11h8" />
        </svg>
      ),
    },
    {
      key: 'messages',
      label: '메시지',
      href: `/${locale}/inquiry`,
      icon: (c) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6">
          <path d="M4 5h16v12H7l-3 3z" />
        </svg>
      ),
    },
    {
      key: 'profile',
      label: '프로필',
      href: `/${locale}/login`,
      icon: (c) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6">
          <circle cx="12" cy="9" r="4" />
          <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
      ),
    },
  ];

  return (
    <div className="sticky bottom-0 flex items-center justify-around border-t border-[#ebebeb] bg-white px-2 pb-[22px] pt-2.5">
      {TABS.map((t) => {
        const isActive = t.key === active;
        const color = isActive ? '#ff385c' : '#9a9a9a';
        return (
          <Link
            key={t.key}
            href={t.href}
            className="flex flex-col items-center gap-1"
            style={{ color }}
          >
            {t.icon(color)}
            <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
              {t.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
