import 'server-only';
import type { NextRequest } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { attributeUser, claimPartnerByEmail, REF_COOKIE } from '@/lib/referral/service';
import { notifySignupEvent } from '@/lib/notify/admin-alert';

/**
 * 로그인 확정 직후 공통 처리 — 총판 QR 귀속, 총판 계정 자동 연결, 가입 출처 스탬프, 가입 알림(1회).
 * Supabase OAuth 콜백(/api/auth/callback)과 자체 구글 OAuth 콜백(/api/auth/google/callback) 이 함께 쓴다.
 */
export async function afterSignIn(supabase: SupabaseClient, user: User, next: string, request: NextRequest): Promise<void> {
  const refCode = request.cookies.get(REF_COOKIE)?.value;
  const refPartner = refCode ? await attributeUser(user.id, refCode, 'oauth').catch(() => null) : null;
  if (user.email) await claimPartnerByEmail(user.id, user.email).catch(() => 0);

  const meta = (user.user_metadata ?? {}) as { signup_source?: string; signup_notified?: boolean; full_name?: string };
  const isPortal = /^\/(kr|en|zh|ja|ru|vi)(\/|$)/.test(next);
  const isNewUser = Date.now() - Date.parse(user.created_at) < 60 * 60_000;
  const shouldNotify = isNewUser && !meta.signup_notified;
  const patch: Record<string, unknown> = {};
  if (!meta.signup_source) patch.signup_source = isPortal ? 'patient_portal' : 'partner_center';
  if (shouldNotify) patch.signup_notified = true;
  if (Object.keys(patch).length > 0) await supabase.auth.updateUser({ data: patch }).catch(() => null);
  if (shouldNotify) {
    const source = (patch.signup_source as string | undefined) ?? meta.signup_source;
    await notifySignupEvent({
      email: user.email ?? '(이메일 없음)',
      name: meta.full_name ?? null,
      kind: source === 'partner_center' ? 'biz' : 'general',
      refLabel: refPartner ? `${refPartner.name} (${refPartner.code})` : null,
    }).catch(() => false);
  }
}

/** 오픈 리다이렉트 방지 — 사이트 내부 경로만 허용 */
export function safeNext(next: string | null | undefined, fallback = '/select-org'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('://')) return fallback;
  return next;
}
