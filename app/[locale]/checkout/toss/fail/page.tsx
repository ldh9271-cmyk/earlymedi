'use client';

// 토스 결제 failUrl 랜딩 — 인증 실패/사용자 취소. code·message 쿼리를
// 보여주고 상품으로 돌아가 다시 시도하게 한다. 승인 전 단계라 인보이스는
// issued 로 남아 있고, 재시도하면 같은 번호로 결제창을 다시 열 수 있다.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function TossFailPage(): JSX.Element {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const code = qs.get('code') ?? '';
    const message = qs.get('message') ?? '';
    setMsg([code, message].filter(Boolean).join(' — '));
  }, []);

  return (
    <div
      style={{
        minHeight: '70vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14,
        padding: 24, textAlign: 'center', color: '#222',
        fontFamily: "'Inter', 'Pretendard Variable', system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 34 }}>💳</div>
      <div style={{ fontSize: 17, fontWeight: 700 }}>
        Payment was not completed · 결제가 완료되지 않았습니다
      </div>
      {msg ? (
        <div style={{ fontSize: 13, color: '#6a6a6a', maxWidth: 420, lineHeight: 1.6 }}>{msg}</div>
      ) : null}
      <div style={{ fontSize: 13, color: '#6a6a6a' }}>
        No charge was made. You can try again anytime. · 요금은 청구되지 않았습니다. 다시 시도해 주세요.
      </div>
      <Link href={`/${locale}`} style={{ fontSize: 14, fontWeight: 600, color: '#ff385c' }}>
        Back to home · 홈으로
      </Link>
    </div>
  );
}
