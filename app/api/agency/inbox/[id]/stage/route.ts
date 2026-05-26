export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { conversations } from '@/drizzle/schema/conversations';
import { auditLogs } from '@/drizzle/schema/audit';

const Body = z.object({
  stage: z.enum(['lead', 'qualified', 'case', 'quoted', 'booked', 'archived']),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  const access = await tryAccess({
    allowedAccountTypes: ['agency', 'medical', 'non_medical', 'freelancer'],
  });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  }

  return await withRls(access.ctx, async () => {
    const [updated] = await db
      .update(conversations)
      .set({ stage: parsed.data.stage, updatedAt: new Date() })
      .where(
        and(eq(conversations.organizationId, access.ctx.orgId), eq(conversations.id, params.id)),
      )
      .returning();
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    await db.insert(auditLogs).values({
      organizationId: access.ctx.orgId,
      actorUserId: access.ctx.userId,
      action: 'change_status',
      entityType: 'conversation',
      entityId: params.id,
      diff: { stage: parsed.data.stage },
    });

    return NextResponse.json({ data: { id: params.id, stage: parsed.data.stage } });
  });
}
