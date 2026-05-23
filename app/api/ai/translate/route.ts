export const dynamic = 'force-dynamic';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { messages, glossaryTerms } from '@/drizzle/schema/messages';
import { aiChat, callerFromCtx } from '@/lib/ai/router';
import { buildTranslationMessages } from '@/lib/ai/prompts/translation';

const Body = z.object({
  text: z.string().min(1).max(8_000).optional(),
  messageId: z.string().uuid().optional(),
  sourceLocale: z.string().optional(),
  targetLocale: z.string().min(2).max(8),
  persist: z.boolean().default(false), // when true and messageId given, save translation_ko / translation_en
});

export async function POST(request: Request): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

  return withRls(access.ctx, async () => {
    let inputText = parsed.data.text;
    let sourceLocale = parsed.data.sourceLocale;
    if (!inputText && parsed.data.messageId) {
      const [m] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, parsed.data.messageId))
        .limit(1);
      if (!m) return NextResponse.json({ error: 'message_not_found' }, { status: 404 });
      inputText = m.body;
      sourceLocale = sourceLocale ?? m.bodyLocale ?? undefined;
    }
    if (!inputText) return NextResponse.json({ error: 'text_required' }, { status: 400 });

    const gloss = await db
      .select({
        source: glossaryTerms.sourceText,
        target: glossaryTerms.targetText,
        srcLoc: glossaryTerms.sourceLocale,
        tgtLoc: glossaryTerms.targetLocale,
      })
      .from(glossaryTerms)
      .where(eq(glossaryTerms.organizationId, access.ctx.orgId))
      .limit(60);

    const glossarySnippet = gloss
      .filter((g) => !sourceLocale || g.srcLoc === sourceLocale)
      .map((g) => `${g.source} → ${g.target}`)
      .join('\n');

    const { system, messages: prompt } = buildTranslationMessages({
      text: inputText,
      sourceLocale,
      targetLocale: parsed.data.targetLocale,
      glossarySnippet,
      domain: 'medical',
    });

    const ai = await aiChat(
      callerFromCtx(access.ctx, { entityType: 'message', entityId: parsed.data.messageId }),
      'translate',
      { system, messages: prompt, temperature: 0, maxTokens: 800 },
    );

    if (parsed.data.persist && parsed.data.messageId) {
      if (parsed.data.targetLocale === 'ko') {
        await db.update(messages).set({ translationKo: ai.text }).where(eq(messages.id, parsed.data.messageId));
      } else if (parsed.data.targetLocale === 'en') {
        await db.update(messages).set({ translationEn: ai.text }).where(eq(messages.id, parsed.data.messageId));
      }
    }

    return NextResponse.json({ data: { text: ai.text } });
  });
}
