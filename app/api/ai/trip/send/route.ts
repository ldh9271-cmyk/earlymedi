import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { aiTripPlans } from '@/drizzle/schema/ai-trip-plans';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { buildTripEmailHtml, sendTripEmail } from '@/lib/ai/trip-planner';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * 저장된 AI 여행 일정을 로그인한 회원의 이메일로 보낸다.
 *  - 로그인 필수 (회원가입 유도 흐름의 마지막 단계). 계정 이메일로만 발송해 타인 이메일 스팸을 막는다.
 *  - 다른 회원이 소유한 일정은 거부. 비회원 상태로 만든 일정은 첫 발송 시 이 회원에게 귀속.
 */
const Body = z.object({ planId: z.string().uuid(), locale: z.string() });

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

  const dict = await getDictionary(locale);
  const t = dict.ai.trip;
  const html = buildTripEmailHtml(plan.planMd, { title: t.title, emailIntro: t.emailIntro, disclaimer: t.disclaimer }, locale);
  const emailed = await sendTripEmail(user.email, t.emailSubject, html);
  await db.update(aiTripPlans).set({ userId: user.id, email: user.email, emailedAt: emailed ? new Date() : plan.emailedAt, updatedAt: new Date() }).where(eq(aiTripPlans.id, plan.id));
  return NextResponse.json({ ok: emailed, email: user.email, reason: emailed ? undefined : (process.env.RESEND_API_KEY ? 'send_failed' : 'no_mailer') });
}
