import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  LOCALE_TO_BCP47,
  PUBLIC_LOCALES,
  isPublicLocale,
  type PublicLocale,
} from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { BRAND_ALIASES, BRAND_NAME, brandJsonLd, withBrandSuffix } from '@/lib/seo/brand';

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
    // absolute — 루트 레이아웃의 '· KoreaGlowUp AI Concierge' 템플릿은
    // B2B SaaS 이름이라 소비자 포털 제목에 붙으면 브랜드가 흐려진다.
    // 사전 제목이 이미 브랜드로 시작하면 접미를 생략한다 (withBrandSuffix).
    title: { absolute: withBrandSuffix(dict.meta.siteTitle) },
    description: dict.meta.siteDescription,
    // 한글·영문 표기가 갈리는 브랜드라 별칭을 키워드로도 넣어 둔다.
    keywords: [BRAND_NAME, ...BRAND_ALIASES],
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        PUBLIC_LOCALES.map((l) => [LOCALE_TO_BCP47[l], `/${l}`]),
      ),
    },
    openGraph: {
      type: 'website',
      url,
      siteName: BRAND_NAME,
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
 * Previously this layout also rendered the public header + footer
 * around every patient-facing route. That coupling meant the new
 * /glowup mobile-app design also got the desktop chrome rendered
 * on top of the phone-frame mockup. We split those concerns:
 *
 *   - This file (root) — validates locale, generateStaticParams for
 *     the 4 locales, and passes children through.
 *   - (public-portal)/layout.tsx — adds MainHeader + MainFooter
 *     to the patient routes (landing, clinics, inquiry, etc.).
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
  return (
    <>
      {/* 브랜드 엔티티(Organization + WebSite) — 검색엔진이 '코리아
          글로우업 / 글로우업투어' 같은 표기 변형을 한 브랜드로 묶도록
          alternateName 을 명시한다. 공개 포털 전 페이지에 실린다. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: brandJsonLd(params.locale) }}
      />
      {children}
    </>
  );
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
