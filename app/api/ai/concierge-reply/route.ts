export const dynamic = 'force-dynamic';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { and, eq, desc } from 'drizzle-orm';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { conversations } from '@/drizzle/schema/conversations';
import { channels } from '@/drizzle/schema/channels';
import { messages } from '@/drizzle/schema/messages';
import { glossaryTerms } from '@/drizzle/schema/messages';
import { aiChatStream, callerFromCtx } from '@/lib/ai/router';
import { buildReplyMessages, type ReplyTone } from '@/lib/ai/prompts/concierge-reply';
import type { ChannelKind } from '@/lib/channels/types';

export const runtime = 'nodejs';

const Body = z.object({
  conversationId: z.string().uuid(),
  tone: z.enum(['concise', 'friendly', 'luxury']),
  outputLocale: z.string().min(2).max(8).default('ko'),
});

export async function POST(request: Request): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

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
        and(eq(conversations.id, parsed.data.conversationId), eq(conversations.organizationId, access.ctx.orgId)),
      )
      .limit(1);
    if (!conv) return null;

    const recent = await db
      .select({ direction: messages.direction, body: messages.body, bodyLocale: messages.bodyLocale })
      .from(messages)
      .where(
        and(
          eq(messages.organizationId, access.ctx.orgId),
          eq(messages.conversationId, parsed.data.conversationId),
        ),
      )
      .orderBy(desc(messages.sentAt))
      .limit(10);

    const glossary = await db
      .select({ source: glossaryTerms.sourceText, target: glossaryTerms.targetText, srcLoc: glossaryTerms.sourceLocale, tgtLoc: glossaryTerms.targetLocale })
      .from(glossaryTerms)
      .where(eq(glossaryTerms.organizationId, access.ctx.orgId))
      .limit(80);

    return { conv, recent: recent.reverse(), glossary };
  });

  if (!ctxData) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const glossarySnippet = ctxData.glossary
    .slice(0, 30)
    .map((g) => `${g.source} (${g.srcLoc}) → ${g.target} (${g.tgtLoc})`)
    .join('\n');

  const { system, messages: prompt } = buildReplyMessages(
    {
      channelKind: ctxData.conv.channelKind as ChannelKind,
      contactDisplayName: ctxData.conv.contactDisplayName,
      contactCountryCode: ctxData.conv.contactCountryCode,
      contactLocale: ctxData.conv.contactLocale,
      aiIntentClass: ctxData.conv.aiIntentClass,
      recentMessages: ctxData.recent.map((m) => ({
        direction: m.direction === 'outbound' ? 'outbound' : 'inbound',
        body: m.body,
        bodyLocale: m.bodyLocale,
      })),
      glossarySnippet,
    },
    parsed.data.tone as ReplyTone,
    parsed.data.outputLocale,
  );

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of aiChatStream(
          callerFromCtx(access.ctx, { entityType: 'conversation', entityId: parsed.data.conversationId }),
          'chat',
          { system, messages: prompt, temperature: 0.4, maxTokens: 600 },
        )) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\n[ERROR] ${err instanceof Error ? err.message : String(err)}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
