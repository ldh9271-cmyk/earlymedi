export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { afterSignIn } from '@/lib/auth/post-signin';

/**
 * OAuth / magic-link landing endpoint. Exchanges the auth code for a session,
 * then redirects to ?next= (or /select-org).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/select-org';

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    // 총판 QR 귀속 · 총판 계정 연결 · 가입 출처 스탬프 · 가입 알림(1회) — 자체 구글 콜백과 공통
    if (!error && data.user) await afterSignIn(supabase, data.user, next, request).catch(() => undefined);
    if (error) {
      const redirect = new URL('/login', url.origin);
      redirect.searchParams.set('error', error.message);
      return NextResponse.redirect(redirect);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
