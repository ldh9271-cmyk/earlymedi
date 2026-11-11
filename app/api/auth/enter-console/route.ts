import { NextResponse, type NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { organizations } from '@/drizzle/schema/organizations';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { setActiveOrgCookie } from '@/lib/auth/session-setters';
import { ACCOUNT_TYPE_TO_PREFIX, type AccountType } from '@/lib/auth/account-types';

export const dynamic = 'force-dynamic';

/**
 * 사업자 콘솔 진입 — 마이페이지 등 서버 컴포넌트에서는 쿠키를 못 쓰므로, 여기서 활성 조직 쿠키(em.active_org)를 심고
 * 그 조직 유형의 콘솔 대시보드로 보낸다. 본인이 활성 멤버인 조직만 허용(아니면 /select-org).
 *   GET /api/auth/enter-console?org=<orgId>
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const orgId = req.nextUrl.searchParams.get('org') ?? '';
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`, req.url));
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) return NextResponse.redirect(new URL('/select-org', req.url));
  const [m] = await db
    .select({ orgId: organizations.id, accountType: organizations.accountType, isActive: organizations.isActive })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.organizationId, organizations.id))
    .where(and(eq(orgMemberships.userId, auth.user.id), eq(orgMemberships.organizationId, orgId), eq(orgMemberships.status, 'active')))
    .limit(1);
  if (!m || !m.isActive) return NextResponse.redirect(new URL('/select-org', req.url));
  const type = m.accountType as AccountType;
  setActiveOrgCookie(m.orgId, type);
  return NextResponse.redirect(new URL(`${ACCOUNT_TYPE_TO_PREFIX[type]}/dashboard`, req.url));
}
