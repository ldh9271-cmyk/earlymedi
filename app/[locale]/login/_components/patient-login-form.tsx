'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

/**
 * Patient login form — three paths, ordered by typical usage frequency:
 *
 *   1. Google OAuth — returning users who signed up with Google,
 *      and the most painless "single click" return path for everyone.
 *   2. Email + password — returning users who used the signup form's
 *      password track. Mirrors the signup form fields exactly so the
 *      mental model matches.
 *   3. Magic link — fallback for password-forgot or new patients
 *      whose clinic provisioned an account without password yet.
 *
 * shouldCreateUser=false on magic link is critical: we don't want a
 * silent signup happening from the login screen (the signup form is
 * the canonical place to capture name/phone/messenger/etc).
 */

const emailSchema = z.object({
  email: z.string().email(),
});
const passwordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
type EmailValues = z.infer<typeof emailSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export function PatientLoginForm({
  locale,
  dict,
}: {
  locale: PublicLocale;
  dict: Dictionary['login'];
}): JSX.Element {
  const router = useRouter();
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const magicForm = useForm<EmailValues>({ resolver: zodResolver(emailSchema) });
  const pwForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  // ─── Google OAuth ─────────────────────────────────────────────────
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

  // ─── Email + Password ─────────────────────────────────────────────
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

  // ─── Magic Link ────────────────────────────────────────────────────
  async function onMagic({ email }: EmailValues): Promise<void> {
    setError(null);
    setMagicLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError('Supabase not connected (demo mode).');
        return;
      }
      const redirectTo = new URL('/api/auth/callback', window.location.origin);
      redirectTo.searchParams.set('next', `/${locale}`);
      const { error: e } = await supabase.auth.signInWithOtp({
        email,
        // Don't silently create accounts from the login screen —
        // /signup is the canonical capture point for new patient data.
        options: { emailRedirectTo: redirectTo.toString(), shouldCreateUser: false },
      });
      if (e) {
        setError(e.message);
        return;
      }
      setMagicSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Magic link failed');
    } finally {
      setMagicLoading(false);
    }
  }

  // ─── Forgot password ──────────────────────────────────────────────
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

  if (magicSent) {
    return (
      <div className="space-y-3 rounded-lg border border-care-200 bg-care-50 p-4 text-sm text-care-700">
        <p className="font-semibold">📩 {dict.sentTitle}</p>
        <p>{dict.sentBody}</p>
        <button
          type="button"
          onClick={() => setMagicSent(false)}
          className="text-xs text-care-700 underline hover:text-care-900"
        >
          {dict.sentRetry}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Google OAuth — primary returning-user path */}
      <button
        type="button"
        onClick={onGoogle}
        disabled={googleLoading || pwLoading || magicLoading}
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

      <Tabs defaultValue="password">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password">{dict.passwordTab}</TabsTrigger>
          <TabsTrigger value="magic">{dict.magicTab}</TabsTrigger>
        </TabsList>

        {/* Password tab */}
        <TabsContent value="password" className="space-y-3 pt-3">
          <form onSubmit={pwForm.handleSubmit(onPassword)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pw-email">{dict.emailLabel}</Label>
              <Input
                id="pw-email"
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder={dict.emailPlaceholder}
                {...pwForm.register('email')}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="pw-password">{dict.passwordLabel}</Label>
                <button
                  type="button"
                  onClick={onForgot}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {dict.forgotPassword}
                </button>
              </div>
              <div className="relative">
                <Input
                  id="pw-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder={dict.passwordPlaceholder}
                  className="pr-10"
                  {...pwForm.register('password')}
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
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <Button type="submit" variant="brand" className="w-full" disabled={pwLoading}>
              {pwLoading ? dict.signingIn : dict.signInCta}
            </Button>
          </form>
        </TabsContent>

        {/* Magic link tab */}
        <TabsContent value="magic" className="space-y-3 pt-3">
          <form onSubmit={magicForm.handleSubmit(onMagic)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="magic-email">{dict.emailLabel}</Label>
              <Input
                id="magic-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={dict.emailPlaceholder}
                {...magicForm.register('email')}
              />
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <Button type="submit" variant="brand" className="w-full" disabled={magicLoading}>
              {magicLoading ? dict.sending : dict.cta}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Official Google "G" multi-color logo. */
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
