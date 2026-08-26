'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireAccess } from '@/lib/auth/route-guards';
import { db } from '@/lib/db/client';
import { billingAccounts } from '@/drizzle/schema/billing';
import { leadTopups, leadUnlocks } from '@/drizzle/schema/lead-market';
import { conversations } from '@/drizzle/schema/conversations';
import { messages } from '@/drizzle/schema/messages';
import { auditLogs } from '@/drizzle/schema/audit';
import {
  LEAD_TOPUP_OPTIONS_WON,
  LEAD_TOPUP_UNIT_WON,
  leadPriceWon,
} from '@/lib/leads/pricing';

/**
 * 리드 마켓 서버 액션 (병원 medical 조직 전용).
 *
 *   충전 신청: lead_topups(pending) — 마스터가 입금 확인 후 잔액 가산
 *   리드 열람: 잔액에서 카테고리 가격(3~6만원) 차감 + lead_unlocks 기록
 *              (조직×리드당 1회 과금, 이후 무료 재열람)
 */

const TopupSchema = z.object({
  amountWon: z.coerce
    .number()
    .int()
    .min(LEAD_TOPUP_UNIT_WON, '최소 충전 금액은 10만원입니다')
    .max(50_000_000)
    .refine((n) => n % LEAD_TOPUP_UNIT_WON === 0, '충전은 10만원 단위입니다'),
});

export async function requestLeadTopupAction(input: {
  amountWon: number;
}): Promise<{ id: string }> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const parsed = TopupSchema.parse(input);
  if (!LEAD_TOPUP_OPTIONS_WON.includes(parsed.amountWon as (typeof LEAD_TOPUP_OPTIONS_WON)[number])) {
    // 옵션 밖 금액도 10만원 단위면 허용 (직접 입력 대비) — 단 상한은 스키마가 제한.
  }
  const [row] = await db
    .insert(leadTopups)
    .values({
      organizationId: ctx.orgId,
      amountWon: parsed.amountWon,
      status: 'pending',
      method: 'bank',
      requestedByUserId: ctx.userId,
    })
    .returning({ id: leadTopups.id });
  if (!row) throw new Error('topup_create_failed');

  await db.insert(auditLogs).values({
    organizationId: ctx.orgId,
    actorUserId: ctx.userId,
    action: 'create',
    entityType: 'lead_topup',
    entityId: row.id,
    diff: { amountWon: parsed.amountWon },
  });

  revalidatePath('/medical/leads');
  return { id: row.id };
}

const UnlockSchema = z.object({ conversationId: z.string().uuid() });

export async function unlockLeadAction(input: {
  conversationId: string;
}): Promise<{ ok: true; priceWon: number; already: boolean } | { ok: false; error: string }> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const { conversationId } = UnlockSchema.parse(input);

  // 이미 열람한 리드는 재과금 없이 통과
  const [existing] = await db
    .select({ id: leadUnlocks.id, priceWon: leadUnlocks.priceWon })
    .from(leadUnlocks)
    .where(
      and(
        eq(leadUnlocks.organizationId, ctx.orgId),
        eq(leadUnlocks.conversationId, conversationId),
      ),
    )
    .limit(1);
  if (existing) return { ok: true, priceWon: existing.priceWon, already: true };

  // 리드 존재 + 관심 분야 → 가격 산정 (첫 인바운드 메시지 metadata)
  const [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conv) return { ok: false, error: '리드를 찾을 수 없습니다' };

  const inbound = await db
    .select({ metadata: messages.metadata })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), eq(messages.direction, 'inbound')))
    .orderBy(messages.sentAt)
    .limit(1);
  const meta = (inbound[0]?.metadata ?? {}) as { interests?: string[] };
  const { priceWon, interestKey } = leadPriceWon(meta.interests ?? []);

  // 잔액 차감 — 조건부 UPDATE 로 동시성 안전하게 (잔액 부족이면 0행)
  const deducted = await db
    .update(billingAccounts)
    .set({
      prepaidBalanceKrw: sql`${billingAccounts.prepaidBalanceKrw} - ${priceWon}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(billingAccounts.organizationId, ctx.orgId),
        gte(billingAccounts.prepaidBalanceKrw, priceWon),
      ),
    )
    .returning({ balance: billingAccounts.prepaidBalanceKrw });
  if (deducted.length === 0) {
    return { ok: false, error: `잔액이 부족합니다 — 이 리드 열람가는 ₩${priceWon.toLocaleString('ko-KR')} 입니다. 충전 후 다시 시도해 주세요.` };
  }

  try {
    await db.insert(leadUnlocks).values({
      organizationId: ctx.orgId,
      conversationId,
      priceWon,
      interestKey,
      unlockedByUserId: ctx.userId,
    });
  } catch (err) {
    // 경합으로 이미 열람됨 — 차감 롤백
    await db
      .update(billingAccounts)
      .set({ prepaidBalanceKrw: sql`${billingAccounts.prepaidBalanceKrw} + ${priceWon}` })
      .where(eq(billingAccounts.organizationId, ctx.orgId));
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return { ok: true, priceWon: 0, already: true };
    }
    throw err;
  }

  await db.insert(auditLogs).values({
    organizationId: ctx.orgId,
    actorUserId: ctx.userId,
    action: 'create',
    entityType: 'lead_unlock',
    entityId: conversationId,
    diff: { priceWon, interestKey },
  });

  revalidatePath('/medical/leads');
  return { ok: true, priceWon, already: false };
}
