import 'server-only';
import { and, desc, eq, inArray, like, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { partnerListings } from '@/drizzle/schema/partner-listings';
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

/**
 * 총판 코드 — 국가별 일련번호. 예: JP_0001, JP_0002 …
 * 같은 국가에서 이미 발급된 최댓값 + 1. 동시 생성으로 충돌하면 unique
 * 인덱스가 잡고, 호출부가 재조회해 다음 번호로 재시도한다.
 */
export async function nextDistributorCode(countryCode: string): Promise<string> {
  const cc = countryCode.toUpperCase().slice(0, 2);
  const rows = await db
    .select({ code: referralPartners.code })
    .from(referralPartners)
    .where(and(eq(referralPartners.role, 'distributor'), like(referralPartners.code, `${cc}_%`)));
  // 주의: 템플릿 리터럴에서 \d 는 이스케이프가 사라져 'd'가 된다 — \\d 필수.
  // (이 버그로 기존 코드가 항상 JP_0001 을 재발급 → 유니크 충돌 → 총판
  //  생성이 code_collision 으로 실패했었다. 2026-08-27 수정)
  const re = new RegExp(`^${cc}_(\\d+)$`);
  let max = 0;
  for (const r of rows) {
    const m = re.exec(r.code);
    if (m?.[1]) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${cc}_${String(max + 1).padStart(4, '0')}`;
}

/** 추천인 코드 — 혼동되는 글자(0/O, 1/I)를 뺀 8자리 랜덤. 앞 두 글자는 국가. */
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
  // 정산 비율(feeShare)을 포함한 모든 설정은 총판별 config 를 그대로 쓴다.
  // 일본 마스터가 각 총판 상세 화면에서 총판마다 개별로 정한다.
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

/**
 * 사이트 결제 주문 → 총판 여행상품 마진 자동 적립.
 *
 * 총판에 귀속된 회원이 여행 패키지(partner_listings.category =
 * 'travel_package')를 구매하면, 입금 확인(paid) 시점에 판매금액(패키지
 * 소계)의 travelMarginPct%(기본 10%)를 총판 마진으로 적립한다. 확정은
 * 결제 확인 + holdDays 후. 같은 주문에 중복 적립하지 않는다(멱등).
 *
 * 반환: 적립된 마진 원화 (해당 없으면 0).
 */
export async function accrueOrderTravelMargin(orderId: string): Promise<number> {
  const [order] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.id, orderId)).limit(1);
  if (!order || !order.distributorId || !order.listingSlug) return 0;

  // 여행 패키지 여부는 상품 카테고리로 판단한다
  const [listing] = await db
    .select({ category: partnerListings.category })
    .from(partnerListings)
    .where(eq(partnerListings.slug, order.listingSlug))
    .limit(1);
  if (!listing || listing.category !== 'travel_package') return 0;

  // 이미 이 주문에 마진 행이 있으면 중복 적립하지 않는다
  const existing = await db
    .select({ id: commissionLedger.id })
    .from(commissionLedger)
    .where(and(eq(commissionLedger.orderId, orderId), eq(commissionLedger.basis, 'travel_margin')))
    .limit(1);
  if (existing.length > 0) return 0;

  const config = await getDistributorConfig(order.distributorId);
  const marginPct = config.travelMarginPct ?? 0;
  if (marginPct <= 0) return 0;

  // 판매금액 = 패키지 소계(플랫폼 서비스 수수료 제외). 값이 없으면 총액.
  const saleBase = order.subtotalWon || order.totalWon;
  const amountWon = Math.round((saleBase * marginPct) / 100);
  if (amountWon <= 0) return 0;

  // 확정 시점 = 여행 시작일. 그날이 오기 전에는 '예비 적립'(pending),
  // 시작일이 지나면 confirmDueLedger 가 '확정 적립'(confirmed)으로 올린다.
  // 여행 취소·환불이 시작 전에 나면 예비 적립이 그대로 환수된다.
  // 시작일을 모르면(구주문) 결제 확인 + holdDays 로 폴백.
  const tripStart = order.reserveYmd && /^\d{4}-\d{2}-\d{2}$/.test(order.reserveYmd)
    ? new Date(order.reserveYmd + 'T00:00:00')
    : null;
  const confirmAt = tripStart ?? new Date((order.paidAt ?? new Date()).getTime() + config.holdDays * 86_400_000);
  await db.insert(commissionLedger).values({
    orderId: order.id,
    distributorId: order.distributorId,
    beneficiary: 'distributor',
    beneficiaryPartnerId: order.partnerId ?? order.distributorId,
    beneficiaryUserId: null,
    basis: 'travel_margin',
    rateBp: Math.round(marginPct * 100),
    baseAmountWon: saleBase,
    amountWon,
    status: 'pending',
    confirmAt,
    note: `여행상품 마진 ${marginPct}% · ${order.invoiceNo}`,
  });
  return amountWon;
}

/**
 * 사이트 결제 주문 → 병원 수수료 자동 정산 (해외 총판 트랙).
 *
 * 플랫폼에 게시된 의료상품(partner_listings.category='hospital')을 총판
 * 귀속 고객이 구매하고 입금이 확인(paid)되면, 구매가(상품 소계, 플랫폼
 * 서비스 수수료 제외)에 진료과별 병원 수수료율(feePctByCategory —
 * 성형 30%·피부 20% 등)을 적용해 수수료 풀을 만들고, 그 풀을 해당
 * 총판 계약의 배분율(config.feeShare.distributorPct, 총판별로 일본
 * 마스터가 설정)대로 총판/플랫폼(및 배분표 모드면 추천인 단계)으로
 * 나눠 수당 원장에 적립한다 — computeLedger 를 그대로 재사용하므로
 * 수동 실적 등록과 계산이 항상 일치한다.
 *
 * 확정(confirmAt)은 시술 예약일 + holdDays — "지급 확정 = 시술 완료 +
 * 14일, 환불 시 환수" 원칙. 예약일을 모르면 결제 확인 + holdDays.
 * 같은 주문에 중복 적립하지 않는다(멱등). 반환: 적립 합계 원화.
 */
export async function accrueOrderHospitalFee(orderId: string): Promise<number> {
  const [order] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.id, orderId)).limit(1);
  if (!order || !order.distributorId || !order.listingSlug) return 0;

  // 의료상품 여부는 게시 리스팅의 카테고리로 판단한다
  const [listing] = await db
    .select({ category: partnerListings.category, details: partnerListings.details })
    .from(partnerListings)
    .where(eq(partnerListings.slug, order.listingSlug))
    .limit(1);
  if (!listing || listing.category !== 'hospital') return 0;

  // 이미 이 주문에 병원 수수료 행이 있으면 중복 적립하지 않는다
  const existing = await db
    .select({ id: commissionLedger.id })
    .from(commissionLedger)
    .where(and(eq(commissionLedger.orderId, orderId), eq(commissionLedger.basis, 'hospital_fee')))
    .limit(1);
  if (existing.length > 0) return 0;

  // 진료과: 리스팅 subType(성형/피부…) 우선, 없으면 주문의 관심 카테고리
  const details = (listing.details ?? {}) as { subType?: string };
  const category = details.subType ?? order.interestKey ?? null;

  const config = await getDistributorConfig(order.distributorId);
  const feeBp = resolveFeeBp(category, config);
  if (feeBp <= 0) return 0;

  const procedureAmountWon = order.subtotalWon || order.totalWon;
  const chain = order.partnerId
    ? await resolveChain(order.partnerId)
    : { l1PartnerId: null, l2PartnerId: null };
  const drafts = computeLedger({
    kind: 'procedure',
    category,
    procedureAmountWon,
    saleAmountWon: 0,
    hospitalFeeBp: feeBp,
    distributorId: order.distributorId,
    l1PartnerId: chain.l1PartnerId,
    l2PartnerId: chain.l2PartnerId,
    patientUserId: order.userId,
    config,
  });
  if (drafts.length === 0) return 0;

  const procDate = order.reserveYmd && /^\d{4}-\d{2}-\d{2}$/.test(order.reserveYmd)
    ? new Date(order.reserveYmd + 'T00:00:00')
    : (order.paidAt ?? new Date());
  const confirmAt = new Date(procDate.getTime() + config.holdDays * 86_400_000);

  return db.transaction(async (tx) => {
    await tx.insert(commissionLedger).values(
      drafts.map((d) => ({
        orderId: order.id,
        distributorId: order.distributorId as string,
        beneficiary: d.beneficiary,
        beneficiaryPartnerId: d.beneficiaryPartnerId,
        beneficiaryUserId: d.beneficiaryUserId,
        basis: d.basis,
        rateBp: d.rateBp,
        baseAmountWon: d.baseAmountWon,
        amountWon: d.amountWon,
        status: 'pending' as const,
        confirmAt,
        note: `의료상품 결제 자동 정산 · ${order.invoiceNo}`,
      })),
    );
    // 마스터 주문·정산 화면이 수동 실적 등록과 같은 필드를 보도록 채운다
    await tx
      .update(checkoutOrders)
      .set({
        procedureCategory: category,
        procedureAmountWon,
        hospitalFeeBp: feeBp,
        updatedAt: new Date(),
      })
      .where(eq(checkoutOrders.id, order.id));
    return drafts.reduce((a, d) => a + d.amountWon, 0);
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
