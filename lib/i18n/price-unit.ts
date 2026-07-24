import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import { localizeKoLabel } from './ko-label';

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
    if (key) return units[key];
    // 복합 단위 '1인 (코스)' → 'person (course)'
    const paren = raw.match(/^(.+?)\s*\((.+)\)$/);
    if (paren) {
      const outer = (paren[1] ?? '').trim();
      const inner = (paren[2] ?? '').trim();
      const a = KO_TO_KEY[outer];
      const b = KO_TO_KEY[inner];
      if (a) return `${units[a]} (${b ? units[b] : localizeKoLabel(inner, locale)})`;
    }
    // 'N박' → 'N nights'
    const nNight = raw.match(/^(\d+)\s*박$/);
    if (nNight) {
      const n = Number(nNight[1]);
      return `${n} ${units.night}${locale === 'en' && n > 1 ? 's' : ''}`;
    }
    // 자유형('실비+수수료 10%' 등) → 생성된 번역 맵 fallback
    return localizeKoLabel(raw, locale);
  }
  if (category === 'hotel') return units.night;
  if (category === 'food' || category === 'restaurant') return units.person;
  return units.session;
}
