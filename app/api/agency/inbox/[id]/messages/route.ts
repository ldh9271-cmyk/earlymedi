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

const Body = z.object({
  body: z.string().min(1).max(8000),
  bodyLocale: z.string().min(2).max(8).default('ko'),
  templateKey: z.string().optional(),
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
      })
      .from(conversations)
      .innerJoin(channels, eq(conversations.channelId, channels.id))
      .where(
        and(eq(conversations.organizationId, access.ctx.orgId), eq(conversations.id, params.id)),
      )
      .limit(1);

    if (!conv) return NextResponse.json({ error: 'not_found' }, { status: 404 });

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
        body: parsed.data.body,
        bodyLocale: parsed.data.bodyLocale,
        status: 'sending',
        sentAt: new Date(),
      })
      .returning();
    if (!pending) return NextResponse.json({ error: 'insert_failed' }, { status: 500 });

    // 2. Dispatch via channel adapter (mock in Phase 2)
    const result = await sendViaChannel({
      conversationId: conv.convId,
      channelKind: conv.channelKind as ChannelKind,
      externalAccountId: conv.externalAccountId,
      externalThreadId: conv.externalThreadId,
      contact: { externalId: conv.contactExternalId ?? '' },
      contentType: parsed.data.templateKey ? 'template' : 'text',
      body: parsed.data.body,
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
