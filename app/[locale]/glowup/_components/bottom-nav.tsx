import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';

/**
 * Bottom tab navigation present on S2 / S3 / S5 / S6 / S7 / S10 (every
 * "home-like" screen). Four tabs: 둘러보기 · 코스 · 예약 · 마이.
 *
 * Icon style: small filled square or circle in glow-wine for active,
 * outlined glow-mist for inactive — matches the spec exactly.
 * Active tab is determined by `active` prop (since RSC can't read
 * usePathname).
 */
export type BottomNavTab = 'discover' | 'courses' | 'booking' | 'my';

const TABS: Array<{
  key: BottomNavTab;
  label: string;
  href: (locale: PublicLocale) => string;
  shape: 'square' | 'circle';
}> = [
  { key: 'discover', label: '둘러보기', href: (l) => `/${l}/glowup/home`, shape: 'square' },
  { key: 'courses',  label: '코스',     href: (l) => `/${l}/glowup/signature`, shape: 'square' },
  { key: 'booking',  label: '예약',     href: (l) => `/${l}/glowup/my-trip`, shape: 'circle' },
  { key: 'my',       label: '마이',     href: (l) => `/${l}/glowup/my-trip`, shape: 'circle' },
];

export function BottomNav({
  locale,
  active,
}: {
  locale: PublicLocale;
  active: BottomNavTab;
}): JSX.Element {
  return (
    <div className="mt-auto flex items-center justify-around border-t border-[#E6DECF] bg-glow-cream px-6 pb-[22px] pt-[14px]">
      {TABS.map((t) => {
        const isActive = t.key === active;
        const text = isActive ? 'text-glow-wine font-semibold' : 'text-[#A89E90]';
        const radius = t.shape === 'square' ? 'rounded-[5px]' : 'rounded-full';
        const fill = isActive ? 'bg-glow-wine' : 'border-2 border-[#A89E90]';
        return (
          <Link
            key={t.key}
            href={t.href(locale)}
            className={`flex flex-col items-center gap-[5px] ${text}`}
          >
            <div className={`h-[18px] w-[18px] ${radius} ${fill}`} />
            <span className="text-[10px]">{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
