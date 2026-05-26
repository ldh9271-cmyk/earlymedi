'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';

export const dynamic = 'force-dynamic';

/**
 * Password reset landing.
 *
 * The Supabase password-reset email links here via:
 *   https://<proj>.supabase.co/auth/v1/verify?token=pkce_...&type=recovery
 *     &redirect_to=<APP>/api/auth/callback?next=/account/reset-password
 *
 * Two arrival modes:
 *
 *   ✅ Happy path — Supabase verifies the recovery token, redirects to
 *      /api/auth/callback?code=... which exchanges the code for a session
 *      and lands us here. supabase.auth.getUser() returns the user;
 *      submitting the form calls supabase.auth.updateUser({ password }).
 *
 *   ❌ Error path — Supabase fails (link already used [PKCE is single-use],
 *      older than 1 hour, or tampered) and redirects with the error in the
 *      URL HASH: #error=access_denied&error_code=otp_expired&error_description=...
 *      The hash is browser-only; the server callback can't see it, so it
 *      just forwards us here with the hash intact. We parse the hash on
 *      mount and show a "link expired" UI with a one-click "send new link"
 *      button.
 *
 * Wrapped in Suspense because parsing window.location during render is
 * deferred to the client; this avoids a hydration mismatch.
 */
export default function ResetPasswordPage(): JSX.Element {
  return (
    <Suspense fallback={<Centered>로딩 중…</Centered>}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner(): JSX.Element {
  const router = useRouter();
  const [phase, setPhase] = useState<'checking' | 'expired' | 'ready' | 'no_session'>(
    'checking',
  );
  const [errorDetail, setErrorDetail] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ─── Phase detection on mount ───────────────────────────────────
  useEffect(() => {
    // 1. Check URL hash for error markers first — these mean the recovery
    //    link itself failed and there's no session to work with.
    if (typeof window !== 'undefined' && window.location.hash) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const errorCode = params.get('error_code') ?? params.get('error');
      const errorDesc = params.get('error_description');
      if (errorCode) {
        setPhase('expired');
        setErrorDetail(errorDesc ?? errorCode);
        // Strip the hash so a manual refresh doesn't re-trigger the error UI.
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }
    }

    // 2. No hash error → check whether a session was established by the
    //    callback. If yes, the user can change their password. If not,
    //    the link probably expired without leaving an error fragment
    //    (some edge cases) — show "expired" anyway so they can resend.
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setPhase('no_session');
      return;
    }
    void supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        setPhase('no_session');
        return;
      }
      setPhase('ready');
    });
  }, []);

  // ─── Submit new password ─────────────────────────────────────────
  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('두 비밀번호가 일치하지 않습니다.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setFormError('데모 모드 — Supabase가 연결되지 않았습니다.');
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        // Supabase rejects passwords that match the current one with
        // "New password should be different from the old password."
        const msg = error.message.toLowerCase();
        if (msg.includes('different from the old password')) {
          setFormError('새 비밀번호가 기존과 동일합니다. 다른 비밀번호를 입력해 주세요.');
        } else if (msg.includes('weak')) {
          setFormError('비밀번호가 너무 약합니다. 영문 대/소문자 + 숫자 + 기호 조합 12자 이상을 권장합니다.');
        } else {
          setFormError(error.message);
        }
        return;
      }
      toast.success('비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.');
      // Force logout so they re-enter the new password — confirms it works
      // and avoids leaving a stale "old password" session lying around.
      await supabase.auth.signOut();
      router.replace('/login');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '비밀번호 변경 실패');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Re-request reset email ──────────────────────────────────────
  async function onResendReset(email: string): Promise<void> {
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        toast.error('데모 모드 — Supabase가 연결되지 않았습니다.');
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/account/reset-password`,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`${email} 주소로 새 비밀번호 재설정 메일을 보냈습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '메일 발송 실패');
    }
  }

  // ─── Render ──────────────────────────────────────────────────────
  if (phase === 'checking') {
    return <Centered>세션 확인 중…</Centered>;
  }

  if (phase === 'expired' || phase === 'no_session') {
    return <ExpiredCard detail={errorDetail} onResend={onResendReset} />;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
          <KeyRound className="h-5 w-5 text-brand-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">새 비밀번호 설정</h1>
          <p className="text-xs text-muted-foreground">
            영문 대/소문자 + 숫자 조합 12자 이상 권장
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="new-password">새 비밀번호</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="8자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              required
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
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
          <Input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="다시 한 번 입력"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {formError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {formError}
          </div>
        ) : null}

        <Button type="submit" variant="brand" className="w-full" disabled={submitting}>
          {submitting ? '변경 중…' : '비밀번호 변경'}
        </Button>

        <Link
          href="/login"
          className="block text-center text-xs text-muted-foreground hover:text-foreground"
        >
          ← 로그인으로 돌아가기
        </Link>
      </form>
    </div>
  );
}

/**
 * Shown when the recovery link can't be used (otp_expired, single-use
 * already consumed, etc.). Offers a one-click resend.
 */
function ExpiredCard({
  detail,
  onResend,
}: {
  detail: string;
  onResend: (email: string) => Promise<void>;
}): JSX.Element {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  async function handleResend(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!email.includes('@')) return;
    setSending(true);
    try {
      await onResend(email);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
          <ShieldAlert className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">링크가 만료되었습니다</h1>
          <p className="text-xs text-muted-foreground">새 비밀번호 재설정 메일을 받으세요</p>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
        <p className="font-medium">⚠ 이 비밀번호 재설정 링크는 사용할 수 없습니다.</p>
        <p className="mt-1 text-destructive/80">
          이유: 이미 사용된 링크이거나, 발송된 지 1시간이 지나 만료되었습니다.
        </p>
        {detail ? (
          <p className="mt-1 font-mono text-[10px] text-destructive/60">
            상세: {detail}
          </p>
        ) : null}
      </div>

      <form onSubmit={handleResend} className="space-y-3">
        <Label htmlFor="resend-email">이메일</Label>
        <Input
          id="resend-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="가입한 이메일 입력"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" variant="brand" className="w-full" disabled={sending}>
          {sending ? '발송 중…' : '새 재설정 메일 받기'}
        </Button>
      </form>

      <div className="mt-6 space-y-2 text-center text-xs text-muted-foreground">
        <Link href="/login" className="block hover:text-foreground">
          ← 로그인으로 돌아가기
        </Link>
        <p>
          매직링크 로그인이 더 안전합니다 —{' '}
          <Link href="/login" className="underline hover:text-foreground">
            매직링크로 로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" />
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
