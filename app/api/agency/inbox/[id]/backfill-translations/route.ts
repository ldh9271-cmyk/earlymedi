export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { messages } from '@/drizzle/schema/messages';
import { translateInboundMessage } from '@/lib/ai/translation';
import { callerFromCtx } from '@/lib/ai/router';

/**
 * Backfill AI translations for any message in a conversation that
 * doesn't have one yet. Called by the conversation pane on mount so
 * old messages (created before Gemini was configured) get their
 * Korean translation cards without any manual click.
 *
 * Concurrency-safe: each message UPDATE re-checks that translation_ko
 * is still null before writing, so multiple tabs hitting this endpoint
 * at once don't redo each other's work.
 *
 * Cheap: free-tier Gemini Flash translates a typical inquiry in
 * ~1.5s. We cap at the 20 most recent untranslated messages per call
 * to keep latency predictable; the pane refreshes via React Query
 * after this returns so subsequent calls pick up where we left off.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ ok: false, reason: 'env_missing', translated: 0 }, { status: 200 });
  }

  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  return await withRls(access.ctx, async () => {
    // Pick the most recent messages on this conversation that look like
    // they SHOULD be translated but aren't:
    //   - inbound + non-Korean source AND translation_ko is null
    //   - OR outbound + Korean source AND translation_en is null (so
    //     the operator's own Korean reply gets an English mirror for
    //     review). We skip outbound translation backfill for now to
    //     avoid double-billing — only inbound is the visible win.
    const candidates = await db
      .select({
        id: messages.id,
        body: messages.body,
        bodyLocale: messages.bodyLocale,
      })
      .from(messages)
      .where(
        and(
          eq(messages.organizationId, access.ctx.orgId),
          eq(messages.conversationId, params.id),
          eq(messages.direction, 'inbound'),
          isNull(messages.translationKo),
          or(
            isNull(messages.bodyLocale),
            sql`${messages.bodyLocale} <> 'ko'`,
          ),
        ),
      )
      .orderBy(desc(messages.sentAt))
      .limit(20);

    if (candidates.length === 0) {
      return NextResponse.json({ ok: true, translated: 0 });
    }

    const caller = callerFromCtx(access.ctx, { entityType: 'conversation', entityId: params.id });

    // Translate in parallel — Gemini Flash handles concurrent calls fine,
    // and even with 20 messages this finishes well within Vercel's
    // function timeout (Hobby tier 10s; Pro tier 60s).
    const results = await Promise.allSettled(
      candidates.map(async (m) => {
        if (!m.body.trim()) return false;
        const r = await translateInboundMessage(caller, m.body, m.bodyLocale ?? undefined);
        if (!r.translationKo && !r.translationEn) return false;
        await db
          .update(messages)
          .set({
            translationKo: r.translationKo,
            translationEn: r.translationEn,
            bodyLocale: m.bodyLocale ?? r.detectedLocale,
          })
          .where(and(eq(messages.id, m.id), isNull(messages.translationKo)));
        return true;
      }),
    );

    const translated = results.filter(
      (r) => r.status === 'fulfilled' && r.value === true,
    ).length;
    return NextResponse.json({ ok: true, translated });
  });
}
