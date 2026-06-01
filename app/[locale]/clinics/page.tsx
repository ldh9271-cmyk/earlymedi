import Link from 'next/link';
import { Search, MapPin, Star, ArrowRight, Sparkles } from 'lucide-react';
import { eq, inArray, sql, and } from 'drizzle-orm';
import type { PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { categoryListings } from '@/drizzle/schema/category-listings';

export const dynamic = 'force-dynamic';

/**
 * Patient-facing clinic catalog. Pulls from the existing `hospitals`
 * table — the same rows the agencies use in their marketplace, just
 * filtered for public display (active + has minimum required fields).
 *
 * RLS note: this is a public page so we run the query without an
 * `app.current_org_id` setting. The hospitals table's RLS policy lets
 * the postgres role read all rows; restrictive policies should be added
 * once we have a `is_public` column to gate visibility per row.
 *
 * Phase 1 limitations (intentional):
 *   - No filtering UI yet (category buttons link to filtered views in
 *     Phase 2)
 *   - No reviews / ratings (data not yet collected)
 *   - No pricing display
 *   - First 50 results, no pagination
 */
type ClinicRow = {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  primaryCategories: string[];
  promoLabel: string | null;
  coverImageUrl: string | null;
};

export default async function ClinicsListPage({
  params,
  searchParams,
}: {
  params: { locale: PublicLocale };
  searchParams: { category?: string; procedure?: string };
}): Promise<JSX.Element> {
  const dict = await getDictionary(params.locale);

  const categoryFilter = searchParams.category;
  const procedureFilter = searchParams.procedure;

  let filtered: ClinicRow[] = [];
  let dbError: string | null = null;

  try {
    if (categoryFilter) {
      // ── Curated listings path ─────────────────────────────────────
      // Master-side mappings (category_listings) take precedence.
      // For `?procedure=X` we look up rows matching that procedure;
      // otherwise we look up the "category-level feature" rows
      // (procedure_slug = '').
      //
      // If category_listings has zero matches, we fall back to the
      // legacy hospitals.primaryCategories tag-based filter so older
      // hospitals (no master curation yet) still appear.
      let listingRows: Array<{
        hospitalId: string;
        sortOrder: number;
        promoLabel: string | null;
      }> = [];
      try {
        listingRows = await db
          .select({
            hospitalId: categoryListings.hospitalId,
            sortOrder: categoryListings.sortOrder,
            promoLabel: categoryListings.promoLabel,
          })
          .from(categoryListings)
          .where(
            and(
              eq(categoryListings.categoryKey, categoryFilter),
              eq(categoryListings.procedureSlug, procedureFilter ?? ''),
            ),
          )
          .orderBy(categoryListings.sortOrder);
      } catch {
        // Table missing or other DB issue — silently fall through to
        // legacy filter. Empty result here just routes us into fallback.
      }

      if (listingRows.length > 0) {
        const ids = listingRows.map((r) => r.hospitalId);
        const hospitalsById = new Map(
          (
            await db
              .select({
                id: hospitals.id,
                name: hospitals.name,
                slug: hospitals.slug,
                countryCode: hospitals.countryCode,
                primaryCategories: hospitals.primaryCategories,
                coverImageUrl: hospitals.coverImageUrl,
              })
              .from(hospitals)
              .where(inArray(hospitals.id, ids))
          ).map((h) => [h.id, h]),
        );
        // Preserve listingRows sort order; drop any listing whose
        // hospital row is missing (cascade should have cleaned these
        // already but defensive).
        filtered = listingRows
          .map((l) => {
            const h = hospitalsById.get(l.hospitalId);
            if (!h) return null;
            return {
              id: h.id,
              name: h.name,
              slug: h.slug,
              countryCode: h.countryCode,
              primaryCategories: (h.primaryCategories ?? []) as string[],
              promoLabel: l.promoLabel,
              coverImageUrl: h.coverImageUrl,
            };
          })
          .filter((r): r is ClinicRow => r !== null);
      } else {
        // Fallback: legacy primary_categories tag filter
        const fetched = await db
          .select({
            id: hospitals.id,
            name: hospitals.name,
            slug: hospitals.slug,
            countryCode: hospitals.countryCode,
            primaryCategories: hospitals.primaryCategories,
            coverImageUrl: hospitals.coverImageUrl,
          })
          .from(hospitals)
          .where(eq(hospitals.countryCode, 'KR'))
          .orderBy(sql`${hospitals.createdAt} desc`)
          .limit(50);
        filtered = fetched
          .map((r) => ({
            ...r,
            primaryCategories: (r.primaryCategories ?? []) as string[],
            promoLabel: null,
          }))
          .filter((h) => h.primaryCategories.includes(categoryFilter));
      }
    } else {
      // No category filter → show everything (most-recent first)
      const fetched = await db
        .select({
          id: hospitals.id,
          name: hospitals.name,
          slug: hospitals.slug,
          countryCode: hospitals.countryCode,
          primaryCategories: hospitals.primaryCategories,
          coverImageUrl: hospitals.coverImageUrl,
        })
        .from(hospitals)
        .where(eq(hospitals.countryCode, 'KR'))
        .orderBy(sql`${hospitals.createdAt} desc`)
        .limit(50);
      filtered = fetched.map((r) => ({
        ...r,
        primaryCategories: (r.primaryCategories ?? []) as string[],
        promoLabel: null,
      }));
    }
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'db_error';
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {dict.nav.clinics}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {dict.featured.subtitle}
        </p>
      </header>

      {/* Lightweight search bar — actual full-text search is Phase 2. */}
      <div className="relative mb-6 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder={dict.nav.clinics}
          className="h-11 w-full rounded-md border border-input bg-card pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {dbError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {dbError}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyClinics
          dict={dict}
          locale={params.locale}
          categoryFilter={categoryFilter}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((h) => (
            <ClinicCard
              key={h.id}
              hospital={h}
              locale={params.locale}
              learnMoreLabel={dict.common.learnMore}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClinicCard({
  hospital,
  locale,
  learnMoreLabel,
}: {
  hospital: ClinicRow;
  locale: PublicLocale;
  learnMoreLabel: string;
}): JSX.Element {
  return (
    <Link
      href={`/${locale}/clinics/${hospital.slug}`}
      className="group block overflow-hidden rounded-xl border bg-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
    >
      {/*
       * Card cover:
       *  - If the hospital has uploaded a cover image (master console
       *    → /master/hospitals/[id]/edit), render it as the thumbnail.
       *  - Otherwise fall back to the soft brand gradient so the layout
       *    never collapses.
       * Recommended upload: 1280 × 800 (16:10), JPEG/WebP, ≤ 500 KB.
       */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-brand-100 via-hospitality-100 to-care-100">
        {hospital.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hospital.coverImageUrl}
            alt={hospital.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : null}
        {hospital.promoLabel ? (
          <span className="absolute left-3 top-3 rounded-full bg-hospitality-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
            {hospital.promoLabel}
          </span>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight">{hospital.name}</h3>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            {hospital.countryCode}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {hospital.primaryCategories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="rounded-full border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {cat}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-500" />
            <span>—</span>
          </span>
          <span className="inline-flex items-center gap-0.5 font-medium text-brand-700 group-hover:text-brand-900">
            {learnMoreLabel}
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyClinics({
  dict,
  locale,
  categoryFilter,
}: {
  dict: Awaited<ReturnType<typeof getDictionary>>;
  locale: PublicLocale;
  categoryFilter?: string;
}): JSX.Element {
  // Two distinct empty states:
  //   (a) `?category=X` filter applied but no rows match → tell the user
  //       it's just this category, suggest browsing all or sending an inquiry.
  //   (b) Truly zero hospitals platform-wide → onboarding phase copy.
  const title = categoryFilter ? dict.common.noClinicsInCategory : dict.common.noClinicsTitle;
  const body = dict.common.noClinicsBody;
  return (
    <div className="rounded-lg border-2 border-dashed bg-muted/20 px-6 py-12 text-center">
      <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40" />
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {categoryFilter ? (
          <Link
            href={`/${locale}/clinics`}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            {dict.common.seeMore}
          </Link>
        ) : null}
        <Link
          href={`/${locale}/inquiry`}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <Sparkles className="h-4 w-4" />
          {dict.inquiryCta.submit}
        </Link>
      </div>
    </div>
  );
}
