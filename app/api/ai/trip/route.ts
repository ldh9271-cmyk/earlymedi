import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { aiTripPlans } from '@/drizzle/schema/ai-trip-plans';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { buildTripGrounding, buildTripSystem, detectTripType, streamGeminiText, type TripMsg } from '@/lib/ai/trip-planner';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * AI 여행하기 — 대화를 받아 일정을 SSE 로 스트리밍하고, 끝나면 ai_trip_plans 에 저장한다.
 *  data: {delta} … data: {done:true, planId}  /  data: {error}
 *  planId 를 다시 보내면 같은 행을 갱신 (회원가입 뒤 이메일 발송이 이 id 로 이어진다).
 */
const Body = z.object({
  locale: z.string(),
  planId: z.string().uuid().optional(),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) })).min(1).max(24),
});

const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(req: Request): Promise<NextResponse> {
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }
  const locale: PublicLocale = isPublicLocale(body.locale) ? (body.locale as PublicLocale) : 'kr';
  const messages: TripMsg[] = body.messages;
  const system = buildTripSystem(locale, await buildTripGrounding(locale));
  const tripType = detectTripType(messages.filter((m) => m.role === 'user').map((m) => m.content).join(' '));

  const encoder = new TextEncoder();
  const rs = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown): void => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      let full = '';
      try {
        for await (const chunk of streamGeminiText(system, messages)) { full += chunk; send({ delta: chunk }); }
      } catch { /* 아래에서 빈 응답 처리 */ }
      if (!full) { send({ error: 'ai_unavailable' }); controller.close(); return; }
      // 저장 (실패해도 답변은 이미 전달됨)
      let planId: string | null = body.planId && UUID.test(body.planId) ? body.planId : null;
      try {
        const all: TripMsg[] = [...messages, { role: 'assistant', content: full }];
        if (planId) {
          const r = await db.update(aiTripPlans).set({ messages: all, planMd: full, tripType: tripType ?? undefined, updatedAt: new Date() }).where(eq(aiTripPlans.id, planId)).returning({ id: aiTripPlans.id });
          if (r.length === 0) planId = null;
        }
        if (!planId) {
          const [row] = await db.insert(aiTripPlans).values({ locale, messages: all, planMd: full, tripType }).returning({ id: aiTripPlans.id });
          planId = row?.id ?? null;
        }
      } catch { /* 저장 실패는 무시 */ }
      send({ done: true, planId });
      controller.close();
    },
  });
  return new NextResponse(rs, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' } });
}
