import { sql } from 'drizzle-orm';
import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { cases } from './cases';
import { hospitals } from './hospitals';
import { users } from './users';

/**
 * case_quotes
 *
 * One row per (case, hospital) RFQ slot. Created in status 'requested'
 * when the agency sends an RFQ, filled in when the hospital's response
 * is recorded, and resolved to selected/rejected when the agency picks
 * a winner. Statuses (plain text — app-level enum, no pg enum so new
 * states don't need a migration):
 *
 *   requested — RFQ 발송, 응답 대기
 *   received  — 병원 견적 수신 (total_krw 채워짐)
 *   selected  — 환자/에이전시가 이 견적 선택 (케이스당 1개)
 *   rejected  — 탈락 (다른 견적 선택 시 일괄, 또는 수동)
 *   expired   — valid_until 경과
 *
 * The case timeline (case_events rfq_sent / quote_received /
 * quote_accepted / quote_rejected) is written alongside every mutation
 * by the repository — this table is the queryable "current state", the
 * events are the audit trail.
 */
export const caseQuotes = pgTable(
  'case_quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    hospitalId: uuid('hospital_id')
      .notNull()
      .references(() => hospitals.id, { onDelete: 'restrict' }),

    status: text('status').notNull().default('requested'),

    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    receivedAt: timestamp('received_at', { withTimezone: true }),
    /** 견적 유효기간 — 지나면 UI 가 expired 로 표시/전환. */
    validUntil: date('valid_until'),

    currency: text('currency').notNull().default('KRW'),
    totalKrw: integer('total_krw'),
    depositKrw: integer('deposit_krw'),

    /** 항목별 금액 — [{ name, amountKrw }]. 총액과 별개로 자유 구성. */
    lineItemsJson: jsonb('line_items_json')
      .$type<Array<{ name: string; amountKrw: number }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    /** 병원이 견적에 덧붙인 조건 (마취·입원·재수술 보증 등). */
    hospitalNotes: text('hospital_notes'),
    /** 에이전시 내부 메모 — 환자에게 노출하지 않음. */
    internalMemo: text('internal_memo'),

    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // RFQ 재발송은 기존 행 재요청으로 처리 — 병원당 슬롯 1개.
    caseHospitalUq: uniqueIndex('case_quotes_case_hospital_uq').on(t.caseId, t.hospitalId),
    orgStatusIdx: index('case_quotes_org_status_idx').on(t.organizationId, t.status),
    caseIdx: index('case_quotes_case_idx').on(t.caseId),
  }),
);

export type CaseQuote = typeof caseQuotes.$inferSelect;
export type NewCaseQuote = typeof caseQuotes.$inferInsert;
