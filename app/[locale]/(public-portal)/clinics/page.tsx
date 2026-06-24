import Link from 'next/link';
import { eq, inArray, sql, and } from 'drizzle-orm';
import type { PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { categoryListings } from '@/drizzle/schema/category-listings';
import { hospitalLocaleContent } from '@/drizzle/schema/hospital-locale-content';

export const dynamic = 'force-dynamic';

/**
 * Patient-facing clinic catalog — Airbnb design language.
 *
 * Pulls from the existing `hospitals` table (the same rows agencies
 * curate) and renders an Airbnb-style 4-column photo card grid. The
 * data layer is unchanged from the previous version: master-curated
 * `category_listings` take precedence, with a legacy
 * `hospitals.primary_categories` tag-match fallback when nothing is
 * curated yet, and `hospital_locale_content` overrides name + cover
 * per locale.
 *
 * RLS note: public page → no `app.current_org_id` setting. The
 * hospitals table's RLS policy lets the postgres role read all rows;
 * a restrictive `is_public` gate can be added later.
 *
 * Visual: inline styles matching /[locale] page.tsx + MainHeader's
 * 1280px / 40px padding rhythm, #ff385c accent, 14px card radius,
 * label outside the photo (not overlaid) for legibility.
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

const CATEGORY_LABELS: Record<string, string> = {
  plastic_surgery: '성형외과',
  dermatology: '피부과',
  dental: '치과',
  hair: '모발',
  health_checkup: '건강검진',
  beauty_tour: '뷰티 투어',
  makeup: '메이크업',
  photo_studio: '사진 스튜디오',
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
        // Table missing or other DB issue — fall through to legacy filter.
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

  if (filtered.length > 0) {
    try {
      const ids = filtered.map((h) => h.id);
      const overrides = await db
        .select({
          hospitalId: hospitalLocaleContent.hospitalId,
          name: hospitalLocaleContent.name,
          coverImageUrl: hospitalLocaleContent.coverImageUrl,
        })
        .from(hospitalLocaleContent)
        .where(
          and(
            inArray(hospitalLocaleContent.hospitalId, ids),
            eq(hospitalLocaleContent.locale, params.locale),
          ),
        );
      const byId = new Map(overrides.map((o) => [o.hospitalId, o]));
      filtered = filtered.map((h) => {
        const o = byId.get(h.id);
        return {
          ...h,
          name: o?.name?.trim() || h.name,
          coverImageUrl: o?.coverImageUrl || h.coverImageUrl,
        };
      });
    } catch {
      // hospital_locale_content missing — keep base values.
    }
  }

  const headerLabel = categoryFilter
    ? CATEGORY_LABELS[categoryFilter] || dict.nav.clinics
    : dict.nav.clinics;

  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px 80px' }}>
      <h1
        style={{
          fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px',
          margin: 0,
        }}
      >
        {headerLabel}
      </h1>
      <p style={{ fontSize: 14, color: '#6a6a6a', margin: '6px 0 0' }}>
        {filtered.length > 0
          ? `${filtered.length}곳의 검증된 병원 · 후기 · 예상 비용 안내`
          : dict.featured.subtitle}
      </p>

      {dbError ? (
        <div
          style={{
            marginTop: 24,
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#b91c1c',
            borderRadius: 12,
            padding: '12px 16px',
            fontSize: 14,
          }}
        >
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
        <div
          style={{
            marginTop: 28,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 24,
          }}
        >
          {filtered.map((h) => (
            <ClinicCard
              key={h.id}
              hospital={h}
              locale={params.locale}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ClinicCard({
  hospital,
  locale,
}: {
  hospital: ClinicRow;
  locale: PublicLocale;
}): JSX.Element {
  return (
    <Link
      href={`/${locale}/clinics/${hospital.slug}`}
      style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: '1', borderRadius: 14, overflow: 'hidden',
          background: hospital.coverImageUrl
            ? `#f2f2f2 url(${hospital.coverImageUrl}) center / cover`
            : 'linear-gradient(135deg, #f7f7f7 0%, #ebebeb 100%)',
        }}
      >
        {hospital.promoLabel ? (
          <div
            style={{
              position: 'absolute', top: 12, left: 12,
              background: '#fff', color: '#222',
              fontSize: 11, fontWeight: 600,
              borderRadius: 9999, padding: '5px 11px',
              boxShadow: 'rgba(0,0,0,0.1) 0 2px 6px',
            }}
          >
            {hospital.promoLabel}
          </div>
        ) : null}
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(0,0,0,0.45)" stroke="#fff" strokeWidth="1.8">
            <path d="M12 20s-7-4.5-9.2-8.5C1.3 8.7 2.5 5.5 5.5 5.5c1.8 0 2.9 1 3.5 2 .6-1 1.7-2 3.5-2 3 0 4.2 3.2 2.7 6C19 15.5 12 20 12 20z" />
          </svg>
        </div>
      </div>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 12,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>
          {hospital.name}
        </span>
      </div>
      <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 3 }}>
        {hospital.primaryCategories
          .slice(0, 3)
          .map((c) => CATEGORY_LABELS[c] || c)
          .join(' · ')}
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
  const title = categoryFilter ? dict.common.noClinicsInCategory : dict.common.noClinicsTitle;
  const body = dict.common.noClinicsBody;
  return (
    <div
      style={{
        marginTop: 40,
        border: '1px dashed #dddddd',
        background: '#fafafa',
        borderRadius: 16,
        padding: '56px 24px',
        textAlign: 'center',
      }}
    >
      <svg
        width="42" height="42" viewBox="0 0 24 24" fill="none"
        stroke="#bcbcbc" strokeWidth="1.5"
        style={{ display: 'inline-block' }}
      >
        <path d="M12 2 a8 8 0 0 1 8 8 c0 6-8 12-8 12 s-8-6-8-12 a8 8 0 0 1 8-8 z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      <h3 style={{ fontSize: 18, fontWeight: 600, margin: '12px 0 0' }}>{title}</h3>
      <p style={{ fontSize: 14, color: '#6a6a6a', margin: '6px 0 0' }}>{body}</p>
      <div
        style={{
          display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
          gap: 10, marginTop: 20,
        }}
      >
        {categoryFilter ? (
          <Link
            href={`/${locale}/clinics`}
            style={{
              border: '1px solid #222', borderRadius: 8,
              padding: '10px 18px',
              fontWeight: 500, fontSize: 14, color: '#222',
              textDecoration: 'none', background: '#fff',
            }}
          >
            {dict.common.seeMore}
          </Link>
        ) : null}
        <Link
          href={`/${locale}/inquiry`}
          style={{
            background: '#ff385c', color: '#fff',
            border: 'none', borderRadius: 8,
            padding: '10px 18px',
            fontWeight: 500, fontSize: 14,
            textDecoration: 'none',
          }}
        >
          {dict.inquiryCta.submit}
        </Link>
      </div>
    </div>
  );
}
