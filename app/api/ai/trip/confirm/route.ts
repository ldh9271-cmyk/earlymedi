import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { aiTripPlans } from '@/drizzle/schema/ai-trip-plans';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { submitPublicInquiryAction } from '@/app/[locale]/(public-portal)/inquiry/actions';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { sendAdminTelegram } from '@/lib/notify/admin-alert';
import { TRIP_TYPE_KO } from '@/lib/ai/trip-workflow';

export const dynamic = 'force-dynamic';

/**
 * 일정 확정 + 플랫폼 도움 여부.
 *  step 'confirm'  : 회원이 이 일정으로 확정 (draft → confirmed). 로그인 필수, 일정을 계정에 귀속.
 *  step 'help'     : wantHelp=true → help_requested(연락처·출발일 저장, 인박스 리드 + 운영자 알림)
 *                    wantHelp=false → help_declined
 */
const Body = z.object({
  planId: z.string().uuid(),
  locale: z.string(),
  step: z.enum(['confirm', 'help']),
  wantHelp: z.boolean().optional(),
  contact: z.object({ name: z.string().max(80).optional(), phone: z.string().max(40).optional(), messenger: z.string().max(100).optional() }).optional(),
  startYmd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.glowuptour.com';

export async function POST(req: Request): Promise<NextResponse> {
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }
  const locale: PublicLocale = isPublicLocale(body.locale) ? (body.locale as PublicLocale) : 'kr';

  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user?.email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const [plan] = await db.select().from(aiTripPlans).where(eq(aiTripPlans.id, body.planId)).limit(1);
  if (!plan || !plan.planMd) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (plan.userId && plan.userId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (plan.status === 'paid' || plan.status === 'quoted') return NextResponse.json({ ok: true, status: plan.status });

  if (body.step === 'confirm') {
    await db.update(aiTripPlans).set({ status: 'confirmed', confirmedAt: new Date(), userId: user.id, email: user.email, updatedAt: new Date() }).where(eq(aiTripPlans.id, plan.id));
    return NextResponse.json({ ok: true, status: 'confirmed' });
  }

  // step === 'help'
  if (!body.wantHelp) {
    await db.update(aiTripPlans).set({ status: 'help_declined', userId: user.id, email: user.email, updatedAt: new Date() }).where(eq(aiTripPlans.id, plan.id));
    return NextResponse.json({ ok: true, status: 'help_declined' });
  }
  const contact = { name: body.contact?.name?.trim() || undefined, phone: body.contact?.phone?.trim() || undefined, messenger: body.contact?.messenger?.trim() || undefined };
  const startYmd = body.startYmd || null;
  await db.update(aiTripPlans).set({
    status: 'help_requested', helpRequestedAt: new Date(), contact, startYmd, userId: user.id, email: user.email, updatedAt: new Date(),
  }).where(eq(aiTripPlans.id, plan.id));

  // 에이전시 인박스 리드 + 운영자 텔레그램 — 컨시어지가 검증·견적을 시작한다
  const typeKo = TRIP_TYPE_KO[plan.tripType ?? ''] ?? '여행';
  const memo = `[AI 여행 일정 도움 요청] ${typeKo}\n이메일: ${user.email}\n출발 희망일: ${startYmd ?? '(미정)'}\n연락처: ${[contact.phone, contact.messenger].filter(Boolean).join(' · ') || '(미입력)'}\n검증·견적: ${SITE_URL}/master/ai-trips?plan=${plan.id}\n\n--- 확정 일정 ---\n${(plan.planMd ?? '').slice(0, 3000)}`;
  await submitPublicInquiryAction({
    locale, hospitalId: null, hospitalName: null,
    name: contact.name || user.email.split('@')[0] || 'guest', countryCode: 'KR',
    contact: contact.phone || contact.messenger || user.email, birthDate: null,
    interests: ['ai_trip'], memo,
  }).catch(() => null);
  await sendAdminTelegram(`<b>🧭 AI 여행 일정 검증·견적 요청</b>\n${typeKo} · ${user.email}\n출발: ${startYmd ?? '미정'} · 연락처: ${[contact.phone, contact.messenger].filter(Boolean).join(' · ') || '미입력'}\n${SITE_URL}/master/ai-trips?plan=${plan.id}`).catch(() => false);
  return NextResponse.json({ ok: true, status: 'help_requested' });
}
