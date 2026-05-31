import { cn } from '@/lib/utils/cn';

/**
 * KoreaGlowUp AI Concierge wordmark.
 *
 *   Korea       — brand-600 (Indigo), font-extrabold
 *   GlowUp      — foreground, font-semibold
 *   AI Concierge — hospitality-500 (Amber), font-medium accent
 *
 * Sizes:
 *   xs  → header chip
 *   sm  → sidebar
 *   md  → topbar
 *   lg  → marketing hero
 */
export function Logo({
  size = 'md',
  className,
  showTagline = false,
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}): JSX.Element {
  const sizeClass = {
    xs: 'text-sm',
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-5xl',
  }[size];

  return (
    <span className={cn('inline-flex flex-col leading-tight', className)}>
      <span className={cn('font-display tracking-tight', sizeClass)}>
        <span className="font-extrabold text-brand-600">Korea</span>
        <span className="font-semibold text-foreground">GlowUp</span>{' '}
        <span className="font-medium text-hospitality-500">AI Concierge</span>
      </span>
      {showTagline ? (
        <span className="text-xs text-muted-foreground">
          환자의 첫 문의부터 귀국 후 케어까지
        </span>
      ) : null}
    </span>
  );
}

export function LogoMark({ className }: { className?: string }): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white',
        className,
      )}
      aria-label="KoreaGlowUp"
    >
      K
    </span>
  );
}
