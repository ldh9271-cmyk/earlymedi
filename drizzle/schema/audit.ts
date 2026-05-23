import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';
import { auditActionEnum } from './enums';

/**
 * audit_logs
 *
 * Append-only audit trail. Every mutating action against patient PII,
 * treatment charts, payouts, role changes, or AI calls writes here.
 * Retention: 10 years for PHI-adjacent rows (filtered by entity type in cron).
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    impersonatedByUserId: uuid('impersonated_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    action: auditActionEnum('action').notNull(),
    entityType: text('entity_type').notNull(), // 'organization' | 'treatment_chart' | etc.
    entityId: text('entity_id'),

    diff: jsonb('diff').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    metadata: jsonb('metadata')
      .$type<{
        ip?: string;
        userAgent?: string;
        url?: string;
        reason?: string;
        [key: string]: unknown;
      }>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index('audit_logs_org_idx').on(t.organizationId),
    entityIdx: index('audit_logs_entity_idx').on(t.entityType, t.entityId),
    actorIdx: index('audit_logs_actor_idx').on(t.actorUserId),
    createdAtIdx: index('audit_logs_created_at_idx').on(t.createdAt),
  }),
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
