'use client';

// 토스 결제 successUrl 랜딩 — 리다이렉트 쿼리(paymentKey/orderId/amount)로
// 서버 승인(/api/payments/toss/confirm)을 호출하고, 완료되면 마이페이지
// 결제내역으로 보낸다. 인증(리다이렉트)까지 끝났어도 승인 전이므로 이
// 페이지가 닫히면 결제가 완결되지 않는다 — 승인 응답을 기다린 뒤 이동.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function TossSuccessPage(): JSX.Element {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';
  const [state, setState] = useState<'confirming' | 'done' | 'error'>('confirming');
  const [invoiceNo, setInvoiceNo] = useState('');

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const paymentKey = qs.get('paymentKey') ?? '';
    const orderId = qs.get('orderId') ?? '';
    const amount = Number(qs.get('amount') ?? '0');
    setInvoiceNo(orderId);
    if (!paymentKey || !orderId) { setState('error'); return; }
    void (async () => {
      try {
        const res = await fetch('/api/payments/toss/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });
        if (!res.ok) { setState('error'); return; }
        setState('done');
        window.location.href = `/${locale}/me?invoice=${encodeURIComponent(orderId)}`;
      } catch {
        setState('error');
      }
    })();
  }, [locale]);

  return (
    <div
      style={{
        minHeight: '70vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14,
        padding: 24, textAlign: 'center', color: '#222',
        fontFamily: "'Inter', 'Pretendard Variable', system-ui, sans-serif",
      }}
    >
      {state === 'confirming' ? (
        <>
          <div style={{ fontSize: 34 }}>⏳</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Confirming your payment… · 결제 승인 중</div>
          <div style={{ fontSize: 13, color: '#6a6a6a' }}>
            Please keep this page open. · 창을 닫지 말고 잠시 기다려 주세요.
          </div>
        </>
      ) : state === 'done' ? (
        <>
          <div style={{ fontSize: 34 }}>✅</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Payment complete · 결제가 완료되었습니다</div>
          <Link
            href={`/${locale}/me?invoice=${encodeURIComponent(invoiceNo)}`}
            style={{ fontSize: 14, fontWeight: 600, color: '#ff385c' }}
          >
            View my booking · 내 예약 보기
          </Link>
        </>
      ) : (
        <>
          <div style={{ fontSize: 34 }}>⚠️</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>
            Payment could not be confirmed · 결제를 승인하지 못했습니다
          </div>
          <div style={{ fontSize: 13, color: '#6a6a6a', maxWidth: 420, lineHeight: 1.6 }}>
            {invoiceNo ? `Invoice ${invoiceNo} — ` : ''}
            If you were charged, contact the concierge and we will sort it out.
            · 결제가 됐다면 컨시어지에 문의해 주세요. 바로 확인해 드립니다.
          </div>
          <Link href={`/${locale}`} style={{ fontSize: 14, fontWeight: 600, color: '#ff385c' }}>
            Back to home · 홈으로
          </Link>
        </>
      )}
    </div>
  );
}
