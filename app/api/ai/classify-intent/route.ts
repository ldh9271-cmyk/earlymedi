export const dynamic = 'force-dynamic';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { conversations } from '@/drizzle/schema/conversations';
import { messages } from '@/drizzle/schema/messages';
import { aiChat, callerFromCtx } from '@/lib/ai/router';
import { buildIntentMessages } from '@/lib/ai/prompts/intent-classifier';
import { MessageIntentSchema } from '@/lib/ai/extraction/schemas/message-intent';
import { anonymize, deanonymize } from '@/lib/ai/extraction/anonymizer';

const Body = z.object({
  conversationId: z.string().uuid(),
  persist: z.boolean().default(true),
});

export async function POST(request: Request): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

  return withRls(access.ctx, async () => {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(
        and(eq(conversations.organizationId, access.ctx.orgId), eq(conversations.id, parsed.data.conversationId)),
      )
      .limit(1);
    if (!conv) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const recent = await db
      .select({ direction: messages.direction, body: messages.body, bodyLocale: messages.bodyLocale })
      .from(messages)
      .where(eq(messages.conversationId, conv.id))
      .orderBy(desc(messages.sentAt))
      .limit(12);

    const { system, messages: prompt } = buildIntentMessages({
      recentMessages: recent.reverse().map((m) => ({
        direction: m.direction === 'outbound' ? 'outbound' : 'inbound',
        body: m.body,
        bodyLocale: m.bodyLocale,
      })),
      contactCountryCode: conv.contactCountryCode,
      contactLocale: conv.contactLocale,
    });

    // Anonymize the joined user prompt (PII names, phones, etc.)
    const joined = prompt.map((m) => m.content).join('\n\n');
    const anon = await anonymize(access.ctx.orgId, joined, {
      extraNames: conv.contactDisplayName ? [conv.contactDisplayName] : [],
    });

    const ai = await aiChat(
      callerFromCtx(access.ctx, { entityType: 'conversation', entityId: conv.id }),
      'classify',
      {
        system: `${system}\n\n응답은 반드시 단일 JSON. JSON 외 텍스트 금지.`,
        temperature: 0,
        maxTokens: 800,
        messages: [{ role: 'user', content: anon.redacted }],
      },
    );

    const restored = await deanonymize(anon.jobToken, ai.text);
    const restored2 = restored.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/i, '').trim();
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(restored2);
    } catch {
      return NextResponse.json({ error: 'invalid_model_json', raw: ai.text.slice(0, 200) }, { status: 502 });
    }
    const intent = MessageIntentSchema.safeParse(parsedJson);
    if (!intent.success) {
      return NextResponse.json({ error: 'schema_violation', issues: intent.error.issues }, { status: 502 });
    }

    if (parsed.data.persist) {
      await db
        .update(conversations)
        .set({
          aiIntentClass: intent.data.intent_class,
          aiSentimentScore: intent.data.sentiment_score,
          priority: intent.data.urgency,
          summary: intent.data.one_line_summary_ko,
          stage: bumpStage(conv.stage, intent.data.recommended_next_stage),
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conv.id));
    }

    return NextResponse.json({ data: intent.data });
  });
}

const STAGE_ORDER = ['lead', 'qualified', 'case', 'quoted', 'booked'] as const;
function bumpStage(
  current: 'lead' | 'qualified' | 'case' | 'quoted' | 'booked' | 'archived',
  recommended: (typeof STAGE_ORDER)[number],
): typeof current {
  if (current === 'archived') return current;
  const c = STAGE_ORDER.indexOf(current as (typeof STAGE_ORDER)[number]);
  const r = STAGE_ORDER.indexOf(recommended);
  if (c < 0) return current;
  return STAGE_ORDER[Math.max(c, r)] ?? current;
}
