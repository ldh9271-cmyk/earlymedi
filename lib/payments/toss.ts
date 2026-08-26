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

export type TossSettlement = {
  /** 거래(매출) 일자 YYYY-MM-DD. */
  soldDate: string;
  /** 은행 계좌 지급 일자 YYYY-MM-DD. */
  paidOutDate: string;
  orderId: string;
  paymentKey: string;
  method: string;
  /** 결제(거래) 금액. */
  amount: number;
  /** 정산 수수료 합계 (공급가+VAT). */
  fee: number;
  /** 실제 지급되는 금액 = amount - fee. */
  payOutAmount: number;
  approvedAt: string | null;
};

export type TossSettlementsResult =
  | { ok: true; settlements: TossSettlement[] }
  | { ok: false; errorCode: string; errorMessage: string };

/**
 * 정산 내역 조회 — GET /v1/settlements. 토스가 카드사에서 받아 우리
 * 계좌로 지급하는 정산 레코드(거래일·지급일·수수료·지급액)를 기간으로
 * 가져온다. 페이지당 최대 100건씩 최대 10페이지(1,000건)까지 순회 —
 * 그 이상은 기간을 좁혀서 조회한다.
 *
 * 주의: 테스트 키(sandbox)는 정산 데이터가 없어 보통 빈 배열이 온다.
 * 심사 승인 후 라이브 키로 바꾸면 실제 정산이 나온다.
 */
export async function fetchTossSettlements(opts: {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  dateType?: 'soldDate' | 'paidOutDate';
}): Promise<TossSettlementsResult> {
  if (!tossConfigured()) {
    return { ok: false, errorCode: 'not_configured', errorMessage: 'TOSS_SECRET_KEY 미설정' };
  }
  const out: TossSettlement[] = [];
  try {
    for (let page = 1; page <= 10; page++) {
      const qs = new URLSearchParams({
        startDate: opts.startDate,
        endDate: opts.endDate,
        dateType: opts.dateType ?? 'soldDate',
        page: String(page),
        size: '100',
      });
      const res = await fetch(`${TOSS_API_BASE}/settlements?${qs.toString()}`, {
        headers: { Authorization: authHeader() },
        cache: 'no-store',
      });
      const body = (await res.json()) as unknown;
      if (!res.ok) {
        const err = (body ?? {}) as Record<string, unknown>;
        return {
          ok: false,
          errorCode: typeof err.code === 'string' ? err.code : `http_${res.status}`,
          errorMessage: typeof err.message === 'string' ? err.message : '',
        };
      }
      const rows = Array.isArray(body) ? body : [];
      for (const raw of rows) {
        const r = (raw ?? {}) as Record<string, unknown>;
        out.push({
          soldDate: typeof r.soldDate === 'string' ? r.soldDate : '',
          paidOutDate: typeof r.paidOutDate === 'string' ? r.paidOutDate : '',
          orderId: typeof r.orderId === 'string' ? r.orderId : '',
          paymentKey: typeof r.paymentKey === 'string' ? r.paymentKey : '',
          method: typeof r.method === 'string' ? r.method : '',
          amount: typeof r.amount === 'number' ? r.amount : 0,
          fee: typeof r.fee === 'number' ? r.fee : 0,
          payOutAmount: typeof r.payOutAmount === 'number' ? r.payOutAmount : 0,
          approvedAt: typeof r.approvedAt === 'string' ? r.approvedAt : null,
        });
      }
      if (rows.length < 100) break;
    }
    return { ok: true, settlements: out };
  } catch {
    return { ok: false, errorCode: 'network', errorMessage: '토스 API 연결 실패' };
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
