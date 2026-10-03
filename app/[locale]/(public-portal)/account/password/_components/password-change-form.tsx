'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';

export type PasswordCopy = {
  newPassword: string; confirm: string; submit: string; saving: string;
  tooShort: string; mismatch: string; same: string; failed: string; done: string;
};

const inputStyle: React.CSSProperties = {
  height: 48, width: '100%', border: '1px solid #dddddd', borderRadius: 10,
  padding: '0 14px', fontSize: 15, color: '#222', background: '#fff', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#222', marginBottom: 6 };

/**
 * 새 비밀번호 입력 → supabase.auth.updateUser. 성공하면 must_change_password 를 끄고 next 로 이동.
 */
export default function PasswordChangeForm({ copy, next }: { copy: PasswordCopy; next: string }): JSX.Element {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError(copy.tooShort); return; }
    if (password !== confirm) { setError(copy.mismatch); return; }
    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) { setError(copy.failed); return; }
      const { error: e1 } = await supabase.auth.updateUser({
        password,
        data: { must_change_password: false, temp_password_issued_at: null },
      });
      if (e1) {
        const m = e1.message.toLowerCase();
        setError(m.includes('different') || m.includes('same') ? copy.same : copy.failed);
        return;
      }
      toast.success(copy.done);
      router.replace(next);
      router.refresh();
    } catch {
      setError(copy.failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label htmlFor="new-password" style={labelStyle}>{copy.newPassword}</label>
        <input id="new-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} minLength={8} required />
      </div>
      <div>
        <label htmlFor="confirm-password" style={labelStyle}>{copy.confirm}</label>
        <input id="confirm-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inputStyle} minLength={8} required />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6a6a6a' }}>
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
        <span aria-hidden="true">👁</span>
      </label>
      {error ? <p style={{ fontSize: 12, color: '#c13515', margin: 0 }}>{error}</p> : null}
      <button
        type="submit"
        disabled={saving}
        style={{ width: '100%', height: 50, marginTop: 4, background: saving ? '#ffb3c1' : '#ff385c', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 16, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit' }}
      >
        {saving ? copy.saving : copy.submit}
      </button>
    </form>
  );
}
