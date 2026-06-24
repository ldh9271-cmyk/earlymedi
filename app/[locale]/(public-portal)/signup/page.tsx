import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { PatientSignupForm } from './_components/patient-signup-form';

/**
 * Patient signup page — paired with /[locale]/login, Airbnb shell.
 *
 * Dedicated page (not a tab on /login) because the form has 9 inputs
 * and would crowd the login card. Patients arriving here are
 * committing to register; patients on /login are returning. Two
 * pages keeps each flow optimized.
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
    <section
      style={{
        maxWidth: 520, margin: '0 auto', padding: '56px 24px 80px',
        display: 'flex', flexDirection: 'column', gap: 24,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#fff5f7', color: '#ff385c',
            border: '1px solid #fecdd3',
            borderRadius: 9999, padding: '5px 12px',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.3px',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 6.4 6.6 0.6-5 4.4 1.6 6.6L12 16.8l-5.6 3.2 1.6-6.6L3 9l6.6-0.6z" />
          </svg>
          {dict.signup.badge}
        </span>
        <h1
          style={{
            fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px',
            margin: '14px 0 6px',
          }}
        >
          {dict.signup.title}
        </h1>
        <p style={{ fontSize: 14, color: '#6a6a6a', margin: 0, lineHeight: 1.5 }}>
          {dict.signup.subtitle}
        </p>
      </div>

      <div
        style={{
          border: '1px solid #dddddd', borderRadius: 14,
          background: '#fff', padding: 28,
          boxShadow: 'rgba(0,0,0,0.04) 0 2px 8px',
        }}
      >
        <PatientSignupForm locale={locale} dict={dict.signup} />
      </div>

      <div
        style={{
          border: '1px solid #ebebeb', borderRadius: 14,
          background: '#fafafa', padding: '16px 20px',
          textAlign: 'center', fontSize: 13, color: '#6a6a6a',
        }}
      >
        <p style={{ margin: '0 0 4px' }}>{dict.signup.haveAccount}</p>
        <Link
          href={`/${locale}/login`}
          style={{ color: '#222', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          {dict.signup.goLogin}
        </Link>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#9c9c9c', margin: 0 }}>
        {dict.signup.privacy}
      </p>
    </section>
  );
}
