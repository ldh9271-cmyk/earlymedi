import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { hospitals } from './hospitals';

/**
 * Master-curated catalog mappings: which hospital appears on which
 * category card / procedure listing on the patient portal.
 *
 *   categoryKey   — top-level B2C category (e.g. 'plastic_surgery',
 *                   'dermatology', 'dental', ...) matching the
 *                   patient-portal homepage cards.
 *   procedureSlug — optional sub-procedure key (e.g. 'rhinoplasty',
 *                   'double-eyelid'). NULL means "category-level
 *                   feature" — this hospital is shown on the category
 *                   card itself, regardless of procedure drilldown.
 *   sortOrder     — ascending: smaller numbers appear first. 100 is
 *                   the conventional starting point so masters can
 *                   slide entries above/below without renumbering.
 *
 * The mapping is intentionally simple — no per-language overrides, no
 * featured-image, no time-based scheduling. We can add those later if
 * usage warrants. Right now the goal is: master picks the order and
 * which hospitals appear where on /[locale]/procedures and
 * /[locale]/clinics filtered views.
 *
 * Unique constraint:
 *   (categoryKey, procedureSlug, hospitalId) — a hospital can only
 *   appear once per procedure slot. Updating sort_order is an UPDATE,
 *   not a duplicate INSERT.
 */
export const categoryListings = pgTable(
  'category_listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    categoryKey: text('category_key').notNull(),
    procedureSlug: text('procedure_slug'), // null = category-level feature

    hospitalId: uuid('hospital_id')
      .notNull()
      .references(() => hospitals.id, { onDelete: 'cascade' }),

    sortOrder: integer('sort_order').notNull().default(100),

    // Optional master-side notes / promo copy. Kept generic; we can
    // refine later if we need structured fields like price ranges.
    promoLabel: text('promo_label'),
    promoLabelEn: text('promo_label_en'),
    promoLabelZh: text('promo_label_zh'),
    promoLabelJa: text('promo_label_ja'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueListing: uniqueIndex('category_listings_unique').on(
      t.categoryKey,
      sql`coalesce(${t.procedureSlug}, '')`,
      t.hospitalId,
    ),
    categoryIdx: index('category_listings_category_idx').on(t.categoryKey, t.sortOrder),
    procedureIdx: index('category_listings_procedure_idx').on(t.procedureSlug, t.sortOrder),
  }),
);

export type CategoryListing = typeof categoryListings.$inferSelect;
export type NewCategoryListing = typeof categoryListings.$inferInsert;
