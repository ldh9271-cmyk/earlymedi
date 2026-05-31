import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { notFound } from 'next/navigation';
import { PatientLoginForm } from './_components/patient-login-form';

/**
 * Patient-facing login page.
 *
 * Why this exists alongside the B2B `/login`:
 *   - The B2B page is built for the 4 operator actors (agency/medical/
 *     partner/freelancer) — its copy ("Free for first 10 patients",
 *     "Pick your category to sign up") confuses real foreign patients
 *     who land there after clicking the "Sign in" link on /kr|/en|/zh|/ja.
 *   - Patients never sign UP here — they're created in the system the
 *     moment a clinic books their procedure. They only ever need to
 *     RETURN, which is exactly what a passwordless magic link is for.
 *   - The signed-out account-types middleware already allow-lists every
 *     /kr|/en|/zh|/ja prefix, so this page is reachable without auth.
 *
 * What it does NOT include (intentionally):
 *   - Google OAuth — patients typically use the email the clinic has on
 *     file; cross-account OAuth confuses the link to their case data.
 *   - Sign-up flow — see above. No new patient orgs from this page.
 *   - Password tab — see above. Magic link only is the documented model.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<{ title: string }> {
  if (!isPublicLocale(params.locale)) return { title: 'Login' };
  const dict = await getDictionary(params.locale);
  return { title: `${dict.login.title} · KoreaGlowUp` };
}

export default async function PatientLoginPage({
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
            {dict.login.badge}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{dict.login.title}</h1>
          <p className="text-sm text-muted-foreground">{dict.login.subtitle}</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <PatientLoginForm locale={locale} dict={dict.login} />
        </div>

        <div className="space-y-3 rounded-xl border bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground">
          <p>{dict.login.noAccount}</p>
          <Link
            href={`/${locale}/inquiry`}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {dict.login.goInquiry}
          </Link>
        </div>

        <div className="space-y-2 border-t pt-4 text-center text-[11px] text-muted-foreground">
          <p>{dict.login.business}</p>
          <Link
            href="/login"
            className="inline-block font-medium text-foreground underline-offset-4 hover:underline"
          >
            {dict.login.businessLogin}
          </Link>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">{dict.login.privacy}</p>
      </div>
    </div>
  );
}
