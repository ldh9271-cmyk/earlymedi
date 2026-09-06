'use client';

/** 등록 대행비 토스 결제 버튼 — 성공/실패는 /medical/registry/toss 로 돌아와 승인 처리. */
import { useState } from 'react';
import { openTossPayment } from '@/lib/payments/toss-client';

export default function AgencyPayButton({ invoiceNo, amountWon, email, hospitalName }: { invoiceNo: string; amountWon: number; email: string; hospitalName: string }): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function pay(): Promise<void> {
    setBusy(true); setMsg(null);
    const origin = window.location.origin;
    const r = await openTossPayment({
      amount: amountWon, orderId: invoiceNo, orderName: `병원 정보 등록 대행 · ${hospitalName}`,
      successUrl: `${origin}/medical/registry/toss?result=success`, failUrl: `${origin}/medical/registry/toss?result=fail`,
      customerEmail: email, locale: 'kr',
    });
    if (r === 'cancelled') setMsg('결제를 취소했습니다.');
    else if (r === 'error') setMsg('결제창을 열지 못했습니다. 잠시 후 다시 시도하거나 운영팀에 문의해 주세요.');
    setBusy(false);
  }
  return (
    <div className="space-y-2">
      <button type="button" onClick={pay} disabled={busy}
        className="inline-flex h-10 items-center rounded-md bg-[#ff385c] px-5 text-sm font-bold text-white disabled:opacity-60">
        {busy ? '결제창 여는 중…' : `대행비 ₩${amountWon.toLocaleString('ko-KR')} 결제하기`}
      </button>
      {msg ? <p className="text-xs text-destructive">{msg}</p> : null}
    </div>
  );
}
