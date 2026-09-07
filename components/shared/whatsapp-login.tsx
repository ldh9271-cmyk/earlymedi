'use client';

/**
 * 왓츠앱 로그인 — 정확히는 "전화번호 OTP 코드를 왓츠앱 메시지로 받는" 방식.
 *
 * 왓츠앱은 구글·카카오·라인 같은 OAuth 제공자가 아니다. 그래서 흐름이 다르다:
 *
 *   1) 전화번호 입력  → supabase.auth.signInWithOtp({ phone, channel: 'whatsapp' })
 *   2) 6자리 코드 입력 → supabase.auth.verifyOtp({ phone, token, type: 'sms' })
 *   3) 이메일이 없는 신규 계정이면 이름·이메일을 한 번 더 받는다
 *
 * 3번이 필요한 이유: 인보이스·바우처·환불 안내가 전부 이메일로 나가고,
 * 같은 사람이 구글·카카오·라인·전화 어느 쪽으로 들어와도 한 사람으로
 * 묶으려면 이메일이 열쇠이기 때문이다. 이메일은 Supabase 가 확인 메일을
 * 보내고 사용자가 링크를 눌러야 확정된다(우리가 임의로 확정하지 않는다 —
 * 남의 이메일을 적어 계정을 가로채는 걸 막아야 한다).
 *
 * 노출 스위치: NEXT_PUBLIC_WHATSAPP_LOGIN=1, 그 전에는 주소에 ?wtest=1.
 */
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { PHONE_COUNTRIES, toE164 } from '@/lib/phone/countries';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

export function whatsappLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_WHATSAPP_LOGIN === '1';
}

type Step = 'idle' | 'phone' | 'code' | 'email';

const BRAND = '#25D366';

export default function WhatsAppLogin({ next, label, dict, disabled, compact }: {
  next: string;
  label: string;
  dict: Dictionary['whatsapp'];
  disabled?: boolean;
  compact?: boolean;
}): JSX.Element | null {
  const [forced, setForced] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [country, setCountry] = useState('KR');
  const [phone, setPhone] = useState('');
  const [e164, setE164] = useState('');
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // 서버 렌더와 어긋나지 않게 마운트 뒤에만 본다
    if (new URLSearchParams(window.location.search).get('wtest') === '1') setForced(true);
  }, []);

  if (!whatsappLoginEnabled() && !forced) return null;

  const dial = PHONE_COUNTRIES.find((c) => c.code === country)?.dial ?? '';

  async function sendCode(): Promise<void> {
    setErr(null);
    const normalized = toE164(phone, dial);
    if (!normalized) { setErr(dict.errInvalidPhone); return; }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setErr(dict.errFailed); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized, options: { channel: 'whatsapp' } });
    setBusy(false);
    if (error) { setErr(explain(error.message, dict)); return; }
    setE164(normalized);
    setCode('');
    setNotice(dict.codeSent.replace('{phone}', normalized));
    setStep('code');
  }

  async function verify(): Promise<void> {
    setErr(null);
    const token = code.replace(/\D/g, '');
    if (token.length < 4) { setErr(dict.errInvalidCode); return; }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setErr(dict.errFailed); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({ phone: e164, token, type: 'sms' });
    if (error || !data.user) { setBusy(false); setErr(explain(error?.message ?? '', dict)); return; }
    // 추천인 귀속·총판 연결·가입 알림은 서버에서 (다른 로그인 경로와 같은 함수)
    await fetch('/api/auth/phone/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ next }),
    }).catch(() => undefined);
    if (data.user.email) { window.location.href = next; return; }
    setBusy(false);
    setNotice(null);
    setStep('email');
  }

  async function saveEmail(): Promise<void> {
    setErr(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr(dict.errInvalidEmail); return; }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setErr(dict.errFailed); return; }
    setBusy(true);
    const redirectTo = new URL('/api/auth/callback', window.location.origin);
    redirectTo.searchParams.set('next', next);
    const { error } = await supabase.auth.updateUser(
      { email, data: { full_name: fullName || undefined, signup_source: 'patient_portal' } },
      { emailRedirectTo: redirectTo.toString() },
    );
    setBusy(false);
    if (error) { setErr(explain(error.message, dict)); return; }
    setNotice(dict.emailSent.replace('{email}', email));
  }

  if (step === 'idle') {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setStep('phone'); setErr(null); setNotice(null); }}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', height: compact ? 44 : 50,
          background: BRAND, color: '#fff', border: 'none', borderRadius: 10,
          fontSize: 15, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', opacity: disabled ? 0.6 : 1,
        }}
      >
        <WhatsAppIcon />
        {label}
      </button>
    );
  }

  return (
    <div style={{ border: `1px solid ${BRAND}`, borderRadius: 10, padding: 14, display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <WhatsAppIcon color={BRAND} />
        <strong style={{ fontSize: 14, color: '#222' }}>{dict.title}</strong>
        <button
          type="button"
          onClick={() => { setStep('idle'); setErr(null); setNotice(null); }}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#717171', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {dict.close}
        </button>
      </div>

      {step === 'phone' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '38% 1fr', gap: 8 }}>
            <select value={country} onChange={(e) => setCountry(e.target.value)} style={fieldStyle}>
              {PHONE_COUNTRIES.filter((c) => c.dial).map((c) => (
                <option key={c.code} value={c.code}>{c.name} ({c.dial})</option>
              ))}
            </select>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void sendCode(); } }}
              placeholder="10-1234-5678"
              style={fieldStyle}
            />
          </div>
          <p style={hintStyle}>{dict.phoneHint}</p>
          <button type="button" disabled={busy} onClick={() => void sendCode()} style={primaryStyle(busy)}>
            {busy ? '…' : dict.sendCode}
          </button>
        </>
      )}

      {step === 'code' && (
        <>
          <input
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void verify(); } }}
            placeholder="000000"
            style={{ ...fieldStyle, letterSpacing: 4, textAlign: 'center', fontSize: 18 }}
          />
          <button type="button" disabled={busy} onClick={() => void verify()} style={primaryStyle(busy)}>
            {busy ? '…' : dict.verify}
          </button>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={() => { setStep('phone'); setNotice(null); }} style={linkStyle}>{dict.changeNumber}</button>
            <button type="button" disabled={busy} onClick={() => void sendCode()} style={linkStyle}>{dict.resend}</button>
          </div>
        </>
      )}

      {step === 'email' && (
        <>
          <p style={hintStyle}>{dict.emailWhy}</p>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={dict.nameLabel} style={fieldStyle} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void saveEmail(); } }}
            placeholder="you@example.com"
            style={fieldStyle}
          />
          <button type="button" disabled={busy} onClick={() => void saveEmail()} style={primaryStyle(busy)}>
            {busy ? '…' : dict.emailSubmit}
          </button>
        </>
      )}

      {notice && <p style={{ ...hintStyle, color: '#0a7c3f' }}>{notice}</p>}
      {err && <p style={{ ...hintStyle, color: '#c1121f' }}>{err}</p>}
    </div>
  );
}

/** Supabase 원문 오류를 사용자가 읽을 만한 문장으로 */
function explain(message: string, dict: Dictionary['whatsapp']): string {
  const m = message.toLowerCase();
  if (m.includes('expired') || m.includes('invalid') || m.includes('token')) return dict.errInvalidCode;
  if (m.includes('rate') || m.includes('too many') || m.includes('security purposes')) return dict.errTooMany;
  if (m.includes('already been registered') || m.includes('already registered') || m.includes('already exists')) return dict.errEmailTaken;
  if (m.includes('phone')) return dict.errInvalidPhone;
  return dict.errFailed;
}

const fieldStyle: React.CSSProperties = {
  height: 44, width: '100%', border: '1px solid #dddddd', borderRadius: 10,
  padding: '0 12px', fontSize: 15, color: '#222', background: '#fff',
  outline: 'none', fontFamily: 'inherit',
};

const hintStyle: React.CSSProperties = { margin: 0, fontSize: 12, color: '#717171', lineHeight: 1.5 };

const linkStyle: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, color: '#717171',
  fontSize: 13, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit',
};

function primaryStyle(busy: boolean): React.CSSProperties {
  return {
    height: 46, width: '100%', background: BRAND, color: '#fff', border: 'none',
    borderRadius: 10, fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
    cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
  };
}

function WhatsAppIcon({ color = '#fff' }: { color?: string }): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 1.8a8.2 8.2 0 1 1-4.2 15.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 0 1 12 3.8zm-3.3 4c-.2 0-.5.1-.7.4-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.7 2.7 4.2 3.7 2.1.8 2.5.7 3 .6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3l-1.8-.9c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5 0-.2 0-.3-.1-.5l-.8-1.8c-.2-.4-.4-.4-.5-.4h-.5z" />
    </svg>
  );
}
