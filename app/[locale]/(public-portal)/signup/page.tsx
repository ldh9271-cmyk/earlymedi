import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { notFound } from 'next/navigation';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { PatientSignupForm } from './_components/patient-signup-form';

/**
 * Patient signup page — paired with /[locale]/login.
 *
 * Why a dedicated signup page (vs. unified login+signup tabs):
 *   - The form has 9 inputs (username, password, password confirm,
 *     name, country, phone, email, messenger kind, messenger ID). It
 *     doesn't fit inside a tab inside the login card without becoming
 *     a wall of text the patient skims past.
 *   - Patients arriving here are committing to register. Patients on
 *     /login are returning, and want the magic-link flow above all.
 *     Two pages keeps each flow optimized.
 *
 * Routing: linked from /[locale]/login bottom row + via direct entry
 * (could be added to the public-header later as an explicit "Sign up"
 * CTA if conversion data shows demand).
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<{ title: string }> {
  if (!isPublicLocale(params.locale)) return { title: 'Sign up' };
  const dict = await getDictionary(params.locale);
  return { title: `${dict.signup.title} · KoreaGlowUp` };
}

export default async function PatientSignupPage({
  params,
}: {
  params: { locale: string };
}): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) notFound();
  const locale = params.locale as PublicLocale;
  const dict = await getDictionary(locale);

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="space-y-6">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800">
            <Sparkles className="h-3 w-3" />
            {dict.signup.badge}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{dict.signup.title}</h1>
          <p className="text-sm text-muted-foreground">{dict.signup.subtitle}</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <PatientSignupForm locale={locale} dict={dict.signup} />
        </div>

        <div className="rounded-xl border bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground">
          <p>{dict.signup.haveAccount}</p>
          <Link
            href={`/${locale}/login`}
            className="mt-1 inline-block font-medium text-foreground underline-offset-4 hover:underline"
          >
            {dict.signup.goLogin}
          </Link>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">{dict.signup.privacy}</p>
      </div>
    </div>
  );
}
