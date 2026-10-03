import LegalDocView from '@/components/shared/legal-doc';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import type { PublicLocale } from '@/lib/i18n/locales';
import { PRIVACY } from '@/lib/legal/privacy';

export const dynamic = 'force-dynamic';

/**
 * 개인정보처리방침 — /[locale]/privacy. 본문은 lib/legal/privacy.ts (한국어 원문 + 5개 언어 번역, 2026-10-03).
 * 구조는 KISA 처리방침 표준(수집 항목 / 목적 / 보유 기간 / 제3자 제공 / 위탁 / 권리 / 책임자)을 따른다.
 */
export async function generateMetadata({ params }: { params: { locale: PublicLocale } }): Promise<{ title: string }> {
  return { title: (PRIVACY[params.locale] ?? PRIVACY.kr).metaTitle };
}

export default async function PrivacyPage({ params }: { params: { locale: PublicLocale } }): Promise<JSX.Element> {
  const doc = PRIVACY[params.locale] ?? PRIVACY.kr;
  const dict = await getDictionary(params.locale);
  return <LegalDocView locale={params.locale} doc={doc} business={dict.siteFooter.business} />;
}
