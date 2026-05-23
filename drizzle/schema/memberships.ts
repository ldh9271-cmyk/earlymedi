import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { users } from './users';
import { membershipRoleEnum, membershipStatusEnum } from './enums';

/**
 * org_memberships
 *
 * Many-to-many between users and organizations. A single user can be a member
 * of multiple organizations across all account_types. The active membership
 * is decided per-request by the 5-step middleware (cookie + URL prefix).
 */
export const orgMemberships = pgTable(
  'org_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    role: membershipRoleEnum('role').notNull().default('member'),
    status: membershipStatusEnum('status').notNull().default('pending'),

    // Per-membership scoped permissions (overrides role defaults)
    extraPermissions: jsonb('extra_permissions')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    // Invited via invite_tokens; null if user joined directly (e.g. org founder)
    invitedById: uuid('invited_by_id').references(() => users.id, { onDelete: 'set null' }),
    invitedEmail: text('invited_email'),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    suspendedReason: text('suspended_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgUserUnique: uniqueIndex('org_memberships_org_user_unique').on(
      t.organizationId,
      t.userId,
    ),
    orgStatusIdx: index('org_memberships_org_status_idx').on(t.organizationId, t.status),
    userActiveIdx: index('org_memberships_user_active_idx').on(t.userId, t.status),
  }),
);

export type OrgMembership = typeof orgMemberships.$inferSelect;
export type NewOrgMembership = typeof orgMemberships.$inferInsert;
