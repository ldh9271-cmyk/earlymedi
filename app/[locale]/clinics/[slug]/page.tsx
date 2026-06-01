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

  const [row] = await db
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

  if (!row) notFound();

  const address = row.addressJson ?? {};
  const cats = (row.primaryCategories ?? []) as string[];
  const isKoiha = !!row.foreignPatientLicenseNumber;
  const coverUrl = row.coverImageUrl;
  const aboutText = row.notes?.trim() || null;

  return (
    <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link
        href={`/${params.locale}/clinics`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {dict.nav.clinics}
      </Link>

      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border bg-card">
        {coverUrl ? (
          // Use a plain <img> for now — many cover URLs sit on third-party
          // hosts not added to next.config.mjs remotePatterns yet. Once
          // we centralize uploads through Supabase Storage we can swap
          // this for <Image>.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={row.name}
            className="aspect-[21/9] w-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="aspect-[21/9] bg-gradient-to-br from-brand-200 via-hospitality-200 to-care-200" />
        )}
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
          {/* About — uses hospitals.notes as the public bio for now.
              Master-side edit at /master/hospitals/[id]/edit. */}
          <PlaceholderSection title={dict.featured.title} icon={Award}>
            {aboutText ? (
              <p className="whitespace-pre-wrap leading-relaxed">{aboutText}</p>
            ) : (
              '병원 상세 소개는 곧 추가됩니다.'
            )}
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
