export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { conversations } from '@/drizzle/schema/conversations';
import { auditLogs } from '@/drizzle/schema/audit';
import { loadConversationDetail } from '@/lib/db/repositories/inbox';

export async function GET(_request: Request, { params }: { params: { id: string } }): Promise<Response> {
  const access = await tryAccess({
    allowedAccountTypes: ['agency', 'medical', 'non_medical', 'freelancer'],
  });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const detail = await withRls(access.ctx, () => loadConversationDetail(access.ctx.orgId, params.id));
  if (!detail) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ data: detail });
}

/**
 * Hard-delete a conversation (and all its messages via FK cascade).
 *
 * Restricted to agency-side roles since the inbox is theirs. The
 * organization check is the load-bearing security boundary —
 * caller must own the conversation. We also write an audit log so
 * accidental deletes can be traced (the row contents are gone from
 * `conversations` but the log preserves who/when).
 *
 * messages.conversation_id has ON DELETE CASCADE (see
 * drizzle/schema/messages.ts line 43) so message rows + their
 * translations/attachments go away in the same statement. Anything
 * outside the messages tree (audit logs, freelancer attribution,
 * case promotions) survives by design — those are independent records.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const access = await tryAccess({
    allowedAccountTypes: ['agency', 'medical', 'non_medical', 'freelancer'],
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: access.status });
  }

  // Verify ownership + capture display fields for the audit log before
  // the row vanishes.
  const [existing] = await withRls(access.ctx, () =>
    db
      .select({
        id: conversations.id,
        contactDisplayName: conversations.contactDisplayName,
        contactExternalId: conversations.contactExternalId,
        stage: conversations.stage,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, params.id),
          eq(conversations.organizationId, access.ctx.orgId),
        ),
      )
      .limit(1),
  );
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await withRls(access.ctx, () =>
    db
      .delete(conversations)
      .where(
        and(
          eq(conversations.id, params.id),
          eq(conversations.organizationId, access.ctx.orgId),
        ),
      ),
  );

  // Best-effort audit log — never block the delete on log failure.
  await db
    .insert(auditLogs)
    .values({
      organizationId: access.ctx.orgId,
      actorUserId: access.ctx.userId,
      action: 'delete',
      entityType: 'conversation',
      entityId: params.id,
      diff: {
        contactDisplayName: existing.contactDisplayName,
        contactExternalId: existing.contactExternalId,
        stage: existing.stage,
      },
      metadata: { source: 'inbox_list_delete' },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
