import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

type Units = Dictionary['detail']['units'];

/**
 * DB 의 한국어 가격 단위('1인'·'박'·'세션'…)를 로케일별 라벨로 매핑.
 * kr 로케일이거나 미등록 단위면 원문 유지. 단위가 비어있으면 카테고리
 * 기본값 (hotel→박, food→1인, 그 외→세션).
 *
 * 사용처: /listings/[slug] 상세, /travel/[type] · /glowup/pc/c/[key]
 * 목록 카드 — 세 표면이 같은 규칙을 공유하도록 단일 소스로 유지.
 */
const KO_TO_KEY: Record<string, keyof Units> = {
  '1인': 'person', '인': 'person', '박': 'night', '세션': 'session',
  '회': 'visit', '반일': 'halfDay', '종일': 'fullDay',
  '상담': 'consult', '코스': 'course', '건': 'caseUnit',
};

export function localizePriceUnit(
  unit: string | null | undefined,
  category: string,
  units: Units,
  locale: string,
): string {
  const raw = unit?.trim() ?? '';
  if (raw && locale === 'kr') return raw;
  if (raw) {
    const key = KO_TO_KEY[raw];
    return key ? units[key] : raw;
  }
  if (category === 'hotel') return units.night;
  if (category === 'food' || category === 'restaurant') return units.person;
  return units.session;
}
