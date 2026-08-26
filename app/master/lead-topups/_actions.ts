'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, sql } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { leadTopups } from '@/drizzle/schema/lead-market';
import { billingAccounts } from '@/drizzle/schema/billing';
import { auditLogs } from '@/drizzle/schema/audit';

/** 리드 마켓 충전 입금 확인 — 총괄 마스터 전용. */

async function assertMaster(): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  if (!isMasterEmail(auth.user.email ?? '')) redirect('/select-org');
}

function back(q: Record<string, string>): never {
  const qs = new URLSearchParams(q).toString();
  redirect(qs ? `/master/lead-topups?${qs}` : '/master/lead-topups');
}

/** 입금 확인 — pending → confirmed + 병원 잔액 가산. */
export async function confirmLeadTopupAction(fd: FormData): Promise<void> {
  await assertMaster();
  const id = String(fd.get('id') ?? '');
  if (!id) back({ error: 'id가 없습니다' });

  // pending 일 때만 confirmed 로 전환 (이중 확인 방지)
  const [row] = await db
    .update(leadTopups)
    .set({ status: 'confirmed', confirmedAt: new Date() })
    .where(and(eq(leadTopups.id, id), eq(leadTopups.status, 'pending')))
    .returning({ organizationId: leadTopups.organizationId, amountWon: leadTopups.amountWon });
  if (!row) back({ error: '이미 처리되었거나 없는 신청입니다' });

  await db
    .update(billingAccounts)
    .set({
      prepaidBalanceKrw: sql`${billingAccounts.prepaidBalanceKrw} + ${row.amountWon}`,
      updatedAt: new Date(),
    })
    .where(eq(billingAccounts.organizationId, row.organizationId));

  await db.insert(auditLogs).values({
    organizationId: row.organizationId,
    actorUserId: null,
    action: 'update',
    entityType: 'lead_topup',
    entityId: id,
    diff: { status: 'confirmed', amountWon: row.amountWon },
  });

  revalidatePath('/master/lead-topups');
  back({ ok: `₩${row.amountWon.toLocaleString('ko-KR')} 충전 확정` });
}

export async function rejectLeadTopupAction(fd: FormData): Promise<void> {
  await assertMaster();
  const id = String(fd.get('id') ?? '');
  const [row] = await db
    .update(leadTopups)
    .set({ status: 'rejected' })
    .where(and(eq(leadTopups.id, id), eq(leadTopups.status, 'pending')))
    .returning({ id: leadTopups.id });
  if (!row) back({ error: '이미 처리되었거나 없는 신청입니다' });
  revalidatePath('/master/lead-topups');
  back({ ok: '신청을 반려했습니다' });
}
