export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { conversations } from '@/drizzle/schema/conversations';
import { messages } from '@/drizzle/schema/messages';

export async function POST(_request: Request, { params }: { params: { id: string } }): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency', 'medical'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  return await withRls(access.ctx, async () => {
    await db
      .update(messages)
      .set({ isSeenByAgency: true, seenAt: new Date() })
      .where(
        and(
          eq(messages.organizationId, access.ctx.orgId),
          eq(messages.conversationId, params.id),
          eq(messages.isSeenByAgency, false),
        ),
      );
    const [c] = await db
      .update(conversations)
      .set({ unreadCount: 0, updatedAt: new Date() })
      .where(
        and(eq(conversations.organizationId, access.ctx.orgId), eq(conversations.id, params.id)),
      )
      .returning();
    if (!c) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ data: { id: params.id, unreadCount: 0 } });
  });
}
