'use server';

import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { ACTIVE_ORG_HEADER } from '@/lib/auth/active-org-constants';
import { db } from '@/lib/db/client';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { checkIn, orgName } from '@/lib/voucher/service';

/** /v/<token> 랜딩에서 사업자가 누르는 방문 확인. */
export async function checkInAction(fd: FormData): Promise<void> {
  const token = String(fd.get('token') ?? '');
  const back = (q: Record<string, string>): never => redirect(`/v/${encodeURIComponent(token)}?${new URLSearchParams(q).toString()}`);
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/v/${token}`)}`);
  const isMaster = isMasterEmail(auth.user.email ?? '');
  const orgId = headers().get(ACTIVE_ORG_HEADER) ?? '';
  if (!isMaster) {
    if (!orgId) back({ error: '활성 조직이 없습니다. 사업자 콘솔에 로그인해 주세요.' });
    const [m] = await db.select({ id: orgMemberships.id }).from(orgMemberships)
      .where(and(eq(orgMemberships.userId, auth.user.id), eq(orgMemberships.organizationId, orgId), eq(orgMemberships.status, 'active'))).limit(1);
    if (!m) back({ error: '이 조직의 멤버가 아닙니다.' });
  }
  const r = await checkIn(token, { id: orgId || 'master', name: orgId ? await orgName(orgId) : '글로우업투어 운영', isMaster });
  if (!r.ok) {
    const msg = r.reason === 'forbidden' ? '이 주문의 사업자가 아닙니다.' : r.reason === 'not_paid' ? '결제가 완료되지 않은 주문입니다.' : r.reason === 'cancelled' ? '취소된 주문입니다.' : '유효하지 않은 바우처입니다.';
    back({ error: msg });
  }
  if (r.ok) back({ ok: r.already ? 'already' : '1' });
}
