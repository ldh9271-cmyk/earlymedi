export const dynamic = 'force-dynamic';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { conversations } from '@/drizzle/schema/conversations';
import { channels } from '@/drizzle/schema/channels';
import { messages, glossaryTerms } from '@/drizzle/schema/messages';
import { aiChat, callerFromCtx } from '@/lib/ai/router';
import { buildReplyMessages } from '@/lib/ai/prompts/concierge-reply';
import type { ChannelKind } from '@/lib/channels/types';

export const runtime = 'nodejs';

const Query = z.object({
  // Output locale for all suggestions — always agent's working language
  // (Korean by default). The composer then runs translateBeforeSend to
  // ship the actual outbound message in the patient's language.
  outputLocale: z.string().default('ko'),
});

/**
 * GET /api/agency/inbox/{id}/suggested-replies
 *
 * Returns two on-tone reply suggestions for the active conversation —
 * friendly (warm conversational) + detailed (itemized info-dense). The
 * pair was picked after the agent saw the full content of all five
 * tones and realized 친절+상세 cover ~90% of medical-tourism inquiries:
 * one for chit-chat / reassurance, one for quote / schedule / 준비물.
 *
 * 간결/공감/프리미엄 톤은 ReplyTone 타입과 프롬프트에 남겨두었습니다
 * (필요하면 이 배열에 추가해 즉시 부활 가능).
 *
 * Each suggestion is a separate parallel AI call; total latency stays
 * well under 2s thanks to Promise.allSettled fan-out + only 2 calls.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency', 'medical'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const url = new URL(request.url);
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_query', issues: parsed.error.issues }, { status: 400 });
  }

  const ctxData = await withRls(access.ctx, async () => {
    const [conv] = await db
      .select({
        id: conversations.id,
        channelKind: channels.kind,
        contactDisplayName: conversations.contactDisplayName,
        contactCountryCode: conversations.contactCountryCode,
        contactLocale: conversations.contactLocale,
        aiIntentClass: conversations.aiIntentClass,
      })
      .from(conversations)
      .innerJoin(channels, eq(conversations.channelId, channels.id))
      .where(
        and(eq(conversations.id, params.id), eq(conversations.organizationId, access.ctx.orgId)),
      )
      .limit(1);
    if (!conv) return null;

    const recent = await db
      .select({
        direction: messages.direction,
        body: messages.body,
        bodyLocale: messages.bodyLocale,
        translationKo: messages.translationKo,
      })
      .from(messages)
      .where(
        and(
          eq(messages.organizationId, access.ctx.orgId),
          eq(messages.conversationId, params.id),
        ),
      )
      .orderBy(desc(messages.sentAt))
      .limit(10);

    const glossary = await db
      .select({
        source: glossaryTerms.sourceText,
        target: glossaryTerms.targetText,
        srcLoc: glossaryTerms.sourceLocale,
        tgtLoc: glossaryTerms.targetLocale,
      })
      .from(glossaryTerms)
      .where(eq(glossaryTerms.organizationId, access.ctx.orgId))
      .limit(40);

    return { conv, recent: recent.reverse(), glossary };
  });

  if (!ctxData) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const glossarySnippet = ctxData.glossary
    .slice(0, 25)
    .map((g) => `${g.source} (${g.srcLoc}) → ${g.target} (${g.tgtLoc})`)
    .join('\n');

  // Two complementary tones cover most medical-tourism inquiries:
  //   friendly  → warm conversational reply for chit-chat / reassurance
  //   detailed  → itemized info-dense reply for quote / schedule / 준비물
  // To re-enable the dropped tones, add them back to this array (the
  // prompt + label tables below still support all five).
  const tones: Array<
    'concise' | 'friendly' | 'luxury' | 'empathetic' | 'detailed'
  > = ['friendly', 'detailed'];
  const toneLabels: Record<typeof tones[number], string> = {
    concise: '간결',
    friendly: '친절',
    empathetic: '공감',
    luxury: '프리미엄',
    detailed: '상세',
  };

  // Fan out 2 parallel AI calls. maxTokens 1024 gives the detailed tone
  // (70–130 단어 ≈ ~500 tokens in Korean) full headroom and survives
  // even if AI_GEMINI_THINKING_BUDGET is later raised — the provider
  // disables thinking by default so the budget is almost entirely
  // available for the visible answer. Total response stays under ~2s.
  const results = await Promise.allSettled(
    tones.map(async (tone) => {
      const { system, messages: prompt } = buildReplyMessages(
        {
          channelKind: ctxData.conv.channelKind as ChannelKind,
          contactDisplayName: ctxData.conv.contactDisplayName,
          contactCountryCode: ctxData.conv.contactCountryCode,
          contactLocale: ctxData.conv.contactLocale,
          aiIntentClass: ctxData.conv.aiIntentClass,
          recentMessages: ctxData.recent.map((m) => ({
            direction: m.direction === 'outbound' ? 'outbound' : 'inbound',
            // Prefer Korean translation when the source language differs
            // so the agent's working context stays in Korean.
            body: m.translationKo ?? m.body,
            bodyLocale: m.bodyLocale,
          })),
          glossarySnippet,
        },
        tone,
        parsed.data.outputLocale,
      );

      const res = await aiChat(
        callerFromCtx(access.ctx, { entityType: 'conversation', entityId: params.id }),
        'chat',
        { system, messages: prompt, temperature: 0.4, maxTokens: 1024 },
      );
      return { tone, label: toneLabels[tone], text: res.text.trim() };
    }),
  );

  type Suggestion = {
    tone: 'concise' | 'friendly' | 'luxury' | 'empathetic' | 'detailed';
    label: string;
    text: string;
  };
  const suggestions: Suggestion[] = results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((s): s is Suggestion => s !== null);

  return NextResponse.json({ data: { suggestions } });
}
