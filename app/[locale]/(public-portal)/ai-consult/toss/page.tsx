'use client';

/** 포인트 충전 토스 결제 리다이렉트 처리 — 성공이면 승인 API 를 부른 뒤 시뮬레이션으로 돌아간다. */
import { useEffect, useState } from 'react';

export default function SimTossReturnPage({ params }: { params: { locale: string } }): JSX.Element {
  const [text, setText] = useState('결제 승인 중… 창을 닫지 말고 잠시 기다려 주세요. / Confirming payment…');
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const back = (q: string): void => window.location.replace(`/${params.locale}/ai-consult?${q}#ai-sim`);
    if (qs.get('result') !== 'success') { back('credits=fail'); return; }
    const paymentKey = qs.get('paymentKey') ?? '';
    const orderId = qs.get('orderId') ?? '';
    const amount = Number(qs.get('amount') ?? '0');
    if (!paymentKey || !orderId) { back('credits=fail'); return; }
    void (async () => {
      try {
        const res = await fetch('/api/payments/toss/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentKey, orderId, amount }) });
        if (!res.ok) { setText('결제를 승인하지 못했습니다.'); back('credits=fail'); return; }
        back('credits=ok');
      } catch {
        back('credits=fail');
      }
    })();
  }, [params.locale]);
  return <div style={{ padding: 40, textAlign: 'center', fontSize: 14, color: '#6a6a6a' }}>{text}</div>;
}
