import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
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
 * Fetch approved+featured listings in the given categories, ordered
 * by sort_order. Applies per-locale overrides (title / cover / loc)
 * via a single follow-up query keyed by listing ids.
 *
 * Read-side never throws — if the table doesn't exist yet (migration
 * not applied) or the row count is zero, returns [] so the /kr
 * landing falls back to its hardcoded defaults without breaking.
 */
export async function fetchFeaturedListings(opts: {
  locale: PublicLocale;
  categories: ListingCategory[];
  limit?: number;
}): Promise<ListingCard[]> {
  const { locale, categories, limit } = opts;
  if (categories.length === 0) return [];

  let rows: PartnerListing[] = [];
  try {
    rows = await db
      .select()
      .from(partnerListings)
      .where(
        and(
          inArray(partnerListings.category, categories),
          eq(partnerListings.status, 'approved'),
          eq(partnerListings.featured, true),
        ),
      )
      .orderBy(asc(partnerListings.sortOrder));
  } catch {
    return [];
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
