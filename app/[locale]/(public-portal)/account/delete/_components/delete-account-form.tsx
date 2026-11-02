'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { deleteAccountAction } from '../actions';

export type DeleteFormCopy = {
  confirm: string; submit: string; deleting: string; dialog: string;
  done: string; doneHint: string; home: string;
  failed: string; loginRequired: string;
  activeBookings: string; goBookings: string; businessAccount: string;
};

/** 로그인한 회원의 즉시 계정 삭제 — 체크 → 확인 창 → 삭제 → 로그아웃. */
export default function DeleteAccountForm({ locale, email, t }: { locale: PublicLocale; email: string | null; t: DeleteFormCopy }): JSX.Element {
  const [agree, setAgree] = useState(false);
  const [state, setState] = useState<'idle' | 'deleting' | 'done' | 'error'>('idle');
  const [errorKind, setErrorKind] = useState<'failed' | 'login_required' | 'active_bookings' | 'business_account'>('failed');

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!agree || state === 'deleting') return;
    if (!window.confirm(t.dialog)) return;
    setState('deleting');
    try {
      const r = await deleteAccountAction();
      if (r.ok) {
        const sb = createSupabaseBrowserClient();
        await sb?.auth.signOut().catch(() => undefined);
        // router.refresh() 는 하지 않는다 — 서버가 비로그인 화면으로 다시 그리면 완료 메시지가 사라진다
        // (2026-11-03 아이패드 녹화에서 확인). 헤더는 onAuthStateChange 로 스스로 로그아웃 상태가 된다.
        setState('done');
      } else {
        setErrorKind(r.error);
        setState('error');
      }
    } catch {
      setErrorKind('failed');
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <div>
        <p style={{ margin: 0, fontSize: 15, color: '#047857', fontWeight: 700, lineHeight: 1.6 }}>✓ {t.done}</p>
        <p style={{ margin: '6px 0 14px', fontSize: 13, color: '#6a6a6a', lineHeight: 1.6 }}>{t.doneHint}</p>
        <Link href={`/${locale}`} style={{ display: 'inline-block', background: '#222', color: '#fff', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>{t.home}</Link>
      </div>
    );
  }

  const errorText = errorKind === 'active_bookings' ? t.activeBookings
    : errorKind === 'business_account' ? t.businessAccount
      : errorKind === 'login_required' ? t.loginRequired : t.failed;

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {email ? <div style={{ fontSize: 13, color: '#6a6a6a' }}>{email}</div> : null}
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.5, cursor: 'pointer' }}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 4 }} data-testid="delete-agree" />
        <span>{t.confirm}</span>
      </label>
      <button type="submit" disabled={!agree || state === 'deleting'} data-testid="delete-submit"
        style={{ alignSelf: 'flex-start', background: agree ? '#dc2626' : '#e5e5e5', color: agree ? '#fff' : '#9c9c9c', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 15, fontWeight: 700, cursor: agree ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
        {state === 'deleting' ? t.deleting : t.submit}
      </button>
      {state === 'error' ? (
        <div style={{ fontSize: 13, color: '#b91c1c', lineHeight: 1.6, background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px' }}>
          {errorText}
          {errorKind === 'active_bookings' ? (
            <div style={{ marginTop: 6 }}><Link href={`/${locale}/me`} style={{ color: '#1d4ed8', fontWeight: 600 }}>{t.goBookings}</Link></div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
