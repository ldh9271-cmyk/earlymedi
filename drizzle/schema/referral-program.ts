import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { checkoutOrders } from './checkout-orders';

/**
 * 해외 총판 · 추천인 프로그램 (2026-07-28, 일본 총판 계약 기준).
 *
 *   총판(distributor) ─ 추천인 A ─ 추천인 B ─ … (모집 깊이는 무제한)
 *
 * 수당은 환자를 소개한 추천인(1단계)과 그 추천인을 모집한 사람(2단계)
 * 까지만 흐르고, 그 위 몫과 빈 단계 몫은 전부 총판에게 간다. 추천인
 * 등록에는 비용이 없고 수당은 실제 시술·여행상품 매출에서만 발생한다
 * (방문판매법 다단계 정의 밖에 두기 위한 설계 — 제안서 참고).
 */

export const referralPartnerRoleEnum = pgEnum('referral_partner_role', ['distributor', 'referrer']);

/**
 * 총판 수당 설정. 총판마다 계약이 다를 수 있어 jsonb 로 둔다.
 * 비율은 시술비 대비 %. network 의 네 항목 + platform 합이 병원
 * 수수료율과 같으면 딱 떨어지고, 다르면 차액은 총판이 가져간다
 * (총판 = 잔여 청구자). 빈 2단계 몫도 같은 원리로 총판에게 간다.
 */
export type DistributorConfig = {
  /**
   * 단순 정산 모드 (2026-08-24 일본 총판 계약 개정).
   * 설정되면 병원 유치 수수료(=100%)를 총판 distributorPct% / 플랫폼
   * 나머지%로만 나누고, 추천인 단계·환자 포인트 배분은 하지 않는다 —
   * 하위 조직 보상은 총판이 자체적으로 운영한다. null 이면 기존 배분표.
   */
  feeShare?: { distributorPct: number } | null;
  platformPct: number;
  feePctByCategory: Record<string, number>; // plastic_surgery: 30, dermatology: 20, default: 20
  direct: { patientPointsPct: number };
  network: Record<string, { patient: number; l1: number; l2: number }>;
  travelMarginPct: number;
  holdDays: number;
};

export const DEFAULT_DISTRIBUTOR_CONFIG: DistributorConfig = {
  feeShare: { distributorPct: 70 },
  platformPct: 3,
  feePctByCategory: { plastic_surgery: 30, dermatology: 20, default: 20 },
  direct: { patientPointsPct: 0 },
  network: {
    plastic_surgery: { patient: 5, l1: 14, l2: 5 },
    dermatology: { patient: 3, l1: 9, l2: 3 },
    default: { patient: 3, l1: 9, l2: 3 },
  },
  travelMarginPct: 10,
  holdDays: 14,
};

export const referralPartners = pgTable(
  'referral_partners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    role: referralPartnerRoleEnum('role').notNull(),
    /** 소속 총판. 총판 자신은 null. */
    distributorId: uuid('distributor_id'),
    /** 나를 모집한 사람 (총판 또는 추천인). 총판은 null. */
    parentId: uuid('parent_id'),

    /** QR·링크에 쓰는 코드. 전역 유일. 예: JP7K2M9Q */
    code: text('code').notNull(),
    name: text('name').notNull(),
    contact: text('contact'),
    countryCode: text('country_code').notNull().default('JP'),
    /** 기본 랜딩 로케일 (QR 스캔 시). */
    landingLocale: text('landing_locale').notNull().default('ja'),

    /** 플랫폼 계정과 연결 — 마이페이지에서 본인 QR·수당을 본다. */
    userId: uuid('user_id'),
    userEmail: text('user_email'),

    /** 총판만 사용. 추천인은 소속 총판 설정을 따른다. */
    config: jsonb('config').$type<DistributorConfig>(),

    clicks: integer('clicks').notNull().default(0),
    signups: integer('signups').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    codeUq: uniqueIndex('referral_partners_code_uq').on(t.code),
    distributorIdx: index('referral_partners_distributor_idx').on(t.distributorId, t.isActive),
    parentIdx: index('referral_partners_parent_idx').on(t.parentId),
    userIdx: index('referral_partners_user_idx').on(t.userId),
  }),
);

/**
 * 환자(계정) → 추천인 영구 귀속. 최초 접촉 우선: 한 번 기록되면
 * 다른 코드로 들어와도 바뀌지 않는다.
 */
export const referralAttributions = pgTable(
  'referral_attributions',
  {
    userId: uuid('user_id').primaryKey(),
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => referralPartners.id, { onDelete: 'cascade' }),
    distributorId: uuid('distributor_id').notNull(),
    source: text('source').notNull().default('qr'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    partnerIdx: index('referral_attributions_partner_idx').on(t.partnerId),
  }),
);

/**
 * 지역 관리자 — 총괄 마스터(astoriakr) 아래의 국가별 마스터 계층.
 *
 *   총괄 마스터 → 지역 마스터(JP 등) → 그 나라의 총판들 → 회원
 *
 * 지역 마스터는 /master/partners 에서 자기 국가의 총판만 보고 만들 수
 * 있다. 등록은 총괄 마스터가 이메일로 한다 (해당 이메일이 사이트에
 * 가입돼 있어야 로그인 가능).
 */
export const regionAdmins = pgTable(
  'region_admins',
  {
    email: text('email').primaryKey(),
    countryCode: text('country_code').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

export const ledgerBeneficiaryEnum = pgEnum('ledger_beneficiary', [
  'platform',
  'patient_points',
  'referrer_l1',
  'referrer_l2',
  'distributor',
]);
export const ledgerBasisEnum = pgEnum('ledger_basis', ['hospital_fee', 'travel_margin']);
export const ledgerStatusEnum = pgEnum('ledger_status', ['pending', 'confirmed', 'paid', 'reversed']);

/**
 * 수당 원장. 주문 하나가 확정(시술 완료 등록)되면 배분표대로 행이
 * 생긴다. pending → (완료 + holdDays) → confirmed → 월 정산 → paid.
 * 환불·취소 시 reversed.
 */
export const commissionLedger = pgTable(
  'commission_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => checkoutOrders.id, { onDelete: 'cascade' }),
    distributorId: uuid('distributor_id').notNull(),

    beneficiary: ledgerBeneficiaryEnum('beneficiary').notNull(),
    beneficiaryPartnerId: uuid('beneficiary_partner_id'),
    beneficiaryUserId: uuid('beneficiary_user_id'),

    basis: ledgerBasisEnum('basis').notNull(),
    /** 시술비(또는 판매가) 대비 %. 소수 둘째 자리까지 × 100 = bp. */
    rateBp: integer('rate_bp').notNull(),
    baseAmountWon: integer('base_amount_won').notNull(),
    amountWon: integer('amount_won').notNull(),

    status: ledgerStatusEnum('status').notNull().default('pending'),
    confirmAt: timestamp('confirm_at', { withTimezone: true }).notNull(),
    /** 지급 정산 월 (YYYY-MM). paid 로 바뀔 때 기록. */
    settlementPeriod: text('settlement_period'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    reversedAt: timestamp('reversed_at', { withTimezone: true }),
    note: text('note'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index('commission_ledger_order_idx').on(t.orderId),
    distributorIdx: index('commission_ledger_distributor_idx').on(t.distributorId, t.status),
    partnerIdx: index('commission_ledger_partner_idx').on(t.beneficiaryPartnerId, t.status),
    userIdx: index('commission_ledger_user_idx').on(t.beneficiaryUserId, t.status),
  }),
);
