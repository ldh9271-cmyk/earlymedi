import type { ReactNode } from 'react';
import { Noto_Serif_KR, Cormorant_Garamond, Space_Mono } from 'next/font/google';

/**
 * Korea Glow-up Challenge — patient-portal redesign root layout.
 *
 * Scoped to /[locale]/glowup/* so the legacy /[locale] B2C landing
 * stays on the old blue brand-* tokens until we explicitly migrate.
 *
 * Font strategy:
 *   - next/font/google self-hosts WOFF2 → no FOUT, no privacy-leaking
 *     fonts.googleapis.com lookup. CSS variables let Tailwind classes
 *     (font-glow-serif, font-glow-italic, font-glow-mono) target each.
 *   - Pretendard is already CDN-loaded in globals.css for the rest of
 *     the app; we reuse it via `var(--font-pretendard)` so font-glow-sans
 *     doesn't double-fetch.
 *   - Subsets: latin only for italic + mono accent fonts (English /
 *     numeric usage). Korean serif sits at the global lang setting.
 *
 * Background lives on a layer wrapping {children} rather than <body> so
 * navigating from /agency/* into /[locale]/glowup/* doesn't bleed ivory
 * back into the B2B routes.
 */

const notoSerifKr = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-serif-kr',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
});

export default function GlowupLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div
      className={`${notoSerifKr.variable} ${cormorant.variable} ${spaceMono.variable} min-h-screen bg-glow-ivory font-glow-sans text-glow-ink antialiased`}
    >
      {children}
    </div>
  );
}
