'use client';

/** 등록 대행비 토스 결제 리다이렉트 처리 — success 면 승인 API 호출 후 병원 공개 정보로, fail 이면 오류 메시지와 함께 복귀. */
import { useEffect, useState } from 'react';

export default function RegistryTossReturnPage(): JSX.Element {
  const [text, setText] = useState('결제 승인 중… 창을 닫지 말고 잠시 기다려 주세요.');
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const result = qs.get('result');
    if (result !== 'success') {
      const msg = qs.get('message') || qs.get('code') || '결제가 취소되었거나 실패했습니다';
      window.location.replace(`/medical/registry?error=${encodeURIComponent(msg)}`);
      return;
    }
    const paymentKey = qs.get('paymentKey') ?? '';
    const orderId = qs.get('orderId') ?? '';
    const amount = Number(qs.get('amount') ?? '0');
    if (!paymentKey || !orderId) { window.location.replace('/medical/registry?error=' + encodeURIComponent('결제 정보가 없습니다')); return; }
    void (async () => {
      try {
        const res = await fetch('/api/payments/toss/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentKey, orderId, amount }) });
        if (!res.ok) { setText('결제를 승인하지 못했습니다.'); window.location.replace('/medical/registry?error=' + encodeURIComponent('결제 승인에 실패했습니다. 운영팀에 문의해 주세요.')); return; }
        window.location.replace('/medical/registry?ok=paid');
      } catch {
        window.location.replace('/medical/registry?error=' + encodeURIComponent('네트워크 오류로 승인하지 못했습니다'));
      }
    })();
  }, []);
  return <div className="p-10 text-center text-sm text-muted-foreground">{text}</div>;
}
