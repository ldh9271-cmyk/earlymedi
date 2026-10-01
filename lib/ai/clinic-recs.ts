/**
 * AI 얼굴 분석 결과에 붙는 병원 추천 규칙 (2026-10-01 사용자 지시).
 *
 * - 특별한 사정이 없으면 모든 병원 카테고리를 보여 주되, 각 카테고리에서
 *   노출 순위 1~6위(마스터 '카테고리 순서' → 병원 순서 → 이름) 안에 드는 병원만.
 * - AI 가 고른 카테고리(피부과/성형외과)를 맨 앞에, 나머지는 아래 순서대로.
 * - 스템케이(이름·slug)는 어느 카테고리에서도 빼고 그 다음 순위를 올린다.
 *
 * 추천 섹션 key 는 `clinic_<category_key>` — 화면·메일 제목은 dict.clinicsPage.categories 에서.
 */
export const CLINIC_REC_CATEGORIES = [
  'dermatology', 'plastic_surgery', 'dental', 'ophthalmology', 'oriental',
  'hair', 'stem_cell', 'health_checkup', 'partner',
] as const;
export type ClinicRecCategory = (typeof CLINIC_REC_CATEGORIES)[number];

/** 카테고리별 노출 개수 (순위 1~6위) */
export const CLINIC_REC_PER_CATEGORY = 6;

/** 추천에서 제외하는 병원 — slug 접두어 / 이름 부분 일치 */
export const CLINIC_REC_EXCLUDED_SLUG_PREFIX = 'stemk-';
export const CLINIC_REC_EXCLUDED_NAME = '스템케이';

export const clinicRecKey = (cat: string): string => `clinic_${cat}`;

/** AI 가 고른 카테고리를 앞세운 노출 순서 */
export function clinicRecOrder(primary: string): string[] {
  const rest = CLINIC_REC_CATEGORIES.filter((c) => c !== primary);
  return CLINIC_REC_CATEGORIES.includes(primary as ClinicRecCategory) ? [primary, ...rest] : [...rest];
}

/** 섹션 제목 — 화면(face-analyzer)과 결과 메일이 같은 표를 쓴다. 'clinic' 은 예전 저장 결과용. */
export function clinicRecTitles(categories: Record<string, string>, legacyClinicTitle: string): Record<string, string> {
  const out: Record<string, string> = { clinic: legacyClinicTitle };
  for (const c of CLINIC_REC_CATEGORIES) out[clinicRecKey(c)] = categories[c] ?? legacyClinicTitle;
  return out;
}
