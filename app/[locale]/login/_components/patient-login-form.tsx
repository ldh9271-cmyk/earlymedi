'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

const schema = z.object({
  email: z.string().email(),
});
type Values = z.infer<typeof schema>;

/**
 * Patient-only magic-link form.
 *
 * Why magic link (and only magic link):
 *   - We never asked the patient to set a password. The first touch is
 *     usually a KakaoTalk/WhatsApp inquiry, then the clinic enrols them
 *     via the agency dashboard — there's no signup ceremony.
 *   - The email is whatever the clinic stored as the patient's contact,
 *     so it's already the trustworthy identifier.
 *   - shouldCreateUser: true is deliberate: if a patient arrives whose
 *     row isn't in `auth.users` yet (e.g. they're trying to log in
 *     before the clinic has fully onboarded them), Supabase will create
 *     the auth user and the post-login session will be empty rather
 *     than a confusing "no such user" failure. The eventual landing
 *     page (Phase 2+ /me/dashboard) handles the empty-case messaging.
 */
export function PatientLoginForm({
  locale,
  dict,
}: {
  locale: PublicLocale;
  dict: Dictionary['login'];
}): JSX.Element {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit({ email }: Values): Promise<void> {
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError('Demo mode — Supabase not yet connected.');
        return;
      }
      const redirectTo = new URL('/api/auth/callback', window.location.origin);
      // Patients should land somewhere meaningful after the link.
      // Until the /me dashboard ships we send them home to the locale.
      redirectTo.searchParams.set('next', `/${locale}`);
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo.toString(), shouldCreateUser: true },
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3 rounded-lg border border-care-200 bg-care-50 p-4 text-sm text-care-700">
        <p className="font-semibold">📩 {dict.sentTitle}</p>
        <p>{dict.sentBody}</p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="text-xs text-care-700 underline hover:text-care-900"
        >
          {dict.sentRetry}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="patient-email">{dict.emailLabel}</Label>
        <Input
          id="patient-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={dict.emailPlaceholder}
          {...form.register('email')}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button type="submit" variant="brand" className="w-full" disabled={loading}>
        {loading ? dict.sending : dict.cta}
      </Button>
    </form>
  );
}
