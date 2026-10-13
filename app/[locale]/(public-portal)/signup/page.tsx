import Link from 'next/link';
import { isSafeInternalPath } from '@/lib/auth/safe-path';
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
  return { title: `${dict.signup.title} · 글로우업투어` };
}

export default async function PatientSignupPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { next?: string };
}): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) notFound();
  const locale = params.locale as PublicLocale;
  const dict = await getDictionary(locale);
  // 예약 도중 가입한 경우 끝나고 그 페이지로 되돌린다. 오픈 리다이렉트를
  // 막기 위해 같은 사이트 경로(/로 시작, //로 시작하지 않음)만 허용.
  const nextPath =
    isSafeInternalPath(searchParams.next)
      ? searchParams.next
      : undefined;

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


      {/* 2026-10-13: 기존 회원이 먼저 보도록 로그인 안내를 가입 폼 위로 (예약은 회원만 → 비회원이 가입 페이지로 오는 흐름) */}
      <div
        style={{
          border: '1px solid #ffd7de', borderRadius: 14,
          background: '#fff8f9', padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          fontSize: 14, color: '#222',
        }}
      >
        <span style={{ fontWeight: 600 }}>{dict.signup.haveAccount}</span>
        <Link
          href={nextPath ? `/${locale}/login?next=${encodeURIComponent(nextPath)}` : `/${locale}/login`}
          style={{ display: 'inline-block', background: '#222', color: '#fff', borderRadius: 10, padding: '9px 16px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
        >
          {dict.signup.goLogin}
        </Link>
      </div>
      <div
        style={{
          border: '1px solid #dddddd', borderRadius: 14,
          background: '#fff', padding: 28,
          boxShadow: 'rgba(0,0,0,0.04) 0 2px 8px',
        }}
      >
        <PatientSignupForm locale={locale} dict={dict.signup} waDict={dict.whatsapp} nextPath={nextPath} />
      </div>


      <p style={{ textAlign: 'center', fontSize: 11, color: '#9c9c9c', margin: 0 }}>
        {dict.signup.privacy}
      </p>
    </section>
  );
}
