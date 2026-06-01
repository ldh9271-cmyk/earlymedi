import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, inArray } from 'drizzle-orm';
import { ArrowLeft, MapPin, Star, ShieldCheck, Sparkles, Award, Languages } from 'lucide-react';
import type { Metadata } from 'next';
import type { PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { hospitalLocaleContent } from '@/drizzle/schema/hospital-locale-content';

export const dynamic = 'force-dynamic';

/**
 * Per-locale SEO metadata.
 *
 * Pulls seo_title / seo_description from hospital_locale_content for
 * the current locale. Falls back through: locale seoTitle → locale
 * name → base hospitals.name, and locale seoDescription → locale
 * intro → base hospitals.notes (first 160 chars). All four locales
 * thus get distinct <title>/<meta> tags pointing back to language-
 * specific URLs — exactly what search engines need to index each
 * /[locale]/clinics/[slug] independently.
 */
export async function generateMetadata({
  params,
}: {
  params: { locale: PublicLocale; slug: string };
}): Promise<Metadata> {
  let resolvedSlug = params.slug;
  try {
    resolvedSlug = decodeURIComponent(params.slug);
  } catch {
    /* malformed escapes — keep raw */
  }
  const candidates = Array.from(new Set([params.slug, resolvedSlug]));

  let baseName: string | null = null;
  let baseNotes: string | null = null;
  let hospitalId: string | null = null;
  try {
    const [b] = await db
      .select({ id: hospitals.id, name: hospitals.name, notes: hospitals.notes })
      .from(hospitals)
      .where(inArray(hospitals.slug, candidates))
      .limit(1);
    if (b) {
      baseName = b.name;
      baseNotes = b.notes;
      hospitalId = b.id;
    }
  } catch {
    /* swallow — return empty metadata if base lookup fails */
  }
  if (!baseName || !hospitalId) return {};

  let lcRow: { name: string | null; intro: string | null; seoTitle: string | null; seoDescription: string | null } | null = null;
  try {
    const [r] = await db
      .select({
        name: hospitalLocaleContent.name,
        intro: hospitalLocaleContent.intro,
        seoTitle: hospitalLocaleContent.seoTitle,
        seoDescription: hospitalLocaleContent.seoDescription,
      })
      .from(hospitalLocaleContent)
      .where(
        and(
          eq(hospitalLocaleContent.hospitalId, hospitalId),
          eq(hospitalLocaleContent.locale, params.locale),
        ),
      )
      .limit(1);
    lcRow = r ?? null;
  } catch {
    /* table missing — fall through */
  }

  const displayName = lcRow?.name?.trim() || baseName;
  const title = lcRow?.seoTitle?.trim() || `${displayName} | KoreaGlowUp`;
  const descRaw = lcRow?.seoDescription?.trim() || lcRow?.intro?.trim() || baseNotes?.trim() || '';
  const description = descRaw.length > 160 ? `${descRaw.slice(0, 157)}…` : descRaw || undefined;

  const url = `/${params.locale}/clinics/${params.slug}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ko: `/kr/clinics/${params.slug}`,
        en: `/en/clinics/${params.slug}`,
        'zh-CN': `/zh/clinics/${params.slug}`,
        ja: `/ja/clinics/${params.slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      locale:
        params.locale === 'kr'
          ? 'ko_KR'
          : params.locale === 'zh'
            ? 'zh_CN'
            : params.locale === 'ja'
              ? 'ja_JP'
              : 'en_US',
    },
  };
}

/**
 * Hospital detail page — anonymous public view.
 *
 * Composed sections:
 *   - Hero (name, location, hero image, badges)
 *   - About (description)
 *   - Specialties (primary_categories chips)
 *   - Doctors (placeholder grid; doctor entities arrive in Phase 2)
 *   - Before/After (placeholder)
 *   - Reviews (placeholder; verified-review pipeline in Phase 3)
 *   - Inquiry CTA
 *
 * The page is forgiving of partial data — most fields tolerate null
 * and just hide that section gracefully. This is intentional: we don't
 * want a half-onboarded clinic to display as "broken".
 */
export default async function ClinicDetailPage({
  params,
  searchParams,
}: {
  params: { locale: PublicLocale; slug: string };
  searchParams?: { debug?: string };
}): Promise<JSX.Element> {
  const dict = await getDictionary(params.locale);
  const debug = searchParams?.debug === '1';

  // Slug-matching is forgiving here because the slug can arrive as:
  //   - exactly what the DB stored: '세라성형외과의원-OI4Vv'
  //   - percent-encoded by some intermediaries: '%EC%84%B8%EB%9D%BC...'
  //   - decoded twice if a proxy was over-eager
  // We also intentionally DROP the countryCode='KR' filter — a hospital
  // returned by the listing page must be visitable from the detail page,
  // and the country filter belongs on the listing side, not detail lookup.
  let resolvedSlug = params.slug;
  try {
    resolvedSlug = decodeURIComponent(params.slug);
  } catch {
    // malformed % escapes — fall back to raw value
  }
  const candidates = Array.from(new Set([params.slug, resolvedSlug]));

  // Wide SELECT first. If the gallery_image_urls / landing_image_url
  // migrations haven't run yet, Postgres throws `column ... does not
  // exist`. Fall back to a minimal projection (without the new image
  // columns) so the page still renders for the patient — they don't
  // care about missing master-tooling features.
  type RowShape = {
    id: string;
    name: string;
    slug: string;
    countryCode: string;
    addressJson: { city?: string } | null;
    primaryCategories: unknown;
    foreignPatientLicenseNumber: string | null;
    coverImageUrl: string | null;
    galleryImageUrls?: unknown;
    landingImageUrl?: string | null;
    notes: string | null;
  };
  let row: RowShape | undefined;
  try {
    const [r] = await db
      .select({
        id: hospitals.id,
        name: hospitals.name,
        slug: hospitals.slug,
        countryCode: hospitals.countryCode,
        addressJson: hospitals.addressJson,
        primaryCategories: hospitals.primaryCategories,
        foreignPatientLicenseNumber: hospitals.foreignPatientLicenseNumber,
        coverImageUrl: hospitals.coverImageUrl,
        galleryImageUrls: hospitals.galleryImageUrls,
        landingImageUrl: hospitals.landingImageUrl,
        notes: hospitals.notes,
      })
      .from(hospitals)
      .where(inArray(hospitals.slug, candidates))
      .limit(1);
    row = r;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('does not exist') || msg.includes('column')) {
      const [r] = await db
        .select({
          id: hospitals.id,
          name: hospitals.name,
          slug: hospitals.slug,
          countryCode: hospitals.countryCode,
          addressJson: hospitals.addressJson,
          primaryCategories: hospitals.primaryCategories,
          foreignPatientLicenseNumber: hospitals.foreignPatientLicenseNumber,
          coverImageUrl: hospitals.coverImageUrl,
          notes: hospitals.notes,
        })
        .from(hospitals)
        .where(inArray(hospitals.slug, candidates))
        .limit(1);
      row = r;
    } else {
      throw e;
    }
  }

  if (!row) notFound();

  // Per-locale content overrides. Read the row for the current locale;
  // if anything is missing, fall back to the base hospital fields below.
  // If the table itself is missing (migration not run), skip silently —
  // the page still works off the legacy base columns.
  let lc: {
    name: string | null;
    intro: string | null;
    coverImageUrl: string | null;
    galleryImageUrls: string[];
    landingImageUrl: string | null;
  } | null = null;
  type LcType = {
    name: string | null;
    intro: string | null;
    coverImageUrl: string | null;
    galleryImageUrls: string[];
    landingImageUrl: string | null;
  } | null;
  let lcDebug: {
    hospitalId: string;
    locale: string;
    queriedAt: string;
    allLocaleRows: Array<{ locale: string; name: string | null; intro: string | null; coverImageUrl: string | null }>;
    selectedRow: LcType;
    error: string | null;
  } = {
    hospitalId: row.id,
    locale: params.locale,
    queriedAt: new Date().toISOString(),
    allLocaleRows: [],
    selectedRow: null,
    error: null,
  };
  try {
    const [r] = await db
      .select({
        name: hospitalLocaleContent.name,
        intro: hospitalLocaleContent.intro,
        coverImageUrl: hospitalLocaleContent.coverImageUrl,
        galleryImageUrls: hospitalLocaleContent.galleryImageUrls,
        landingImageUrl: hospitalLocaleContent.landingImageUrl,
      })
      .from(hospitalLocaleContent)
      .where(
        and(
          eq(hospitalLocaleContent.hospitalId, row.id),
          eq(hospitalLocaleContent.locale, params.locale),
        ),
      )
      .limit(1);
    if (r) lc = { ...r, galleryImageUrls: (r.galleryImageUrls ?? []) as string[] };
    lcDebug.selectedRow = lc;

    if (debug) {
      // Also fetch all rows for this hospital to see what's actually stored.
      const all = await db
        .select({
          locale: hospitalLocaleContent.locale,
          name: hospitalLocaleContent.name,
          intro: hospitalLocaleContent.intro,
          coverImageUrl: hospitalLocaleContent.coverImageUrl,
        })
        .from(hospitalLocaleContent)
        .where(eq(hospitalLocaleContent.hospitalId, row.id));
      lcDebug.allLocaleRows = all;
    }
  } catch (e) {
    lcDebug.error = e instanceof Error ? e.message : String(e);
    // Table missing — patient never sees an error, just falls back.
  }

  const address = row.addressJson ?? {};
  const cats = (row.primaryCategories ?? []) as string[];
  const isKoiha = !!row.foreignPatientLicenseNumber;

  // Locale-first resolution with COALESCE-style fallback to the base
  // hospital row. Gallery falls back only if the locale's gallery is
  // empty — a deliberately empty locale gallery (master cleared it)
  // is preserved via the explicit length check on lc?.galleryImageUrls.
  const displayName = lc?.name?.trim() || row.name;
  const aboutText = lc?.intro?.trim() || row.notes?.trim() || null;
  const coverUrl = lc?.coverImageUrl || row.coverImageUrl;
  const galleryRaw = lc?.galleryImageUrls && lc.galleryImageUrls.length > 0
    ? lc.galleryImageUrls
    : ((row.galleryImageUrls ?? []) as string[]);
  const gallery = galleryRaw ?? [];
  const landingUrl = lc?.landingImageUrl || row.landingImageUrl || null;

  return (
    <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link
        href={`/${params.locale}/clinics`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {dict.nav.clinics}
      </Link>

      {debug ? (
        <pre className="mb-6 overflow-auto rounded-lg border border-amber-300 bg-amber-50 p-3 text-[11px] text-amber-900">
          {JSON.stringify(lcDebug, null, 2)}
        </pre>
      ) : null}

      {/* Hero — cover photo with optional thumbnail strip below.
          aspect-[16/6] is ~33% shorter than the original 21:9, which
          keeps the page-fold scannable on laptops. The thumbnail strip
          (first 4 gallery images) repurposes content the master already
          uploaded so the Hero feels populated even before a real cover
          arrives. */}
      <section className="overflow-hidden rounded-2xl border bg-card">
        {coverUrl ? (
          // Plain <img> for now — many cover URLs sit on hosts not in
          // next.config.mjs remotePatterns yet. Will swap to <Image>
          // once everything routes through Supabase Storage.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={displayName}
            className="aspect-[16/6] w-full object-cover"
            loading="eager"
          />
        ) : gallery.length > 0 ? (
          // No cover but we have a gallery — assemble a 4-up mosaic so
          // the Hero never looks empty when assets exist.
          <div className="grid aspect-[16/6] grid-cols-4 gap-px bg-muted">
            {gallery.slice(0, 4).map((url, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt={`${displayName} ${idx + 1}`}
                className="h-full w-full object-cover"
                loading="eager"
              />
            ))}
            {/* If fewer than 4, pad the rest with a soft gradient */}
            {Array.from({ length: Math.max(0, 4 - gallery.length) }).map((_, i) => (
              <div
                key={`pad-${i}`}
                className="bg-gradient-to-br from-brand-100 via-hospitality-100 to-care-100"
              />
            ))}
          </div>
        ) : (
          <div className="aspect-[16/6] bg-gradient-to-br from-brand-200 via-hospitality-200 to-care-200" />
        )}

        {/* Thumbnail strip — shown only when cover exists AND we have
            extra gallery images to preview. Acts as a teaser for the
            full "병원 둘러보기" section further down. */}
        {coverUrl && gallery.length > 0 ? (
          <div className="grid grid-cols-4 gap-1.5 border-t bg-muted/10 p-1.5">
            {gallery.slice(0, 4).map((url, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt={`${displayName} 갤러리 ${idx + 1}`}
                className="aspect-[4/3] w-full rounded object-cover"
                loading="lazy"
              />
            ))}
          </div>
        ) : null}

        <div className="space-y-3 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{displayName}</h1>
            {isKoiha ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-care-300 bg-care-50 px-2.5 py-0.5 text-xs font-medium text-care-800">
                <ShieldCheck className="h-3 w-3" />
                KOIHA
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {address.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {address.city}, {row.countryCode}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              <span>—</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c) => (
              <span
                key={c}
                className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* About + landing poster — uses hospitals.notes for the
              bio text and hospitals.landingImageUrl for the long
              vertical promo poster (clinic-supplied flyer). Both are
              optional and mastered at /master/hospitals/[id]/edit.
              The standalone "병원 둘러보기" gallery section was
              removed: Hero already shows the first 4 gallery images
              as a thumbnail strip, so duplicating them below felt
              redundant. */}
          <PlaceholderSection title={dict.featured.title} icon={Award}>
            <div className="space-y-5">
              {aboutText ? (
                <p className="whitespace-pre-wrap leading-relaxed">{aboutText}</p>
              ) : !landingUrl ? (
                '병원 상세 소개는 곧 추가됩니다.'
              ) : null}

              {landingUrl ? (
                // Full-width vertical poster. Image renders at its
                // intrinsic aspect — most clinic flyers are 600–900
                // wide × 2000+ tall, so we cap visible width with
                // max-w but never crop vertically.
                <div className="overflow-hidden rounded-lg border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={landingUrl}
                    alt={`${displayName} 랜딩 포스터`}
                    className="mx-auto block w-full"
                    loading="lazy"
                  />
                </div>
              ) : null}
            </div>
          </PlaceholderSection>

          <PlaceholderSection title={dict.nav.reviews} icon={Star}>
            실제 환자 후기는 검증 절차를 거쳐 곧 공개됩니다.
          </PlaceholderSection>
        </div>

        {/* Sticky inquiry side card */}
        <aside className="lg:col-span-1">
          <div className="sticky top-20 rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-brand-700" />
              <h2 className="text-sm font-semibold">{dict.inquiryCta.title}</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {dict.inquiryCta.subtitle}
            </p>
            <Link
              href={`/${params.locale}/inquiry?hospital=${row.id}`}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <Sparkles className="h-4 w-4" />
              {dict.inquiryCta.submit}
            </Link>
            <Link
              href={`/${params.locale}/ai-consult?hospital=${row.id}`}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-input bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              {dict.nav.aiConsult}
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}

function PlaceholderSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Sparkles;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
