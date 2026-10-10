'use client';

import { useState } from 'react';
import { openTossPayment, tossClientKey } from '@/lib/payments/toss-client';

/**
 * 견적 인보이스 결제 버튼 — 마이페이지에서 kind='quote' · issued 주문에 붙는다.
 * 토스 결제창을 열고, 인증이 끝나면 /[locale]/checkout/toss/success 가 서버 승인
 * (/api/payments/toss/confirm → paid) 뒤 마이페이지로 돌아온다. 금액은 DB 의
 * totalWon 으로 서버가 다시 확인하므로 여기 값은 표시·요청용이다.
 */
export function PayInvoiceButton({ locale, invoiceNo, amountWon, title, email, labels }: {
  locale: string; invoiceNo: string; amountWon: number; title: string; email: string | null;
  labels: { payNow: string; hint: string; failed: string };
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const enabled = !!tossClientKey();

  const pay = async (): Promise<void> => {
    setErr(null); setBusy(true);
    const outcome = await openTossPayment({
      amount: amountWon, orderId: invoiceNo, orderName: `${title} · ${invoiceNo}`,
      successUrl: `${window.location.origin}/${locale}/checkout/toss/success`,
      failUrl: `${window.location.origin}/${locale}/checkout/toss/fail`,
      customerEmail: email, locale,
    });
    setBusy(false);
    if (outcome === 'error') setErr(labels.failed);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
      <button
        type="button"
        onClick={() => { void pay(); }}
        disabled={busy || !enabled}
        style={{
          height: 46, borderRadius: 999, border: 'none', cursor: busy || !enabled ? 'default' : 'pointer',
          background: enabled ? '#ff385c' : '#d6d6d2', color: '#fff', fontSize: 15, fontWeight: 800,
        }}
      >
        {busy ? '…' : `${labels.payNow} · ₩${amountWon.toLocaleString('ko-KR')}`}
      </button>
      <div style={{ fontSize: 12, color: '#6a6a6a', lineHeight: 1.5 }}>{labels.hint}</div>
      {err ? <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{err}</div> : null}
    </div>
  );
}
