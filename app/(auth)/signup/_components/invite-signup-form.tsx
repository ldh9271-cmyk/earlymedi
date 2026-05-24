'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';

const schema = z
  .object({
    email: z.string().email('유효한 이메일을 입력해 주세요'),
    password: z.string().min(8, '비밀번호는 8자 이상').max(128),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    path: ['passwordConfirm'],
    message: '비밀번호가 일치하지 않습니다',
  });

type FormValues = z.infer<typeof schema>;

/**
 * Slim signup form used on the invite-acceptance path. Only collects
 * what's needed for auth (email + password); the user does NOT need to
 * fill out org info because they're joining an EXISTING organization.
 *
 * On success:
 *   1. supabase.auth.signUp creates the auth user
 *   2. brief delay for session cookies to land
 *   3. router.replace(`/invite/{token}`) → invite acceptance page → on
 *      "Accept" the acceptTeamInviteAction wires up the membership.
 */
export function InviteSignupForm({
  invitedEmail,
  orgName,
  token,
}: {
  invitedEmail: string;
  orgName: string;
  token: string;
}): JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: invitedEmail },
  });

  async function onGoogleSignIn(): Promise<void> {
    setServerError(null);
    setGoogleLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setServerError('Supabase가 연결되지 않았습니다.');
        return;
      }
      const redirectTo = new URL('/api/auth/callback', window.location.origin);
      redirectTo.searchParams.set('next', `/invite/${token}`);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo.toString(),
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (oauthError) setServerError(oauthError.message);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Google 로그인 실패');
    } finally {
      setGoogleLoading(false);
    }
  }

  function onSubmit(values: FormValues): void {
    setServerError(null);
    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        if (!supabase) {
          setServerError('Supabase가 연결되지 않았습니다.');
          return;
        }
        const { error: signUpErr } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(`/invite/${token}`)}`,
          },
        });
        if (signUpErr) {
          const msg = signUpErr.message.toLowerCase();
          if (msg.includes('already registered') || msg.includes('user already exists')) {
            setServerError(
              `${values.email}은 이미 가입된 계정입니다. 우측 하단 "로그인하고 합류" 링크를 이용해 주세요.`,
            );
          } else if (msg.includes('weak') || msg.includes('password')) {
            setServerError('비밀번호가 너무 약합니다. 8자 이상, 영문+숫자 조합 권장.');
          } else {
            setServerError(signUpErr.message);
          }
          return;
        }
        // Wait for session cookie to land
        await new Promise((r) => setTimeout(r, 300));
        toast.success(`${orgName}에 합류 준비 완료 — 초대를 수락하세요.`);
        router.replace(`/invite/${token}`);
      } catch (err) {
        setServerError(err instanceof Error ? err.message : '가입 중 오류가 발생했습니다.');
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Google OAuth — quickest path for an invitee */}
      <button
        type="button"
        onClick={onGoogleSignIn}
        disabled={googleLoading || isPending}
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
      >
        <GoogleIcon className="h-4 w-4" />
        {googleLoading ? 'Google로 이동 중…' : 'Google로 가입하고 합류'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            또는 이메일·비밀번호
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">이메일</Label>
          <Input
            id="invite-email"
            type="email"
            autoComplete="email"
            {...register('email')}
          />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invite-password">비밀번호</Label>
          <div className="relative">
            <Input
              id="invite-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="8자 이상"
              className="pr-10"
              {...register('password')}
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
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invite-password-confirm">비밀번호 확인</Label>
          <Input
            id="invite-password-confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="다시 한 번"
            {...register('passwordConfirm')}
          />
          {errors.passwordConfirm ? (
            <p className="text-xs text-destructive">{errors.passwordConfirm.message}</p>
          ) : null}
        </div>

        {serverError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {serverError}
          </div>
        ) : null}

        <Button
          type="submit"
          variant="brand"
          className="w-full"
          disabled={isPending || googleLoading}
        >
          {isPending ? '가입 중…' : `${orgName}에 합류 →`}
        </Button>

        <p className="text-center text-[11px] text-muted-foreground">
          가입 시 이용약관 · 개인정보처리방침에 동의합니다.
        </p>
      </form>
    </div>
  );
}

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
