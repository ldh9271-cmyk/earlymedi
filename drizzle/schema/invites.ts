import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';
import { membershipRoleEnum } from './enums';

/**
 * invites
 *
 * Single source of truth for outstanding invitations. Each row carries:
 *  - a tokenHash (the raw token is JWT-signed, only its hash lands here)
 *  - the target email and intended role
 *  - the inviting organization
 *
 * Once accepted, an org_memberships row is created and the invite row is
 * marked acceptedAt. Expired invites stay for audit but cannot be redeemed.
 *
 * For partner / freelancer / medical signups initiated by an Agency, the
 * Agency creates an invite first; the partner uses /signup/* with the token
 * baked into the URL to land on the right wizard pre-filled.
 */
export const invites = pgTable(
  'invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    invitedByUserId: uuid('invited_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    email: text('email').notNull(),
    role: membershipRoleEnum('role').notNull().default('member'),
    intendedAccountType: text('intended_account_type'), // for cross-category invites (agency → freelancer/medical/partner org bootstrap)

    tokenHash: text('token_hash').notNull(), // sha256 of the JWT; raw JWT lives only in email
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedByUserId: uuid('accepted_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),

    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tokenHashUnique: uniqueIndex('invites_token_hash_unique').on(t.tokenHash),
    orgEmailIdx: index('invites_org_email_idx').on(t.organizationId, t.email),
    emailIdx: index('invites_email_idx').on(t.email),
    expiresAtIdx: index('invites_expires_at_idx').on(t.expiresAt),
  }),
);

export type Invite = typeof invites.$inferSelect;
export type NewInvite = typeof invites.$inferInsert;
