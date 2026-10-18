'use client';

import { useState } from 'react';

/** 추천 코드 복사 버튼 — 클립보드 API 가 없는 구형 WebView 에서는 숨은 textarea + execCommand 로 대신한다. */
export default function CopyCode({ code, label, done }: { code: string; label: string; done: string }): JSX.Element {
  const [copied, setCopied] = useState(false);
  const copy = async (): Promise<void> => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(code);
      ok = true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { ok = false; }
    }
    if (!ok) return; // 길게 눌러 복사하면 된다
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={() => { void copy(); }}
      aria-live="polite"
      style={{
        flexShrink: 0,
        border: '1px solid #222222',
        background: copied ? '#222222' : '#ffffff',
        color: copied ? '#ffffff' : '#222222',
        borderRadius: 999,
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'background .15s, color .15s',
      }}
    >
      {copied ? done : label}
    </button>
  );
}
