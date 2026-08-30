import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';
import { freelancerAffiliations } from './affiliations';

/**
 * 프리랜서 정산 이의 제기.
 *
 * 커미션 정산 결과에 오류가 의심될 때 프리랜서가 소속 Agency 앞으로
 * 제출하는 티켓. 양 당사자(프리랜서 org · Agency org)만 RLS
 * (freelancer_disputes_party)로 접근한다 — 프리랜서는 제출·이력 확인,
 * Agency는 검토·상태 변경(리졸브).
 */

export const freelancerDisputeStatusEnum = pgEnum('freelancer_dispute_status', [
  'open', // 제출됨 — Agency 검토 대기
  'reviewing', // Agency 검토 중
  'resolved', // 정정/보상 등으로 해결
  'rejected', // 이의 기각 (사유 필수)
]);

/** category 값: rate_error(요율 오류) | missing_case(케이스 누락) |
 *  payment_delay(지급 지연) | other — 앱 레벨 검증, 자유 확장 가능. */
export const freelancerDisputes = pgTable(
  'freelancer_disputes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    freelancerOrgId: uuid('freelancer_org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    agencyOrgId: uuid('agency_org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    affiliationId: uuid('affiliation_id').references(() => freelancerAffiliations.id, {
      onDelete: 'set null',
    }),

    /** 문제 거래 참조 — 인보이스 번호·케이스 번호 등 자유 텍스트. */
    subjectRef: text('subject_ref'),
    category: text('category').notNull().default('other'),
    description: text('description').notNull(),

    status: freelancerDisputeStatusEnum('status').notNull().default('open'),
    /** Agency의 검토 결과 메모 — resolved/rejected 시 채운다. */
    resolutionNote: text('resolution_note'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => ({
    freelancerStatusIdx: index('freelancer_disputes_freelancer_status_idx').on(
      t.freelancerOrgId,
      t.status,
    ),
    agencyStatusIdx: index('freelancer_disputes_agency_status_idx').on(t.agencyOrgId, t.status),
  }),
);

export type FreelancerDispute = typeof freelancerDisputes.$inferSelect;
export type NewFreelancerDispute = typeof freelancerDisputes.$inferInsert;
