import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { hospitalRegistry, type RegistryAgency, type RegistryDetails } from '@/drizzle/schema/hospital-registry';
import { sendAdminTelegram } from '@/lib/notify/admin-alert';

/**
 * 병원 정보 등록 대행 — 콘솔에서 '플랫폼 대행' 을 고르면 인보이스(checkout_orders, kind registry_agency)를
 * 발행해 토스로 결제하고, 결제가 확인되면 검수 큐(submission.status = submitted, mode agency)에 올라가
 * 운영팀이 자료를 받아 대신 등록한다.
 */
export const REGISTRY_AGENCY_FEE_WON = Math.max(0, Math.round(Number(process.env.REGISTRY_AGENCY_FEE_WON ?? 500_000)));
export const REGISTRY_AGENCY_KIND = 'registry_agency';

function makeInvoiceNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `GU-${ymd}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

export async function createAgencyOrder(input: { registryId: string; ykiho: string; name: string; orgId: string; userId: string; userEmail: string }): Promise<{ invoiceNo: string; orderId: string; amountWon: number }> {
  const [row] = await db.select({ details: hospitalRegistry.details }).from(hospitalRegistry).where(eq(hospitalRegistry.id, input.registryId)).limit(1);
  const existing = row?.details.agency;
  if (existing?.orderId) {
    const [o] = await db.select({ id: checkoutOrders.id, status: checkoutOrders.status, invoiceNo: checkoutOrders.invoiceNo, totalWon: checkoutOrders.totalWon }).from(checkoutOrders).where(eq(checkoutOrders.id, existing.orderId)).limit(1);
    if (o && o.status !== 'cancelled') return { invoiceNo: o.invoiceNo, orderId: o.id, amountWon: o.totalWon };
  }
  const amount = REGISTRY_AGENCY_FEE_WON;
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10);
  let created: { id: string; invoiceNo: string } | undefined;
  for (let i = 0; i < 5 && !created; i++) {
    try {
      const [r] = await db.insert(checkoutOrders).values({
        invoiceNo: makeInvoiceNo(), locale: 'kr', listingSlug: null, listingTitle: `병원 정보 등록 대행 · ${input.name}`.slice(0, 120), interestKey: REGISTRY_AGENCY_KIND,
        reserveDate: today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }), reserveYmd: ymd, reserveTime: '00:00', guests: 1,
        unitPriceWon: amount, subtotalWon: amount, serviceFeeWon: 0, totalWon: amount,
        userId: input.userId, userEmail: input.userEmail, kind: REGISTRY_AGENCY_KIND,
        meta: { registryId: input.registryId, ykiho: input.ykiho, orgId: input.orgId, registryAgency: true },
      }).returning({ id: checkoutOrders.id, invoiceNo: checkoutOrders.invoiceNo });
      created = r;
    } catch { /* 인보이스 번호 충돌 — 재시도 */ }
  }
  if (!created) throw new Error('인보이스를 발행하지 못했습니다');
  const agency: RegistryAgency = { requestedAt: new Date().toISOString(), orderId: created.id, invoiceNo: created.invoiceNo, amountWon: amount, status: 'requested' };
  const submission = { ...(row?.details.submission ?? { status: 'draft' as const }), mode: 'agency' as const };
  await db.execute(sql`update hospital_registry set details = coalesce(details,'{}'::jsonb) || ${JSON.stringify({ agency, submission })}::jsonb, updated_at = now() where id = ${input.registryId}`);
  await sendAdminTelegram(`<b>🧾 등록 대행 인보이스 발행</b>\n${esc(input.name)} · <code>${created.invoiceNo}</code> · ₩${amount.toLocaleString('ko-KR')}\n${esc(input.userEmail)}`).catch(() => false);
  return { invoiceNo: created.invoiceNo, orderId: created.id, amountWon: amount };
}

/** 결제 확인 훅 (토스 confirm/webhook · 마스터 입금 확인) — 대행 인보이스면 검수 큐에 올린다. 멱등. */
export async function onRegistryAgencyPaid(orderId: string): Promise<boolean> {
  const [o] = await db.select({ id: checkoutOrders.id, kind: checkoutOrders.kind, meta: checkoutOrders.meta, invoiceNo: checkoutOrders.invoiceNo, totalWon: checkoutOrders.totalWon }).from(checkoutOrders).where(eq(checkoutOrders.id, orderId)).limit(1);
  if (!o || o.kind !== REGISTRY_AGENCY_KIND) return false;
  const registryId = String((o.meta as { registryId?: string })?.registryId ?? '');
  if (!registryId) return false;
  const [row] = await db.select({ name: hospitalRegistry.name, details: hospitalRegistry.details }).from(hospitalRegistry).where(eq(hospitalRegistry.id, registryId)).limit(1);
  if (!row) return false;
  const d: RegistryDetails = row.details;
  if (d.agency?.paidAt) return true;
  const now = new Date().toISOString();
  const agency: RegistryAgency = { ...(d.agency ?? { requestedAt: now, orderId: o.id, invoiceNo: o.invoiceNo, amountWon: o.totalWon, status: 'requested' }), paidAt: now, status: 'paid' };
  const submission = d.submission?.status === 'approved'
    ? d.submission
    : { ...(d.submission ?? { status: 'draft' as const }), status: 'submitted' as const, mode: 'agency' as const, submittedAt: d.submission?.submittedAt ?? now };
  await db.execute(sql`update hospital_registry set details = coalesce(details,'{}'::jsonb) || ${JSON.stringify({ agency, submission })}::jsonb, updated_at = now() where id = ${registryId}`);
  await sendAdminTelegram(`<b>💳 등록 대행 결제 완료 — 작업 착수</b>\n${esc(row.name)} · <code>${o.invoiceNo}</code> · ₩${o.totalWon.toLocaleString('ko-KR')}\n→ 마스터 레지스트리 '병원 등록 검수' 에서 자료 확인 후 대신 등록`).catch(() => false);
  return true;
}

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c);
}
