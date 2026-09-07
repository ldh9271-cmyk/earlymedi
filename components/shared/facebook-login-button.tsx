'use client';

/**
 * 페이스북 로그인 버튼 — Meta 브랜드 파랑(#1877F2).
 * NEXT_PUBLIC_FACEBOOK_LOGIN=1 이면 모두에게, 그 전이라도 주소에 ?ftest=1 을 붙이면
 * 테스터에게만 보인다(구글·라인 때와 같은 방식 — 전체 공개 전 실제 계정 검증용).
 */
import { useEffect, useState } from 'react';
import { facebookLoginEnabled, startFacebookSignIn } from '@/lib/auth/facebook-signin';

export default function FacebookLoginButton({ next, label, disabled, onError, compact }: {
  next: string; label: string; disabled?: boolean; onError?: (m: string) => void; compact?: boolean;
}): JSX.Element | null {
  const [loading, setLoading] = useState(false);
  const [forced, setForced] = useState(false);
  useEffect(() => {
    // 서버 렌더와 어긋나지 않게 마운트 뒤에만 본다
    if (new URLSearchParams(window.location.search).get('ftest') === '1') setForced(true);
  }, []);
  if (!facebookLoginEnabled() && !forced) return null;
  const busy = loading || disabled;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setLoading(true);
        const err = await startFacebookSignIn(next);
        if (err) { onError?.(err); setLoading(false); }
      }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', height: compact ? 44 : 50,
        background: '#1877F2', color: '#fff', border: 'none', borderRadius: 10,
        fontSize: 15, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
        fontFamily: 'inherit', opacity: busy ? 0.6 : 1,
      }}
    >
      <FacebookIcon />
      {loading ? '…' : label}
    </button>
  );
}

function FacebookIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" />
    </svg>
  );
}
