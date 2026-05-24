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
 * Returns three on-tone reply suggestions for the active conversation —
 * one per tone (concise / friendly / luxury) — so the agent can pick the
 * one that fits the moment. Each call is a fresh AI generation; we keep
 * them short so latency stays under ~2-3s.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
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

  const tones: Array<'concise' | 'friendly' | 'luxury'> = ['concise', 'friendly', 'luxury'];
  const toneLabels: Record<typeof tones[number], string> = {
    concise: '간결',
    friendly: '친절',
    luxury: '프리미엄',
  };

  // Fan out 3 parallel AI calls — keep them small (maxTokens 220) for
  // ~1.5s P95 per call; total response stays under ~3s thanks to
  // parallelism.
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
        { system, messages: prompt, temperature: 0.4, maxTokens: 220 },
      );
      return { tone, label: toneLabels[tone], text: res.text.trim() };
    }),
  );

  type Suggestion = { tone: 'concise' | 'friendly' | 'luxury'; label: string; text: string };
  const suggestions: Suggestion[] = results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((s): s is Suggestion => s !== null);

  return NextResponse.json({ data: { suggestions } });
}
