import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
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

    // Demographics — collected at signup for marketing analytics + KOIHA
    // statistical reporting. ALL OPTIONAL — "선택 수집" per the Kakao
    // Channel PII review policy (사용자가 응답 안 해도 가입 진행).
    // age_range is denormalized from birth_year for fast filtering; the
    // signup server action keeps them in sync.
    // 생일은 한국 컨벤션을 따라 월/일만 별도 저장 (연도는 birth_year).
    gender: text('gender'), // 'male' | 'female' | 'other' | 'prefer_not_to_say'
    birthYear: integer('birth_year'),
    birthMonth: integer('birth_month'), // 1-12
    birthDay: integer('birth_day'), // 1-31
    ageRange: text('age_range'), // 'under_20' | '20s' | '30s' | '40s' | '50s' | '60s' | '70_plus'

    // Per-user feature flags (admin overrides)
    flags: jsonb('flags').$type<Record<string, boolean>>().notNull().default(sql`'{}'::jsonb`),

    // Last active org pointer (cached; not authoritative — middleware re-verifies)
    activeOrgId: uuid('active_org_id'),

    isSystemAdmin: boolean('is_system_admin').notNull().default(false), // KoreaGlowUp staff

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
