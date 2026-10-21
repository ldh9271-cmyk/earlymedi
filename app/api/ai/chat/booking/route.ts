export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { BookingDraftSchema } from '@/lib/ai/booking/draft';
import { submitPublicInquiryAction } from '@/app/[locale]/(public-portal)/inquiry/actions';

/**
 * AI 상담 → 진료 예약 요청 전송 (2026-10-21).
 * 상담 답변의 예약 카드에서 '예약 요청 보내기'를 누르면 호출된다. 회원만(문의 폼 예약 모드와 같은 규칙),
 * 기존 문의 폼 서버 액션(submitPublicInquiryAction)을 그대로 써서 인박스 대화·hospital_visit 무료 주문·
 * 텔레그램 알림·마이페이지·마스터 확정·QR 흐름에 똑같이 태운다. 메모 끝에 상담 대화 요약을 붙인다.
 */
const Body = z.object({
  locale: z.enum(['kr', 'en', 'zh', 'ja', 'ru', 'vi']),
  draft: BookingDraftSchema.extend({ hospitalId: z.string().uuid(), hospitalName: z.string().min(1).max(200) }),
  transcript: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) })).max(12).optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, error: 'login_required' }, { status: 401 });

  const d = body.draft;
  const [h] = await db
    .select({ id: hospitals.id, name: hospitals.name })
    .from(hospitals)
    .where(and(eq(hospitals.id, d.hospitalId), eq(hospitals.isActiveForMatching, true)))
    .limit(1);
  if (!h) return NextResponse.json({ ok: false, error: 'hospital_not_found' }, { status: 400 });

  const transcript = (body.transcript ?? [])
    .slice(-8)
    .map((m) => `${m.role === 'user' ? '고객' : 'AI'}: ${m.content.replace(/\s+/g, ' ').slice(0, 300)}`)
    .join('\n');
  const memo = `${d.memo || '(AI 상담에서 들어온 진료 예약 요청)'}\n\n[AI 상담 예약 요청]${transcript ? `\n${transcript}` : ''}`.slice(0, 4000);

  const r = await submitPublicInquiryAction({
    locale: body.locale,
    hospitalId: h.id,
    hospitalName: h.name,
    name: d.name,
    countryCode: d.countryCode,
    contact: d.email || d.phone,
    birthDate: d.birthDate,
    interests: [],
    memo,
    gender: d.gender,
    phone: d.phone,
    messengerType: d.messengerType,
    messengerId: d.messengerId,
    email: d.email || null,
    visitYmd: d.visitYmd,
    visitTime: d.visitTime,
  });
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, invoiceNo: r.invoiceNo ?? null, conversationId: r.conversationId });
}
