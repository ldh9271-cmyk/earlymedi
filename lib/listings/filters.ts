/**
 * 헤더 필터 pill(?priceMin·priceMax·minRating·loc)을 쿼리 옵션으로
 * 변환하는 공용 파서.
 *
 * MainHeader 의 FilterPill 이 현재 pathname 에 그대로 붙여주는 규약:
 *   ?priceMin=80000&priceMax=500000&minRating=45&loc=gangnam,myeongdong
 * minRating 은 정수 ×10 (45 = 4.5+) — partner_listings.rating 인코딩과 동일.
 * loc 은 필터 키이므로 실제 저장값(한국어 지역명)으로 매핑해서 넘긴다.
 */

const LOC_TO_CITY: Record<string, string> = {
  gangnam: '강남',
  myeongdong: '명동',
  seongsu: '성수',
  cheongdam: '청담',
  hongdae: '홍대',
  itaewon: '이태원',
};

export type SurfaceFilters = {
  priceMin: number | null;
  priceMax: number | null;
  minRating: number | null;
  cities: string[];
};

export function parseSurfaceFilters(sp: {
  priceMin?: string;
  priceMax?: string;
  minRating?: string;
  loc?: string;
}): SurfaceFilters {
  const num = (v: string | undefined): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const cities = (sp.loc ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((k) => LOC_TO_CITY[k])
    .filter((v): v is string => typeof v === 'string');
  return {
    priceMin: num(sp.priceMin),
    priceMax: num(sp.priceMax),
    minRating: num(sp.minRating),
    cities,
  };
}

/** 필터가 하나라도 걸려 있는지 — 빈 결과 안내 문구 분기에 사용. */
export function hasAnyFilter(f: SurfaceFilters): boolean {
  return f.priceMin !== null || f.priceMax !== null || f.minRating !== null || f.cities.length > 0;
}
