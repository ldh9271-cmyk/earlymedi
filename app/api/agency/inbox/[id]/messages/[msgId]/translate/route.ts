export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { messages } from '@/drizzle/schema/messages';
import { translateInboundMessage } from '@/lib/ai/translation';
import { callerFromCtx } from '@/lib/ai/router';

/**
 * Manual translation retry for a single message. Used by the "다시 번역"
 * button on a chat bubble when the auto-translation didn't run (e.g.
 * Gemini key missing at the time of arrival). Surfaces the underlying
 * error message so the operator sees WHY rather than silently swallowing.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string; msgId: string } },
): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  // Early-exit with a concrete error BEFORE we even attempt the AI call,
  // so the toast says exactly what's wrong instead of "응답하지 않습니다".
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      {
        error: 'env_missing',
        message:
          'GOOGLE_GENERATIVE_AI_API_KEY 환경 변수가 Vercel 또는 로컬 .env에 설정되어 있지 않습니다. (Vercel: Settings → Environment Variables → Add New → 키 등록 후 반드시 Redeploy with "Use existing Build Cache" OFF.)',
      },
      { status: 503 },
    );
  }

  return await withRls(access.ctx, async () => {
    const [msg] = await db
      .select({
        id: messages.id,
        body: messages.body,
        bodyLocale: messages.bodyLocale,
        direction: messages.direction,
      })
      .from(messages)
      .where(
        and(
          eq(messages.id, params.msgId),
          eq(messages.conversationId, params.id),
          eq(messages.organizationId, access.ctx.orgId),
        ),
      )
      .limit(1);
    if (!msg) return NextResponse.json({ error: 'message_not_found' }, { status: 404 });
    if (!msg.body || !msg.body.trim()) {
      return NextResponse.json({ error: 'empty_body' }, { status: 400 });
    }

    try {
      const result = await translateInboundMessage(
        callerFromCtx(access.ctx, { entityType: 'message', entityId: msg.id }),
        msg.body,
        msg.bodyLocale ?? undefined,
      );

      if (!result.translationKo && !result.translationEn) {
        // The first attempt swallowed any error. Re-call translateText
        // with throwOnError so the underlying Gemini error surfaces to
        // the operator (model not found / key invalid / quota / etc.).
        const { translateText } = await import('@/lib/ai/translation');
        const target: 'ko' | 'en' = msg.bodyLocale?.startsWith('ko') ? 'en' : 'ko';
        try {
          const direct = await translateText(
            callerFromCtx(access.ctx, { entityType: 'message', entityId: msg.id }),
            msg.body,
            target,
            msg.bodyLocale ?? undefined,
            { throwOnError: true },
          );
          if (!direct) {
            return NextResponse.json(
              {
                error: 'translation_empty',
                message: 'AI가 빈 응답을 반환했습니다. 다시 시도해 주세요.',
              },
              { status: 502 },
            );
          }
          if (target === 'ko') result.translationKo = direct;
          else result.translationEn = direct;
        } catch (innerErr) {
          const detailMessage =
            innerErr instanceof Error ? innerErr.message : 'unknown_error';
          return NextResponse.json(
            {
              error: 'gemini_call_failed',
              message: `Gemini API 호출 실패: ${detailMessage}`,
              hint:
                detailMessage.toLowerCase().includes('model') ||
                detailMessage.toLowerCase().includes('not found')
                  ? 'AI_PRIMARY_MODEL을 gemini-2.0-flash-001 또는 gemini-1.5-flash-latest로 시도해 보세요.'
                  : detailMessage.toLowerCase().includes('api key') ||
                      detailMessage.toLowerCase().includes('unauthorized') ||
                      detailMessage.toLowerCase().includes('401')
                    ? 'GOOGLE_GENERATIVE_AI_API_KEY가 잘못되었거나 만료되었습니다.'
                    : detailMessage.toLowerCase().includes('quota') ||
                        detailMessage.toLowerCase().includes('rate')
                      ? 'Gemini 일일 한도 또는 분당 요청 한도 초과.'
                      : 'Google AI Studio (https://aistudio.google.com/) 에서 키 상태를 확인해 주세요.',
            },
            { status: 502 },
          );
        }
      }

      await db
        .update(messages)
        .set({
          translationKo: result.translationKo ?? null,
          translationEn: result.translationEn ?? null,
          bodyLocale: msg.bodyLocale ?? result.detectedLocale,
        })
        .where(eq(messages.id, msg.id));

      return NextResponse.json({
        data: {
          translationKo: result.translationKo,
          translationEn: result.translationEn,
          detectedLocale: result.detectedLocale,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown_error';
      // eslint-disable-next-line no-console
      console.error('[translate] manual retry failed:', message);
      return NextResponse.json(
        { error: 'translation_failed', message },
        { status: 500 },
      );
    }
  });
}
