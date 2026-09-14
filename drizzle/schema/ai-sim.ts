import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * AI 시뮬레이션 크레딧(포인트) 원장 + 실행 기록.
 *
 * 시뮬레이션 1회 = SIM_RUN_COST 포인트. 회원가입 첫 1회는 무료(원장에
 * 'free' 로 기록만 남기고 차감 0). 포인트는 토스로 충전 팩을 사면
 * 결제 확정 시 'purchase' 로 적립된다. 잔액 = delta 합계.
 *
 * 사진과 결과 이미지는 절대 저장하지 않는다 — 실행 기록엔 프리셋과
 * 성공 여부만 남는다(얼굴 분석과 같은 원칙).
 */
export const aiSimCredits = pgTable(
  'ai_sim_credits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    /** +충전 / -사용 (포인트 단위, 1P = ₩1) */
    delta: integer('delta').notNull(),
    /** purchase | run | free | refund | grant */
    reason: text('reason').notNull(),
    orderId: uuid('order_id'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('ai_sim_credits_user_idx').on(t.userId),
    orderIdx: index('ai_sim_credits_order_idx').on(t.orderId),
  }),
);

export const aiSimulations = pgTable(
  'ai_simulations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    locale: text('locale').notNull().default('kr'),
    preset: text('preset').notNull(),
    /** ok | refused | failed */
    status: text('status').notNull(),
    costPoints: integer('cost_points').notNull().default(0),
    durationMs: integer('duration_ms'),
    meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ userIdx: index('ai_simulations_user_idx').on(t.userId) }),
);
