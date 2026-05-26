import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

/**
 * freelancer_referral_codes
 *
 * Each row is one trackable code a freelancer (송객·통역·코디·
 * 인플루언서) hands out via their channel. The freelancer might run
 * multiple campaigns (Instagram bio link, KakaoTalk QR, business card,
 * influencer post link) so we model one row per code — they can label
 * each one to remember which channel it serves.
 *
 * Lifecycle:
 *   1. Freelancer creates a code → row inserted with clicks=signups=0
 *   2. Code printed on a card / posted online / encoded in QR
 *   3. Patient hits /r/{code} landing → clicks++
 *   4. Patient fills inquiry form → signups++, conversation created
 *      with attribution to this code
 *   5. Conversation converts to booking → commission accrues against
 *      the agency the freelancer is affiliated with
 *
 * Codes are tied to the freelancer's org (not the agency). When a
 * code converts, the resulting commission is settled by the agency
 * the freelancer is affiliated with (see affiliations table).
 */
export const freelancerReferralCodes = pgTable(
  'freelancer_referral_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id') // the freelancer's org
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    /** 8-12 char uppercase alphanumeric. Globally unique so the
     *  landing URL `/r/{code}` never ambiguously resolves. */
    code: text('code').notNull(),

    /** Operator-facing memo: "Instagram bio", "KakaoTalk QR — 부산
     *  병원 행사", "Influencer review 2026-06". Helps the freelancer
     *  remember which campaign each code serves. */
    label: text('label').notNull(),

    /** Optional target landing locale — when set, /r/{code} renders
     *  the landing page in this language by default ("zh", "en", "ja"
     *  etc.). Null = auto-detect from browser. */
    targetLocale: text('target_locale'),

    /** Optional notes (campaign goal, deal terms, etc.). */
    notes: text('notes'),

    /** Counter incremented every time the /r/{code} landing is opened. */
    clicks: integer('clicks').notNull().default(0),

    /** Counter incremented every time a NEW conversation is created
     *  attributed to this code (form submit, KakaoTalk inquiry, etc.). */
    signups: integer('signups').notNull().default(0),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Codes are GLOBALLY unique, not just per-org — the landing URL
    // /r/<code> must resolve unambiguously.
    codeUq: uniqueIndex('freelancer_referral_codes_code_uq').on(t.code),
    orgIdx: index('freelancer_referral_codes_org_idx').on(t.organizationId, t.isActive),
  }),
);
