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
import { organizations } from './organizations';

/**
 * partner_listings
 *
 * Unified non-medical marketplace inventory. One row per consumer-
 * facing product card on the /kr landing surface, regardless of
 * category. Hospitals stay in their own `hospitals` table — this is
 * for hotels / restaurants / 맛집 / 퍼스널컬러 / 헤어샵 / 메이크업샵 /
 * 사진 스튜디오 / K-팝 투어 etc.
 *
 * One table for many categories on purpose: the common shape (cover
 * + price + location + featured flag + status) carries 80% of the
 * fields any card needs, and the remaining 20% per category is
 * tucked into the `details` JSONB so we can add new categories
 * without migrations.
 *
 * Ownership: every listing is owned by one organization
 * (`owner_org_id`). That org's `account_type` + `partner_subtype`
 * gate which categories its operators are allowed to create at the
 * app layer (master/agency = all categories; partner = limited to
 * their subtype; medical = only ancillary categories like
 * restaurants-inside-hospital).
 *
 * Status: `draft` → `pending` → `approved` → public. Only approved
 * rows surface on /kr; `featured` + `sort_order` decide where.
 */
export const partnerListings = pgTable(
  'partner_listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * The organization that owns this listing. Cascade-delete: if the
     * org is removed, its listings go with it. RLS at the app layer
     * scopes operator queries to their own org; master bypasses via
     * the service-role connection used by /master.
     */
    ownerOrgId: uuid('owner_org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    /**
     * Category bucket. Free text (not a PG enum) so masters can add
     * new categories without DDL. Validated at the app layer against
     * the LISTING_CATEGORIES constant in lib/listings/categories.ts.
     */
    category: text('category').notNull(),

    /** draft | pending | approved | rejected. */
    status: text('status').notNull().default('draft'),

    /** URL-friendly slug, unique per (owner, category). */
    slug: text('slug').notNull(),

    /** Display title — Korean default; per-locale override lives in
     *  partner_listing_locale_content. */
    title: text('title').notNull(),

    /** Short human-readable location label shown on cards: "강남",
     *  "명동 · ★★★★★", "성수동". Separate from the structured
     *  address so cards can render the marketing label directly. */
    locationLabel: text('location_label'),

    /** Structured address. All fields optional so partners can fill
     *  what they have. */
    addressJson: jsonb('address_json')
      .$type<{
        city?: string;
        region?: string;
        addressLine1?: string;
        postalCode?: string;
      }>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    /** Headline price in KRW. Optional — kpop tours / packages may
     *  price per-person, hotels per-night, sessions per-visit. The
     *  unit is captured by `price_unit` for display. */
    priceWon: integer('price_won'),
    /** "박" / "세션" / "1인" / "코스" — rendered after the amount. */
    priceUnit: text('price_unit'),

    /** Cover image used on the card. Stored as full Supabase Storage
     *  public URL. Empty for drafts. */
    coverImageUrl: text('cover_image_url'),
    /** Ordered gallery for the detail page. */
    galleryImageUrls: jsonb('gallery_image_urls')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    /** Card pill like "게스트 선호" / "예약 대행". Null = no badge. */
    promoLabel: text('promo_label'),

    /** featured rows surface on the /kr landing. */
    featured: boolean('featured').notNull().default(false),

    /** Lower comes first inside the section. */
    sortOrder: integer('sort_order').notNull().default(100),

    /** Card rating display: 49 = 4.9, 50 = 5.0. Null = no rating. */
    rating: integer('rating'),
    reviewsCount: integer('reviews_count').notNull().default(0),

    /** Long description used on the detail page. */
    description: text('description'),

    /** Pre-checked interest chip when the user clicks "예약하기" and
     *  lands on /[locale]/inquiry?interest=<key>. Free string aligned
     *  with dict.categories.items keys. */
    interestKey: text('interest_key'),

    /** Category-specific extras. Shape depends on `category`:
     *
     *  hotel:           { stars, amenities: string[], rooms: [{name, priceWon, sleeps}] }
     *  restaurant/food: { cuisine, menu: [{name, priceWon}], fitReservation, groupReservation, maxPartySize }
     *  personal_color:  { durationMin, includes: string[] }
     *  hair / makeup:   { menu: [{name, priceWon, durationMin}] }
     *  photo_studio:    { shotCount, hairMakeupIncluded, packageName }
     *  kpop_tour:       { courseName, visitHouses: string[], guideIncluded, durationMin }
     *
     *  Master/operator UIs render different field clusters based on
     *  category; readers (the /kr page) treat `details` as
     *  best-effort enrichment — missing keys never break the card.
     */
    details: jsonb('details')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerSlugCatUnique: uniqueIndex('partner_listings_owner_cat_slug_unique').on(
      t.ownerOrgId,
      t.category,
      t.slug,
    ),
    statusIdx: index('partner_listings_status_idx').on(t.status, t.category, t.sortOrder),
    featuredIdx: index('partner_listings_featured_idx').on(t.featured, t.category, t.sortOrder),
  }),
);

export type PartnerListing = typeof partnerListings.$inferSelect;
export type NewPartnerListing = typeof partnerListings.$inferInsert;

/**
 * Per-locale (kr / en / zh / ja) overrides for a listing.
 *
 * Mirrors hospital_locale_content: one row per (listing, locale),
 * with field-by-field COALESCE-style fallback on the read side.
 * Sparse — most listings fill 1–2 locales.
 */
export const partnerListingLocaleContent = pgTable(
  'partner_listing_locale_content',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => partnerListings.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(), // 'kr' | 'en' | 'zh' | 'ja'

    title: text('title'),
    description: text('description'),
    locationLabel: text('location_label'),
    coverImageUrl: text('cover_image_url'),
    galleryImageUrls: jsonb('gallery_image_urls')
      .$type<string[]>()
      .default([])
      .notNull(),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    listingLocaleUnique: uniqueIndex(
      'partner_listing_locale_content_unique',
    ).on(t.listingId, t.locale),
  }),
);

export type PartnerListingLocaleContent = typeof partnerListingLocaleContent.$inferSelect;
export type NewPartnerListingLocaleContent =
  typeof partnerListingLocaleContent.$inferInsert;
