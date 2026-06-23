import { LOCALE_TO_BCP47, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';

export const dynamic = 'force-dynamic';

/**
 * Patient-facing public portal layout (legacy routes).
 *
 * Wraps PublicHeader + main + PublicFooter for everything under the
 * (public-portal) route group: landing, clinics, inquiry, login,
 * signup, ai-consult, procedures, admin. Locale validation already
 * happened in the parent /[locale]/layout.tsx, so we can trust
 * `params.locale` as a PublicLocale.
 *
 * The /[locale]/glowup/* routes intentionally bypass this layout —
 * the mobile-app redesign owns the full viewport.
 */
export default async function PublicPortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: PublicLocale };
}): Promise<JSX.Element> {
  const dict = await getDictionary(params.locale);

  // Optional master flag — only used to expose the /admin link in the
  // header. Failure to load the session is non-fatal; we just render
  // the header without the admin shortcut.
  let isMaster = false;
  try {
    const supabase = createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    isMaster = isMasterEmail(auth.user?.email ?? null);
  } catch {
    isMaster = false;
  }

  return (
    <div
      lang={LOCALE_TO_BCP47[params.locale]}
      className="flex min-h-screen flex-col bg-background text-foreground"
    >
      <PublicHeader locale={params.locale} dict={dict} isMaster={isMaster} />
      <main className="flex-1">{children}</main>
      <PublicFooter locale={params.locale} dict={dict} />
    </div>
  );
}
