import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { PatientLoginForm } from './_components/patient-login-form';

/**
 * Patient-facing login page — Airbnb design language.
 *
 * Distinct from the B2B `/login` (which targets the 4 operator
 * actors). Patient orgs are created by the clinic on booking, so
 * this page only ever needs to RETURN a patient to their case data —
 * passwordless magic link only. No Google OAuth (patients typically
 * use the email the clinic has on file), no signup tab here (handled
 * by /[locale]/signup), no password tab (magic link is the documented
 * model).
 *
 * Visual: centered ~420px card on the white Airbnb canvas, #ff385c
 * accents for primary actions, muted secondary links.
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
    <section
      style={{
        maxWidth: 480, margin: '0 auto', padding: '56px 24px 80px',
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
          {dict.login.badge}
        </span>
        <h1
          style={{
            fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px',
            margin: '14px 0 6px',
          }}
        >
          {dict.login.title}
        </h1>
        <p style={{ fontSize: 14, color: '#6a6a6a', margin: 0, lineHeight: 1.5 }}>
          {dict.login.subtitle}
        </p>
      </div>

      <div
        style={{
          border: '1px solid #dddddd', borderRadius: 14,
          background: '#fff', padding: 28,
          boxShadow: 'rgba(0,0,0,0.04) 0 2px 8px',
        }}
      >
        <PatientLoginForm locale={locale} dict={dict.login} />
      </div>

      <div
        style={{
          border: '1px solid #ebebeb', borderRadius: 14,
          background: '#fafafa', padding: '16px 20px',
          textAlign: 'center', fontSize: 13, color: '#6a6a6a',
        }}
      >
        <p style={{ margin: '0 0 8px' }}>
          {dict.signup.haveAccount === '이미 계정이 있으신가요?'
            ? '아직 계정이 없으신가요?'
            : dict.login.noAccount}
        </p>
        <div
          style={{
            display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
            gap: 14, alignItems: 'center',
          }}
        >
          <Link
            href={`/${locale}/signup`}
            style={{ color: '#222', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            {dict.signup.submitCta} →
          </Link>
          <span style={{ color: '#dddddd' }}>·</span>
          <Link
            href={`/${locale}/inquiry`}
            style={{ color: '#222', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            {dict.login.goInquiry}
          </Link>
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid #ebebeb', paddingTop: 16,
          textAlign: 'center', fontSize: 12, color: '#6a6a6a',
        }}
      >
        <p style={{ margin: 0 }}>{dict.login.business}</p>
        <Link
          href="/login"
          style={{
            display: 'inline-block', marginTop: 4,
            color: '#222', fontWeight: 600,
            textDecoration: 'underline', textUnderlineOffset: 3,
          }}
        >
          {dict.login.businessLogin}
        </Link>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#9c9c9c', margin: 0 }}>
        {dict.login.privacy}
      </p>
    </section>
  );
}
