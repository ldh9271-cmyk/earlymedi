export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { patients } from '@/drizzle/schema/patients';
import { auditLogs } from '@/drizzle/schema/audit';
import { decryptPii } from '@/lib/encryption/pgcrypto';

const Body = z.object({
  fields: z.array(z.enum(['passport', 'phone', 'email', 'rrn'])).min(1).max(4),
  reason: z.string().min(3).max(200),
});

/**
 * Reveals encrypted PII fields. Each call is audit-logged with the
 * actor + reason; agency managers can review the access log.
 */
export async function POST(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

  return await withRls(access.ctx, async () => {
    const [p] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.organizationId, access.ctx.orgId), eq(patients.id, params.id)))
      .limit(1);
    if (!p) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const out: Record<string, string | null> = {};
    if (parsed.data.fields.includes('passport')) out.passport = await decryptPii(p.passportNumberEncrypted);
    if (parsed.data.fields.includes('phone')) out.phone = await decryptPii(p.phoneEncrypted);
    if (parsed.data.fields.includes('email')) out.email = await decryptPii(p.emailEncrypted);
    if (parsed.data.fields.includes('rrn')) out.rrn = await decryptPii(p.rrnEncrypted);

    await db.insert(auditLogs).values({
      organizationId: access.ctx.orgId,
      actorUserId: access.ctx.userId,
      action: 'view',
      entityType: 'patient_pii',
      entityId: params.id,
      diff: { fields: parsed.data.fields },
      metadata: { reason: parsed.data.reason },
    });

    return NextResponse.json({ data: out });
  });
}
