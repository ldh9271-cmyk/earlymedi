export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { and, eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { checkIn, orgName } from '@/lib/voucher/service';
import { ACTIVE_ORG_HEADER } from '@/lib/auth/active-org-constants';

/**
 * 사업자 체크인 — 로그인 + 활성 조직 멤버십 필요. 마스터는 모든 주문 가능.
 * POST { token }  →  { ok, already, summary } | { ok:false, reason }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { token?: string; orgId?: string };
  const token = String(body.token ?? '').trim().replace(/^https?:\/\/[^/]+\/v\//, '');
  if (!token) return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 });

  const isMaster = isMasterEmail(auth.user.email ?? '');
  const orgId = body.orgId || headers().get(ACTIVE_ORG_HEADER) || '';
  if (!isMaster) {
    if (!orgId) return NextResponse.json({ ok: false, reason: 'no_org' }, { status: 403 });
    const [m] = await db.select({ id: orgMemberships.id }).from(orgMemberships)
      .where(and(eq(orgMemberships.userId, auth.user.id), eq(orgMemberships.organizationId, orgId), eq(orgMemberships.status, 'active'))).limit(1);
    if (!m) return NextResponse.json({ ok: false, reason: 'forbidden' }, { status: 403 });
  }
  const name = orgId ? await orgName(orgId) : '글로우업투어 운영';
  const result = await checkIn(token, { id: orgId || 'master', name, isMaster });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
