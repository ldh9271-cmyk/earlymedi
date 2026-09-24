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

  // 안드로이드 앱이 외부 브라우저(커스텀 탭)로 연 OAuth — 여기엔 PKCE code_verifier 쿠키가 없으므로
  // 교환하지 않고 앱을 깨워 code 를 넘긴다. 앱이 WebView 에서 이 콜백을 (app 없이) 다시 열면 교환된다.
  if (url.searchParams.get('app') === '1') {
    const back = new URL('glowuptour://auth-callback');
    if (code) back.searchParams.set('code', code);
    back.searchParams.set('next', next.startsWith('/') && !next.startsWith('//') ? next : '/');
    const err = url.searchParams.get('error_description') ?? url.searchParams.get('error');
    if (err) back.searchParams.set('error', err.slice(0, 300));
    return NextResponse.redirect(back.toString(), 302);
  }

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    // 파트너 QR 귀속 · 파트너 계정 연결 · 가입 출처 스탬프 · 가입 알림(1회) — 자체 구글 콜백과 공통
    if (!error && data.user) await afterSignIn(supabase, data.user, next, request).catch(() => undefined);
    if (error) {
      const redirect = new URL('/login', url.origin);
      redirect.searchParams.set('error', error.message);
      return NextResponse.redirect(redirect);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
