'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';

const emailSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해 주세요.'),
});

const passwordSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해 주세요.'),
  password: z.string().min(8, '비밀번호는 8자 이상').max(128),
});

type EmailValues = z.infer<typeof emailSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export function LoginForm({
  nextPath,
  sent,
}: {
  nextPath: string;
  sent: boolean;
}): JSX.Element {
  const router = useRouter();
  const [magicLinkSent, setMagicLinkSent] = useState(sent);
  const [error, setError] = useState<string | null>(null);
  const [magicLoading, setMagicLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const magicForm = useForm<EmailValues>({ resolver: zodResolver(emailSchema) });
  const pwForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  // ─── Google OAuth ───────────────────────────────────────────────
  async function onGoogleSignIn(): Promise<void> {
    setError(null);
    setGoogleLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError('데모 모드 — Supabase가 아직 연결되지 않았습니다.');
        return;
      }
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google 로그인 실패');
    } finally {
      setGoogleLoading(false);
    }
  }

  // ─── Magic Link (email) ─────────────────────────────────────────
  async function onMagicLinkSubmit({ email }: EmailValues): Promise<void> {
    setError(null);
    setMagicLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError('데모 모드 — Supabase가 아직 연결되지 않았습니다.');
        return;
      }
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
      setMagicLinkSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setMagicLoading(false);
    }
  }

  // ─── Email + Password ───────────────────────────────────────────
  async function onPasswordSubmit({ email, password }: PasswordValues): Promise<void> {
    setError(null);
    setPwLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError('데모 모드 — Supabase가 아직 연결되지 않았습니다.');
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        // Friendly Korean messages for common Supabase errors.
        const msg = signInError.message.toLowerCase();
        if (msg.includes('invalid login')) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        } else if (msg.includes('email not confirmed')) {
          setError('이메일 인증이 완료되지 않았습니다. 받은 인증 메일을 확인해 주세요.');
        } else {
          setError(signInError.message);
        }
        return;
      }
      toast.success('로그인 성공');
      router.replace(nextPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setPwLoading(false);
    }
  }

  // ─── Forgot password ────────────────────────────────────────────
  async function onForgotPassword(): Promise<void> {
    const email = pwForm.getValues('email');
    if (!email || !email.includes('@')) {
      setError('비밀번호 재설정 메일을 받을 이메일을 먼저 입력해 주세요.');
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/account/reset-password`,
      });
      if (resetErr) {
        setError(resetErr.message);
        return;
      }
      toast.success(`${email} 주소로 비밀번호 재설정 메일을 보냈습니다.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '재설정 메일 발송 실패');
    }
  }

  if (magicLinkSent) {
    return (
      <div className="space-y-3 rounded-lg border bg-care-50 p-4 text-sm text-care-700">
        <p className="font-medium">📩 매직링크를 보냈습니다.</p>
        <p>이메일 받은편지함에서 링크를 클릭해 로그인하세요. (스팸함도 확인)</p>
        <button
          type="button"
          onClick={() => setMagicLinkSent(false)}
          className="text-xs text-care-700 underline hover:text-care-900"
        >
          다른 방법으로 로그인
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Google OAuth — always at the top */}
      <button
        type="button"
        onClick={onGoogleSignIn}
        disabled={googleLoading || magicLoading || pwLoading}
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
            또는
          </span>
        </div>
      </div>

      {/* Email/password vs Magic link */}
      <Tabs defaultValue="password">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password">비밀번호</TabsTrigger>
          <TabsTrigger value="magic">매직링크</TabsTrigger>
        </TabsList>

        {/* Password tab */}
        <TabsContent value="password" className="space-y-3 pt-3">
          <form onSubmit={pwForm.handleSubmit(onPasswordSubmit)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pw-email">이메일</Label>
              <Input
                id="pw-email"
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder="you@example.com"
                {...pwForm.register('email')}
              />
              {pwForm.formState.errors.email ? (
                <p className="text-xs text-destructive">{pwForm.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="pw-password">비밀번호</Label>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  비밀번호 찾기
                </button>
              </div>
              <div className="relative">
                <Input
                  id="pw-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="8자 이상"
                  className="pr-10"
                  {...pwForm.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {pwForm.formState.errors.password ? (
                <p className="text-xs text-destructive">
                  {pwForm.formState.errors.password.message}
                </p>
              ) : null}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              type="submit"
              variant="brand"
              className="w-full"
              disabled={pwLoading || magicLoading || googleLoading}
            >
              {pwLoading ? '로그인 중…' : '로그인'}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              계정이 없으신가요?{' '}
              <a href="/signup" className="font-medium text-foreground underline">
                회원가입
              </a>
            </p>
          </form>
        </TabsContent>

        {/* Magic link tab */}
        <TabsContent value="magic" className="space-y-3 pt-3">
          <form onSubmit={magicForm.handleSubmit(onMagicLinkSubmit)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="magic-email">이메일</Label>
              <Input
                id="magic-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...magicForm.register('email')}
              />
              {magicForm.formState.errors.email ? (
                <p className="text-xs text-destructive">
                  {magicForm.formState.errors.email.message}
                </p>
              ) : null}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              type="submit"
              variant="brand"
              className="w-full"
              disabled={magicLoading || pwLoading || googleLoading}
            >
              {magicLoading ? '전송 중…' : '매직링크 받기'}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              비밀번호 없이 이메일 링크 한 번으로 로그인합니다.
            </p>
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
