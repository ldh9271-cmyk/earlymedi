export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { attributeUser, REF_COOKIE } from '@/lib/referral/service';

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
    // 총판 QR 쿠키를 가진 계정이면 로그인 확정 시점에 귀속 (최초 접촉 우선)
    if (!error && data.user) {
      const refCode = request.cookies.get(REF_COOKIE)?.value;
      if (refCode) await attributeUser(data.user.id, refCode, 'oauth').catch(() => null);
    }
    if (error) {
      const redirect = new URL('/login', url.origin);
      redirect.searchParams.set('error', error.message);
      return NextResponse.redirect(redirect);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
