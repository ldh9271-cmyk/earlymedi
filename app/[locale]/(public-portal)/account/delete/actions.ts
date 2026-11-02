'use server';

import 'server-only';
import { and, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/auth/supabase-server';
import { db } from '@/lib/db/client';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { pushTokens } from '@/drizzle/schema/push-tokens';
import { aiFaceAnalyses } from '@/drizzle/schema/ai-face-analyses';
import { aiTripPlans } from '@/drizzle/schema/ai-trip-plans';
import { chatRooms } from '@/drizzle/schema/chat';
import { referralAttributions, referralPartners } from '@/drizzle/schema/referral-program';
import { conversations } from '@/drizzle/schema/conversations';
import { messages } from '@/drizzle/schema/messages';
import { users } from '@/drizzle/schema/users';
import { sendAdminTelegram } from '@/lib/notify/admin-alert';

/**
 * 계정 삭제 — 회원이 직접, 즉시 (App Store 5.1.1(v) · Google Play 계정 삭제 정책).
 *
 * 2026-11-03 이전에는 '삭제 요청'만 받아 운영자가 30일 안에 처리했는데, 애플 심사(1.3.0)에서
 * "앱 안에서 삭제를 시작할 수 있어야 한다"는 거절을 받아 즉시 삭제로 바꿨다.
 *
 * 순서:
 *  1) 사업자 콘솔 조직(의료기관·파트너)에 속한 계정은 셀프 삭제 대상이 아니다 → 안내
 *  2) 결제·확정된 예약이 오늘 이후에 남아 있으면 먼저 취소/이용 완료 → 안내 (확인 단계)
 *  3) 개인정보 삭제·익명화 — 푸시 토큰, AI 얼굴 분석 결과, AI 여행 플랜, 채팅방(+메시지), 추천 귀속,
 *     문의 대화(연락처·본문 익명화), public.users 행. 결제·예약 기록은 법정 보관(개인정보처리방침 4조)이라 남긴다.
 *  4) Supabase auth 사용자 삭제(소셜 연동 포함) → 세션 종료
 */
export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: 'login_required' | 'business_account' | 'active_bookings' | 'failed'; count?: number };

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

export async function deleteAccountAction(): Promise<DeleteAccountResult> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { ok: false, error: 'login_required' };
  const uid = user.id;
  const email = user.email ?? null;
  const phone = user.phone ?? null;

  // 1) 사업자 계정 — 조직 자산(병원 정보·정산)이 묶여 있어 운영자가 처리한다
  const [member] = await db
    .select({ id: orgMemberships.id })
    .from(orgMemberships)
    .where(and(eq(orgMemberships.userId, uid), eq(orgMemberships.status, 'active')))
    .limit(1);
  if (member) return { ok: false, error: 'business_account' };

  // 2) 진행 중 예약(결제·확정, 오늘 이후) — 취소/이용 완료 뒤에 삭제
  const today = kstToday();
  const active = await db
    .select({ id: checkoutOrders.id })
    .from(checkoutOrders)
    .where(and(
      eq(checkoutOrders.userId, uid),
      inArray(checkoutOrders.status, ['paid', 'reported']),
      gte(checkoutOrders.reserveDate, today),
    ));
  if (active.length > 0) return { ok: false, error: 'active_bookings', count: active.length };

  // 3) 개인정보 삭제·익명화 — 한 단계가 실패해도 나머지는 계속하고 마지막 auth 삭제로 판정한다
  const steps: Array<[string, () => Promise<unknown>]> = [
    ['issued_orders', () => db.update(checkoutOrders).set({ status: 'cancelled' })
      .where(and(eq(checkoutOrders.userId, uid), eq(checkoutOrders.status, 'issued'), gte(checkoutOrders.reserveDate, today)))],
    ['push_tokens', () => db.delete(pushTokens).where(eq(pushTokens.userId, uid))],
    ['ai_face_analyses', () => db.delete(aiFaceAnalyses)
      .where(email ? or(eq(aiFaceAnalyses.userId, uid), eq(aiFaceAnalyses.email, email)) : eq(aiFaceAnalyses.userId, uid))],
    ['ai_trip_plans', () => db.delete(aiTripPlans)
      .where(email ? or(eq(aiTripPlans.userId, uid), eq(aiTripPlans.email, email)) : eq(aiTripPlans.userId, uid))],
    ['chat_rooms', () => db.delete(chatRooms).where(eq(chatRooms.userId, uid))],
    ['referral_attributions', () => db.delete(referralAttributions).where(eq(referralAttributions.userId, uid))],
    ['referral_partners', () => db.update(referralPartners).set({ userId: null, userEmail: null }).where(eq(referralPartners.userId, uid))],
    ['conversations', async () => {
      const contacts = [email, phone].filter((v): v is string => Boolean(v));
      if (contacts.length === 0) return;
      const rows = await db.select({ id: conversations.id }).from(conversations).where(inArray(conversations.contactExternalId, contacts));
      if (rows.length === 0) return;
      const ids = rows.map((r) => r.id);
      await db.update(messages)
        .set({
          body: '[회원 탈퇴로 삭제된 내용 / Removed at account deletion]',
          metadata: sql`coalesce(${messages.metadata}, '{}'::jsonb) - 'contact' - 'name' - 'birthDate' - 'email' - 'phone'`,
        })
        .where(and(inArray(messages.conversationId, ids), eq(messages.direction, 'inbound')));
      await db.update(conversations)
        .set({ contactDisplayName: '탈퇴 회원', contactExternalId: null, contactAvatarUrl: null })
        .where(inArray(conversations.id, ids));
    }],
    ['users', async () => {
      try {
        await db.delete(users).where(eq(users.id, uid));
      } catch {
        await db.update(users)
          .set({ email: `deleted-${uid}@deleted.invalid`, fullName: null, phone: null, avatarUrl: null })
          .where(eq(users.id, uid));
      }
    }],
  ];
  const failed: string[] = [];
  for (const [name, run] of steps) {
    try { await run(); } catch (err) { failed.push(`${name}: ${err instanceof Error ? err.message : String(err)}`); }
  }

  // 4) 인증 사용자 삭제 — 여기서 실패하면 삭제 실패로 본다
  const svc = createSupabaseServiceClient();
  const { error } = await svc.auth.admin.deleteUser(uid);
  if (error) {
    console.error('[account-delete] auth delete failed', uid, error.message, failed);
    return { ok: false, error: 'failed' };
  }
  await supabase.auth.signOut().catch(() => undefined);

  const masked = email ? `${email.slice(0, 2)}***@${email.split('@')[1] ?? ''}` : '(이메일 없음)';
  await sendAdminTelegram(
    `🗑️ <b>회원 탈퇴(즉시 삭제)</b>\n${masked} · ${uid.slice(0, 8)}…${failed.length ? `\n⚠️ 부분 실패: ${failed.join(' | ')}` : ''}`,
  ).catch(() => undefined);
  if (failed.length) console.error('[account-delete] partial cleanup failures', uid, failed);
  return { ok: true };
}
