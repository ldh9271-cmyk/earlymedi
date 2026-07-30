// 토스페이먼츠 브라우저 헬퍼 — v2 표준 SDK 를 지연 로드해 결제창을 연다.
// NEXT_PUBLIC_TOSS_CLIENT_KEY 가 없으면 미구성 → 호출부는 알리페이 QR
// 흐름을 유지한다. orderId 는 우리 인보이스 번호(GU-…)를 그대로 쓴다.

const SDK_SRC = 'https://js.tosspayments.com/v2/standard';

type TossPaymentsFn = ((clientKey: string) => {
  payment: (opts: { customerKey: string }) => {
    requestPayment: (req: Record<string, unknown>) => Promise<void>;
  };
}) & { ANONYMOUS: string };

/** 빌드 시 인라인되는 공개 클라이언트 키 — 없으면 토스 비활성. */
export function tossClientKey(): string | null {
  return process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? null;
}

let sdkPromise: Promise<TossPaymentsFn | null> | null = null;

function loadSdk(): Promise<TossPaymentsFn | null> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve) => {
    const w = window as unknown as { TossPayments?: TossPaymentsFn };
    if (w.TossPayments) { resolve(w.TossPayments); return; }
    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.async = true;
    script.onload = () => resolve(w.TossPayments ?? null);
    script.onerror = () => { sdkPromise = null; resolve(null); };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export type TossOpenOutcome = 'redirected' | 'cancelled' | 'error';

/**
 * 결제창 열기. 성공적으로 인증이 진행되면 successUrl 로 리다이렉트되어
 * 이 프라미스는 사실상 페이지 이탈로 끝난다. 사용자가 창을 닫으면
 * 'cancelled', SDK 로드/호출 실패면 'error'.
 */
export async function openTossPayment(opts: {
  amount: number;
  orderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
  customerEmail?: string | null;
}): Promise<TossOpenOutcome> {
  const key = tossClientKey();
  if (!key) return 'error';
  const TossPayments = await loadSdk();
  if (!TossPayments) return 'error';
  try {
    const payment = TossPayments(key).payment({ customerKey: TossPayments.ANONYMOUS });
    await payment.requestPayment({
      method: 'CARD',
      amount: { currency: 'KRW', value: opts.amount },
      orderId: opts.orderId,
      // 토스 orderName 은 최대 100자
      orderName: opts.orderName.slice(0, 100),
      successUrl: opts.successUrl,
      failUrl: opts.failUrl,
      ...(opts.customerEmail ? { customerEmail: opts.customerEmail } : {}),
      card: { useEscrow: false, flowMode: 'DEFAULT', useCardPoint: false, useAppCardOnly: false },
    });
    return 'redirected';
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
    if (code === 'USER_CANCEL' || code === 'PAY_PROCESS_CANCELED') return 'cancelled';
    return 'error';
  }
}
