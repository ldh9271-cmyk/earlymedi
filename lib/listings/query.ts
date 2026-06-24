import 'server-only';
import { and, asc, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  partnerListings,
  partnerListingLocaleContent,
  type PartnerListing,
} from '@/drizzle/schema/partner-listings';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { ListingCategory } from './categories';

/**
 * Card shape used by /kr landing sections. Flattens the base row +
 * locale override into one struct the page can render directly.
 */
export type ListingCard = {
  id: string;
  category: string;
  slug: string;
  title: string;
  locationLabel: string | null;
  priceWon: number | null;
  priceUnit: string | null;
  coverImageUrl: string | null;
  promoLabel: string | null;
  rating: number | null;
  reviewsCount: number;
  description: string | null;
  interestKey: string | null;
  details: Record<string, unknown>;
};

/**
 * Full detail-page row — superset of ListingCard with the gallery
 * URLs that the /listings/[slug] hero swiper renders. Kept separate
 * from ListingCard so the landing query stays lean (no JSONB column
 * hydration for cards that only show the cover).
 */
export type ListingDetail = ListingCard & {
  galleryImageUrls: string[];
  ownerOrgId: string | null;
};

/**
 * Fetch approved+featured listings in the given categories, ordered
 * by sort_order. Applies per-locale overrides (title / cover / loc)
 * via a single follow-up query keyed by listing ids.
 *
 * Read-side never throws — if the table doesn't exist yet (migration
 * not applied) or the row count is zero, returns [] so the /kr
 * landing falls back to its hardcoded defaults without breaking.
 *
 * Filter options (MainHeader filter pill):
 *   - priceMin/priceMax: SQL gte/lte on partner_listings.price_won
 *   - minRating: SQL gte on partner_listings.rating (×10 encoding)
 *   - cities: post-fetch JS filter against location_label (substring)
 *     — schema's address_json.city isn't reliably populated for
 *     listings yet, so we match against the human-readable
 *     location_label instead. Once the JSONB index lands we can
 *     migrate to a server-side filter.
 */
export async function fetchFeaturedListings(opts: {
  locale: PublicLocale;
  categories: ListingCategory[];
  limit?: number;
  priceMin?: number | null;
  priceMax?: number | null;
  minRating?: number | null;
  cities?: ReadonlyArray<string>;
}): Promise<ListingCard[]> {
  const { locale, categories, limit, priceMin, priceMax, minRating, cities } = opts;
  if (categories.length === 0) return [];

  let rows: PartnerListing[] = [];
  try {
    const whereParts: SQL[] = [
      inArray(partnerListings.category, categories),
      eq(partnerListings.status, 'approved'),
      eq(partnerListings.featured, true),
    ];
    if (typeof priceMin === 'number' && priceMin > 0) {
      whereParts.push(gte(partnerListings.priceWon, priceMin));
    }
    if (typeof priceMax === 'number' && priceMax > 0) {
      whereParts.push(lte(partnerListings.priceWon, priceMax));
    }
    if (typeof minRating === 'number' && minRating > 0) {
      whereParts.push(gte(partnerListings.rating, minRating));
    }
    rows = await db
      .select()
      .from(partnerListings)
      .where(and(...whereParts))
      .orderBy(asc(partnerListings.sortOrder));
  } catch {
    return [];
  }

  // City whitelist — post-fetch substring match against locationLabel.
  if (cities && cities.length > 0) {
    rows = rows.filter((r) => {
      const label = (r.locationLabel ?? '').trim();
      if (!label) return false;
      return cities.some((c) => label.includes(c));
    });
  }

  if (rows.length === 0) return [];
  const capped = typeof limit === 'number' ? rows.slice(0, limit) : rows;

  // Per-locale overrides
  let overrides = new Map<string, {
    title: string | null;
    locationLabel: string | null;
    coverImageUrl: string | null;
    description: string | null;
  }>();
  try {
    const ids = capped.map((r) => r.id);
    const lcRows = await db
      .select({
        listingId: partnerListingLocaleContent.listingId,
        title: partnerListingLocaleContent.title,
        locationLabel: partnerListingLocaleContent.locationLabel,
        coverImageUrl: partnerListingLocaleContent.coverImageUrl,
        description: partnerListingLocaleContent.description,
      })
      .from(partnerListingLocaleContent)
      .where(
        and(
          inArray(partnerListingLocaleContent.listingId, ids),
          eq(partnerListingLocaleContent.locale, locale),
        ),
      );
    overrides = new Map(lcRows.map((r) => [r.listingId, r]));
  } catch {
    /* locale table missing — fall through with no overrides */
  }

  return capped.map((r): ListingCard => {
    const o = overrides.get(r.id);
    return {
      id: r.id,
      category: r.category,
      slug: r.slug,
      title: o?.title?.trim() || r.title,
      locationLabel: o?.locationLabel?.trim() || r.locationLabel,
      priceWon: r.priceWon,
      priceUnit: r.priceUnit,
      coverImageUrl: o?.coverImageUrl || r.coverImageUrl,
      promoLabel: r.promoLabel,
      rating: r.rating,
      reviewsCount: r.reviewsCount,
      description: o?.description?.trim() || r.description,
      interestKey: r.interestKey,
      details: (r.details ?? {}) as Record<string, unknown>,
    };
  });
}

/**
 * Single-row fetch by slug for the /listings/[slug] detail page.
 * Returns null when the slug doesn't resolve, when the listing
 * isn't approved (so the page can 404 cleanly), or when the table
 * isn't present yet. Applies the same per-locale override pattern
 * as fetchFeaturedListings.
 */
export async function fetchListingBySlug(opts: {
  locale: PublicLocale;
  slug: string;
}): Promise<ListingDetail | null> {
  const { locale, slug } = opts;
  let row: PartnerListing | null = null;
  try {
    const rows = await db
      .select()
      .from(partnerListings)
      .where(
        and(
          eq(partnerListings.slug, slug),
          eq(partnerListings.status, 'approved'),
        ),
      )
      .limit(1);
    row = rows[0] ?? null;
  } catch {
    return null;
  }
  if (!row) return null;

  let override: {
    title: string | null;
    locationLabel: string | null;
    coverImageUrl: string | null;
    description: string | null;
  } | null = null;
  try {
    const lcRows = await db
      .select({
        title: partnerListingLocaleContent.title,
        locationLabel: partnerListingLocaleContent.locationLabel,
        coverImageUrl: partnerListingLocaleContent.coverImageUrl,
        description: partnerListingLocaleContent.description,
      })
      .from(partnerListingLocaleContent)
      .where(
        and(
          eq(partnerListingLocaleContent.listingId, row.id),
          eq(partnerListingLocaleContent.locale, locale),
        ),
      )
      .limit(1);
    override = lcRows[0] ?? null;
  } catch {
    /* locale table missing — fall through with no override */
  }

  return {
    id: row.id,
    category: row.category,
    slug: row.slug,
    title: override?.title?.trim() || row.title,
    locationLabel: override?.locationLabel?.trim() || row.locationLabel,
    priceWon: row.priceWon,
    priceUnit: row.priceUnit,
    coverImageUrl: override?.coverImageUrl || row.coverImageUrl,
    promoLabel: row.promoLabel,
    rating: row.rating,
    reviewsCount: row.reviewsCount,
    description: override?.description?.trim() || row.description,
    interestKey: row.interestKey,
    details: (row.details ?? {}) as Record<string, unknown>,
    galleryImageUrls: Array.isArray(row.galleryImageUrls)
      ? (row.galleryImageUrls as string[])
      : [],
    ownerOrgId: row.ownerOrgId ?? null,
  };
}
