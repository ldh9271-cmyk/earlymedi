export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { quickReplies } from '@/drizzle/schema/messages';

export async function GET(): Promise<Response> {
  const access = await tryAccess({
    allowedAccountTypes: ['agency', 'medical', 'non_medical', 'freelancer'],
  });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const rows = await withRls(access.ctx, () =>
    db
      .select()
      .from(quickReplies)
      .where(eq(quickReplies.organizationId, access.ctx.orgId))
      .orderBy(quickReplies.sortOrder),
  );
  return NextResponse.json({ data: rows });
}
