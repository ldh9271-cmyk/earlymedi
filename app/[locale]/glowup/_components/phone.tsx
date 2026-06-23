import type { ReactNode } from 'react';

/**
 * 390×844 iPhone-sized phone frame.
 *
 * Desktop: shows the bezel + drop shadow so a designer can review the
 * mobile app on a wide screen the way the source mockup did.
 * Mobile (<sm): drops the bezel and goes full-bleed for actual phone
 * usage — the inner cream/white app shell becomes the viewport.
 *
 * Inner surface scrolls vertically. The `position: relative` on the
 * inner wraps the sticky status bar + bottom tab bar correctly without
 * leaking outside the rounded mask.
 */
export function PhoneFrame({ children }: { children: ReactNode }): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-0 sm:p-8 md:p-12 lg:bg-[#f7f7f7]">
      <div
        className="
          w-full min-h-screen sm:w-[390px] sm:h-[844px] sm:min-h-0
          sm:bg-black sm:p-[11px] sm:rounded-[54px]
          sm:shadow-[0_40px_80px_-30px_rgba(0,0,0,0.4)]
        "
      >
        <div className="relative h-full min-h-screen w-full overflow-y-auto bg-white sm:min-h-0 sm:rounded-[43px]">
          {children}
        </div>
      </div>
    </main>
  );
}

/**
 * iOS-style 9:41 + 5G + battery status bar. Sticky to top so it
 * remains visible while the inner content scrolls. The image-hero
 * screens (course detail) prefer `tone="light"` so the white text is
 * legible against the photo overlay.
 */
export function StatusBar({
  tone = 'dark',
  sticky = true,
}: {
  tone?: 'dark' | 'light';
  sticky?: boolean;
}): JSX.Element {
  const color = tone === 'light' ? '#fff' : '#222';
  return (
    <div
      className={`${sticky ? 'sticky top-0 z-20 bg-white' : ''} px-7 pt-3.5`}
      style={{ color, background: sticky ? '#fff' : undefined }}
    >
      <div className="flex items-center justify-between text-[15px] font-semibold">
        <span>9:41</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[12px]">5G</span>
          <div
            className="flex h-3 w-6 items-stretch rounded-[3px] border-[1.5px] p-[1.5px]"
            style={{ borderColor: color }}
          >
            <div className="h-full w-[72%] rounded-[1px]" style={{ background: color }} />
          </div>
        </div>
      </div>
    </div>
  );
}
