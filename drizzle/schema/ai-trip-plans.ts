import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * ai_trip_plans — AI 여행 플래너가 만든 일정과 그 뒤 흐름.
 *
 *  status: draft(대화 중) → confirmed(회원이 이 일정으로 확정)
 *        → help_requested(플랫폼 도움 요청) | help_declined(직접 진행)
 *        → quoted(컨시어지가 검증·가격 산정 → checkout_orders 인보이스 발행)
 *        → paid(결제 확인 = 스케줄 완성) | cancelled
 *
 * 비회원도 대화할 수 있게 행을 먼저 만들고(id 를 클라이언트가 들고 있음),
 * '이메일로 받기'·'확정' 시 회원가입/로그인 뒤 돌아와 user_id·email 을 채운다.
 */
export const aiTripPlans = pgTable(
  'ai_trip_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    locale: text('locale').notNull().default('kr'),
    userId: uuid('user_id'),
    email: text('email'),
    tripType: text('trip_type'), // free · package · training · (null)
    messages: jsonb('messages').$type<Array<{ role: 'user' | 'assistant'; content: string }>>().notNull().default(sql`'[]'::jsonb`),
    planMd: text('plan_md'), // 최신 일정(마크다운)
    emailedAt: timestamp('emailed_at', { withTimezone: true }),

    status: text('status').notNull().default('draft'),
    /** 견적 인보이스(checkout_orders.id). 결제 상태는 주문 쪽이 진실. */
    orderId: uuid('order_id'),
    quoteWon: integer('quote_won'),
    quoteNote: text('quote_note'), // 컨시어지 검증 메모(고객에게 보임)
    verifiedPlanMd: text('verified_plan_md'), // 컨시어지가 검증·수정한 최종 일정
    contact: jsonb('contact').$type<{ name?: string; phone?: string; messenger?: string }>(),
    startYmd: text('start_ymd'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    helpRequestedAt: timestamp('help_requested_at', { withTimezone: true }),
    quotedAt: timestamp('quoted_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('ai_trip_plans_user_idx').on(t.userId),
    statusIdx: index('ai_trip_plans_status_idx').on(t.status, t.updatedAt),
  }),
);
export type AiTripPlanRow = typeof aiTripPlans.$inferSelect;
