export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { afterSignIn, safeNext } from '@/lib/auth/post-signin';
import { exchangeLineCode, lineUserOtp } from '@/lib/auth/line';

/** 라인 인가 코드 → id_token 검증 → Supabase 사용자 조회·생성 → 세션 쿠키 → next 로 이동. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const next = safeNext(request.cookies.get('line_next')?.value, '/kr');
  const clear = (res: NextResponse): NextResponse => {
    res.cookies.delete('line_state'); res.cookies.delete('line_nonce'); res.cookies.delete('line_next');
    return res;
  };
  const fail = (msg: string): NextResponse => {
    const locale = /^\/(kr|en|zh|ja|ru|vi)(\/|$)/.exec(next)?.[1] ?? 'kr';
    const back = new URL(`/${locale}/login`, url.origin);
    back.searchParams.set('error', msg);
    back.searchParams.set('next', next);
    return clear(NextResponse.redirect(back));
  };

  if (url.searchParams.get('error')) return fail(url.searchParams.get('error_description') || url.searchParams.get('error') || 'line_error');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = request.cookies.get('line_state')?.value;
  const nonce = request.cookies.get('line_nonce')?.value ?? '';
  if (!code || !state || !expected || state !== expected) return fail('invalid_state');

  const r = await exchangeLineCode(code, `${url.origin}/api/auth/line/callback`, nonce);
  if (!r.ok) return fail(r.error);
  if (!r.profile.email) {
    // 라인 채널에 이메일 권한이 없거나 사용자가 이메일 없는 계정인 경우
    return fail('line_email_required');
  }

  const otpRes = await lineUserOtp({ ...r.profile, email: r.profile.email });
  if (!otpRes.ok) return fail(otpRes.error);

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ email: r.profile.email, token: otpRes.otp, type: 'email' });
  if (error || !data.user) return fail(error?.message ?? 'signin_failed');
  await afterSignIn(supabase, data.user, next, request).catch(() => undefined);

  return clear(NextResponse.redirect(new URL(next, url.origin)));
}
