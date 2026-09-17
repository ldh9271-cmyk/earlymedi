import { unstable_cache } from 'next/cache';

/**
 * 공공데이터 레지스트리 목록 화면(병원·미용업·숙박·음식점·관광지)용 짧은 캐시.
 *
 * 왜: DB 가 다른 리전(시드니)에 있어 쿼리마다 왕복 130ms 이상이 붙고, 22만 건 미용업 같은
 * 큰 테이블의 count(*) 는 0.7~4초가 걸린다. 그런데 이 화면의 값은 하루 한 번 동기화되는
 * 데이터라 몇 분 묵은 값이어도 문제가 없다. 시도 목록은 사실상 상수(1일), 건수·목록은 10분.
 *
 * 키는 필터 조합 전부를 포함해야 한다(로케일·검색어·시도·카테고리·페이지 …) — 캐시 결과는
 * JSON 으로 저장되므로 Date 같은 값은 문자열이 된다(목록 화면은 문자열 컬럼만 쓴다).
 */
export const SIDOS_TTL = 86400;
export const COUNT_TTL = 600;
export const LIST_TTL = 600;

export function cachedQuery<T>(
  parts: ReadonlyArray<string | number | boolean | null | undefined>,
  revalidate: number,
  fn: () => PromiseLike<T>,
): Promise<T> {
  const key = parts.map((p) => (p == null ? '' : String(p))).join('|');
  return unstable_cache(async () => fn(), ['registry-cache', key], { revalidate })();
}
