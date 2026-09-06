import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * QR 바우처 토큰 — 결제 완료 주문을 가리키는 서명된 짧은 코드.
 *
 *   token = <orderId 36자>.<HMAC-SHA256(orderId) 앞 20자 base64url>
 *   QR 내용 = https://www.glowuptour.com/v/<token>
 *
 * 토큰 자체는 DB에 저장하지 않는다 — 주문 id 로 재계산해 검증하므로 유출돼도
 * 서명 없는 id 만으로는 위조가 불가능하고, 주문이 취소되면 즉시 무효가 된다.
 * 비밀키: VOUCHER_SECRET (없으면 INVITE_TOKEN_SECRET 재사용).
 */
function secret(): string {
  const s = process.env.VOUCHER_SECRET || process.env.INVITE_TOKEN_SECRET || '';
  if (!s) throw new Error('VOUCHER_SECRET/INVITE_TOKEN_SECRET 가 설정되지 않았습니다');
  return s;
}

function sig(orderId: string): string {
  return createHmac('sha256', secret()).update(`voucher:${orderId}`).digest('base64url').slice(0, 20);
}

export function signVoucher(orderId: string): string {
  return `${orderId}.${sig(orderId)}`;
}

/** 토큰 → 주문 id (서명 불일치면 null). */
export function verifyVoucher(token: string): string | null {
  const m = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{20})$/.exec(token.trim());
  if (!m) return null;
  const [, orderId, given] = m as unknown as [string, string, string];
  const expected = sig(orderId);
  const a = Buffer.from(given); const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return orderId;
}

export function voucherUrl(orderId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.glowuptour.com').replace(/\/$/, '');
  return `${base}/v/${signVoucher(orderId)}`;
}

/** merchant_settlements 미러 — 가맹점이 입력한 최종 결제금액과 플랫폼 수수료(3자 검증). */
export type VoucherSettlementMeta = {
  finalAmountWon: number;
  onlinePaidWon: number;
  feeBp: number;
  feeWon: number;
  status: 'declared' | 'confirmed' | 'disputed' | 'invoiced' | 'paid';
  declaredAt: string;
  declaredBy?: string;
  consumerConfirmedAt?: string | null;
  disputedAt?: string | null;
  disputeNote?: string | null;
  confirmedAt?: string | null;
  confirmedBy?: string | null;
};

/** 주문 meta 안의 바우처 상태 (체크인 기록 + 정산 미러). */
export type VoucherMeta = {
  checkedInAt?: string;
  checkedInByOrgId?: string;
  checkedInByName?: string;
  checkins?: Array<{ at: string; orgId: string; orgName: string }>;
  settlement?: VoucherSettlementMeta;
};
