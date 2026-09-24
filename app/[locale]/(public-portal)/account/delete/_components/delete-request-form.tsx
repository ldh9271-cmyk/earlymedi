'use client';

import { useState } from 'react';
import type { PublicLocale } from '@/lib/i18n/locales';
import { requestAccountDeletionAction } from '../actions';

/** 로그인한 회원의 계정 삭제 요청 폼 — 확인 체크 후 한 번만 보낸다. */
export default function DeleteRequestForm({
  locale, email, requestedAt, t,
}: {
  locale: PublicLocale;
  email: string | null;
  requestedAt: string | null;
  t: { reason: string; confirm: string; submit: string; sending: string; done: string; already: string; failed: string; loginRequired: string };
}): JSX.Element {
  const [reason, setReason] = useState('');
  const [agree, setAgree] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>(requestedAt ? 'done' : 'idle');
  const [msg, setMsg] = useState(requestedAt ? t.already : '');

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!agree || state === 'sending') return;
    setState('sending');
    try {
      const r = await requestAccountDeletionAction({ locale, reason });
      if (r.ok) { setState('done'); setMsg(t.done); }
      else { setState('error'); setMsg(r.error === 'login_required' ? t.loginRequired : t.failed); }
    } catch {
      setState('error'); setMsg(t.failed);
    }
  }

  if (state === 'done') {
    return <p style={{ margin: 0, fontSize: 14, color: '#047857', fontWeight: 600, lineHeight: 1.6 }}>✓ {msg}{email ? ` (${email})` : ''}</p>;
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {email ? <div style={{ fontSize: 13, color: '#6a6a6a' }}>{email}</div> : null}
      <label style={{ fontSize: 13, fontWeight: 600 }}>
        {t.reason}
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={3}
          style={{ display: 'block', width: '100%', marginTop: 6, border: '1px solid #dddddd', borderRadius: 10, padding: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.5, cursor: 'pointer' }}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 4 }} />
        <span>{t.confirm}</span>
      </label>
      <button type="submit" disabled={!agree || state === 'sending'}
        style={{ alignSelf: 'flex-start', background: agree ? '#dc2626' : '#e5e5e5', color: agree ? '#fff' : '#9c9c9c', border: 'none', borderRadius: 10, padding: '11px 18px', fontSize: 14, fontWeight: 700, cursor: agree ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
        {state === 'sending' ? t.sending : t.submit}
      </button>
      {state === 'error' ? <p style={{ margin: 0, fontSize: 13, color: '#dc2626' }}>{msg}</p> : null}
    </form>
  );
}
