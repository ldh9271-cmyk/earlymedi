import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * merchant_settlements — QR 방문 확인 뒤 가맹점이 입력한 "최종 결제금액"과 그에 대한 플랫폼 수수료.
 *
 *  3자 검증: 소비자(QR 제시·금액 확인) · 가맹점(스캔·최종금액 입력) · 플랫폼(기록·알림·확정).
 *  status: declared(가맹점 입력) → confirmed(소비자 확인 또는 72시간 무이의 자동확정, 마스터 수동) | disputed(소비자 이의)
 *          → invoiced(수수료 청구) → paid(수수료 입금)
 *  fee_bp: 만분율 ×100 표기(billing_plans.settlement_fee_bp 와 동일 — 1000 = 10.00%).
 */
export const merchantSettlements = pgTable(
  'merchant_settlements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull().unique(),
    orgId: text('org_id'),
    orgName: text('org_name'),
    invoiceNo: text('invoice_no').notNull(),
    onlinePaidWon: integer('online_paid_won').notNull().default(0),
    finalAmountWon: integer('final_amount_won').notNull(),
    feeBp: integer('fee_bp').notNull().default(0),
    feeWon: integer('fee_won').notNull().default(0),
    status: text('status').notNull().default('declared'),
    declaredAt: timestamp('declared_at', { withTimezone: true }).notNull().defaultNow(),
    consumerConfirmedAt: timestamp('consumer_confirmed_at', { withTimezone: true }),
    disputedAt: timestamp('disputed_at', { withTimezone: true }),
    disputeNote: text('dispute_note'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    confirmedBy: text('confirmed_by'), // consumer | auto | master
    invoicedAt: timestamp('invoiced_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index('merchant_settlements_org_idx').on(t.orgId, t.status),
    statusIdx: index('merchant_settlements_status_idx').on(t.status, t.declaredAt),
  }),
);
export type MerchantSettlementRow = typeof merchantSettlements.$inferSelect;
