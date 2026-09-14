import 'server-only';
import { and, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { db } from '@/lib/db/client';
import { hospitalRegistry } from '@/drizzle/schema/hospital-registry';
import { lodgingRegistry } from '@/drizzle/schema/lodging-registry';
import { foodRegistry } from '@/drizzle/schema/food-registry';
import { beautyRegistry } from '@/drizzle/schema/beauty-registry';
import { tourSpots } from '@/drizzle/schema/tour-spots';
import type { PublicLocale } from '@/lib/i18n/locales';

/**
 * 통합 검색 — 공공데이터 레지스트리 5종.
 *
 * 글로우업 찾기가 우리 상품·인증 병원만 뒤지던 것을, 사이트에 들어와 있는
 * 전국 병원(심평원 8만)·숙박(6만)·맛집(9천)·뷰티샵(22만)·관광지(2천)까지 넓힌다.
 * 이름 컬럼마다 pg_trgm 인덱스가 있어 ILIKE 가 싸고, 정렬은 similarity 로
 * "검색어와 가장 닮은 이름"이 앞에 오게 한다. 글로우업 등록(계약) 업체가
 * 있으면 그게 맨 앞.
 *
 * 이름이 한국어라 외국어 검색어는 이름에 안 걸린다 — 그래서 "hotel" 같은
 * 분야 단어가 들어오면 그 분야의 대표(계약 우선) 몇 곳을 대신 보여준다.
 */
export type RegistryHit = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  thumb: string | null;
  registered: boolean;
};

export type RegistryResults = {
  registryClinics: RegistryHit[];
  stays: RegistryHit[];
  eats: RegistryHit[];
  shops: RegistryHit[];
  attractions: RegistryHit[];
};

export const EMPTY_REGISTRY: RegistryResults = { registryClinics: [], stays: [], eats: [], shops: [], attractions: [] };
const LIMIT = 12;

const WANT: Record<keyof RegistryResults, string[]> = {
  registryClinics: ['병원', '의원', '피부과', '성형외과', '성형', '치과', '안과', '한의원', '한방', '검진', '클리닉', 'hospital', 'clinic', '医院', '病院', 'клиника', 'bệnh viện'],
  stays: ['호텔', '숙소', '숙박', '모텔', '게스트하우스', '펜션', 'hotel', 'stay', 'отель', 'ホテル', '酒店', '住宿', 'khách sạn'],
  eats: ['맛집', '식당', '음식', '카페', '한식', '일식', '중식', 'food', 'restaurant', 'cafe', 'グルメ', '美食', '餐厅', 'ресторан', 'quán', 'nhà hàng'],
  shops: ['뷰티', '미용', '헤어', '미용실', '네일', '메이크업', '피부관리', '반영구', '속눈썹', 'beauty', 'salon', 'hair', 'nail', 'ヘア', 'ネイル', '美容', '美发', '美甲', 'салон', 'tóc', 'làm đẹp'],
  attractions: ['관광', '관광지', '명소', '여행지', '야경', '궁', '해변', '공원', 'attraction', 'sightseeing', 'spot', '観光', '景点', 'достопримечател', 'tham quan'],
};

function wants(kind: keyof RegistryResults, tokens: string[]): boolean {
  return tokens.some((t) => WANT[kind].some((w) => t.toLowerCase().includes(w.toLowerCase())));
}

function anyLike(cols: AnyPgColumn[], tokens: string[]): SQL | undefined {
  const conds: SQL[] = [];
  for (const t of tokens) for (const c of cols) conds.push(ilike(c, `%${t}%`) as SQL);
  return conds.length ? (or(...conds) as SQL) : undefined;
}

const region = (sido: string | null, sggu: string | null): string => [sido, sggu].filter(Boolean).join(' ');

export async function searchRegistries(q: string, tokens: string[], locale: PublicLocale): Promise<RegistryResults> {
  if (tokens.length === 0) return EMPTY_REGISTRY;
  const enc = encodeURIComponent;

  const clinics = async (): Promise<RegistryHit[]> => {
    const sel = {
      ykiho: hospitalRegistry.ykiho, name: hospitalRegistry.name, clName: hospitalRegistry.clName,
      sido: hospitalRegistry.sidoName, sggu: hospitalRegistry.sgguName,
      contracted: hospitalRegistry.contractedHospitalId, foreign: hospitalRegistry.foreignLicensed,
    };
    const like = anyLike([hospitalRegistry.name, hospitalRegistry.addr], tokens);
    const byName = like
      ? await db.select(sel).from(hospitalRegistry).where(like)
          .orderBy(sql`(${hospitalRegistry.contractedHospitalId} is null)`, sql`${hospitalRegistry.foreignLicensed} desc`, sql`similarity(${hospitalRegistry.name}, ${q}) desc`)
          .limit(LIMIT)
      : [];
    const rows = byName.length === 0 && wants('registryClinics', tokens)
      ? await db.select(sel).from(hospitalRegistry).where(eq(hospitalRegistry.foreignLicensed, true))
          .orderBy(sql`(${hospitalRegistry.contractedHospitalId} is null)`, sql`${hospitalRegistry.drTotal} desc`).limit(8)
      : byName;
    return rows.map((r) => ({
      key: `hr-${r.ykiho}`, href: `/${locale}/clinics/r/${enc(r.ykiho)}`, title: r.name,
      subtitle: [region(r.sido, r.sggu), r.clName].filter(Boolean).join(' · '), thumb: null, registered: !!r.contracted,
    }));
  };

  const simple = async (
    kind: 'stays' | 'eats' | 'shops',
    t: typeof lodgingRegistry | typeof foodRegistry | typeof beautyRegistry,
    path: string,
  ): Promise<RegistryHit[]> => {
    const like = anyLike([t.name, t.sgguName], tokens);
    const sel = {
      mgtNo: t.mgtNo, name: t.name, bizType: t.bizType, sido: t.sidoName, sggu: t.sgguName, contracted: t.contractedListingId,
    };
    const byName = like
      ? await db.select(sel).from(t).where(and(eq(t.statusCode, '01'), like))
          .orderBy(sql`(${t.contractedListingId} is null)`, sql`similarity(${t.name}, ${q}) desc`).limit(LIMIT)
      : [];
    const rows = byName.length === 0 && wants(kind, tokens)
      ? await db.select(sel).from(t).where(eq(t.statusCode, '01'))
          .orderBy(sql`(${t.contractedListingId} is null)`, sql`${t.lastModifiedAt} desc nulls last`).limit(8)
      : byName;
    return rows.map((r) => ({
      key: `${kind}-${r.mgtNo}`, href: `/${locale}/${path}/r/${enc(r.mgtNo)}`, title: r.name,
      subtitle: [region(r.sido, r.sggu), r.bizType].filter(Boolean).join(' · '), thumb: null, registered: !!r.contracted,
    }));
  };

  const spots = async (): Promise<RegistryHit[]> => {
    const i18nTitle = sql<string>`coalesce(${tourSpots.i18n}->${locale}->>'title', ${tourSpots.title})`;
    const conds: SQL[] = [];
    for (const t of tokens) {
      conds.push(ilike(tourSpots.title, `%${t}%`) as SQL, ilike(tourSpots.keyword, `%${t}%`) as SQL, ilike(tourSpots.location, `%${t}%`) as SQL);
      conds.push(sql`${tourSpots.i18n}->${locale}->>'title' ilike ${'%' + t + '%'}`);
    }
    const sel = { contentId: tourSpots.contentId, title: i18nTitle, thumb: tourSpots.thumbUrl, image: tourSpots.imageUrl, sido: tourSpots.sidoName, sggu: tourSpots.sgguName };
    const byName = await db.select(sel).from(tourSpots).where(or(...conds))
      .orderBy(sql`similarity(${tourSpots.title}, ${q}) desc`).limit(LIMIT);
    const rows = byName.length === 0 && wants('attractions', tokens)
      ? await db.select(sel).from(tourSpots).where(sql`${tourSpots.geoSource} = 'kakao_kw'`).orderBy(sql`${tourSpots.modifiedTime} desc nulls last`).limit(8)
      : byName;
    return rows.map((r) => ({
      key: `ts-${r.contentId}`, href: `/${locale}/attractions/${enc(r.contentId)}`, title: r.title,
      subtitle: region(r.sido, r.sggu), thumb: r.thumb ?? r.image ?? null, registered: false,
    }));
  };

  // 5개면 커넥션 풀을 말리지 않는다 (통계 리포트의 20개 동시 실행 사고 참고)
  const safe = <T,>(p: Promise<T[]>): Promise<T[]> => p.catch(() => []);
  const [registryClinics, stays, eats, shops, attractions] = await Promise.all([
    safe(clinics()),
    safe(simple('stays', lodgingRegistry, 'stays')),
    safe(simple('eats', foodRegistry, 'eats')),
    safe(simple('shops', beautyRegistry, 'shops')),
    safe(spots()),
  ]);
  return { registryClinics, stays, eats, shops, attractions };
}
