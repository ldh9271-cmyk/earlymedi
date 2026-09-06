import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { StaysRegistryList, type StaysSearch } from '../_registry/list';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  if (!isPublicLocale(params.locale)) return {};
  const dict = await getDictionary(params.locale);
  return { title: `${dict.staysRegistry.title} · GlowUpTour`, description: dict.staysRegistry.subtitle };
}

/**
 * 전국 숙박 찾기 — 행안부 문화_숙박업 레지스트리 전체 (영업 중만) + 글로우 인증(직접 등록) 호텔.
 * 목록 UI는 StaysRegistryList (메인메뉴 호텔 카테고리 페이지와 공유).
 */
export default async function StaysListPage({ params, searchParams }: { params: { locale: string }; searchParams: StaysSearch }): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) notFound();
  const locale = params.locale as PublicLocale;
  const dict = await getDictionary(locale);
  return <StaysRegistryList locale={locale} dict={dict} searchParams={searchParams} basePath={`/${locale}/stays/all`} />;
}
