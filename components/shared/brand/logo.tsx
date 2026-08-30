import { cn } from '@/lib/utils/cn';
import { BrandMark, BrandLockup } from '@/app/[locale]/_components/brand-mark';

/**
 * 글로우업투어 워드마크 (콘솔용).
 *
 * 예전에는 "Korea(인디고) GlowUp AI Concierge(앰버)" 텍스트 로크업이었다.
 * 고객 포털·/biz·로그인은 모두 glow-up K 마크 + 로즈 로크업을 쓰는데
 * 콘솔만 달라서, 로그인 직후 브랜드가 바뀌어 보였다. 마크는
 * app/[locale]/_components/brand-mark 하나만 쓴다.
 *
 * Sizes:
 *   xs  → header chip
 *   sm  → sidebar
 *   md  → topbar
 *   lg  → marketing hero
 */

const ROSE = '#ff385c';

const LOCKUP_HEIGHT = { xs: 20, sm: 24, md: 28, lg: 36, xl: 52 } as const;

export function Logo({
  size = 'md',
  className,
  showTagline = false,
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}): JSX.Element {
  return (
    <span className={cn('inline-flex flex-col gap-1 leading-tight', className)}>
      <BrandLockup height={LOCKUP_HEIGHT[size]} color={ROSE} />
      {showTagline ? (
        <span className="text-xs text-muted-foreground">
          병원 · 뷰티 · 호텔 · 여행 파트너 콘솔
        </span>
      ) : null}
    </span>
  );
}

/** 정사각 아이콘 자리(아바타·파비콘 대체)용 K 마크. */
export function LogoMark({ className }: { className?: string }): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50',
        className,
      )}
      aria-label="글로우업투어"
    >
      <BrandMark size={22} color={ROSE} variant="bold" />
    </span>
  );
}
