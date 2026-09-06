export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { activeOrgId } from '@/lib/auth/active-org-server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { checkIn, orgName } from '@/lib/voucher/service';
import { resolveMerchantFeeBp } from '@/lib/voucher/settlement';

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
  const orgId = body.orgId || activeOrgId();
  if (!isMaster) {
    if (!orgId) return NextResponse.json({ ok: false, reason: 'no_org' }, { status: 403 });
    const [m] = await db.select({ id: orgMemberships.id }).from(orgMemberships)
      .where(and(eq(orgMemberships.userId, auth.user.id), eq(orgMemberships.organizationId, orgId), eq(orgMemberships.status, 'active'))).limit(1);
    if (!m) return NextResponse.json({ ok: false, reason: 'forbidden' }, { status: 403 });
  }
  const name = orgId ? await orgName(orgId) : '글로우업투어 운영';
  const result = await checkIn(token, { id: orgId || 'master', name, isMaster });
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  // 스캔 화면이 최종 결제금액 입력 전에 수수료를 미리 보여줄 수 있도록 요율을 함께 준다.
  const feeBp = result.summary.settlement?.feeBp ?? (await resolveMerchantFeeBp(orgId || null));
  return NextResponse.json({ ...result, feeBp });
}
