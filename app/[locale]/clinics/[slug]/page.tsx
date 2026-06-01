import Link from 'next/link';
import { notFound } from 'next/navigation';
import { inArray } from 'drizzle-orm';
import { ArrowLeft, MapPin, Star, ShieldCheck, Sparkles, Award, Languages } from 'lucide-react';
import type { PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';

export const dynamic = 'force-dynamic';

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
}: {
  params: { locale: PublicLocale; slug: string };
}): Promise<JSX.Element> {
  const dict = await getDictionary(params.locale);

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

  const address = row.addressJson ?? {};
  const cats = (row.primaryCategories ?? []) as string[];
  const isKoiha = !!row.foreignPatientLicenseNumber;
  const coverUrl = row.coverImageUrl;
  const aboutText = row.notes?.trim() || null;
  const gallery = ((row.galleryImageUrls ?? []) as string[]) ?? [];
  const landingUrl = row.landingImageUrl ?? null;

  return (
    <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link
        href={`/${params.locale}/clinics`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {dict.nav.clinics}
      </Link>

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
            alt={row.name}
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
                alt={`${row.name} ${idx + 1}`}
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
                alt={`${row.name} 갤러리 ${idx + 1}`}
                className="aspect-[4/3] w-full rounded object-cover"
                loading="lazy"
              />
            ))}
          </div>
        ) : null}

        <div className="space-y-3 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{row.name}</h1>
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
                    alt={`${row.name} 랜딩 포스터`}
                    className="mx-auto block w-full"
                    loading="lazy"
                  />
                </div>
              ) : null}
            </div>
          </PlaceholderSection>

          <PlaceholderSection title="Before / After" icon={Sparkles}>
            검증된 시술 전후 사진은 의료법 규정에 따라 본인 동의 후 게시됩니다.
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
