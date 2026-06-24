import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  LOCALE_TO_BCP47,
  PUBLIC_LOCALES,
  isPublicLocale,
  type PublicLocale,
} from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';

/**
 * Per-locale metadata (title / description / openGraph). Overrides the
 * root layout's defaults so /en, /zh, /ja, /ru, /vi each get their own
 * <title>/<meta description>/og: tags in the active language — important
 * for SEO and for social previews when foreign users share links.
 */
export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  if (!isPublicLocale(params.locale)) return {};
  const dict = await getDictionary(params.locale as PublicLocale);
  const url = `/${params.locale}`;
  return {
    title: dict.meta.siteTitle,
    description: dict.meta.siteDescription,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        PUBLIC_LOCALES.map((l) => [LOCALE_TO_BCP47[l], `/${l}`]),
      ),
    },
    openGraph: {
      type: 'website',
      url,
      siteName: 'glow-up',
      locale: LOCALE_TO_BCP47[params.locale as PublicLocale].replace('-', '_'),
      title: dict.meta.ogTitle,
      description: dict.meta.ogDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.meta.ogTitle,
      description: dict.meta.ogDescription,
    },
  };
}

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

// Pre-generate every locale segment so /kr, /en, /zh, /ja, /ru, /vi
// statically resolve and don't hit catch-all behavior.
export function generateStaticParams(): Array<{ locale: string }> {
  return [
    { locale: 'kr' },
    { locale: 'en' },
    { locale: 'zh' },
    { locale: 'ja' },
    { locale: 'ru' },
    { locale: 'vi' },
  ];
}
