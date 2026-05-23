import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * users
 *
 * Mirrors supabase auth.users via the `id` column (== auth uid).
 * Keep PII to a minimum here — full operator profile data lives in
 * downstream tables (freelancers, doctors, etc.).
 *
 * A user can belong to multiple organizations of different account_types
 * (e.g. owns an agency AND works as freelancer for another agency).
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(), // = supabase auth.uid
    email: text('email').notNull(),
    fullName: text('full_name'),
    avatarUrl: text('avatar_url'),

    // Communication preferences
    locale: text('locale').notNull().default('ko'),
    timezone: text('timezone').notNull().default('Asia/Seoul'),
    phone: text('phone'),

    // Per-user feature flags (admin overrides)
    flags: jsonb('flags').$type<Record<string, boolean>>().notNull().default(sql`'{}'::jsonb`),

    // Last active org pointer (cached; not authoritative — middleware re-verifies)
    activeOrgId: uuid('active_org_id'),

    isSystemAdmin: boolean('is_system_admin').notNull().default(false), // EarlyMedi staff

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastSignInAt: timestamp('last_sign_in_at', { withTimezone: true }),
  },
  (t) => ({
    emailUnique: uniqueIndex('users_email_unique').on(t.email),
    activeOrgIdx: index('users_active_org_idx').on(t.activeOrgId),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
