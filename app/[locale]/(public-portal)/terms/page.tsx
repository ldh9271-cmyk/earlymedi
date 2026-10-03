import LegalDocView from '@/components/shared/legal-doc';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import type { PublicLocale } from '@/lib/i18n/locales';
import { TERMS } from '@/lib/legal/terms';

export const dynamic = 'force-dynamic';

/**
 * 이용약관 — /[locale]/terms. 본문은 lib/legal/terms.ts (한국어 원문 + 5개 언어 번역, 2026-10-03).
 * 회사 표기줄은 푸터와 같은 사전 값(siteFooter.business)을 쓴다.
 */
export async function generateMetadata({ params }: { params: { locale: PublicLocale } }): Promise<{ title: string }> {
  return { title: (TERMS[params.locale] ?? TERMS.kr).metaTitle };
}

export default async function TermsPage({ params }: { params: { locale: PublicLocale } }): Promise<JSX.Element> {
  const doc = TERMS[params.locale] ?? TERMS.kr;
  const dict = await getDictionary(params.locale);
  return <LegalDocView locale={params.locale} doc={doc} business={dict.siteFooter.business} />;
}
