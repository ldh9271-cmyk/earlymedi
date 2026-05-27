export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { messages } from '@/drizzle/schema/messages';
import { conversations } from '@/drizzle/schema/conversations';
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
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ ok: false, reason: 'env_missing', translated: 0 }, { status: 200 });
  }

  // ?force=1 → re-translate ALL inbound non-Korean messages on this thread,
  // even ones that already have translation_ko set. Used by the "전체 다시
  // 번역" button to redo old truncated translations after the maxTokens fix.
  const force = new URL(request.url).searchParams.get('force') === '1';

  const access = await tryAccess({
    allowedAccountTypes: ['agency', 'medical', 'non_medical', 'freelancer'],
  });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  return await withRls(access.ctx, async () => {
    // Fetch the conversation's contact info so the prompt can use it for
    // tone/honorific decisions.
    const [conv] = await db
      .select({
        contactDisplayName: conversations.contactDisplayName,
        contactCountryCode: conversations.contactCountryCode,
        contactLocale: conversations.contactLocale,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, params.id),
          eq(conversations.organizationId, access.ctx.orgId),
        ),
      )
      .limit(1);

    // Fetch the last 6 already-translated messages as conversation
    // context. Backfill candidates use this so the AI doesn't keep
    // re-translating the same procedure name three different ways.
    const historyRows = await db
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
      .limit(6);
    const history = historyRows.reverse().map((m) => ({
      direction: (m.direction === 'outbound' ? 'outbound' : 'inbound') as
        | 'inbound'
        | 'outbound',
      body: m.body,
      bodyLocale: m.bodyLocale,
      translationKo: m.translationKo,
    }));
    const ctx = {
      history,
      contact: conv
        ? {
            displayName: conv.contactDisplayName,
            countryCode: conv.contactCountryCode,
            locale: conv.contactLocale,
          }
        : undefined,
    };

    // Pick the most recent messages on this conversation:
    //   - default mode: inbound + body_locale != 'ko' AND translation_ko is null
    //   - force mode: ALL inbound, including ones mislabeled as 'ko'
    //
    // Why force drops the body_locale filter too: the old Kakao webhook
    // hardcoded body_locale='ko' even when the actual content was
    // Chinese. Those rows would otherwise be skipped here forever even
    // though they're the exact ones that need re-translating. force=1
    // lets the operator recover them.
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
          ...(force
            ? []
            : [
                isNull(messages.translationKo),
                or(
                  isNull(messages.bodyLocale),
                  sql`${messages.bodyLocale} <> 'ko'`,
                ),
              ]),
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
    //
    // Force mode IGNORES the stored body_locale and lets the translator
    // re-detect from the actual content. Necessary because the original
    // Kakao webhook hardcoded 'ko', so mislabeled Chinese/Japanese
    // messages will keep getting wrong translations if we trust the
    // stored locale.
    const results = await Promise.allSettled(
      candidates.map(async (m) => {
        if (!m.body.trim()) return false;
        const sourceLocaleHint = force ? undefined : m.bodyLocale ?? undefined;
        const r = await translateInboundMessage(caller, m.body, sourceLocaleHint, ctx);
        if (!r.translationKo && !r.translationEn) return false;
        await db
          .update(messages)
          .set({
            translationKo: r.translationKo,
            translationEn: r.translationEn,
            // Always write the freshly-detected locale in force mode
            // so the row is correctly labeled going forward.
            bodyLocale: force ? r.detectedLocale : m.bodyLocale ?? r.detectedLocale,
          })
          .where(
            force
              ? eq(messages.id, m.id)
              : and(eq(messages.id, m.id), isNull(messages.translationKo)),
          );
        return true;
      }),
    );

    const translated = results.filter(
      (r) => r.status === 'fulfilled' && r.value === true,
    ).length;
    return NextResponse.json({ ok: true, translated });
  });
}
