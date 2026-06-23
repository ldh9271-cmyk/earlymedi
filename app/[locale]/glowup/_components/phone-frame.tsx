import type { ReactNode } from 'react';

/**
 * Phone-frame wrapper used by every glowup screen.
 *
 * Desktop: 380×800 jet-bezel phone mockup centered on ivory page —
 * preserves the design's "atelier" presentation when reviewing the
 * full flow on a laptop.
 *
 * Mobile (sm breakpoint and below): drops the bezel entirely and goes
 * full-bleed so the experience feels like a native app on real phones.
 *
 * The cream-colored screen inside is rounded internally so on desktop
 * the rounded inner display sits inside a slightly larger jet outer
 * frame, exactly matching the source design.
 */
export function PhoneFrame({
  children,
  variant = 'cream',
}: {
  children: ReactNode;
  /** Inside-screen background. cream = default ivory app surface,
   *  jet = dark variant for confirmation/landing-hero screens. */
  variant?: 'cream' | 'jet';
}): JSX.Element {
  const innerBg = variant === 'jet' ? 'bg-glow-jet' : 'bg-glow-cream';
  return (
    <main className="flex min-h-screen items-center justify-center bg-glow-ivory p-0 sm:p-8 md:p-12">
      <div
        className="
          w-full sm:w-[380px] sm:h-[800px] sm:p-[11px]
          sm:rounded-[54px] sm:bg-glow-jet
          sm:shadow-[0_50px_90px_-40px_rgba(40,28,22,0.55),0_0_0_1px_rgba(0,0,0,0.35)]
          min-h-screen sm:min-h-0
        "
      >
        <div
          className={`relative flex h-full min-h-screen w-full flex-col overflow-hidden ${innerBg} sm:min-h-0 sm:rounded-[43px]`}
        >
          {children}
        </div>
      </div>
    </main>
  );
}

/**
 * iOS-style status bar (9:41 · 5G · battery) shown at the top of every
 * non-onboarding screen. Colors flip based on the underlying surface.
 */
export function StatusBar({ tone = 'dark' }: { tone?: 'dark' | 'light' }): JSX.Element {
  const text = tone === 'light' ? 'text-glow-paper' : 'text-glow-ink';
  const border = tone === 'light' ? 'border-glow-paper' : 'border-glow-ink';
  const fill = tone === 'light' ? 'bg-glow-paper' : 'bg-glow-ink';
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-between px-7 pt-[18px] text-[15px] font-semibold ${text}`}
    >
      <span>9:41</span>
      <div className="flex items-center gap-[7px]">
        <span className="text-[12px]">5G</span>
        <div className={`flex h-3 w-6 items-stretch rounded-[3px] border-[1.5px] ${border} p-[1.5px]`}>
          <div className={`h-full w-[72%] rounded-[1px] ${fill}`} />
        </div>
      </div>
    </div>
  );
}
