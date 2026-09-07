'use client';

/** 카카오 로그인 버튼 — 카카오 브랜드 가이드(노랑 #FEE500, 검정 라벨·심볼). */
import { useState } from 'react';
import { kakaoLoginEnabled, startKakaoSignIn } from '@/lib/auth/kakao-signin';

export default function KakaoLoginButton({ next, label, disabled, onError, compact }: {
  next: string; label: string; disabled?: boolean; onError?: (m: string) => void; compact?: boolean;
}): JSX.Element | null {
  const [loading, setLoading] = useState(false);
  if (!kakaoLoginEnabled()) return null;
  const busy = loading || disabled;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setLoading(true);
        const err = await startKakaoSignIn(next);
        if (err) { onError?.(err); setLoading(false); }
      }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', height: compact ? 44 : 50,
        background: '#FEE500', color: '#191600', border: 'none', borderRadius: 10,
        fontSize: 15, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
        fontFamily: 'inherit', opacity: busy ? 0.6 : 1,
      }}
    >
      <KakaoIcon />
      {loading ? '…' : label}
    </button>
  );
}

function KakaoIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#191600" aria-hidden="true">
      <path d="M12 3C6.9 3 2.8 6.3 2.8 10.3c0 2.6 1.7 4.9 4.3 6.2l-1 3.7c-.1.3.2.6.5.4l4.4-2.9c.3 0 .7.1 1 .1 5.1 0 9.2-3.3 9.2-7.4S17.1 3 12 3z" />
    </svg>
  );
}
