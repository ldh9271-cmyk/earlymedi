import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { DEPT_GROUPS } from '@/lib/hospital-registry/departments';
import { SHOP_CATS } from '../shops/_registry/shared';
import MapView from './_components/map-view';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  if (!isPublicLocale(params.locale)) return {};
  const dict = await getDictionary(params.locale);
  return { title: `${dict.mapPage.title} · GlowUpTour`, description: dict.mapPage.subtitle };
}

/**
 * 지도로 찾기 — 한국어는 카카오맵, 그 외 5개 언어는 구글맵(라벨 현지어) 위에 전국 병원(심평원)·뷰티샵(행안부) + 글로우업 등록(컬러) 표시.
 * ?lat&lng&level&kinds&dept&cat&foreign&listed&q 로 초기 상태 지정 (기본: 강남역, 레벨 4, 글로우업 등록만 = ON · ?listed=0 이면 전체).
 */
export default async function MapPage({ params, searchParams }: {
  params: { locale: string };
  searchParams: { lat?: string; lng?: string; level?: string; kinds?: string; dept?: string; cat?: string; foreign?: string; listed?: string; q?: string };
}): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) notFound();
  const locale = params.locale as PublicLocale;
  const dict = await getDictionary(locale);
  const t = dict.mapPage;
  const tr = dict.clinicsPage.registry;
  const depts = DEPT_GROUPS.map((g) => ({ key: g.key, label: (dict.clinicsPage.depts as Record<string, string>)[g.key] ?? g.ko }));
  const cats = SHOP_CATS.map((k) => ({ key: k, label: dict.shopsRegistry.cats[k] }));
  const num = (v: string | undefined, d: number): number => { const n = Number(v); return Number.isFinite(n) && v ? n : d; };

  return (
    <section style={{ maxWidth: 1600, margin: '0 auto' }}>
      <div style={{ padding: '14px 20px 10px', display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{t.title}</h1>
        <span style={{ fontSize: 13, color: '#6a6a6a' }}>{t.subtitle}</span>
      </div>
      <MapView
        locale={locale}
        kakaoKey={process.env.NEXT_PUBLIC_KAKAO_MAP_KEY?.trim() || null}
        googleKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY?.trim() || null}
        labels={{ ...t, contractedBadge: tr.listedBadgeBiz, foreignBadge: tr.foreignBadge }}
        depts={depts}
        cats={cats}
        initial={{
          lat: num(searchParams.lat, 37.4979), lng: num(searchParams.lng, 127.0276), level: Math.min(14, Math.max(1, num(searchParams.level, 3))),
          kinds: searchParams.kinds ?? 'all', dept: searchParams.dept ?? '', cat: searchParams.cat ?? '',
          foreign: searchParams.foreign === '1', listed: searchParams.listed !== '0', q: (searchParams.q ?? '').slice(0, 40),
        }}
      />
    </section>
  );
}
