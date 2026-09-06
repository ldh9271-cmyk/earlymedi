export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { activeOrgId } from '@/lib/auth/active-org-server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { checkIn, loadOrderByToken, orgName, summarize } from '@/lib/voucher/service';
import { declareFinalAmount } from '@/lib/voucher/settlement';

/**
 * 가맹점 최종 결제금액 입력 (3자 검증 2단계) — 체크인과 같은 권한.
 * 아직 체크인 전이면 먼저 체크인하고 이어서 금액을 기록한다.
 * POST { token, orgId?, finalAmountWon, note? } → { ok, summary } | { ok:false, reason }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { token?: string; orgId?: string; finalAmountWon?: number | string; note?: string };
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
  const org = { id: orgId || 'master', name: orgId ? await orgName(orgId) : '글로우업투어 운영', isMaster };

  let o = await loadOrderByToken(token);
  if (!o) return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 404 });
  if (!(o.meta as { voucher?: { checkedInAt?: string } } | null)?.voucher?.checkedInAt) {
    const c = await checkIn(token, org);
    if (!c.ok) return NextResponse.json(c, { status: 400 });
    o = (await loadOrderByToken(token)) ?? o;
  }
  const r = await declareFinalAmount(o, org, { finalAmountWon: Number(body.finalAmountWon), note: body.note ?? null });
  if (!r.ok) return NextResponse.json(r, { status: 400 });
  const fresh = (await loadOrderByToken(token)) ?? o;
  return NextResponse.json({ ok: true, summary: summarize(fresh, { withPII: true, withFee: true }) });
}
