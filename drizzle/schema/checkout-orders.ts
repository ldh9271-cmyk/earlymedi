import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * 공개 예약 결제 상태.
 *
 *   issued    — 게스트가 '결제하기'를 눌러 인보이스가 발행됨 (QR 노출)
 *   reported  — 게스트가 '결제를 완료했어요'를 눌러 입금을 신고함
 *   paid      — 운영자가 알리페이 정산에서 실제 입금을 확인함
 *   cancelled — 미결제 만료 / 게스트 취소
 *
 * reported 는 게스트의 자기신고일 뿐 입금 확인이 아니다 — 실제 확인은
 * 운영자가 paid 로 올려야 한다.
 */
export const checkoutOrderStatusEnum = pgEnum('checkout_order_status', [
  'issued',
  'reported',
  'paid',
  'cancelled',
]);

/**
 * checkout_orders
 *
 * 공개 포털 예약 팝업에서 발행되는 인보이스. 파트너 조직에 소속되지
 * 않은 게스트 주문이라 partner_bookings 와 분리했다 (그쪽은
 * organization_id 필수).
 *
 * 상품 정보는 스냅샷으로 저장한다 — 나중에 가격이나 제목이 바뀌어도
 * 발행 당시 조건이 인보이스에 남아야 하기 때문.
 */
export const checkoutOrders = pgTable(
  'checkout_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 사람이 읽는 인보이스 번호 — GU-20260727-4821 형태. */
    invoiceNo: text('invoice_no').notNull().unique(),
    status: checkoutOrderStatusEnum('status').notNull().default('issued'),

    locale: text('locale').notNull().default('kr'),

    // 상품 스냅샷
    listingSlug: text('listing_slug'),
    listingTitle: text('listing_title').notNull(),
    interestKey: text('interest_key'),

    // 예약 조건 (표시용 문자열 그대로 — 로케일 포맷을 유지)
    reserveDate: text('reserve_date').notNull(),
    reserveTime: text('reserve_time').notNull(),
    guests: integer('guests').notNull().default(1),

    // 금액 (KRW, 정수)
    unitPriceWon: integer('unit_price_won').notNull().default(0),
    subtotalWon: integer('subtotal_won').notNull().default(0),
    serviceFeeWon: integer('service_fee_won').notNull().default(0),
    totalWon: integer('total_won').notNull().default(0),
    paymentMethod: text('payment_method').notNull().default('alipay'),

    /** 로그인 상태로 예약했다면 그 계정 — 마이페이지 조회 키. */
    userId: uuid('user_id'),
    userEmail: text('user_email'),

    // ── 총판·추천인 프로그램 (2026-07-28) ──────────────────────────
    /** listing = 사이트 상품 인보이스(기본) · procedure = 운영자가 등록한
     *  시술 실적 · travel = 총판이 판매한 여행상품 (10% 마진 + 포함 시술). */
    kind: text('kind').notNull().default('listing'),
    /** 환자를 소개한 추천인(또는 총판 직접이면 총판) / 소속 총판. */
    partnerId: uuid('partner_id'),
    distributorId: uuid('distributor_id'),
    /** 시술 분류 — 병원 수수료율을 정한다 (plastic_surgery / dermatology / …). */
    procedureCategory: text('procedure_category'),
    /** 수수료 계산 기준 시술비. travel 은 패키지에 포함된 시술 금액. */
    procedureAmountWon: integer('procedure_amount_won'),
    /** 적용한 병원 수수료율 (bp, 3000 = 30%). 등록 시점 스냅샷. */
    hospitalFeeBp: integer('hospital_fee_bp'),
    hospitalName: text('hospital_name'),
    /** 계정 없는 환자를 운영자가 등록할 때의 표시 이름. */
    patientLabel: text('patient_label'),
    /** 시술 완료(또는 투어 출발) 확인 시각 — 수당 holdDays 의 기준. */
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // 게스트 연락처 — 인보이스 발행 시점엔 비어 있고, 문의 폼을 거치면 채워진다
    guestName: text('guest_name'),
    guestContact: text('guest_contact'),
    guestCountryCode: text('guest_country_code'),

    /** 부가 정보 (UA, referer 등) — 스키마 변경 없이 덧붙이기 위함. */
    meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    reportedAt: timestamp('reported_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
  },
  (t) => ({
    statusIdx: index('checkout_orders_status_idx').on(t.status, t.createdAt),
    createdIdx: index('checkout_orders_created_idx').on(t.createdAt),
    userIdx: index('checkout_orders_user_idx').on(t.userId, t.createdAt),
  }),
);
