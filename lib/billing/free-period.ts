/**
 * 비즈니스 회원 무료 이용 기간 — founder 2026-10-11.
 *
 * "앱 회원이 일정 수준까지 늘어날 때까지는 사업자(병원·유치업체·협력업체) 요금을 받지 않는다."
 * 요금이 걸리는 지점은 전부 이 스위치 하나를 본다:
 *   · 무료 체험 종료 차단(lib/billing/trial-quota)         → 차단 안 함
 *   · 리드 마켓 열람 차감(app/medical/leads/_actions)       → 0원 열람, 충전 불필요
 *   · QR 3자 검증 정산 수수료(lib/voucher/settlement)       → 0%
 *   · 병원 정보 등록 대행비(lib/registry/agency)             → 결제 없이 바로 접수
 *   · 요금 화면(/pricing, 각 콘솔 billing, /upgrade)         → "무료 이용 기간" 안내, 정가는 참고로 표시
 *
 * 끝내는 법: Vercel 환경변수 BIZ_FREE_PERIOD=0 → 재배포. 코드 기본값은 ON(무료).
 * 서버 전용으로만 읽는다 — 클라이언트 번들은 env 를 못 보므로 값은 props 로 내려 준다.
 */
export const BIZ_FREE_PERIOD: boolean = process.env.BIZ_FREE_PERIOD !== '0';

export const BIZ_FREE_TITLE = '지금은 비즈니스 회원 무료 이용 기간입니다';
export const BIZ_FREE_BODY = '회원 규모가 자리 잡을 때까지 등록비·월 요금·정산 수수료·리드 열람·등록 대행비를 받지 않습니다. 아래 금액은 유료 전환 뒤 적용될 정가이며, 전환 시점은 미리 안내드립니다.';
export const BIZ_FREE_SHORT = '무료 이용 기간';
