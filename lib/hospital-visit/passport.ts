/**
 * 외국인 환자 여권번호 — 병원 진료 예약(hospital_visit)에서만 받는다 (2026-11-09 Early 지시).
 *
 *  - 입력: 국적(countryCode)이 KR 이 아닐 때 예약 폼·AI 예약 카드가 요구한다.
 *  - 저장: 평문은 DB 에 남기지 않는다 — lib/encryption/pgcrypto encryptPii 로 암호화한 base64(meta.passportEnc)와
 *    마스킹 문자열(meta.passportMasked)만 checkout_orders.meta 에 둔다. 복호화는 마스터 상세 화면뿐.
 *  - 이 파일은 'server-only' 가 아니다 — 클라이언트 폼의 정규화·검증에도 같이 쓴다.
 */

/** 여권번호 형식: 영문 대문자·숫자 5~15자 (국가별 6~9자가 보통, 여유를 둔다). */
export const PASSPORT_RE = /^[A-Z0-9]{5,15}$/;

/** 공백·하이픈 제거 + 대문자. 빈 값이면 null. */
export function normalizePassportNo(v: string | null | undefined): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\s\-–—.]/g, '').toUpperCase();
  return s.length > 0 ? s : null;
}

export function isValidPassportNo(v: string | null | undefined): boolean {
  return typeof v === 'string' && PASSPORT_RE.test(v);
}

/** 운영 로그·상담 인박스용 마스킹 — 앞 2자리 + * + 뒤 2자리 (M1****89). 4자 이하는 전부 *. */
export function maskPassportNo(v: string): string {
  const s = v.trim();
  if (s.length <= 4) return '*'.repeat(s.length);
  return `${s.slice(0, 2)}${'*'.repeat(Math.max(2, s.length - 4))}${s.slice(-2)}`;
}

/** 한국 국적은 여권번호를 받지 않는다. 국적 미상(null)은 외국인으로 본다. */
export function needsPassport(countryCode: string | null | undefined): boolean {
  return (countryCode ?? '').toUpperCase() !== 'KR';
}
