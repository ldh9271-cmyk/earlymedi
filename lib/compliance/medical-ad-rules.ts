/**
 * 의료법 제27조의2 — 외국인환자 유치 광고 가이드라인 체크.
 *
 * 한국 의료법 제27조의2 ① 외국인환자 유치업자(에이전시·송객자)는 광고 시
 * 다음을 위반할 수 없다:
 *   1. 거짓·과장 광고
 *   2. 비교 광고
 *   3. 비방 광고
 *   4. 환자 후기를 시술 효과를 단정하는 형태로 노출
 *   5. 의료기관 명칭·전문의 자격 등 사실과 다른 표현
 *   6. 시술 전·후 사진을 사실과 다르게 보정·합성
 *   7. 객관적 근거 없는 치료 효과 보장 표현
 *
 * 이 모듈은 광고 텍스트를 받아 위 항목을 헤이리스틱 + 패턴 매칭으로 검사한다.
 * 매뉴얼 리뷰가 여전히 권장된다 — 자동 검사는 false negative가 있을 수 있다.
 */

export type AdViolation = {
  code: AdRuleCode;
  severity: 'critical' | 'warning' | 'info';
  matched: string;
  message: string;
  guidance: string;
};

export type AdRuleCode =
  | 'false_claim'
  | 'comparative'
  | 'disparaging'
  | 'review_as_certainty'
  | 'fake_credentials'
  | 'altered_photo_implication'
  | 'guarantee_effect'
  | 'price_discount_no_terms'
  | 'risk_omission';

/** Critical absolute-claim keywords. Any of these triggers a critical violation. */
const ABSOLUTE_CLAIMS = [
  '100%',
  '완치',
  '부작용 없음',
  '부작용 0',
  '안전 보장',
  '효과 보장',
  'guaranteed',
  'no side effects',
  'risk-free',
  '无副作用',
  '保证',
  '完全治愈',
];

/** Comparative phrases — 한국 의료법 비교 광고 금지. */
const COMPARATIVE = [
  '국내 1위',
  '국내 최고',
  '업계 1위',
  '동종 대비',
  '경쟁사보다',
  '타 병원보다',
  '#1 in',
  'best in',
  'better than',
];

/** Disparaging language toward competitors. */
const DISPARAGING = [
  '저질',
  '엉터리',
  '돌팔이',
  '엉터리 의사',
  'fake clinic',
  'scam doctors',
];

const GUARANTEE_PATTERNS = [
  /효과\s*[가|이|를]?\s*확실/, // "효과가 확실"
  /반드시\s*(좋아|개선|회복)/,
  /평생\s*유지/, // 평생 유지 보장 — 객관적 근거 없는 표현
];

const REVIEW_CERTAINTY_PATTERNS = [
  /후기\s*\d+%/, // "후기 99% 만족" — 후기를 단정 효과로 사용
  /[모든|모두]\s*환자[가|는]?\s*만족/,
];

const PRICE_NO_TERMS_PATTERNS = [
  /\d+\s*%\s*할인/, // 할인% — 조건·기간 명시 없이는 위반
  /50%\s*off/i,
];

const RISK_OMISSION_NEEDED_KEYWORDS = ['수술', '시술', 'surgery', 'injection']; // 수술/시술 광고
const RISK_KEYWORDS_MENTIONED = ['부작용', '회복기간', '주의사항', 'side effect', 'recovery'];

export function checkAdCopy(text: string): AdViolation[] {
  const lower = text.toLowerCase();
  const violations: AdViolation[] = [];

  for (const k of ABSOLUTE_CLAIMS) {
    if (text.includes(k) || lower.includes(k.toLowerCase())) {
      violations.push({
        code: 'guarantee_effect',
        severity: 'critical',
        matched: k,
        message: `절대적 표현 "${k}" — 의료법 27조의2 위반 (효과 보장 금지)`,
        guidance: '시술 효과·부작용에 대해 단정적 표현 사용 금지. "개인차가 있을 수 있다"는 단서 필수.',
      });
    }
  }

  for (const k of COMPARATIVE) {
    if (text.includes(k) || lower.includes(k.toLowerCase())) {
      violations.push({
        code: 'comparative',
        severity: 'critical',
        matched: k,
        message: `비교 광고 표현 "${k}" — 의료법 27조의2 위반`,
        guidance: '경쟁 의료기관과의 우위 비교는 금지. 자기 의료기관의 강점만 객관적으로 서술.',
      });
    }
  }

  for (const k of DISPARAGING) {
    if (text.includes(k) || lower.includes(k.toLowerCase())) {
      violations.push({
        code: 'disparaging',
        severity: 'critical',
        matched: k,
        message: `비방 광고 표현 "${k}"`,
        guidance: '타 의료기관·의료인을 비방하거나 폄하하는 표현은 금지.',
      });
    }
  }

  for (const p of GUARANTEE_PATTERNS) {
    const m = text.match(p);
    if (m) {
      violations.push({
        code: 'guarantee_effect',
        severity: 'warning',
        matched: m[0],
        message: `효과 보장 의심 표현 "${m[0]}"`,
        guidance: '객관적 근거 없는 효과 보장 표현 회피. "환자의 95%가 만족" 등 출처가 있는 통계로 대체.',
      });
    }
  }

  for (const p of REVIEW_CERTAINTY_PATTERNS) {
    const m = text.match(p);
    if (m) {
      violations.push({
        code: 'review_as_certainty',
        severity: 'warning',
        matched: m[0],
        message: `후기를 단정 효과로 표현: "${m[0]}"`,
        guidance: '후기는 개별 사례임을 명시. "결과는 개인차가 있을 수 있다" 단서 필요.',
      });
    }
  }

  for (const p of PRICE_NO_TERMS_PATTERNS) {
    const m = text.match(p);
    if (m) {
      const hasTerms = /기간|조건|대상|until|terms/i.test(text);
      if (!hasTerms) {
        violations.push({
          code: 'price_discount_no_terms',
          severity: 'warning',
          matched: m[0],
          message: `할인 조건 미명시: "${m[0]}"`,
          guidance: '의료 광고의 가격·할인 표시는 적용 기간·대상·시술 범위를 명시해야 함.',
        });
      }
    }
  }

  const needsRisk = RISK_OMISSION_NEEDED_KEYWORDS.some(
    (k) => text.includes(k) || lower.includes(k.toLowerCase()),
  );
  const mentionsRisk = RISK_KEYWORDS_MENTIONED.some(
    (k) => text.includes(k) || lower.includes(k.toLowerCase()),
  );
  if (needsRisk && !mentionsRisk) {
    violations.push({
      code: 'risk_omission',
      severity: 'info',
      matched: '(missing)',
      message: '시술 광고에 부작용·회복기간 안내 누락',
      guidance: '시술·수술 광고에는 잠재 부작용과 일반적 회복기간을 함께 표시 권장 (의료법 27조의2 시행규칙).',
    });
  }

  return violations;
}

/**
 * Country-specific medical-ad regulation hints.
 * Returned in addition to the 27조의2 baseline check.
 */
export type CountryGuideline = {
  countryCode: string;
  notes: string[];
};

export const COUNTRY_AD_GUIDELINES: Record<string, CountryGuideline> = {
  CN: {
    countryCode: 'CN',
    notes: [
      'WeChat/微博 의료광고는 사전 심의 필수 (의료광고심사위원회).',
      '시술 전후 사진은 같은 조명·각도여야 하며 보정 시 명시.',
      '"最佳" "第一" 등 절대급 표현 금지.',
    ],
  },
  JP: {
    countryCode: 'JP',
    notes: [
      '医療法 第6条의5: 일본 환자 대상 광고는 일본 의료광고 가이드라인 준수.',
      '체험담·후기는 효과 보증과 함께 사용 금지.',
      'Before/After 이미지는 시술 내용·기간·비용 함께 명시.',
    ],
  },
  US: {
    countryCode: 'US',
    notes: [
      'FTC Truth-in-Advertising — testimonials must reflect typical results.',
      'Off-label 시술 광고 시 명시 의무.',
      'HIPAA — 환자 정보·사진 사용 시 사전 동의 서면 필수.',
    ],
  },
};

export function getCountryGuidelines(countryCode: string): CountryGuideline | null {
  return COUNTRY_AD_GUIDELINES[countryCode.toUpperCase()] ?? null;
}
