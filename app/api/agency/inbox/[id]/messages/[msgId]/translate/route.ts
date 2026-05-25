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
          const lower = detailMessage.toLowerCase();

          // If the error mentions Anthropic, it means Gemini already
          // failed AND the router tried Claude as fallback — but Claude
          // has no key. The ROOT cause is whatever made Gemini fail; the
          // Anthropic part is just downstream noise. Re-frame for the user.
          const isAnthropicNoise =
            lower.includes('anthropic') && lower.includes('api key');

          let hint: string;
          if (isAnthropicNoise) {
            hint =
              'Gemini 호출 자체가 실패해 Claude 폴백을 시도했지만 ANTHROPIC_API_KEY도 없습니다. ① Google Cloud Console에서 EarlyMedi 프로젝트의 "Generative Language API"가 활성화되어 있는지 확인 (console.cloud.google.com/apis/library/generativelanguage.googleapis.com). ② aistudio.google.com/api-keys 에서 "+ API 키 만들기"로 키를 다시 발급해 새 키로 교체. ③ Vercel Redeploy (캐시 OFF).';
          } else if (
            lower.includes('no longer available') ||
            lower.includes('deprecated')
          ) {
            hint =
              '이 모델은 신규 사용자에게 제공이 중단되었습니다. AI_PRIMARY_MODEL을 gemini-2.5-flash (또는 gemini-2.0-flash) 로 설정해 보세요. 코드 기본값이 이미 변경되어 있다면 Vercel을 Build Cache OFF로 재배포해 주세요.';
          } else if (lower.includes('model') || lower.includes('not found')) {
            hint = 'AI_PRIMARY_MODEL을 gemini-2.5-flash 또는 gemini-1.5-flash-latest로 시도해 보세요.';
          } else if (
            lower.includes('api key') ||
            lower.includes('unauthorized') ||
            lower.includes('401') ||
            lower.includes('permission')
          ) {
            hint =
              'GOOGLE_GENERATIVE_AI_API_KEY가 잘못되었거나 Generative Language API가 비활성화되어 있을 수 있습니다.';
          } else if (lower.includes('quota') || lower.includes('rate') || lower.includes('429')) {
            hint = 'Gemini 일일/분당 요청 한도 초과. 1-2분 후 다시 시도해 주세요.';
          } else {
            hint =
              'Google AI Studio (aistudio.google.com) 에서 키 상태를 확인하고, Generative Language API 활성화 여부도 확인해 주세요.';
          }

          return NextResponse.json(
            {
              error: 'gemini_call_failed',
              message: `AI 번역 실패: ${detailMessage}`,
              hint,
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
