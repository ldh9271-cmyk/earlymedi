import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { EatsRegistryList, type EatsSearch } from '../_registry/list';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  if (!isPublicLocale(params.locale)) return {};
  const dict = await getDictionary(params.locale);
  return { title: `${dict.eatsRegistry.title} · GlowUpTour`, description: dict.eatsRegistry.subtitle };
}

/**
 * 전국 맛집 찾기 — 행안부 식품_일반음식점 레지스트리 전체 (영업 중만) + 글로우 인증(직접 등록) 찐맛집.
 * 목록 UI는 EatsRegistryList (메인메뉴 맛집 카테고리 페이지와 공유).
 */
export default async function EatsListPage({ params, searchParams }: { params: { locale: string }; searchParams: EatsSearch }): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) notFound();
  const locale = params.locale as PublicLocale;
  const dict = await getDictionary(locale);
  return <EatsRegistryList locale={locale} dict={dict} searchParams={searchParams} basePath={`/${locale}/eats/all`} />;
}
