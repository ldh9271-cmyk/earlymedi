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
import { checkIn, loadOrderByToken, orgName } from '@/lib/voucher/service';
import { declareFinalAmount } from '@/lib/voucher/settlement';

type Actor = { id: string; name: string; isMaster: boolean };

/** 랜딩에서 사업자 권한 확인 — 마스터 또는 활성 조직의 멤버. 실패하면 랜딩으로 되돌린다. */
async function resolveActor(token: string): Promise<Actor> {
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
  return { id: orgId || 'master', name: orgId ? await orgName(orgId) : '글로우업투어 운영', isMaster };
}

/** /v/<token> 랜딩에서 사업자가 누르는 방문 확인. */
export async function checkInAction(fd: FormData): Promise<void> {
  const token = String(fd.get('token') ?? '');
  const back = (q: Record<string, string>): never => redirect(`/v/${encodeURIComponent(token)}?${new URLSearchParams(q).toString()}`);
  const actor = await resolveActor(token);
  const r = await checkIn(token, actor);
  if (!r.ok) {
    const msg = r.reason === 'forbidden' ? '이 주문의 사업자가 아닙니다.' : r.reason === 'not_paid' ? '결제가 완료되지 않은 주문입니다.' : r.reason === 'cancelled' ? '취소된 주문입니다.' : '유효하지 않은 바우처입니다.';
    back({ error: msg });
  }
  if (r.ok) back({ ok: r.already ? 'already' : '1' });
}

/** 방문 확인 뒤 최종 결제금액 입력 (3자 검증 2단계). 체크인 전이면 먼저 체크인한다. */
export async function settleAction(fd: FormData): Promise<void> {
  const token = String(fd.get('token') ?? '');
  const back = (q: Record<string, string>): never => redirect(`/v/${encodeURIComponent(token)}?${new URLSearchParams(q).toString()}`);
  const actor = await resolveActor(token);
  const amount = Math.round(Number(String(fd.get('finalAmountWon') ?? '').replace(/[^\d]/g, '')));
  if (!Number.isFinite(amount) || amount < 0) back({ error: '최종 결제금액을 숫자로 입력해 주세요.' });
  const first = await loadOrderByToken(token);
  if (!first) return back({ error: '유효하지 않은 바우처입니다.' });
  let o = first;
  if (!(o.meta as { voucher?: { checkedInAt?: string } } | null)?.voucher?.checkedInAt) {
    const c = await checkIn(token, actor);
    if (!c.ok) back({ error: c.reason === 'forbidden' ? '이 주문의 사업자가 아닙니다.' : '방문 확인을 먼저 할 수 없는 주문입니다.' });
    o = (await loadOrderByToken(token)) ?? o;
  }
  const r = await declareFinalAmount(o, actor, { finalAmountWon: amount, note: String(fd.get('note') ?? '') || null });
  if (!r.ok) {
    const msg: Record<string, string> = {
      locked: '이미 확정·청구된 건이라 정정할 수 없습니다. 운영팀에 문의해 주세요.', bad_amount: '금액이 올바르지 않습니다.',
      forbidden: '이 주문의 사업자가 아닙니다.', not_checked_in: '방문 확인이 먼저 필요합니다.', not_paid: '결제가 완료되지 않은 주문입니다.', cancelled: '취소된 주문입니다.',
    };
    back({ error: msg[r.reason] ?? '기록하지 못했습니다.' });
  }
  back({ ok: 'settled' });
}
