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
 *   procedureSlug — sub-procedure key (e.g. 'rhinoplasty',
 *                   'double-eyelid'). Empty string '' means
 *                   "category-level feature" — this hospital is shown
 *                   on the category card itself, regardless of
 *                   procedure drilldown.
 *   sortOrder     — ascending: smaller numbers appear first. 100 is
 *                   the conventional starting point so masters can
 *                   slide entries above/below without renumbering.
 *
 * Why procedureSlug is NOT NULL with '' as the sentinel:
 *   - SQL UNIQUE on (categoryKey, procedureSlug, hospitalId) treats
 *     NULL as distinct → duplicates possible if we left it nullable.
 *   - Using '' avoids COALESCE-expression unique indexes (which some
 *     older drizzle versions don't support cleanly).
 */
export const categoryListings = pgTable(
  'category_listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    categoryKey: text('category_key').notNull(),
    procedureSlug: text('procedure_slug').notNull().default(''),

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
      t.procedureSlug,
      t.hospitalId,
    ),
    categoryIdx: index('category_listings_category_idx').on(t.categoryKey, t.sortOrder),
    procedureIdx: index('category_listings_procedure_idx').on(t.procedureSlug, t.sortOrder),
  }),
);

export type CategoryListing = typeof categoryListings.$inferSelect;
export type NewCategoryListing = typeof categoryListings.$inferInsert;
