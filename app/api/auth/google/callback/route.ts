export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { afterSignIn, safeNext } from '@/lib/auth/post-signin';

/** 구글 인가 코드 → id_token 교환 → Supabase 세션 (signInWithIdToken) → next 로 이동. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const next = safeNext(request.cookies.get('g_oauth_next')?.value);
  const fail = (msg: string): NextResponse => {
    const back = new URL(/^\/(kr|en|zh|ja|ru|vi)(\/|$)/.test(next) ? `${next.split('/').slice(0, 2).join('/')}/login` : '/login', url.origin);
    back.searchParams.set('error', msg);
    back.searchParams.set('next', next);
    const r = NextResponse.redirect(back);
    r.cookies.delete('g_oauth_state'); r.cookies.delete('g_oauth_next');
    return r;
  };
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = request.cookies.get('g_oauth_state')?.value;
  if (url.searchParams.get('error')) return fail(url.searchParams.get('error') ?? 'google_error');
  if (!code || !state || !expected || state !== expected) return fail('invalid_state');

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) return fail('google_oauth_not_configured');

  let idToken = '';
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: `${url.origin}/api/auth/google/callback`, grant_type: 'authorization_code' }),
      cache: 'no-store',
    });
    const j = (await res.json()) as { id_token?: string; error?: string; error_description?: string };
    if (!res.ok || !j.id_token) return fail(j.error_description || j.error || 'token_exchange_failed');
    idToken = j.id_token;
  } catch {
    return fail('token_exchange_failed');
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error || !data.user) return fail(error?.message ?? 'signin_failed');
  await afterSignIn(supabase, data.user, next, request).catch(() => undefined);

  const r = NextResponse.redirect(new URL(next, url.origin));
  r.cookies.delete('g_oauth_state'); r.cookies.delete('g_oauth_next');
  return r;
}
