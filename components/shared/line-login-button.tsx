'use client';

/** 라인 로그인 버튼 — 라인 브랜드 초록(#06C755). NEXT_PUBLIC_LINE_LOGIN=1 일 때만 노출. */
import { useState } from 'react';

export function lineLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_LINE_LOGIN === '1';
}

export default function LineLoginButton({ next, label, disabled, compact }: {
  next: string; label: string; disabled?: boolean; compact?: boolean;
}): JSX.Element | null {
  const [loading, setLoading] = useState(false);
  if (!lineLoginEnabled()) return null;
  const busy = loading || disabled;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setLoading(true);
        const u = new URL('/api/auth/line/start', window.location.origin);
        u.searchParams.set('next', next);
        window.location.href = u.toString();
      }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', height: compact ? 44 : 50,
        background: '#06C755', color: '#fff', border: 'none', borderRadius: 10,
        fontSize: 15, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
        fontFamily: 'inherit', opacity: busy ? 0.6 : 1,
      }}
    >
      <LineIcon />
      {loading ? '…' : label}
    </button>
  );
}

function LineIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M12 2.6c5.2 0 9.4 3.4 9.4 7.6 0 1.7-.7 3.2-1.8 4.5-1.7 2-5.5 4.4-6.4 4.8-.9.4-.8-.2-.7-.5l.1-.7c0-.2.1-.7-.3-.8-3.9-.5-6.8-3.2-6.8-6.4C5.5 6 9.1 2.6 12 2.6zm-2.4 5.6H8.5c-.2 0-.3.1-.3.3v4.2c0 .2.1.3.3.3h1.1c.2 0 .3-.1.3-.3V8.5c0-.2-.1-.3-.3-.3zm5.6 0h-1c-.2 0-.3.1-.3.3v2.4l-1.9-2.5-.1-.1h-1.2c-.2 0-.3.1-.3.3v4.2c0 .2.1.3.3.3h1c.2 0 .3-.1.3-.3v-2.5l1.9 2.6h1.3c.2 0 .3-.1.3-.3V8.5c0-.2-.1-.3-.3-.3zm3.4 1.4c.2 0 .3-.1.3-.3v-.8c0-.2-.1-.3-.3-.3h-2.7c-.2 0-.3.1-.3.3v4.2c0 .2.1.3.3.3h2.7c.2 0 .3-.1.3-.3v-.8c0-.2-.1-.3-.3-.3h-1.6v-.6h1.6c.2 0 .3-.1.3-.3v-.8c0-.2-.1-.3-.3-.3h-1.6v-.6h1.6z" />
    </svg>
  );
}
