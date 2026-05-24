export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { messages } from '@/drizzle/schema/messages';
import { conversations } from '@/drizzle/schema/conversations';
import { channels } from '@/drizzle/schema/channels';
import { sendViaChannel } from '@/lib/channels/router';
import type { ChannelKind } from '@/lib/channels/types';
import { auditLogs } from '@/drizzle/schema/audit';
import { translateText, detectLocale } from '@/lib/ai/translation';
import { callerFromCtx } from '@/lib/ai/router';

const Body = z.object({
  body: z.string().min(1).max(8000),
  bodyLocale: z.string().min(2).max(8).default('ko'),
  templateKey: z.string().optional(),
  /** When true, AI-translate `body` from the agent's locale into the
   *  conversation's contactLocale before delivery. The original Korean
   *  is kept in the DB as translationKo so the agent sees what they
   *  actually wrote. */
  translateBeforeSend: z.boolean().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  }

  return await withRls(access.ctx, async () => {
    const [conv] = await db
      .select({
        convId: conversations.id,
        channelId: channels.id,
        channelKind: channels.kind,
        externalAccountId: channels.externalAccountId,
        externalThreadId: conversations.externalThreadId,
        contactExternalId: conversations.contactExternalId,
        contactLocale: conversations.contactLocale,
      })
      .from(conversations)
      .innerJoin(channels, eq(conversations.channelId, channels.id))
      .where(
        and(eq(conversations.organizationId, access.ctx.orgId), eq(conversations.id, params.id)),
      )
      .limit(1);

    if (!conv) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // 0. (Optional) AI translation: when the agent typed Korean but the
    //    patient's contactLocale isn't Korean, translate before delivery.
    //    The original Korean is preserved in translationKo for the agent
    //    to see; the translated text becomes the outbound body.
    const agentLocale = parsed.data.bodyLocale;
    const patientLocale = conv.contactLocale ?? null;
    let outboundBody = parsed.data.body;
    let outboundLocale = agentLocale;
    let translationKoForRow: string | null = null;
    let translationEnForRow: string | null = null;

    if (parsed.data.translateBeforeSend && patientLocale && patientLocale !== agentLocale) {
      const target: 'ko' | 'en' = patientLocale.startsWith('ko') ? 'ko' : 'en';
      const translated = await translateText(
        callerFromCtx(access.ctx, { entityType: 'message' }),
        parsed.data.body,
        target,
        agentLocale,
      );
      if (translated) {
        outboundBody = translated;
        outboundLocale = target;
        // Preserve the original so the agent sees what they actually wrote.
        if (agentLocale.startsWith('ko')) translationKoForRow = parsed.data.body;
        if (agentLocale.startsWith('en')) translationEnForRow = parsed.data.body;
        // And mirror the translated text into the *other* lookup column
        // so the conversation pane can flip between original/translation.
        if (target === 'ko') translationKoForRow = translated;
        if (target === 'en') translationEnForRow = translated;
      }
    } else {
      // No outbound translation — but auto-fill the opposite-language
      // column for the conversation pane's toggle convenience.
      const detected = detectLocale(parsed.data.body);
      if (detected === 'ko') {
        translationKoForRow = parsed.data.body;
      } else if (detected === 'en') {
        translationEnForRow = parsed.data.body;
      }
    }

    // 1. Optimistic insert with status='sending'
    const [pending] = await db
      .insert(messages)
      .values({
        organizationId: access.ctx.orgId,
        conversationId: conv.convId,
        direction: 'outbound',
        senderRole: 'agent',
        senderUserId: access.ctx.userId,
        contentType: parsed.data.templateKey ? 'template' : 'text',
        body: outboundBody,
        bodyLocale: outboundLocale,
        translationKo: translationKoForRow,
        translationEn: translationEnForRow,
        status: 'sending',
        sentAt: new Date(),
      })
      .returning();
    if (!pending) return NextResponse.json({ error: 'insert_failed' }, { status: 500 });

    // 2. Dispatch via channel adapter (mock in Phase 2) — send the
    //    possibly-translated outbound body, not the agent's original.
    const result = await sendViaChannel({
      conversationId: conv.convId,
      channelKind: conv.channelKind as ChannelKind,
      externalAccountId: conv.externalAccountId,
      externalThreadId: conv.externalThreadId,
      contact: { externalId: conv.contactExternalId ?? '' },
      contentType: parsed.data.templateKey ? 'template' : 'text',
      body: outboundBody,
      templateKey: parsed.data.templateKey,
    });

    // 3. Update message + conversation pointers
    if (result.ok) {
      await db
        .update(messages)
        .set({
          status: 'sent',
          externalMessageId: result.externalMessageId,
          deliveredAt: result.deliveredAt ?? null,
        })
        .where(eq(messages.id, pending.id));
      await db
        .update(conversations)
        .set({ lastOutboundAt: new Date(), updatedAt: new Date() })
        .where(eq(conversations.id, conv.convId));
    } else {
      await db
        .update(messages)
        .set({ status: 'failed', failureReason: result.error })
        .where(eq(messages.id, pending.id));
    }

    // 4. Audit
    await db.insert(auditLogs).values({
      organizationId: access.ctx.orgId,
      actorUserId: access.ctx.userId,
      action: 'create',
      entityType: 'message',
      entityId: pending.id,
      diff: { conversationId: conv.convId, ok: result.ok },
      metadata: { url: '/api/agency/inbox/[id]/messages' },
    });

    return NextResponse.json({
      data: {
        id: pending.id,
        status: result.ok ? 'sent' : 'failed',
        externalMessageId: result.ok ? result.externalMessageId : null,
        error: result.ok ? null : result.error,
      },
    });
  });
}
