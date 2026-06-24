'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

/**
 * Patient self-signup form.
 *
 * Storage strategy:
 *   - Supabase `auth.signUp` creates the auth.users row using `email` +
 *     `password` as the primary identifier (Supabase requires email).
 *   - All extra profile fields (username, full name, country, phone,
 *     messenger handle) are stuffed into `options.data` so they land in
 *     `auth.users.raw_user_meta_data`. This is enough to ship the form
 *     without a new `patient_self_signups` table; an Agency-side worker
 *     can later mint a proper `patients` row by matching emailHash when
 *     the patient is enrolled into an actual treatment plan.
 *   - `emailRedirectTo` brings the patient back to the locale home
 *     after email verification. When the /me dashboard ships (Phase 2+),
 *     this should point at /{locale}/me instead.
 *
 * What we deliberately DON'T do here:
 *   - Country/timezone auto-detect from IP — privacy + accuracy issues
 *     in VPN-heavy markets like CN, so user picks explicitly.
 *   - Async username uniqueness check — Supabase user_metadata isn't
 *     indexed; the value is informational. The auth identifier is email,
 *     which Supabase enforces unique server-side.
 *   - Phone OTP — outside scope of this form. Phone is recorded for
 *     the clinic to call back (paired with the messenger channel which
 *     is the actual realtime contact route).
 */

// 가장 자주 오는 송출국 위주. 'OTHER'는 자유 입력 대체 안 하고
// "기타"로 분류 — agency-side에서 후속 보완.
const COUNTRIES: Array<{ code: string; name: string; dial: string }> = [
  { code: 'KR', name: 'Korea (한국)', dial: '+82' },
  { code: 'CN', name: 'China (中国)', dial: '+86' },
  { code: 'JP', name: 'Japan (日本)', dial: '+81' },
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'RU', name: 'Russia (Россия)', dial: '+7' },
  { code: 'VN', name: 'Vietnam (Việt Nam)', dial: '+84' },
  { code: 'TH', name: 'Thailand (ไทย)', dial: '+66' },
  { code: 'MY', name: 'Malaysia', dial: '+60' },
  { code: 'ID', name: 'Indonesia', dial: '+62' },
  { code: 'PH', name: 'Philippines', dial: '+63' },
  { code: 'SG', name: 'Singapore', dial: '+65' },
  { code: 'TW', name: 'Taiwan (台灣)', dial: '+886' },
  { code: 'HK', name: 'Hong Kong', dial: '+852' },
  { code: 'AE', name: 'UAE', dial: '+971' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { code: 'KZ', name: 'Kazakhstan', dial: '+7' },
  { code: 'MN', name: 'Mongolia', dial: '+976' },
  { code: 'IN', name: 'India', dial: '+91' },
  { code: 'AU', name: 'Australia', dial: '+61' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'OTHER', name: 'Other / 기타', dial: '' },
];

// 8 messenger channels matching components/shared/channels/registry.
// We list them in the same priority as the inbox so patient familiarity
// with the inbox icons carries over.
const MESSENGERS: Array<{ value: string; label: string }> = [
  { value: 'kakao', label: 'KakaoTalk' },
  { value: 'line', label: 'LINE' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'wechat', label: 'WeChat' },
  { value: 'instagram', label: 'Instagram DM' },
  { value: 'messenger', label: 'Facebook Messenger' },
  { value: 'naver', label: 'Naver 톡톡' },
  { value: 'telegram', label: 'Telegram' },
];

const schema = z
  .object({
    username: z
      .string()
      .min(4)
      .max(20)
      .regex(/^[a-zA-Z0-9_]+$/, 'a-z A-Z 0-9 _'),
    password: z.string().min(8).max(128),
    passwordConfirm: z.string(),
    fullName: z.string().min(2).max(80),
    countryCode: z.string().min(2),
    phone: z
      .string()
      .min(6)
      .max(40)
      .regex(/^[0-9+\-\s()]+$/, '0-9 + - ( )'),
    email: z.string().email(),
    messengerKind: z.enum([
      'kakao',
      'line',
      'whatsapp',
      'wechat',
      'instagram',
      'messenger',
      'naver',
      'telegram',
    ]),
    messengerId: z.string().min(1).max(80),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'mismatch',
  });

type Values = z.infer<typeof schema>;

export function PatientSignupForm({
  locale,
  dict,
}: {
  locale: PublicLocale;
  dict: Dictionary['signup'];
}): JSX.Element {
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null); // verified email when sent
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { countryCode: 'KR', messengerKind: 'kakao' },
  });

  // ─── Google OAuth ─────────────────────────────────────────────────
  // Patients who sign up via Google skip the form entirely — we send
  // them to a /me profile-completion page (placeholder for Phase 2+;
  // for now bounces back to the locale home and the operator-side will
  // see them as an auth.users row missing patient metadata).
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
      setError(e instanceof Error ? e.message : 'Google sign-up failed');
    } finally {
      setGoogleLoading(false);
    }
  }

  // ─── Email + Password sign-up ─────────────────────────────────────
  async function onSubmit(values: Values): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError('Supabase not connected (demo mode).');
        return;
      }
      const redirectTo = new URL('/api/auth/callback', window.location.origin);
      redirectTo.searchParams.set('next', `/${locale}`);
      const { error: e } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: redirectTo.toString(),
          // All extra fields land in auth.users.raw_user_meta_data; the
          // Agency dashboard's patient-merge job will read this when an
          // operator first enrols the patient into a treatment plan.
          data: {
            username: values.username,
            full_name: values.fullName,
            country_code: values.countryCode,
            phone: values.phone,
            messenger_kind: values.messengerKind,
            messenger_id: values.messengerId,
            signup_source: 'patient_portal',
            signup_locale: locale,
          },
        },
      });
      if (e) {
        const m = e.message.toLowerCase();
        if (m.includes('already registered') || m.includes('already exists')) {
          setError(
            locale === 'kr'
              ? '이미 가입된 이메일입니다. 로그인을 시도해 주세요.'
              : 'This email is already registered. Try signing in instead.',
          );
        } else {
          setError(e.message);
        }
        return;
      }
      setSent(values.email);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-up failed');
    } finally {
      setSubmitting(false);
    }
  }

  // Post-submit confirmation state. Supabase will have queued the
  // verification email; user has to click the link to complete signUp.
  if (sent) {
    return (
      <div className="space-y-3 rounded-lg border border-care-200 bg-care-50 p-4 text-sm text-care-700">
        <p className="font-semibold">📩 {dict.sentTitle}</p>
        <p>
          {dict.sentBody}{' '}
          <strong className="break-all">{sent}</strong>
        </p>
        <button
          type="button"
          onClick={() => setSent(null)}
          className="text-xs text-care-700 underline hover:text-care-900"
        >
          {dict.sentRetry}
        </button>
      </div>
    );
  }

  const errs = form.formState.errors;
  return (
    <div className="space-y-5">
      {/* Google OAuth — primary path for tech-savvy international users */}
      <button
        type="button"
        onClick={onGoogle}
        disabled={googleLoading || submitting}
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
      >
        <GoogleIcon className="h-4 w-4" />
        {googleLoading ? '…' : dict.googleCta}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            {dict.or}
          </span>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Username */}
        <Field
          id="s-username"
          label={dict.usernameLabel}
          hint={dict.usernameHint}
          error={errs.username?.message}
        >
          <Input
            id="s-username"
            placeholder={dict.usernamePlaceholder}
            autoComplete="username"
            {...form.register('username')}
          />
        </Field>

        {/* Password */}
        <Field
          id="s-password"
          label={dict.passwordLabel}
          hint={dict.passwordHint}
          error={errs.password?.message}
        >
          <div className="relative">
            <Input
              id="s-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="pr-10"
              {...form.register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'hide' : 'show'}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </Field>

        {/* Password confirm */}
        <Field
          id="s-password-confirm"
          label={dict.passwordConfirmLabel}
          error={errs.passwordConfirm?.message}
        >
          <Input
            id="s-password-confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            {...form.register('passwordConfirm')}
          />
        </Field>

        {/* Full name */}
        <Field
          id="s-name"
          label={dict.fullNameLabel}
          hint={dict.fullNameHint}
          error={errs.fullName?.message}
        >
          <Input id="s-name" autoComplete="name" {...form.register('fullName')} />
        </Field>

        {/* Country */}
        <Field id="s-country" label={dict.countryLabel} error={errs.countryCode?.message}>
          <select
            id="s-country"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            {...form.register('countryCode')}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
                {c.dial ? ` (${c.dial})` : ''}
              </option>
            ))}
          </select>
        </Field>

        {/* Phone */}
        <Field
          id="s-phone"
          label={dict.phoneLabel}
          hint={dict.phoneHint}
          error={errs.phone?.message}
        >
          <Input
            id="s-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+82 10-1234-5678"
            {...form.register('phone')}
          />
        </Field>

        {/* Email */}
        <Field
          id="s-email"
          label={dict.emailLabel}
          hint={dict.emailHint}
          error={errs.email?.message}
        >
          <Input
            id="s-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...form.register('email')}
          />
        </Field>

        {/* Messenger kind */}
        <Field
          id="s-messenger-kind"
          label={dict.messengerLabel}
          error={errs.messengerKind?.message}
        >
          <select
            id="s-messenger-kind"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            {...form.register('messengerKind')}
          >
            {MESSENGERS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>

        {/* Messenger ID */}
        <Field
          id="s-messenger-id"
          label={dict.messengerIdLabel}
          hint={dict.messengerIdHint}
          error={errs.messengerId?.message}
        >
          <Input id="s-messenger-id" {...form.register('messengerId')} />
        </Field>

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%', height: 50, marginTop: 4,
            background: submitting ? '#ffb3c1' : '#ff385c',
            color: '#fff', border: 'none', borderRadius: 10,
            fontWeight: 600, fontSize: 16,
            cursor: submitting ? 'wait' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {submitting ? dict.submitting : dict.submitCta}
        </button>
      </form>
    </div>
  );
}

// ── Reusable field wrapper to keep the form body terse ────────────────
function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}

/** Official Google "G" multi-color logo (same SVG as the B2B login). */
function GoogleIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.996 3.018v2.51h3.232c1.891-1.741 2.982-4.303 2.982-7.351z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.964-.895 6.618-2.422l-3.232-2.51c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.759-5.595-4.123H3.064v2.59A9.996 9.996 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.405 13.9A6.013 6.013 0 0 1 6.09 12c0-.66.114-1.3.314-1.9V7.51H3.064A9.996 9.996 0 0 0 2 12c0 1.614.386 3.14 1.064 4.49l3.341-2.59z"
      />
      <path
        fill="#EA4335"
        d="M12 5.977c1.468 0 2.786.504 3.823 1.495l2.867-2.867C16.96 3.005 14.696 2 12 2A9.996 9.996 0 0 0 3.064 7.51l3.341 2.59C7.19 7.736 9.395 5.977 12 5.977z"
      />
    </svg>
  );
}
