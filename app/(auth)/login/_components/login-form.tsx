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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit({ email }: FormValues): Promise<void> {
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
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
      <Button type="submit" variant="brand" className="w-full" disabled={loading}>
        {loading ? '전송 중…' : '매직링크 받기'}
      </Button>
    </form>
  );
}
