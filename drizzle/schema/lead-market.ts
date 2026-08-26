import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { conversations } from './conversations';
import { users } from './users';

/**
 * 리드 마켓 — 환자 문의(DB)를 병원(medical 조직)에 판매하는 구조.
 *
 *   환자가 상품(병원 시술)에 문의 → 리드 생성 (conversations)
 *   병원은 충전금(10만원 단위)으로 리드를 건당 3~6만원에 열람
 *
 * 지갑은 billing_accounts.prepaid_balance_krw 를 그대로 쓴다 (medical
 * PAYG 설계와 동일). 여기 두 테이블은 충전 신청과 열람 기록만 담는다.
 */

/**
 * lead_topups — 충전 신청. 병원이 금액(100,000원 단위)을 신청하면
 * pending 으로 쌓이고, 마스터가 입금을 확인하면 confirmed 로 바꾸며
 * billing_accounts.prepaid_balance_krw 에 가산한다.
 */
export const leadTopups = pgTable(
  'lead_topups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** 충전 금액 (KRW) — 100,000원 단위. */
    amountWon: integer('amount_won').notNull(),
    /** pending → confirmed / rejected. */
    status: text('status').notNull().default('pending'),
    method: text('method').notNull().default('bank'), // bank | toss
    note: text('note'),
    requestedByUserId: uuid('requested_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index('lead_topups_org_idx').on(t.organizationId, t.status),
    statusIdx: index('lead_topups_status_idx').on(t.status, t.createdAt),
  }),
);

/**
 * lead_unlocks — 열람 기록. (병원 조직, 리드 대화) 당 1회만 과금하고
 * 이후에는 무료로 다시 볼 수 있다.
 */
export const leadUnlocks = pgTable(
  'lead_unlocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    priceWon: integer('price_won').notNull(),
    /** 과금 기준이 된 관심 분야 키 (plastic_surgery 등). */
    interestKey: text('interest_key'),
    unlockedByUserId: uuid('unlocked_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgConversationUq: uniqueIndex('lead_unlocks_org_conversation_uq').on(
      t.organizationId,
      t.conversationId,
    ),
    orgIdx: index('lead_unlocks_org_idx').on(t.organizationId, t.createdAt),
  }),
);

export type LeadTopup = typeof leadTopups.$inferSelect;
export type LeadUnlock = typeof leadUnlocks.$inferSelect;
