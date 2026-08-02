import type { MetadataRoute } from 'next';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { hospitals } from '@/drizzle/schema/hospitals';
import { PUBLIC_LOCALES } from '@/lib/i18n/locales';

/**
 * sitemap.xml — Google Search Console 제출용.
 *
 * 로케일 6종(kr/en/zh/ja/ru/vi)에 대해 고정 진입 경로 + 공개 상품
 * (partner_listings.status='approved') + 매칭 활성 병원을 나열한다.
 * 상품·병원 목록은 DB 를 읽으므로 요청 시점에 생성한다 — 빌드 때
 * DATABASE_URL 이 없어도 배포가 깨지지 않도록 조회 실패는 삼키고
 * 고정 경로만 내보낸다.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const SITE = 'https://www.glowuptour.com';

/** 로케일 프리픽스가 붙는 공개 진입 경로. */
const LOCALE_PATHS = [
  '',
  '/clinics',
  '/ai-consult',
  '/inquiry',
  '/glowup/pc',
  '/glowup/pc/c/color',
  '/glowup/pc/c/hair',
  '/glowup/pc/c/makeup',
  '/glowup/pc/c/nail',
  '/glowup/pc/c/pmu',
  '/glowup/pc/c/photo',
  '/glowup/pc/c/hotel',
  '/glowup/pc/c/food',
  '/glowup/pc/c/kpop',
  '/travel/package',
];

/** 로케일과 무관한 단일 경로. */
const FLAT_PATHS = ['/about', '/pricing', '/legal/terms', '/legal/privacy', '/legal/medical-ad'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of PUBLIC_LOCALES) {
    for (const path of LOCALE_PATHS) {
      entries.push({
        url: `${SITE}/${locale}${path}`,
        lastModified: now,
        changeFrequency: path === '' ? 'daily' : 'weekly',
        priority: path === '' ? 1 : 0.7,
      });
    }
  }
  for (const path of FLAT_PATHS) {
    entries.push({ url: SITE + path, lastModified: now, changeFrequency: 'monthly', priority: 0.3 });
  }

  try {
    const rows = await db
      .select({ slug: partnerListings.slug, updatedAt: partnerListings.updatedAt })
      .from(partnerListings)
      .where(eq(partnerListings.status, 'approved'));
    for (const r of rows) {
      for (const locale of PUBLIC_LOCALES) {
        entries.push({
          url: `${SITE}/${locale}/listings/${encodeURIComponent(r.slug)}`,
          lastModified: r.updatedAt ?? now,
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }
  } catch {
    /* DB 미가용 — 고정 경로만으로도 유효한 사이트맵이다 */
  }

  try {
    const rows = await db
      .select({ slug: hospitals.slug, updatedAt: hospitals.updatedAt })
      .from(hospitals)
      .where(and(eq(hospitals.countryCode, 'KR'), eq(hospitals.isActiveForMatching, true)));
    for (const r of rows) {
      for (const locale of PUBLIC_LOCALES) {
        entries.push({
          url: `${SITE}/${locale}/clinics/${encodeURIComponent(r.slug)}`,
          lastModified: r.updatedAt ?? now,
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }
  } catch {
    /* 위와 동일 */
  }

  return entries;
}
