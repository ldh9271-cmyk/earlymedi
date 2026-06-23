import { notFound } from 'next/navigation';
import { isPublicLocale } from '@/lib/i18n/locales';

/**
 * Root layout for /[locale]/* — locale validation ONLY.
 *
 * Previously this layout also rendered PublicHeader + PublicFooter
 * around every patient-facing route. That coupling meant the new
 * /glowup mobile-app design also got the desktop chrome rendered
 * on top of the phone-frame mockup. We split those concerns:
 *
 *   - This file (root) — validates locale, generateStaticParams for
 *     the 4 locales, and passes children through.
 *   - (public-portal)/layout.tsx — adds PublicHeader + PublicFooter
 *     to the legacy patient routes (landing, clinics, inquiry, etc.).
 *   - glowup/layout.tsx — applies the glowup font stack + ivory bg.
 *     The mobile app design owns the full viewport.
 *
 * Route groups (paren-wrapped folders) are not part of the URL, so
 * existing links like /kr/clinics/[slug] keep working unchanged after
 * the move into (public-portal)/.
 */
export default function PublicLocaleRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}): JSX.Element {
  if (!isPublicLocale(params.locale)) {
    notFound();
  }
  return <>{children}</>;
}

// Pre-generate the 4 locale segments so /kr, /en, /zh, /ja statically
// resolve and don't hit catch-all behavior.
export function generateStaticParams(): Array<{ locale: string }> {
  return [{ locale: 'kr' }, { locale: 'en' }, { locale: 'zh' }, { locale: 'ja' }];
}
