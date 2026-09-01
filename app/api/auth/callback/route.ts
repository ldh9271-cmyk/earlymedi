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

      // 가입 출처 스탬프 — 구글 OAuth 는 이메일 가입과 달리 user_metadata
      // 를 우리가 못 채우므로, 콜백의 next 경로로 출처를 판정해 1회
      // 기록한다 (공개 포털 로케일 경로 → 일반 회원, 그 외 → 파트너
      // 센터). 기존 계정도 다음 로그인 때 자동 보정된다.
      const meta = (data.user.user_metadata ?? {}) as { signup_source?: string };
      if (!meta.signup_source) {
        const isPortal = /^\/(kr|en|zh|ja|ru|vi)(\/|$)/.test(next);
        await supabase.auth
          .updateUser({ data: { signup_source: isPortal ? 'patient_portal' : 'partner_center' } })
          .catch(() => null);
      }
    }
    if (error) {
      const redirect = new URL('/login', url.origin);
      redirect.searchParams.set('error', error.message);
      return NextResponse.redirect(redirect);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
