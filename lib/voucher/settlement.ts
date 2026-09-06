import 'server-only';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { merchantSettlements, type MerchantSettlementRow } from '@/drizzle/schema/merchant-settlements';
import { billingAccounts, billingPlans } from '@/drizzle/schema/billing';
import { sendAdminTelegram } from '@/lib/notify/admin-alert';
import { orgCanCheckIn } from './service';
import type { VoucherMeta, VoucherSettlementMeta } from './token';

/**
 * 3자 검증 정산 — QR 방문 확인 뒤의 "최종 결제금액" 과 플랫폼 수수료.
 *
 *   1. 가맹점: QR 스캔(체크인) → 현장에서 실제로 받은 총액(온라인 결제 포함)을 입력  … declared
 *   2. 소비자: 마이페이지 바우처 화면에서 그 금액을 확인하거나 이의 제기            … confirmed | disputed
 *      (72시간 무응답이면 크론이 자동 확인)                                           … confirmed(auto)
 *   3. 플랫폼: 확정 금액 × 요율 = 수수료를 가맹점에 청구 → 입금                     … invoiced → paid
 *
 * 요율: 조직의 청구 플랜(billing_plans.settlement_fee_bp) 이 있으면 그 값, 없으면 MERCHANT_FEE_BP(기본 300 = 3.00%).
 * 첫 입력 때 요율을 행에 고정해 두므로 플랜이 바뀌어도 이미 입력된 건은 흔들리지 않는다.
 * checkout_orders.meta.voucher.settlement 에 같은 내용을 미러링해 소비자 폴링/마스터 목록이 조인 없이 본다.
 */
type OrderRow = typeof checkoutOrders.$inferSelect;
export type SettlementStatus = 'declared' | 'confirmed' | 'disputed' | 'invoiced' | 'paid';

export const DEFAULT_MERCHANT_FEE_BP = Math.max(0, Math.round(Number(process.env.MERCHANT_FEE_BP ?? 300)));
export const AUTO_CONFIRM_HOURS = 72;

export function feeOf(amountWon: number, feeBp: number): number {
  return Math.max(0, Math.round((amountWon * feeBp) / 10_000));
}

export async function resolveMerchantFeeBp(orgId: string | null | undefined): Promise<number> {
  if (orgId && orgId !== 'master') {
    const [a] = await db
      .select({ bp: billingPlans.settlementFeeBp })
      .from(billingAccounts)
      .innerJoin(billingPlans, eq(billingAccounts.planId, billingPlans.id))
      .where(eq(billingAccounts.organizationId, orgId))
      .limit(1);
    if (a && a.bp > 0) return a.bp;
  }
  return DEFAULT_MERCHANT_FEE_BP;
}

function toMeta(r: MerchantSettlementRow, declaredBy?: string | null): VoucherSettlementMeta {
  return {
    finalAmountWon: r.finalAmountWon,
    onlinePaidWon: r.onlinePaidWon,
    feeBp: r.feeBp,
    feeWon: r.feeWon,
    status: r.status as SettlementStatus,
    declaredAt: r.declaredAt.toISOString(),
    declaredBy: declaredBy ?? r.orgName ?? undefined,
    consumerConfirmedAt: r.consumerConfirmedAt?.toISOString() ?? null,
    disputedAt: r.disputedAt?.toISOString() ?? null,
    disputeNote: r.disputeNote ?? null,
    confirmedAt: r.confirmedAt?.toISOString() ?? null,
    confirmedBy: r.confirmedBy ?? null,
  };
}

async function mirror(orderId: string, r: MerchantSettlementRow, declaredBy?: string | null): Promise<void> {
  const patch = JSON.stringify({ settlement: toMeta(r, declaredBy) });
  await db.execute(sql`
    update checkout_orders
       set meta = jsonb_set(coalesce(meta, '{}'::jsonb), '{voucher}', coalesce(meta->'voucher', '{}'::jsonb) || ${patch}::jsonb),
           updated_at = now()
     where id = ${orderId}`);
}

const won = (n: number): string => `₩${n.toLocaleString('ko-KR')}`;
const pct = (bp: number): string => `${(bp / 100).toFixed(bp % 100 === 0 ? 0 : 2)}%`;
function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c);
}

export type DeclareResult =
  | { ok: true; settlement: MerchantSettlementRow }
  | { ok: false; reason: 'not_paid' | 'cancelled' | 'forbidden' | 'not_checked_in' | 'locked' | 'bad_amount' };

/** 가맹점(또는 마스터)이 최종 결제금액을 입력/정정. 확정·청구된 뒤에는 마스터만 정정할 수 있다. */
export async function declareFinalAmount(
  o: OrderRow,
  org: { id: string; name: string; isMaster?: boolean },
  input: { finalAmountWon: number; note?: string | null },
): Promise<DeclareResult> {
  if (o.status === 'cancelled') return { ok: false, reason: 'cancelled' };
  if (o.status !== 'paid') return { ok: false, reason: 'not_paid' };
  if (!org.isMaster && !(await orgCanCheckIn(o, org.id))) return { ok: false, reason: 'forbidden' };
  const meta = (o.meta ?? {}) as { voucher?: VoucherMeta };
  if (!meta.voucher?.checkedInAt) return { ok: false, reason: 'not_checked_in' };
  const amount = Math.round(Number(input.finalAmountWon));
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) return { ok: false, reason: 'bad_amount' };

  const [existing] = await db.select().from(merchantSettlements).where(eq(merchantSettlements.orderId, o.id)).limit(1);
  if (existing) {
    const lockedForMerchant = existing.status === 'confirmed' || existing.status === 'invoiced' || existing.status === 'paid';
    if (existing.status === 'invoiced' || existing.status === 'paid') return { ok: false, reason: 'locked' };
    if (lockedForMerchant && !org.isMaster) return { ok: false, reason: 'locked' };
  }
  const orgId = org.isMaster ? (existing?.orgId ?? meta.voucher.checkedInByOrgId ?? null) : org.id;
  const orgName = org.isMaster ? (existing?.orgName ?? meta.voucher.checkedInByName ?? null) : org.name;
  const feeBp = existing && existing.feeBp > 0 ? existing.feeBp : await resolveMerchantFeeBp(orgId);
  const feeWon = feeOf(amount, feeBp);
  const now = new Date();
  const note = input.note?.trim().slice(0, 500) || null;

  const [row] = await db
    .insert(merchantSettlements)
    .values({ orderId: o.id, orgId, orgName, invoiceNo: o.invoiceNo, onlinePaidWon: o.totalWon, finalAmountWon: amount, feeBp, feeWon, status: 'declared', declaredAt: now, note })
    .onConflictDoUpdate({
      target: merchantSettlements.orderId,
      set: {
        orgId, orgName, onlinePaidWon: o.totalWon, finalAmountWon: amount, feeBp, feeWon, status: 'declared', declaredAt: now,
        consumerConfirmedAt: null, disputedAt: null, disputeNote: null, confirmedAt: null, confirmedBy: null, note, updatedAt: now,
      },
    })
    .returning();
  if (!row) return { ok: false, reason: 'bad_amount' };
  await mirror(o.id, row, org.name);

  await sendAdminTelegram(
    `<b>💳 최종 결제금액 입력 (QR 3자 검증)</b>\n<code>${o.invoiceNo}</code> · ${esc(o.listingTitle)}\n사업자: ${esc(org.name)}${existing ? ' · 정정' : ''}\n온라인 결제 ${won(o.totalWon)} → 최종 ${won(amount)}\n플랫폼 수수료 ${won(feeWon)} (${pct(feeBp)})\n소비자 확인 대기 · ${AUTO_CONFIRM_HOURS}시간 무응답 시 자동 확정`,
  ).catch(() => false);
  return { ok: true, settlement: row };
}

export type RespondResult =
  | { ok: true; settlement: MerchantSettlementRow }
  | { ok: false; reason: 'forbidden' | 'none' | 'locked' };

/** 소비자가 가맹점이 입력한 금액을 확인하거나 이의 제기. 주문 소유자만. */
export async function consumerRespond(o: OrderRow, userId: string, action: 'confirm' | 'dispute', note?: string | null): Promise<RespondResult> {
  if (!o.userId || o.userId !== userId) return { ok: false, reason: 'forbidden' };
  const [existing] = await db.select().from(merchantSettlements).where(eq(merchantSettlements.orderId, o.id)).limit(1);
  if (!existing) return { ok: false, reason: 'none' };
  if (existing.status !== 'declared') return { ok: false, reason: 'locked' };
  const now = new Date();
  const [row] = await db
    .update(merchantSettlements)
    .set(action === 'confirm'
      ? { status: 'confirmed', consumerConfirmedAt: now, confirmedAt: now, confirmedBy: 'consumer', updatedAt: now }
      : { status: 'disputed', disputedAt: now, disputeNote: note?.trim().slice(0, 500) || null, updatedAt: now })
    .where(eq(merchantSettlements.id, existing.id))
    .returning();
  if (!row) return { ok: false, reason: 'none' };
  await mirror(o.id, row);
  await sendAdminTelegram(
    action === 'confirm'
      ? `<b>✅ 소비자 금액 확인</b>\n<code>${o.invoiceNo}</code> · ${esc(o.listingTitle)}\n최종 ${won(row.finalAmountWon)} · 수수료 ${won(row.feeWon)} (${pct(row.feeBp)}) 확정`
      : `<b>⚠️ 소비자 금액 이의</b>\n<code>${o.invoiceNo}</code> · ${esc(o.listingTitle)}\n가맹점 입력 ${won(row.finalAmountWon)} (${esc(row.orgName ?? '')})\n사유: ${esc(row.disputeNote ?? '(없음)')}\n→ 마스터 주문 화면에서 확인·확정 필요`,
  ).catch(() => false);
  return { ok: true, settlement: row };
}

/** 마스터가 상태를 직접 옮긴다 — 이의 조정 후 확정, 수수료 청구/입금 표시, 되돌리기. */
export async function masterSetSettlementStatus(orderId: string, status: SettlementStatus, note?: string | null): Promise<MerchantSettlementRow | null> {
  const [existing] = await db.select().from(merchantSettlements).where(eq(merchantSettlements.orderId, orderId)).limit(1);
  if (!existing) return null;
  const now = new Date();
  const set: Partial<typeof merchantSettlements.$inferInsert> = { status, updatedAt: now };
  if (note !== undefined) set.note = note?.trim().slice(0, 500) || null;
  if (status === 'confirmed') { set.confirmedAt = now; set.confirmedBy = 'master'; }
  if (status === 'invoiced') set.invoicedAt = now;
  if (status === 'paid') set.paidAt = now;
  if (status === 'declared') { set.confirmedAt = null; set.confirmedBy = null; set.consumerConfirmedAt = null; set.disputedAt = null; set.invoicedAt = null; set.paidAt = null; }
  const [row] = await db.update(merchantSettlements).set(set).where(eq(merchantSettlements.id, existing.id)).returning();
  if (row) await mirror(orderId, row);
  return row ?? null;
}

/** 크론: 입력 후 N시간 동안 소비자 응답이 없는 건을 자동 확정. */
export async function autoConfirmStaleSettlements(hours = AUTO_CONFIRM_HOURS): Promise<{ confirmed: number }> {
  const rows = await db
    .update(merchantSettlements)
    .set({ status: 'confirmed', confirmedAt: new Date(), confirmedBy: 'auto', updatedAt: new Date() })
    .where(sql`${merchantSettlements.status} = 'declared' and ${merchantSettlements.declaredAt} < now() - make_interval(hours => ${hours})`)
    .returning();
  for (const r of rows) await mirror(r.orderId, r);
  return { confirmed: rows.length };
}

export async function loadSettlementsForOrders(orderIds: string[]): Promise<Map<string, MerchantSettlementRow>> {
  const m = new Map<string, MerchantSettlementRow>();
  if (orderIds.length === 0) return m;
  const rows = await db.select().from(merchantSettlements).where(inArray(merchantSettlements.orderId, orderIds));
  for (const r of rows) m.set(r.orderId, r);
  return m;
}

export async function listOrgSettlements(orgId: string, limit = 200): Promise<MerchantSettlementRow[]> {
  return db.select().from(merchantSettlements).where(eq(merchantSettlements.orgId, orgId)).orderBy(desc(merchantSettlements.declaredAt)).limit(limit);
}

export const SETTLEMENT_STATUS_KO: Record<SettlementStatus, string> = {
  declared: '소비자 확인 대기',
  confirmed: '금액 확정',
  disputed: '소비자 이의',
  invoiced: '수수료 청구됨',
  paid: '수수료 입금 완료',
};
