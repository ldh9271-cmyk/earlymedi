/**
 * 리드 마켓 가격표 — 환자 문의(DB) 1건 열람가. 관심 분야(상품
 * 카테고리)별로 3~6만원. 충전은 100,000원 단위 (LEAD_TOPUP_UNIT).
 */

export const LEAD_TOPUP_UNIT_WON = 100_000;
export const LEAD_TOPUP_OPTIONS_WON = [100_000, 200_000, 300_000, 500_000, 1_000_000] as const;

export const LEAD_PRICE_BY_CATEGORY_WON: Record<string, number> = {
  plastic_surgery: 60_000,
  stem_cell: 60_000,
  dermatology: 50_000,
  dental: 50_000,
  ophthalmology: 40_000,
  hair: 40_000,
  health_checkup: 30_000,
  oriental: 30_000,
  partner: 30_000,
};
export const LEAD_PRICE_DEFAULT_WON = 30_000;

export const LEAD_CATEGORY_LABEL_KO: Record<string, string> = {
  plastic_surgery: '성형외과',
  dermatology: '피부과',
  dental: '치과',
  ophthalmology: '안과',
  hair: '모발',
  health_checkup: '건강검진',
  stem_cell: '줄기세포',
  oriental: '한방병원',
  partner: '파트너병원',
  beauty_tour: '뷰티 투어',
  ai_face_analysis: 'AI 얼굴 분석',
  ai_chat: 'AI 상담',
};

/** 관심 분야 목록에서 가장 비싼 카테고리 기준으로 과금한다. */
export function leadPriceWon(interests: ReadonlyArray<string>): {
  priceWon: number;
  interestKey: string | null;
} {
  let best: { priceWon: number; interestKey: string | null } = {
    priceWon: LEAD_PRICE_DEFAULT_WON,
    interestKey: null,
  };
  for (const key of interests) {
    const p = LEAD_PRICE_BY_CATEGORY_WON[key];
    if (p != null && p >= best.priceWon) best = { priceWon: p, interestKey: key };
  }
  return best;
}

/** 이름 마스킹 — 첫 글자만 남긴다. "문석호" → "문○○", "Emma" → "E***". */
export function maskName(name: string | null | undefined): string {
  const n = (name ?? '').trim();
  if (!n) return '익명';
  const first = Array.from(n)[0] ?? '';
  const rest = Math.max(Array.from(n).length - 1, 2);
  const isHangul = /[가-힣]/.test(first);
  return first + (isHangul ? '○'.repeat(Math.min(rest, 3)) : '*'.repeat(Math.min(rest, 4)));
}

/** 연락처(이메일·전화·메신저 ID) 마스킹. */
export function maskContact(contact: string | null | undefined): string {
  const c = (contact ?? '').trim();
  if (!c) return '—';
  if (c.includes('@')) {
    const [local = '', domain = ''] = c.split('@');
    return `${local.slice(0, 2)}***@${domain.replace(/^[^.]*/, (m) => m.slice(0, 1) + '***')}`;
  }
  const digits = c.replace(/\D/g, '');
  if (digits.length >= 8) return `${digits.slice(0, 3)}-****-**${digits.slice(-2)}`;
  return c.slice(0, 2) + '***';
}

/** 문의 본문에서 연락처·이메일 라인을 지운 미리보기를 만든다. */
export function maskBodyPreview(body: string, maxLen = 160): string {
  const cleaned = body
    .split('\n')
    .filter((line) => !/^\s*(연락처|이메일|전화|생년월일)\s*[:：]/.test(line))
    .join('\n')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '***@***')
    .replace(/\+?\d[\d\s\-().]{7,}\d/g, '***-****-****');
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen)}…` : cleaned;
}
