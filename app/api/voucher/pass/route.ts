export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { organizations } from '@/drizzle/schema/organizations';
import { PASS_TTL_DAYS, scanPassUrl, signScanPass } from '@/lib/voucher/scan-pass';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 1회용 비회원 스캔 링크 발급 — 사업자(활성 소속 조직) 또는 마스터.
 * POST { orgId? }  →  { ok, url, expiresAt, days }
 *   조직 멤버: orgId 필수(자기 조직). 마스터: orgId 가 있으면 그 조직 이름으로, 없으면 운영(모든 주문) 링크.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { orgId?: string | null };
  const orgId = body.orgId && UUID_RE.test(body.orgId) ? body.orgId : null;
  const isMaster = isMasterEmail(auth.user.email ?? '');

  if (orgId) {
    if (isMaster) {
      const [o] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
      if (!o) return NextResponse.json({ ok: false, reason: 'org_not_found' }, { status: 404 });
    } else {
      const [m] = await db.select({ id: orgMemberships.id }).from(orgMemberships)
        .where(and(eq(orgMemberships.userId, auth.user.id), eq(orgMemberships.organizationId, orgId), eq(orgMemberships.status, 'active'))).limit(1);
      if (!m) return NextResponse.json({ ok: false, reason: 'forbidden' }, { status: 403 });
    }
  } else if (!isMaster) {
    return NextResponse.json({ ok: false, reason: 'no_org' }, { status: 403 });
  }

  const { pass, expiresAt } = signScanPass(orgId);
  return NextResponse.json({ ok: true, url: scanPassUrl(pass), expiresAt: expiresAt.toISOString(), days: PASS_TTL_DAYS });
}
