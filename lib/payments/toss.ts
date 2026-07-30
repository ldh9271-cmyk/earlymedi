// 토스페이먼츠 서버 헬퍼 — 결제 승인(confirm)과 결제 단건 조회.
//
// 연동 흐름 (표준 결제창):
//   1) 예약 팝업에서 인보이스 발행(/api/checkout/order) → invoiceNo 를
//      토스 orderId 로 사용해 결제창을 연다 (클라이언트 SDK v2).
//   2) 결제 인증이 끝나면 토스가 successUrl 로 리다이렉트 →
//      /api/payments/toss/confirm 이 이 모듈의 confirmTossPayment 로
//      최종 승인하고 인보이스를 paid 로 올린다.
//   3) /api/payments/toss/webhook 은 상태 변경(취소 등)을 동기화한다.
//      웹훅 페이로드는 서명이 없으므로 믿지 않고 fetchTossPayment 로
//      토스 API 에서 다시 조회해 확정한다.
//
// TOSS_SECRET_KEY 가 없으면 모든 함수가 '미구성' 을 반환하고, 결제
// 팝업은 기존 알리페이 QR 흐름으로 폴백한다.

const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

export type TossPaymentResult = {
  ok: boolean;
  /** 토스 결제 상태 — DONE / CANCELED / ... (실패 시 undefined) */
  status?: string;
  paymentKey?: string;
  orderId?: string;
  /** 승인 금액 (KRW). */
  totalAmount?: number;
  method?: string;
  approvedAt?: string;
  /** 실패 시 토스 에러 코드/메시지. */
  errorCode?: string;
  errorMessage?: string;
};

/** 서버 시크릿 키가 설정돼 있는가 — 미설정이면 QR 폴백 유지. */
export function tossConfigured(): boolean {
  return !!process.env.TOSS_SECRET_KEY;
}

function authHeader(): string {
  const secret = process.env.TOSS_SECRET_KEY ?? '';
  return 'Basic ' + Buffer.from(secret + ':').toString('base64');
}

function toResult(status: number, body: Record<string, unknown>): TossPaymentResult {
  if (status >= 200 && status < 300) {
    return {
      ok: true,
      status: typeof body.status === 'string' ? body.status : undefined,
      paymentKey: typeof body.paymentKey === 'string' ? body.paymentKey : undefined,
      orderId: typeof body.orderId === 'string' ? body.orderId : undefined,
      totalAmount: typeof body.totalAmount === 'number' ? body.totalAmount : undefined,
      method: typeof body.method === 'string' ? body.method : undefined,
      approvedAt: typeof body.approvedAt === 'string' ? body.approvedAt : undefined,
    };
  }
  return {
    ok: false,
    errorCode: typeof body.code === 'string' ? body.code : 'unknown',
    errorMessage: typeof body.message === 'string' ? body.message : '',
  };
}

/**
 * 결제 승인 — successUrl 리다이렉트로 받은 paymentKey/orderId 와 서버가
 * 계산한 금액으로 최종 승인한다. 금액은 반드시 인보이스의 totalWon 을
 * 넘겨야 한다 (클라이언트 값 금지 — 위변조 방지의 핵심).
 */
export async function confirmTossPayment(opts: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<TossPaymentResult> {
  if (!tossConfigured()) return { ok: false, errorCode: 'not_configured', errorMessage: '' };
  try {
    const res = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
      method: 'POST',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
      cache: 'no-store',
    });
    const body = (await res.json()) as Record<string, unknown>;
    return toResult(res.status, body);
  } catch {
    return { ok: false, errorCode: 'network', errorMessage: '' };
  }
}

/** 결제 단건 조회 — 웹훅 검증용. 페이로드 대신 이 결과를 믿는다. */
export async function fetchTossPayment(paymentKey: string): Promise<TossPaymentResult> {
  if (!tossConfigured()) return { ok: false, errorCode: 'not_configured', errorMessage: '' };
  try {
    const res = await fetch(`${TOSS_API_BASE}/payments/${encodeURIComponent(paymentKey)}`, {
      headers: { Authorization: authHeader() },
      cache: 'no-store',
    });
    const body = (await res.json()) as Record<string, unknown>;
    return toResult(res.status, body);
  } catch {
    return { ok: false, errorCode: 'network', errorMessage: '' };
  }
}
