'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';

const schema = z.object({
  email: z.string().email('유효한 이메일을 입력해 주세요.'),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm({
  nextPath,
  sent,
}: {
  nextPath: string;
  sent: boolean;
}): JSX.Element {
  const [submitted, setSubmitted] = useState(sent);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onGoogleSignIn(): Promise<void> {
    setError(null);
    setGoogleLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError('데모 모드 — Supabase가 아직 연결되지 않았습니다. 환경 변수 설정 후 다시 시도해주세요.');
        return;
      }
      // PKCE flow lands on /api/auth/callback Route Handler, which is the
      // only place we can reliably write the Supabase session cookies in
      // Next.js 14 (Server Components silently drop cookieStore.set).
      const redirectTo = new URL('/api/auth/callback', window.location.origin);
      redirectTo.searchParams.set('next', nextPath);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo.toString(),
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (oauthError) setError(oauthError.message);
      // 정상 동작 시: 브라우저가 Google로 자동 redirect되므로 이후 코드는 실행되지 않음.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google 로그인 실패');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function onSubmit({ email }: FormValues): Promise<void> {
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError('데모 모드 — Supabase가 아직 연결되지 않았습니다. 환경 변수 설정 후 다시 시도해주세요.');
        return;
      }
      // PKCE magic link redirects through the /api/auth/callback Route
      // Handler, which is the only place we can reliably set session
      // cookies. /login then has a forwarding fallback for cases where
      // Supabase's verify endpoint drops the user back at the Site URL.
      const redirectTo = new URL('/api/auth/callback', window.location.origin);
      redirectTo.searchParams.set('next', nextPath);
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo.toString(), shouldCreateUser: true },
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-3 rounded-lg border bg-care-50 p-4 text-sm text-care-700">
        <p className="font-medium">📩 매직링크를 보냈습니다.</p>
        <p>이메일 받은편지함에서 링크를 클릭해 로그인하세요. (스팸함도 확인)</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onGoogleSignIn}
        disabled={googleLoading || loading}
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
      >
        <GoogleIcon className="h-4 w-4" />
        {googleLoading ? 'Google로 이동 중…' : 'Google로 계속하기'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            또는 이메일로
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
          />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" variant="brand" className="w-full" disabled={loading || googleLoading}>
          {loading ? '전송 중…' : '매직링크 받기'}
        </Button>
      </form>
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
