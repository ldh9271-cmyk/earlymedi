import { LOCALE_TO_BCP47, type PublicLocale } from '@/lib/i18n/locales';
import { MainHeader } from '../_components/main-header';
import { MainFooter } from '../_components/main-footer';

export const dynamic = 'force-dynamic';

/**
 * Patient-facing public portal layout — Airbnb design language.
 *
 * Wraps every route under (public-portal): /clinics, /clinics/[slug],
 * /inquiry, /ai-consult, /login, /signup, /procedures, /admin. All
 * share the same MainHeader (sticky 80px + 의료 카테고리 strip) and
 * MainFooter as the /[locale] landing page, so the whole B2C surface
 * has a single visual identity.
 *
 * Active tab + category default to "병원 찾기" + "전체" which is the
 * right baseline for /clinics traffic. Pages that need a different
 * active state (e.g. /ai-consult highlighting the AI tab) can render
 * their own MainHeader instead of relying on this layout.
 *
 * The /[locale]/glowup/* routes also adopt MainHeader/MainFooter
 * (via their own page wrappers) so the shell is consistent
 * everywhere — only the body content differs.
 */
export default function PublicPortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: PublicLocale };
}): JSX.Element {
  return (
    <div
      lang={LOCALE_TO_BCP47[params.locale]}
      style={{
        background: '#ffffff',
        fontFamily:
          "'Inter', 'Airbnb Cereal VF', Circular, -apple-system, system-ui, sans-serif",
        color: '#222222',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'clip',
      }}
    >
      <MainHeader locale={params.locale} activeKey="all" activeTab="clinics" />
      <main style={{ flex: 1 }}>{children}</main>
      <MainFooter />
    </div>
  );
}
