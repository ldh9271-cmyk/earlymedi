import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { hospitals } from '@/drizzle/schema/hospitals';
import { organizations } from '@/drizzle/schema/organizations';
import { sendAdminTelegram } from '@/lib/notify/admin-alert';
import { signVoucher, verifyVoucher, type VoucherMeta, type VoucherSettlementMeta } from './token';

/**
 * QR 바우처 — 소비자·사업자·플랫폼 3자가 같은 주문 레코드를 보는 흐름.
 *
 *  소비자: 결제 완료 주문의 QR(/v/<token>)을 마이페이지에서 보여준다.
 *  사업자: /scan 에서 QR 을 읽어 checkIn() — 주문 meta.voucher 에 방문 확인 기록.
 *  플랫폼: 마스터 주문 목록·텔레그램 알림으로 즉시 확인.
 */
export type VoucherSummary = {
  orderId: string;
  token: string;
  invoiceNo: string;
  listingTitle: string;
  listingSlug: string | null;
  hospitalName: string | null;
  reserveDate: string;
  reserveTime: string;
  guests: number;
  status: string;
  totalWon: number;
  subtotalWon: number;
  depositWon: number | null;
  payOnSiteWon: number | null;
  reserveConfirmedAt: string | null;
  checkedInAt: string | null;
  checkedInByName: string | null;
  /** 사업자/소비자 화면에서만 채움 */
  guestName?: string | null;
  guestContact?: string | null;
  userEmail?: string | null;
  locale: string;
  paidAt: string | null;
  /** 3자 검증 정산 — 가맹점이 입력한 최종 결제금액. 수수료(feeBp/feeWon)는 사업자·마스터 화면(withFee)에만. */
  settlement: VoucherSettlementView | null;
};

export type VoucherSettlementView = {
  finalAmountWon: number;
  onlinePaidWon: number;
  status: VoucherSettlementMeta['status'];
  declaredAt: string;
  declaredBy: string | null;
  consumerConfirmedAt: string | null;
  disputedAt: string | null;
  disputeNote: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  feeBp?: number;
  feeWon?: number;
};

type OrderRow = typeof checkoutOrders.$inferSelect;

export async function loadOrderByToken(token: string): Promise<OrderRow | null> {
  const orderId = verifyVoucher(token);
  if (!orderId) return null;
  const [o] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.id, orderId)).limit(1);
  return o ?? null;
}

export async function loadOrderByInvoice(invoiceNo: string): Promise<OrderRow | null> {
  const [o] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.invoiceNo, invoiceNo)).limit(1);
  return o ?? null;
}

export function summarize(o: OrderRow, opts: { withPII: boolean; withFee?: boolean }): VoucherSummary {
  const meta = (o.meta ?? {}) as { depositWon?: number; payOnSiteWon?: number; reserveConfirmedAt?: string; voucher?: VoucherMeta };
  const v = meta.voucher ?? {};
  const st = v.settlement;
  const settlement: VoucherSettlementView | null = st
    ? {
      finalAmountWon: st.finalAmountWon, onlinePaidWon: st.onlinePaidWon, status: st.status, declaredAt: st.declaredAt,
      declaredBy: st.declaredBy ?? null, consumerConfirmedAt: st.consumerConfirmedAt ?? null, disputedAt: st.disputedAt ?? null,
      disputeNote: opts.withPII ? (st.disputeNote ?? null) : null, confirmedAt: st.confirmedAt ?? null, confirmedBy: st.confirmedBy ?? null,
      ...(opts.withFee ? { feeBp: st.feeBp, feeWon: st.feeWon } : {}),
    }
    : null;
  return {
    settlement,
    orderId: o.id,
    token: signVoucher(o.id),
    invoiceNo: o.invoiceNo,
    listingTitle: o.listingTitle,
    listingSlug: o.listingSlug,
    hospitalName: o.hospitalName,
    reserveDate: o.reserveDate,
    reserveTime: o.reserveTime,
    guests: o.guests,
    status: o.status,
    totalWon: o.totalWon,
    subtotalWon: o.subtotalWon,
    depositWon: meta.depositWon ?? null,
    payOnSiteWon: meta.payOnSiteWon ?? null,
    reserveConfirmedAt: meta.reserveConfirmedAt ?? null,
    checkedInAt: v.checkedInAt ?? null,
    checkedInByName: v.checkedInByName ?? null,
    locale: o.locale,
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    ...(opts.withPII ? { guestName: o.guestName ?? o.patientLabel ?? null, guestContact: o.guestContact ?? null, userEmail: o.userEmail ?? null } : {}),
  };
}

/** 이 조직이 해당 주문의 사업자인가 — 리스팅 소유 org, 또는 병원(에이전시 등록/의료기관 연결) org. */
export async function orgCanCheckIn(o: OrderRow, orgId: string): Promise<boolean> {
  if (o.listingSlug) {
    const [l] = await db.select({ owner: partnerListings.ownerOrgId }).from(partnerListings).where(eq(partnerListings.slug, o.listingSlug)).limit(1);
    if (l?.owner === orgId) return true;
  }
  if (o.hospitalName) {
    const rows = await db.select({ org: hospitals.organizationId, linked: hospitals.linkedOrgId }).from(hospitals).where(eq(hospitals.name, o.hospitalName));
    if (rows.some((h) => h.org === orgId || h.linked === orgId)) return true;
  }
  return false;
}

export type CheckInResult =
  | { ok: true; already: boolean; summary: VoucherSummary }
  | { ok: false; reason: 'invalid' | 'not_paid' | 'cancelled' | 'forbidden' };

/** 방문 확인(체크인). 멱등 — 이미 확인된 주문은 already=true 로 그대로 돌려준다. */
export async function checkIn(token: string, org: { id: string; name: string; isMaster?: boolean }): Promise<CheckInResult> {
  const o = await loadOrderByToken(token);
  if (!o) return { ok: false, reason: 'invalid' };
  if (o.status === 'cancelled') return { ok: false, reason: 'cancelled' };
  if (o.status !== 'paid') return { ok: false, reason: 'not_paid' };
  if (!org.isMaster && !(await orgCanCheckIn(o, org.id))) return { ok: false, reason: 'forbidden' };

  const meta = (o.meta ?? {}) as { voucher?: VoucherMeta };
  if (meta.voucher?.checkedInAt) return { ok: true, already: true, summary: summarize(o, { withPII: true, withFee: true }) };

  const now = new Date().toISOString();
  const voucher: VoucherMeta = {
    checkedInAt: now, checkedInByOrgId: org.id, checkedInByName: org.name,
    checkins: [...(meta.voucher?.checkins ?? []), { at: now, orgId: org.id, orgName: org.name }],
  };
  await db.execute(sql`update checkout_orders set meta = meta || ${JSON.stringify({ voucher })}::jsonb, updated_at = now() where id = ${o.id}`);
  const [fresh] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.id, o.id)).limit(1);

  await sendAdminTelegram(
    `<b>✅ 방문 확인 (QR 체크인)</b>\n<code>${o.invoiceNo}</code> · ${escapeHtml(o.listingTitle)}\n사업자: ${escapeHtml(org.name)}\n예약: ${o.reserveDate} ${o.reserveTime} · ${o.guests}명\n결제: ₩${o.totalWon.toLocaleString('ko-KR')}${(o.meta as { payOnSiteWon?: number })?.payOnSiteWon ? ` · 현장결제 예정 ₩${Number((o.meta as { payOnSiteWon?: number }).payOnSiteWon).toLocaleString('ko-KR')}` : ''}`,
  ).catch(() => false);

  return { ok: true, already: false, summary: summarize(fresh ?? o, { withPII: true, withFee: true }) };
}

/** 조직의 최근 체크인 목록 (스캔 화면 하단). */
export async function recentCheckIns(orgId: string, limit = 20): Promise<VoucherSummary[]> {
  const rows = (await db.execute(sql`
    select * from checkout_orders
     where meta->'voucher'->>'checkedInByOrgId' = ${orgId}
     order by (meta->'voucher'->>'checkedInAt') desc
     limit ${limit}`)) as unknown as OrderRow[];
  return rows.map((r) => summarize(normalizeRow(r), { withPII: true, withFee: true }));
}

/** 마스터용 — 조직 구분 없이 최근 체크인 전체. */
export async function recentCheckInsAll(limit = 30): Promise<VoucherSummary[]> {
  const rows = (await db.execute(sql`
    select * from checkout_orders
     where meta->'voucher'->>'checkedInAt' is not null
     order by (meta->'voucher'->>'checkedInAt') desc
     limit ${limit}`)) as unknown as OrderRow[];
  return rows.map((r) => summarize(normalizeRow(r), { withPII: true, withFee: true }));
}

export async function orgName(orgId: string): Promise<string> {
  const [o] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
  return o?.name ?? '사업자';
}

/** db.execute 는 snake_case 컬럼을 그대로 주므로 camelCase 로 맞춘다. */
function normalizeRow(r: Record<string, unknown>): OrderRow {
  const g = (k: string): unknown => r[k] ?? r[k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)];
  return {
    ...(r as unknown as OrderRow),
    invoiceNo: String(g('invoiceNo') ?? ''),
    listingTitle: String(g('listingTitle') ?? ''),
    listingSlug: (g('listingSlug') as string | null) ?? null,
    hospitalName: (g('hospitalName') as string | null) ?? null,
    reserveDate: String(g('reserveDate') ?? ''),
    reserveTime: String(g('reserveTime') ?? ''),
    totalWon: Number(g('totalWon') ?? 0),
    subtotalWon: Number(g('subtotalWon') ?? 0),
    guestName: (g('guestName') as string | null) ?? null,
    guestContact: (g('guestContact') as string | null) ?? null,
    userEmail: (g('userEmail') as string | null) ?? null,
    patientLabel: (g('patientLabel') as string | null) ?? null,
    paidAt: g('paidAt') ? new Date(String(g('paidAt'))) : null,
  } as OrderRow;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c);
}
