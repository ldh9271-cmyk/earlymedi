import type { ReactNode } from 'react';

/**
 * Glow-up patient app layout — minimal wrapper.
 *
 * Replaces the earlier Atelier mobile design (10-screen Wine/Ivory
 * phone mockups) with the Airbnb-style mobile patterns:
 *   - /[locale]/glowup           → Home (screen 1)
 *   - /[locale]/glowup/courses/[id]  → Course detail (screen 2)
 *   - /[locale]/glowup/explore   → Food & K-pop (screen 3)
 *   - /[locale]/glowup/categories  → All categories feed (screen 4)
 *   - /[locale]/glowup/pc        → Desktop landing (existing)
 *
 * Mobile screens render a phone-frame mockup on desktop (so designers
 * see the full app shell at full size) and full-bleed on real mobile.
 *
 * Inter + Pretendard fonts come from the root globals.css — no
 * additional next/font/google calls needed. The old Noto Serif KR +
 * Cormorant + Space Mono fonts that the Atelier design relied on were
 * removed since the Airbnb-style mobile design uses neither.
 *
 * Background is a plain white so the phone-frame's outer chrome (on
 * desktop) sits on a neutral surface, matching the design's photo
 * preview cards.
 */
export default function GlowupLayout({ children }: { children: ReactNode }): JSX.Element {
  return <div className="min-h-screen bg-white text-glow-ink antialiased">{children}</div>;
}
