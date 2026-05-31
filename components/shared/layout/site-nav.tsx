import Link from 'next/link';

/**
 * Marketing-surface global header.
 *
 * Used on:
 *   - `/` (root landing — explicitly rendered)
 *   - `/(marketing)/*` (pricing, about, legal, showroom — via layout)
 *
 * Sticky `top-0 z-40` with translucent backdrop blur. Logo collapses to
 * "KoreaGlowUp" on mobile; full "KoreaGlowUp AI Concierge" on md+. Center
 * nav links (의료관광 / 기능 / 요금제 / 데모) hidden below md. The two pill
 * CTAs (로그인 / 무료로 시작) are always visible — they shrink to h-9 text-xs
 * px-3 on mobile so even narrow phones don't wrap them.
 *
 * Anchor links (`#actors`, `#features`) only resolve on `/`. On other
 * pages they degrade harmlessly — the browser scrolls to the top.
 */
export function SiteNav(): JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:gap-6 md:px-6 md:py-5">
        <Link href="/" className="shrink-0 whitespace-nowrap text-base font-bold tracking-tight md:text-2xl">
          <span className="font-extrabold text-brand-600">Korea</span>
          <span className="font-semibold">GlowUp</span>
          <span className="hidden text-hospitality-500 md:inline">{' '}AI Concierge</span>
        </Link>
        <nav className="hidden items-center gap-7 text-lg font-medium md:flex">
          <Link href="/#actors" className="text-muted-foreground hover:text-foreground">
            의료관광
          </Link>
          <Link href="/#features" className="text-muted-foreground hover:text-foreground">
            기능
          </Link>
          <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
            요금제
          </Link>
          <Link href="/showroom/insights" className="text-muted-foreground hover:text-foreground">
            데모 둘러보기
          </Link>
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          <Link
            href="/login"
            className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-card px-3 text-xs font-semibold transition hover:bg-muted md:h-11 md:px-5 md:text-base"
          >
            로그인
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-foreground px-3 text-xs font-semibold text-background transition hover:bg-foreground/90 md:h-11 md:px-5 md:text-base"
          >
            무료로 시작
          </Link>
        </div>
      </div>
    </header>
  );
}
