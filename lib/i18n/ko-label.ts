import { KO_LABELS } from './ko-labels.generated';

/**
 * DB 에 한국어로 저장된 짧은 마케팅 라벨(프로모 배지, 자유형 가격단위)을
 * 로케일별로 치환. scripts/generate-ko-label-map.mjs 가 만든 정적 맵을
 * 조회하고, 맵에 없으면 원문 유지. kr 로케일은 항상 원문.
 *
 * 사용처: /clinics 병원 카드 배지, /glowup·/travel 상품 카드 배지,
 * 랜딩 Course 설명(promoLabel), localizePriceUnit 자유형 fallback.
 */
export function localizeKoLabel(
  text: string | null | undefined,
  locale: string,
): string {
  const raw = text?.trim() ?? '';
  if (!raw || locale === 'kr') return raw;
  const entry = (KO_LABELS as Record<string, Partial<Record<string, string>>>)[raw];
  return entry?.[locale] ?? raw;
}
