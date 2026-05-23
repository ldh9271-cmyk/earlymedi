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
import { organizations } from './organizations';
import { channelKindEnum, channelStatusEnum } from './messaging-enums';

/**
 * channels
 *
 * One row per integrated messaging account that an Agency owns.
 * Examples:
 *   - Agency "얼리메디" + KakaoTalk channel @earlymedi
 *   - Same Agency + Instagram DM business account
 *   - Same Agency + WhatsApp Business sender 010-...
 *
 * The `credentials` jsonb stores per-channel credentials (tokens, webhook
 * verify keys) encrypted at the application layer. NEVER returned to the
 * browser.
 */
export const channels = pgTable(
  'channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    kind: channelKindEnum('kind').notNull(),
    displayName: text('display_name').notNull(),
    externalAccountId: text('external_account_id').notNull(), // page id / channel id / phone number
    status: channelStatusEnum('status').notNull().default('connected'),

    isDefault: boolean('is_default').notNull().default(false),

    // App-level encrypted bag.
    credentialsEncrypted: text('credentials_encrypted'),

    // Per-channel config (auto-reply, business hours, signature templates).
    config: jsonb('config')
      .$type<{
        autoReplyEnabled?: boolean;
        businessHoursJson?: Record<string, [string, string]>; // day → [open, close]
        signature?: Record<string, string>; // locale → text
        webhookVerifyKey?: string;
        defaultLocale?: string;
      }>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
    lastErrorMessage: text('last_error_message'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index('channels_org_idx').on(t.organizationId),
    kindUnique: uniqueIndex('channels_org_kind_extid_unique').on(
      t.organizationId,
      t.kind,
      t.externalAccountId,
    ),
  }),
);

export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
