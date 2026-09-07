export const dynamic = 'force-dynamic';

import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/auth/post-signin';
import { LINE_AUTH_BASE, lineConfig } from '@/lib/auth/line';

/** 라인 로그인 시작 — state·nonce 를 쿠키에 심고 라인 동의 화면으로 보낸다. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get('next'), '/kr');
  const cfg = lineConfig();
  if (!cfg) {
    const back = new URL('/kr/login', url.origin);
    back.searchParams.set('error', 'line_not_configured');
    return NextResponse.redirect(back);
  }
  const state = randomBytes(16).toString('base64url');
  const nonce = randomBytes(16).toString('base64url');
  const auth = new URL(LINE_AUTH_BASE);
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('client_id', cfg.channelId);
  auth.searchParams.set('redirect_uri', `${url.origin}/api/auth/line/callback`);
  auth.searchParams.set('state', state);
  auth.searchParams.set('scope', 'openid profile email');
  auth.searchParams.set('nonce', nonce);
  const res = NextResponse.redirect(auth);
  const cookie = { httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax' as const, path: '/', maxAge: 600 };
  res.cookies.set('line_state', state, cookie);
  res.cookies.set('line_nonce', nonce, cookie);
  res.cookies.set('line_next', next, cookie);
  return res;
}
