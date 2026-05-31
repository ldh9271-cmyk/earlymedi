import { notFound } from 'next/navigation';
import { isPublicLocale, LOCALE_TO_BCP47, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';

export const dynamic = 'force-dynamic';

/**
 * Patient-facing portal layout — applies to every route under
 * /kr|/en|/zh|/ja. The B2B dashboards under /agency, /medical,
 * /partner, /freelancer keep their own AppShell layout untouched.
 *
 * Locale validation happens here so individual pages can assume
 * `params.locale` is one of PUBLIC_LOCALES. Anything else 404s
 * cleanly without leaking the page structure.
 */
export default async function PublicLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) {
    notFound();
  }
  const locale = params.locale as PublicLocale;
  const dict = await getDictionary(locale);

  return (
    <div
      lang={LOCALE_TO_BCP47[locale]}
      className="flex min-h-screen flex-col bg-background text-foreground"
    >
      <PublicHeader locale={locale} dict={dict} />
      <main className="flex-1">{children}</main>
      <PublicFooter locale={locale} dict={dict} />
    </div>
  );
}

// Pre-generate the 4 locale segments so /kr, /en, /zh, /ja statically
// resolve and don't hit catch-all behavior.
export function generateStaticParams(): Array<{ locale: string }> {
  return [{ locale: 'kr' }, { locale: 'en' }, { locale: 'zh' }, { locale: 'ja' }];
}
