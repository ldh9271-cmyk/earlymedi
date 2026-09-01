export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { attributeUser, REF_COOKIE } from '@/lib/referral/service';
import { notifySignupEvent } from '@/lib/notify/admin-alert';

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
      const refPartner = refCode
        ? await attributeUser(data.user.id, refCode, 'oauth').catch(() => null)
        : null;

      // 가입 출처 스탬프 — 구글 OAuth 는 이메일 가입과 달리 user_metadata
      // 를 우리가 못 채우므로, 콜백의 next 경로로 출처를 판정해 1회
      // 기록한다 (공개 포털 로케일 경로 → 일반 회원, 그 외 → 파트너
      // 센터). 기존 계정도 다음 로그인 때 자동 보정된다.
      const meta = (data.user.user_metadata ?? {}) as {
        signup_source?: string;
        signup_notified?: boolean;
        full_name?: string;
      };
      const isPortal = /^\/(kr|en|zh|ja|ru|vi)(\/|$)/.test(next);
      // 가입 알림 — 이메일 인증·OAuth 모두 이 콜백을 지나므로 여기서
      // 1회만 보낸다 (created_at 1시간 이내 + 미발송 플래그 기준).
      const isNewUser = Date.now() - Date.parse(data.user.created_at) < 60 * 60_000;
      const shouldNotify = isNewUser && !meta.signup_notified;
      const patch: Record<string, unknown> = {};
      if (!meta.signup_source) {
        patch.signup_source = isPortal ? 'patient_portal' : 'partner_center';
      }
      if (shouldNotify) patch.signup_notified = true;
      if (Object.keys(patch).length > 0) {
        await supabase.auth.updateUser({ data: patch }).catch(() => null);
      }
      if (shouldNotify) {
        const source = (patch.signup_source as string | undefined) ?? meta.signup_source;
        await notifySignupEvent({
          email: data.user.email ?? '(이메일 없음)',
          name: meta.full_name ?? null,
          kind: source === 'partner_center' ? 'biz' : 'general',
          refLabel: refPartner ? `${refPartner.name} (${refPartner.code})` : null,
        }).catch(() => false);
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
