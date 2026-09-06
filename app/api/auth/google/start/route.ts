export const dynamic = 'force-dynamic';

import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/auth/post-signin';

/**
 * 자체 구글 로그인 시작 — 구글 동의 화면에 supabase.co 대신 glowuptour.com 이 보이도록
 * 리다이렉트 URI 를 우리 도메인(/api/auth/google/callback)으로 건다. 콜백에서 id_token 을 받아
 * Supabase signInWithIdToken 으로 세션을 만든다.
 *
 * 필요 env: GOOGLE_OAUTH_CLIENT_ID(+NEXT_PUBLIC_…, 버튼 게이트) · GOOGLE_OAUTH_CLIENT_SECRET.
 * 구글 클라우드 콘솔의 같은 OAuth 클라이언트에 승인된 리디렉션 URI 로
 * https://www.glowuptour.com/api/auth/google/callback 을 추가해야 한다.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || '';
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get('next'));
  if (!clientId) {
    const back = new URL('/login', url.origin);
    back.searchParams.set('error', 'google_oauth_not_configured');
    return NextResponse.redirect(back);
  }
  const state = randomBytes(16).toString('base64url');
  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  auth.searchParams.set('client_id', clientId);
  auth.searchParams.set('redirect_uri', redirectUri);
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('scope', 'openid email profile');
  auth.searchParams.set('state', state);
  auth.searchParams.set('prompt', 'select_account');
  auth.searchParams.set('access_type', 'online');
  const res = NextResponse.redirect(auth);
  const cookie = { httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax' as const, path: '/', maxAge: 600 };
  res.cookies.set('g_oauth_state', state, cookie);
  res.cookies.set('g_oauth_next', next, cookie);
  return res;
}
