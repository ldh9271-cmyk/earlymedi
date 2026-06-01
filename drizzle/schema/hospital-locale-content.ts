import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { hospitals } from './hospitals';

/**
 * Per-locale content overrides for a hospital.
 *
 * Why a separate table instead of locale-specific columns on hospitals?
 *  - We support 4 locales (kr/en/zh/ja) today, more later — wide columns
 *    don't scale.
 *  - Most hospitals will fill only 1–2 locales; sparse columns waste
 *    storage and obscure intent.
 *  - SEO benefits: each row carries its own seo_title/seo_description
 *    so generateMetadata can produce truly localized <head> tags.
 *
 * Read pattern (patient-facing pages):
 *   1. SELECT * FROM hospital_locale_content
 *      WHERE hospital_id = $1 AND locale = $2;
 *   2. Field-by-field COALESCE to the base hospitals row so partially
 *      localized clinics don't show blanks. e.g. ZH page with no intro
 *      yet falls back to the KR intro (or the legacy hospitals.notes).
 *
 * Write pattern (master console):
 *   Upsert per-locale via the 4-tab UI on /master/hospitals/[id]/edit.
 *   Each tab edits its own row independently; one locale's missing
 *   fields don't affect another's.
 *
 * Storage convention for uploaded images:
 *   <hospitalId>/<locale>/<purpose>/<timestamp>-<rand>.<ext>
 *   purpose ∈ {cover, gallery, landing}
 *   Legacy uploads (pre-locale) live at <hospitalId>/<purpose>/... and
 *   continue to work via the hospitals base row fallback.
 */
export const hospitalLocaleContent = pgTable(
  'hospital_locale_content',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hospitalId: uuid('hospital_id')
      .notNull()
      .references(() => hospitals.id, { onDelete: 'cascade' }),
    // 'kr' | 'en' | 'zh' | 'ja' — validated at app layer + SQL CHECK
    locale: text('locale').notNull(),
    // Localized display name. Optional — if null, public page uses
    // hospitals.name. Useful for clinics whose Korean legal name
    // ("세라성형외과의원") differs from their export brand
    // ("Cera Plastic Surgery", "쎄拉整形外科", "セラ整形外科").
    name: text('name'),
    intro: text('intro'),
    coverImageUrl: text('cover_image_url'),
    galleryImageUrls: jsonb('gallery_image_urls')
      .$type<string[]>()
      .default([])
      .notNull(),
    landingImageUrl: text('landing_image_url'),
    // SEO. Populated independently so master can write keyword-tuned
    // titles per market without touching display copy.
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    // One row per (hospital, locale). All writes go through ON CONFLICT
    // upserts, so this constraint is load-bearing.
    hospitalLocaleUnique: uniqueIndex(
      'hospital_locale_content_hospital_locale_unique',
    ).on(t.hospitalId, t.locale),
  }),
);
