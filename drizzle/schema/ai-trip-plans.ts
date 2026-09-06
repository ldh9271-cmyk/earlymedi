import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * ai_trip_plans — AI 여행 플래너가 만든 일정.
 * 비회원도 대화할 수 있게 행을 먼저 만들고(id 를 클라이언트가 들고 있음),
 * '이메일로 받기' 시 회원가입/로그인 뒤 돌아와 user_id·email 을 채우고 발송한다.
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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ userIdx: index('ai_trip_plans_user_idx').on(t.userId) }),
);
export type AiTripPlanRow = typeof aiTripPlans.$inferSelect;
