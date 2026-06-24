import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, inArray } from 'drizzle-orm';
import type { Metadata } from 'next';
import type { PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { hospitalLocaleContent } from '@/drizzle/schema/hospital-locale-content';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  plastic_surgery: '성형외과',
  dermatology: '피부과',
  dental: '치과',
  hair: '모발',
  health_checkup: '건강검진',
  stem_cell: '줄기세포',
  oriental: '한방병원',
  partner: '파트너병원',
  beauty_tour: '뷰티 투어',
  makeup: '메이크업',
  photo_studio: '사진 스튜디오',
};

/**
 * Per-locale SEO metadata — unchanged from the previous version.
 * Pulls seo_title / seo_description from hospital_locale_content for
 * the current locale with falls back through locale name → base name
 * and locale intro → base notes.
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
        ru: `/ru/clinics/${params.slug}`,
        vi: `/vi/clinics/${params.slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      locale: ({
        kr: 'ko_KR',
        zh: 'zh_CN',
        ja: 'ja_JP',
        ru: 'ru_RU',
        vi: 'vi_VN',
        en: 'en_US',
      } as const)[params.locale] ?? 'en_US',
    },
  };
}

/**
 * Hospital detail page — Airbnb design language.
 *
 * Data layer is unchanged from the previous version (locale-first
 * overrides with COALESCE-style fallback). What changed is the shell:
 * 1280px max-width, Airbnb-style gallery mosaic (1 big + 4 small when
 * we have 5+ images), title row with KOIHA badge inline, 2-column
 * layout with a sticky #ff385c inquiry card on the right.
 */
export default async function ClinicDetailPage({
  params,
}: {
  params: { locale: PublicLocale; slug: string };
}): Promise<JSX.Element> {
  const dict = await getDictionary(params.locale);

  let resolvedSlug = params.slug;
  try {
    resolvedSlug = decodeURIComponent(params.slug);
  } catch {
    /* malformed % escapes — fall back to raw */
  }
  const candidates = Array.from(new Set([params.slug, resolvedSlug]));

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

  let lc: {
    name: string | null;
    intro: string | null;
    coverImageUrl: string | null;
    galleryImageUrls: string[];
    landingImageUrl: string | null;
  } | null = null;
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
  } catch {
    /* table missing — fall through to base */
  }

  const address = row.addressJson ?? {};
  const cats = (row.primaryCategories ?? []) as string[];
  const isKoiha = !!row.foreignPatientLicenseNumber;

  const displayName = lc?.name?.trim() || row.name;
  const aboutText = lc?.intro?.trim() || row.notes?.trim() || null;
  const coverUrl = lc?.coverImageUrl || row.coverImageUrl;
  const galleryRaw = lc?.galleryImageUrls && lc.galleryImageUrls.length > 0
    ? lc.galleryImageUrls
    : ((row.galleryImageUrls ?? []) as string[]);
  const gallery = galleryRaw ?? [];
  const landingUrl = lc?.landingImageUrl || row.landingImageUrl || null;

  return (
    <article style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px 80px' }}>
      <Link
        href={`/${params.locale}/clinics`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          color: '#222', fontSize: 14, fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        ← 모든 병원
      </Link>

      <h1
        style={{
          margin: '14px 0 4px',
          fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px',
          display: 'inline-flex', alignItems: 'center', gap: 12,
        }}
      >
        {displayName}
        {isKoiha ? (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600,
              background: '#ecfdf5', color: '#047857',
              border: '1px solid #a7f3d0',
              borderRadius: 9999, padding: '3px 9px',
              letterSpacing: '0.3px',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            KOIHA
          </span>
        ) : null}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#6a6a6a' }}>
        {address.city ? <span>{address.city} · {row.countryCode}</span> : null}
        {cats.length > 0 ? (
          <span>
            · {cats.slice(0, 3).map((c) => CATEGORY_LABELS[c] || c).join(' · ')}
          </span>
        ) : null}
      </div>

      {/* Hero gallery — Airbnb-style mosaic.
          5+ images → 1 big + 4 small (60/40 split, 4 tiles in 2x2).
          1 image → single cover.
          0 image + 0 cover → soft gradient fallback. */}
      <div style={{ marginTop: 20 }}>
        {coverUrl && gallery.length >= 4 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 8,
              aspectRatio: '2/1',
              borderRadius: 20, overflow: 'hidden',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt={displayName}
              style={{
                gridRow: '1 / span 2',
                width: '100%', height: '100%', objectFit: 'cover',
              }}
              loading="eager"
            />
            {gallery.slice(0, 4).map((url, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt={`${displayName} ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
            ))}
          </div>
        ) : coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={displayName}
            style={{
              width: '100%', aspectRatio: '16/9', objectFit: 'cover',
              borderRadius: 20, display: 'block',
            }}
            loading="eager"
          />
        ) : gallery.length > 0 ? (
          <div
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
              aspectRatio: '16/6',
              borderRadius: 20, overflow: 'hidden',
            }}
          >
            {gallery.slice(0, 4).map((url, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt={`${displayName} ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              aspectRatio: '16/6', borderRadius: 20,
              background: 'linear-gradient(135deg, #f7f7f7 0%, #ebebeb 100%)',
            }}
          />
        )}
      </div>

      {/* Body — 2-column layout with sticky inquiry card */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 48,
          marginTop: 32, alignItems: 'start',
        }}
      >
        <div>
          <h2 style={{ fontSize: 21, fontWeight: 700, margin: '0 0 12px' }}>
            {dict.featured.title}
          </h2>
          <div style={{ fontSize: 15, lineHeight: 1.7, color: '#3f3f3f' }}>
            {aboutText ? (
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{aboutText}</p>
            ) : !landingUrl ? (
              <p style={{ color: '#6a6a6a', margin: 0 }}>병원 상세 소개는 곧 추가됩니다.</p>
            ) : null}
          </div>

          {landingUrl ? (
            <div
              style={{
                marginTop: 24,
                overflow: 'hidden', borderRadius: 16,
                border: '1px solid #ebebeb',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={landingUrl}
                alt={`${displayName} 랜딩 포스터`}
                style={{ width: '100%', display: 'block' }}
                loading="lazy"
              />
            </div>
          ) : null}

          <div style={{ height: 1, background: '#ebebeb', margin: '32px 0' }} />

          <h2 style={{ fontSize: 21, fontWeight: 700, margin: '0 0 12px' }}>
            {dict.nav.reviews}
          </h2>
          <p style={{ fontSize: 14, color: '#6a6a6a', margin: 0 }}>
            실제 환자 후기는 검증 절차를 거쳐 곧 공개됩니다.
          </p>
        </div>

        {/* Sticky inquiry card — same shape as Course 예약 card on /kr */}
        <div
          style={{
            position: 'sticky', top: 200,
            border: '1px solid #dddddd', borderRadius: 14, padding: 24,
            boxShadow:
              'rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600 }}>{dict.inquiryCta.title}</div>
          <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 18px', lineHeight: 1.5 }}>
            {dict.inquiryCta.subtitle}
          </p>
          <Link
            href={`/${params.locale}/inquiry?hospital=${row.id}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', height: 50,
              background: '#ff385c', color: '#fff',
              borderRadius: 8,
              fontWeight: 500, fontSize: 16,
              textDecoration: 'none',
            }}
          >
            {dict.inquiryCta.submit}
          </Link>
          <Link
            href={`/${params.locale}/ai-consult?hospital=${row.id}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', height: 50, marginTop: 10,
              background: '#fff', color: '#222',
              border: '1px solid #222', borderRadius: 8,
              fontWeight: 500, fontSize: 16,
              textDecoration: 'none',
            }}
          >
            {dict.nav.aiConsult}
          </Link>
          <div
            style={{
              textAlign: 'center', fontSize: 13, color: '#6a6a6a',
              marginTop: 14,
            }}
          >
            예약 확정 전에는 요금이 청구되지 않습니다
          </div>
        </div>
      </div>
    </article>
  );
}
