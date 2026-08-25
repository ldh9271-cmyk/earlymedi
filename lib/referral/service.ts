import 'server-only';
import { and, desc, eq, inArray, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import {
  commissionLedger,
  referralAttributions,
  referralPartners,
  regionAdmins,
  DEFAULT_DISTRIBUTOR_CONFIG,
  type DistributorConfig,
} from '@/drizzle/schema/referral-program';
import { computeLedger, resolveFeeBp } from './commission';

export const REF_COOKIE = 'gu_ref';
/** 추천인 가입 초대로 들어온 경우 — /me/referral 에서 참여 버튼을 띄운다. */
export const REF_JOIN_COOKIE = 'gu_ref_join';
export const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type Partner = typeof referralPartners.$inferSelect;

/** 혼동되는 글자(0/O, 1/I)를 뺀 8자리 코드. 앞 두 글자는 국가. */
export function generateCode(countryCode: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i += 1) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${countryCode.toUpperCase().slice(0, 2)}${s}`;
}

/** Supabase auth 계정을 이메일로 찾는다 (운영자가 파트너·환자를 계정에 묶을 때). */
export async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const res = await db.execute(sql`select id from auth.users where lower(email) = ${email.toLowerCase()} limit 1`);
  const rows = (Array.isArray(res) ? res : ((res as { rows?: unknown[] }).rows ?? [])) as Array<{ id: string }>;
  return rows[0]?.id ?? null;
}

export async function getPartnerByCode(code: string): Promise<Partner | null> {
  const [row] = await db
    .select()
    .from(referralPartners)
    .where(and(eq(referralPartners.code, code.toUpperCase()), eq(referralPartners.isActive, true)))
    .limit(1);
  return row ?? null;
}

export async function getPartnerById(id: string): Promise<Partner | null> {
  const [row] = await db.select().from(referralPartners).where(eq(referralPartners.id, id)).limit(1);
  return row ?? null;
}

export async function getPartnerByUserId(userId: string): Promise<Partner | null> {
  const [row] = await db
    .select()
    .from(referralPartners)
    .where(and(eq(referralPartners.userId, userId), eq(referralPartners.isActive, true)))
    .limit(1);
  return row ?? null;
}

export async function getDistributorConfig(distributorId: string): Promise<DistributorConfig> {
  const d = await getPartnerById(distributorId);
  return { ...DEFAULT_DISTRIBUTOR_CONFIG, ...(d?.config ?? {}) };
}

/**
 * 환자를 소개한 파트너로부터 수당 체인을 푼다.
 *   총판 직접      → l1 = null, l2 = null
 *   추천인 A(총판 모집) → l1 = A, l2 = null
 *   추천인 B(A 모집)   → l1 = B, l2 = A
 */
export async function resolveChain(partnerId: string): Promise<{
  distributorId: string; l1PartnerId: string | null; l2PartnerId: string | null;
}> {
  const p = await getPartnerById(partnerId);
  if (!p) throw new Error('partner_not_found');
  if (p.role === 'distributor') return { distributorId: p.id, l1PartnerId: null, l2PartnerId: null };
  const distributorId = p.distributorId ?? '';
  let l2: string | null = null;
  if (p.parentId) {
    const parent = await getPartnerById(p.parentId);
    if (parent && parent.role === 'referrer') l2 = parent.id;
  }
  return { distributorId, l1PartnerId: p.id, l2PartnerId: l2 };
}

/** 최초 접촉 우선 — 이미 귀속된 계정은 건드리지 않는다. */
export async function attributeUser(userId: string, code: string, source = 'qr'): Promise<Partner | null> {
  const partner = await getPartnerByCode(code);
  if (!partner) return null;
  const distributorId = partner.role === 'distributor' ? partner.id : partner.distributorId;
  if (!distributorId) return null;
  const inserted = await db
    .insert(referralAttributions)
    .values({ userId, partnerId: partner.id, distributorId, source })
    .onConflictDoNothing()
    .returning({ userId: referralAttributions.userId });
  if (inserted.length > 0) {
    await db
      .update(referralPartners)
      .set({ signups: sql`${referralPartners.signups} + 1`, updatedAt: new Date() })
      .where(eq(referralPartners.id, partner.id));
  }
  return partner;
}

export async function getAttribution(userId: string): Promise<{ partnerId: string; distributorId: string } | null> {
  const [row] = await db
    .select({ partnerId: referralAttributions.partnerId, distributorId: referralAttributions.distributorId })
    .from(referralAttributions)
    .where(eq(referralAttributions.userId, userId))
    .limit(1);
  return row ?? null;
}

/** 초대 링크로 들어온 계정을 추천인으로 등록한다 (무료). */
export async function joinAsReferrer(opts: {
  userId: string; userEmail: string | null; name: string; parentCode: string;
}): Promise<Partner> {
  const existing = await getPartnerByUserId(opts.userId);
  if (existing) return existing;
  const parent = await getPartnerByCode(opts.parentCode);
  if (!parent) throw new Error('invite_not_found');
  const distributorId = parent.role === 'distributor' ? parent.id : parent.distributorId;
  if (!distributorId) throw new Error('invite_not_found');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const [row] = await db
        .insert(referralPartners)
        .values({
          role: 'referrer',
          distributorId,
          parentId: parent.id,
          code: generateCode(parent.countryCode),
          name: opts.name,
          countryCode: parent.countryCode,
          landingLocale: parent.landingLocale,
          userId: opts.userId,
          userEmail: opts.userEmail,
        })
        .returning();
      if (row) return row;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('unique') && !msg.includes('duplicate')) throw err;
    }
  }
  throw new Error('code_collision');
}

export type CreateResultOrderInput = {
  distributorId: string;
  /** 환자를 소개한 파트너 (총판 직접이면 총판 id). */
  partnerId: string;
  kind: 'procedure' | 'travel';
  category: string | null;
  procedureAmountWon: number;
  saleAmountWon: number;
  hospitalFeeBp: number | null;
  hospitalName: string | null;
  listingTitle: string;
  patientUserId: string | null;
  patientLabel: string | null;
  completedAt: Date;
  reserveDate: string;
  locale: string;
  invoiceNo?: string;
  note?: string | null;
};

function makeInvoiceNo(prefix: string): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${prefix}-${ymd}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

/**
 * 실적 등록: 시술 완료(또는 투어 출발)를 운영자가 확인하면 주문 + 원장을
 * 한 번에 만든다. 원장은 pending 이고 confirmAt = 완료 + holdDays.
 */
export async function createResultOrderWithLedger(input: CreateResultOrderInput): Promise<{
  orderId: string; invoiceNo: string; rows: number; total: number;
}> {
  const config = await getDistributorConfig(input.distributorId);
  const chain = await resolveChain(input.partnerId);
  const feeBp = input.hospitalFeeBp ?? resolveFeeBp(input.category, config);
  const drafts = computeLedger({
    kind: input.kind,
    category: input.category,
    procedureAmountWon: input.procedureAmountWon,
    saleAmountWon: input.saleAmountWon,
    hospitalFeeBp: feeBp,
    distributorId: input.distributorId,
    l1PartnerId: chain.l1PartnerId,
    l2PartnerId: chain.l2PartnerId,
    patientUserId: input.patientUserId,
    config,
  });
  const confirmAt = new Date(input.completedAt.getTime() + config.holdDays * 86_400_000);
  const total = input.kind === 'travel' ? input.saleAmountWon : input.procedureAmountWon;

  return db.transaction(async (tx) => {
    const [order] = await tx
      .insert(checkoutOrders)
      .values({
        invoiceNo: input.invoiceNo ?? makeInvoiceNo(input.kind === 'travel' ? 'GT' : 'GP'),
        status: 'paid',
        locale: input.locale,
        listingTitle: input.listingTitle,
        reserveDate: input.reserveDate,
        reserveTime: '-',
        guests: 1,
        unitPriceWon: total,
        subtotalWon: total,
        serviceFeeWon: 0,
        totalWon: total,
        paymentMethod: 'offline',
        userId: input.patientUserId,
        kind: input.kind,
        partnerId: input.partnerId,
        distributorId: input.distributorId,
        procedureCategory: input.category,
        procedureAmountWon: input.procedureAmountWon,
        hospitalFeeBp: feeBp,
        hospitalName: input.hospitalName,
        patientLabel: input.patientLabel,
        completedAt: input.completedAt,
        paidAt: input.completedAt,
        meta: { note: input.note ?? null, source: 'master_result_entry' },
      })
      .returning({ id: checkoutOrders.id, invoiceNo: checkoutOrders.invoiceNo });
    if (!order) throw new Error('order_insert_failed');
    if (drafts.length > 0) {
      await tx.insert(commissionLedger).values(
        drafts.map((d) => ({
          orderId: order.id,
          distributorId: input.distributorId,
          beneficiary: d.beneficiary,
          beneficiaryPartnerId: d.beneficiaryPartnerId,
          beneficiaryUserId: d.beneficiaryUserId,
          basis: d.basis,
          rateBp: d.rateBp,
          baseAmountWon: d.baseAmountWon,
          amountWon: d.amountWon,
          confirmAt,
        })),
      );
    }
    return {
      orderId: order.id,
      invoiceNo: order.invoiceNo,
      rows: drafts.length,
      total: drafts.reduce((a, d) => a + d.amountWon, 0),
    };
  });
}

/** 취소·환불 — 아직 지급 전이면 reversed, 이미 지급됐으면 음수 행을 추가해 다음 정산에서 환수. */
export async function reverseOrder(orderId: string, note: string): Promise<number> {
  const rows = await db.select().from(commissionLedger).where(eq(commissionLedger.orderId, orderId));
  let affected = 0;
  await db.transaction(async (tx) => {
    for (const r of rows) {
      if (r.status === 'reversed') continue;
      if (r.status === 'paid') {
        await tx.insert(commissionLedger).values({
          orderId: r.orderId, distributorId: r.distributorId, beneficiary: r.beneficiary,
          beneficiaryPartnerId: r.beneficiaryPartnerId, beneficiaryUserId: r.beneficiaryUserId,
          basis: r.basis, rateBp: r.rateBp, baseAmountWon: r.baseAmountWon, amountWon: -r.amountWon,
          status: 'confirmed', confirmAt: new Date(), note: `환수: ${note}`,
        });
      } else {
        await tx.update(commissionLedger)
          .set({ status: 'reversed', reversedAt: new Date(), note })
          .where(eq(commissionLedger.id, r.id));
      }
      affected += 1;
    }
    await tx.update(checkoutOrders)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(checkoutOrders.id, orderId));
  });
  return affected;
}

/** holdDays 가 지난 pending 행을 confirmed 로. */
export async function confirmDueLedger(distributorId?: string): Promise<number> {
  const where = distributorId
    ? and(eq(commissionLedger.status, 'pending'), lte(commissionLedger.confirmAt, new Date()), eq(commissionLedger.distributorId, distributorId))
    : and(eq(commissionLedger.status, 'pending'), lte(commissionLedger.confirmAt, new Date()));
  const updated = await db.update(commissionLedger).set({ status: 'confirmed' }).where(where).returning({ id: commissionLedger.id });
  return updated.length;
}

/** 월 정산: 총판의 confirmed 행을 paid 로 (플랫폼 몫과 환자 포인트는 지급 대상이 아니라 제외). */
export async function markSettled(distributorId: string, period: string): Promise<{ rows: number; amount: number }> {
  const updated = await db
    .update(commissionLedger)
    .set({ status: 'paid', paidAt: new Date(), settlementPeriod: period })
    .where(and(
      eq(commissionLedger.distributorId, distributorId),
      eq(commissionLedger.status, 'confirmed'),
      inArray(commissionLedger.beneficiary, ['referrer_l1', 'referrer_l2', 'distributor']),
    ))
    .returning({ amountWon: commissionLedger.amountWon });
  return { rows: updated.length, amount: updated.reduce((a, r) => a + r.amountWon, 0) };
}

export async function listDistributors(countryCode?: string): Promise<Partner[]> {
  const where = countryCode
    ? and(eq(referralPartners.role, 'distributor'), eq(referralPartners.countryCode, countryCode))
    : eq(referralPartners.role, 'distributor');
  return db.select().from(referralPartners).where(where).orderBy(desc(referralPartners.createdAt));
}

export type AdminScope = { isMaster: true; region: null } | { isMaster: false; region: string };

/**
 * 관리 권한 계층: 총괄 마스터(전체) > 지역 마스터(자기 국가의 총판만).
 * 지역 마스터가 아니면 null.
 */
export async function getRegionAdmin(email: string): Promise<string | null> {
  const [row] = await db
    .select({ countryCode: regionAdmins.countryCode })
    .from(regionAdmins)
    .where(eq(regionAdmins.email, email.toLowerCase()))
    .limit(1);
  return row?.countryCode ?? null;
}

export async function listRegionAdmins(): Promise<Array<{ email: string; countryCode: string; note: string | null }>> {
  return db.select({ email: regionAdmins.email, countryCode: regionAdmins.countryCode, note: regionAdmins.note }).from(regionAdmins);
}

export async function listReferrers(distributorId: string): Promise<Partner[]> {
  return db
    .select()
    .from(referralPartners)
    .where(and(eq(referralPartners.role, 'referrer'), eq(referralPartners.distributorId, distributorId)))
    .orderBy(desc(referralPartners.createdAt));
}

export type LedgerTotals = { pending: number; confirmed: number; paid: number };

/** 파트너(추천인·총판) 기준 수당 합계. */
export async function partnerTotals(partnerId: string): Promise<LedgerTotals> {
  const rows = await db
    .select({ status: commissionLedger.status, amount: sql<number>`coalesce(sum(${commissionLedger.amountWon}), 0)::int` })
    .from(commissionLedger)
    .where(eq(commissionLedger.beneficiaryPartnerId, partnerId))
    .groupBy(commissionLedger.status);
  const t: LedgerTotals = { pending: 0, confirmed: 0, paid: 0 };
  for (const r of rows) if (r.status in t) t[r.status as keyof LedgerTotals] = r.amount;
  return t;
}

/** 환자 포인트 잔액 (confirmed + paid). */
export async function patientPointsBalance(userId: string): Promise<number> {
  const [row] = await db
    .select({ amount: sql<number>`coalesce(sum(${commissionLedger.amountWon}), 0)::int` })
    .from(commissionLedger)
    .where(and(
      eq(commissionLedger.beneficiaryUserId, userId),
      eq(commissionLedger.beneficiary, 'patient_points'),
      inArray(commissionLedger.status, ['confirmed', 'paid']),
    ));
  return row?.amount ?? 0;
}
