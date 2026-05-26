export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { loadConversationDetail } from '@/lib/db/repositories/inbox';

export async function GET(_request: Request, { params }: { params: { id: string } }): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency', 'medical'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const detail = await withRls(access.ctx, () => loadConversationDetail(access.ctx.orgId, params.id));
  if (!detail) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ data: detail });
}
