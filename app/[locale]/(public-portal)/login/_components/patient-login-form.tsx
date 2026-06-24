'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

/**
 * Guest login form — Airbnb-styled. Two paths only:
 *
 *   1. Google OAuth — single-click return for users who signed up
 *      with Google (most common path).
 *   2. Email + password — for users who used the signup form's
 *      password track. Includes "비밀번호 찾기" → resetPasswordForEmail.
 *
 * Magic link was removed (2026-06-24) per founder request — too easy
 * for unauthenticated visitors to be confused about which channel to
 * use, and the password path covers the same return-user need with
 * less friction (no email round-trip).
 *
 * Visual: same inline-style language as InquiryForm / SignupForm —
 * 48px inputs / 10px radius / #ff385c primary CTA / subtle 1px
 * borders. No Tailwind utility soup — fits the rest of the /kr
 * surface that uses inline styles throughout.
 */

// Loose client-side validation: just non-empty + roughly email-shape.
// Supabase signInWithPassword is the source of truth — it returns
// "Invalid login credentials" if email/password don't match a row.
// Stricter min(8) on the client would silently block legit users
// whose accounts predate the rule.
const passwordSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.').max(200),
});
type PasswordValues = z.infer<typeof passwordSchema>;

const inputStyle: React.CSSProperties = {
  height: 48,
  width: '100%',
  border: '1px solid #dddddd',
  borderRadius: 10,
  padding: '0 14px',
  fontSize: 15,
  color: '#222',
  background: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#222',
  marginBottom: 6,
};

export function PatientLoginForm({
  locale,
  dict,
}: {
  locale: PublicLocale;
  dict: Dictionary['login'];
}): JSX.Element {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const pwForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  async function onGoogle(): Promise<void> {
    setError(null);
    setGoogleLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError('Supabase not connected (demo mode).');
        return;
      }
      const redirectTo = new URL('/api/auth/callback', window.location.origin);
      redirectTo.searchParams.set('next', `/${locale}`);
      const { error: e } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo.toString(),
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (e) setError(e.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function onPassword({ email, password }: PasswordValues): Promise<void> {
    setError(null);
    setPwLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError('Supabase not connected (demo mode).');
        return;
      }
      const { error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) {
        const m = e.message.toLowerCase();
        if (m.includes('invalid login')) setError(dict.invalidCreds);
        else if (m.includes('email not confirmed')) setError(dict.emailNotConfirmed);
        else setError(e.message);
        return;
      }
      router.replace(`/${locale}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setPwLoading(false);
    }
  }

  async function onForgot(): Promise<void> {
    const email = pwForm.getValues('email');
    if (!email || !email.includes('@')) {
      setError(dict.invalidCreds);
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;
      const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/account/reset-password`,
      });
      if (e) {
        setError(e.message);
        return;
      }
      toast.success(dict.resetSent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    }
  }

  const anyLoading = googleLoading || pwLoading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Google OAuth — primary path */}
      <button
        type="button"
        onClick={onGoogle}
        disabled={anyLoading}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', height: 50,
          background: '#fff', color: '#222',
          border: '1px solid #222', borderRadius: 10,
          fontSize: 15, fontWeight: 600,
          cursor: anyLoading ? 'wait' : 'pointer',
          fontFamily: 'inherit',
          opacity: anyLoading ? 0.6 : 1,
        }}
      >
        <GoogleIcon />
        {googleLoading ? '…' : dict.googleCta}
      </button>

      {/* "or" divider */}
      <div style={{ position: 'relative', textAlign: 'center', height: 16 }}>
        <div
          style={{
            position: 'absolute', top: '50%', left: 0, right: 0,
            borderTop: '1px solid #ebebeb',
          }}
        />
        <span
          style={{
            position: 'relative', background: '#fff',
            padding: '0 12px',
            fontSize: 11, color: '#9c9c9c', fontWeight: 600,
            letterSpacing: '0.5px', textTransform: 'uppercase',
          }}
        >
          {dict.or}
        </span>
      </div>

      {/* Email + password */}
      <form onSubmit={pwForm.handleSubmit(onPassword)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label htmlFor="pw-email" style={labelStyle}>{dict.emailLabel}</label>
          <input
            id="pw-email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder={dict.emailPlaceholder}
            style={inputStyle}
            {...pwForm.register('email')}
          />
          {pwForm.formState.errors.email ? (
            <p style={{ fontSize: 12, color: '#c13515', margin: '6px 0 0' }}>
              {pwForm.formState.errors.email.message}
            </p>
          ) : null}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <label htmlFor="pw-password" style={{ ...labelStyle, marginBottom: 0 }}>
              {dict.passwordLabel}
            </label>
            <button
              type="button"
              onClick={onForgot}
              style={{
                background: 'transparent', border: 'none',
                fontSize: 12, color: '#6a6a6a', cursor: 'pointer',
                textDecoration: 'underline', textUnderlineOffset: 3,
                fontFamily: 'inherit', padding: 0,
              }}
            >
              {dict.forgotPassword}
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              id="pw-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={dict.passwordPlaceholder}
              style={{ ...inputStyle, paddingRight: 44 }}
              {...pwForm.register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'hide' : 'show'}
              style={{
                position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent', border: 'none',
                cursor: 'pointer', color: '#6a6a6a',
                padding: 4, lineHeight: 0,
              }}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {pwForm.formState.errors.password ? (
            <p style={{ fontSize: 12, color: '#c13515', margin: '6px 0 0' }}>
              {pwForm.formState.errors.password.message}
            </p>
          ) : null}
        </div>
        {error ? (
          <p style={{ fontSize: 12, color: '#c13515', margin: 0 }}>{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pwLoading}
          style={{
            width: '100%', height: 50, marginTop: 4,
            background: pwLoading ? '#ffb3c1' : '#ff385c',
            color: '#fff', border: 'none', borderRadius: 10,
            fontWeight: 600, fontSize: 16,
            cursor: pwLoading ? 'wait' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {pwLoading ? dict.signingIn : dict.signInCta}
        </button>
      </form>
    </div>
  );
}

function GoogleIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.996 3.018v2.51h3.232c1.891-1.741 2.982-4.303 2.982-7.351z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.964-.895 6.618-2.422l-3.232-2.51c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.759-5.595-4.123H3.064v2.59A9.996 9.996 0 0 0 12 22z" />
      <path fill="#FBBC05" d="M6.405 13.9A6.013 6.013 0 0 1 6.09 12c0-.66.114-1.3.314-1.9V7.51H3.064A9.996 9.996 0 0 0 2 12c0 1.614.386 3.14 1.064 4.49l3.341-2.59z" />
      <path fill="#EA4335" d="M12 5.977c1.468 0 2.786.504 3.823 1.495l2.867-2.867C16.96 3.005 14.696 2 12 2A9.996 9.996 0 0 0 3.064 7.51l3.341 2.59C7.19 7.736 9.395 5.977 12 5.977z" />
    </svg>
  );
}

function EyeIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17.94 17.94A10.06 10.06 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.46 18.46 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
