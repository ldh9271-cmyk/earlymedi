import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

/**
 * Category of priced service a non-medical partner sells separately
 * from capacity-bound facilities. These are line items the agency adds
 * to a package quote: "Korean massage 60min · ₩80k", "Airport pickup
 * sedan · ₩120k", "VIP guide full-day · ₩400k".
 *
 * Note: this is intentionally separate from partner_facilities. A
 * facility is something with daily inventory (3 rooms left tonight);
 * a service is something always sellable (massage menu).
 */
export const serviceCategoryEnum = pgEnum('partner_service_category', [
  'massage', // 마사지·스파
  'transfer', // 의전·이송
  'guide', // 가이드·통역 (정액 / 패키지)
  'food', // 식음·룸서비스 옵션
  'tour', // 관광·체험
  'other',
]);

/**
 * partner_services
 *
 * Priced menu items the partner offers. Agencies see this catalog when
 * building packages or responding to RFQs and can drop items into a
 * quote with no capacity check (services have no daily inventory).
 */
export const partnerServices = pgTable(
  'partner_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    name: text('name').notNull(), // "스웨디시 60분", "공항 픽업 (세단)", "한라산 트레킹 (1일)"
    category: serviceCategoryEnum('category').notNull().default('other'),
    description: text('description'),

    priceAmount: integer('price_amount').notNull(), // 단위 통화로 정수 (소수점 X — 원/엔/위안 가정)
    priceCurrency: text('price_currency').notNull().default('KRW'),
    /** Per what? "session" / "person" / "hour" / "day" / "flat" — UI hint. */
    priceUnit: text('price_unit').notNull().default('flat'),

    /** Optional duration in minutes (마사지·투어 등 시간 기반 서비스용). */
    durationMinutes: integer('duration_minutes'),

    /** Free-form structured attributes (포함 사항, 제외 사항 등). */
    attributes: jsonb('attributes')
      .$type<Record<string, string | number | boolean>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgCatIdx: index('partner_services_org_cat_idx').on(
      t.organizationId,
      t.category,
      t.isActive,
    ),
  }),
);
