import Link from 'next/link';
import { and, eq, ilike, inArray, or } from 'drizzle-orm';
import { LOCALE_LABELS, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import { localizePriceUnit } from '@/lib/i18n/price-unit';
import { localizeKoLabel } from '@/lib/i18n/ko-label';
import { db } from '@/lib/db/client';
import {
  partnerListings,
  partnerListingLocaleContent,
} from '@/drizzle/schema/partner-listings';
import { hospitals } from '@/drizzle/schema/hospitals';
import { hospitalLocaleContent } from '@/drizzle/schema/hospital-locale-content';
import { MainHeader } from '../_components/main-header';
import { MainFooter } from '../_components/main-footer';
import { ListingCardPlaceholder, LISTING_PLACEHOLDER_BG } from '../_components/listing-card-placeholder';

export const dynamic = 'force-dynamic';

/**
 * /search — 헤더 검색바의 통합 검색 결과.
 *
 * 상품(partner_listings)과 병원(hospitals)을 한 페이지에서 검색:
 *   - 상품: 기본(한국어) title/description ILIKE + 현재 로케일의
 *     partner_listing_locale_content title/description ILIKE 를 합집합.
 *   - 병원: hospitals.name ILIKE + hospital_locale_content.name ILIKE.
 * 카드 디자인은 카테고리 목록 페이지와 동일한 문법을 재사용하고,
 * 표시 텍스트는 로케일 override 를 COALESCE 방식으로 적용.
 */

type ListingHit = {
  id: string;
  slug: string;
  category: string;
  title: string;
  locationLabel: string | null;
  priceWon: number | null;
  priceUnit: string | null;
  coverImageUrl: string | null;
  promoLabel: string | null;
  description: string | null;
  details: Record<string, unknown>;
};

type ClinicHit = {
  id: string;
  slug: string;
  name: string;
  coverImageUrl: string | null;
};

const LIMIT = 24;

async function searchListings(q: string, locale: PublicLocale): Promise<ListingHit[]> {
  const pattern = `%${q}%`;
  try {
    const base = await db
      .select()
      .from(partnerListings)
      .where(
        and(
          eq(partnerListings.status, 'approved'),
          or(
            ilike(partnerListings.title, pattern),
            ilike(partnerListings.description, pattern),
          ),
        ),
      )
      .limit(LIMIT);

    // 현재 로케일 번역본에서만 매칭되는 상품 (예: EN 검색어)
    const lcHits = await db
      .select({ listingId: partnerListingLocaleContent.listingId })
      .from(partnerListingLocaleContent)
      .where(
        and(
          eq(partnerListingLocaleContent.locale, locale),
          or(
            ilike(partnerListingLocaleContent.title, pattern),
            ilike(partnerListingLocaleContent.description, pattern),
          ),
        ),
      )
      .limit(LIMIT);
    const seen = new Set(base.map((r) => r.id));
    const extraIds = lcHits.map((r) => r.listingId).filter((id) => !seen.has(id));
    const extra = extraIds.length
      ? await db
          .select()
          .from(partnerListings)
          .where(
            and(
              inArray(partnerListings.id, extraIds),
              eq(partnerListings.status, 'approved'),
            ),
          )
      : [];

    const rows = [...base, ...extra].slice(0, LIMIT);
    if (rows.length === 0) return [];

    // 표시용 로케일 override
    const overrides = new Map<string, { title: string | null; locationLabel: string | null; coverImageUrl: string | null; description: string | null }>();
    try {
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
            inArray(partnerListingLocaleContent.listingId, rows.map((r) => r.id)),
            eq(partnerListingLocaleContent.locale, locale),
          ),
        );
      for (const r of lcRows) overrides.set(r.listingId, r);
    } catch { /* keep base values */ }

    return rows.map((r) => {
      const o = overrides.get(r.id);
      return {
        id: r.id,
        slug: r.slug,
        category: r.category,
        title: o?.title?.trim() || r.title,
        locationLabel: o?.locationLabel?.trim() || r.locationLabel,
        priceWon: r.priceWon,
        priceUnit: r.priceUnit,
        coverImageUrl: o?.coverImageUrl || r.coverImageUrl,
        promoLabel: r.promoLabel,
        description: o?.description?.trim() || r.description,
        details: (r.details ?? {}) as Record<string, unknown>,
      };
    });
  } catch {
    return [];
  }
}

async function searchClinics(q: string, locale: PublicLocale): Promise<ClinicHit[]> {
  const pattern = `%${q}%`;
  try {
    const base = await db
      .select({
        id: hospitals.id,
        slug: hospitals.slug,
        name: hospitals.name,
        coverImageUrl: hospitals.coverImageUrl,
      })
      .from(hospitals)
      .where(and(eq(hospitals.countryCode, 'KR'), ilike(hospitals.name, pattern)))
      .limit(12);

    const lcHits = await db
      .select({ hospitalId: hospitalLocaleContent.hospitalId })
      .from(hospitalLocaleContent)
      .where(
        and(
          eq(hospitalLocaleContent.locale, locale),
          ilike(hospitalLocaleContent.name, pattern),
        ),
      )
      .limit(12);
    const seen = new Set(base.map((r) => r.id));
    const extraIds = lcHits.map((r) => r.hospitalId).filter((id) => !seen.has(id));
    const extra = extraIds.length
      ? await db
          .select({
            id: hospitals.id,
            slug: hospitals.slug,
            name: hospitals.name,
            coverImageUrl: hospitals.coverImageUrl,
          })
          .from(hospitals)
          .where(inArray(hospitals.id, extraIds))
      : [];

    const rows = [...base, ...extra].slice(0, 12);
    if (rows.length === 0) return [];

    // 이름·커버 로케일 override
    const overrides = new Map<string, { name: string | null; coverImageUrl: string | null }>();
    try {
      const lcRows = await db
        .select({
          hospitalId: hospitalLocaleContent.hospitalId,
          name: hospitalLocaleContent.name,
          coverImageUrl: hospitalLocaleContent.coverImageUrl,
        })
        .from(hospitalLocaleContent)
        .where(
          and(
            inArray(hospitalLocaleContent.hospitalId, rows.map((r) => r.id)),
            eq(hospitalLocaleContent.locale, locale),
          ),
        );
      for (const r of lcRows) overrides.set(r.hospitalId, r);
    } catch { /* keep base */ }

    return rows.map((r) => {
      const o = overrides.get(r.id);
      return {
        id: r.id,
        slug: r.slug,
        name: o?.name?.trim() || r.name,
        coverImageUrl: o?.coverImageUrl || r.coverImageUrl,
      };
    });
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { locale: PublicLocale } }) {
  const dict = await getDictionary(params.locale);
  return { title: `${dict.searchPage.title} · KoreaGlowUp` };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: { locale: PublicLocale };
  searchParams: { q?: string };
}): Promise<JSX.Element> {
  const dict = await getDictionary(params.locale);
  const sp = dict.searchPage;
  const q = (searchParams.q ?? '').trim().slice(0, 80);

  const [listings, clinics] = q
    ? await Promise.all([searchListings(q, params.locale), searchClinics(q, params.locale)])
    : [[], []];
  const total = listings.length + clinics.length;

  return (
    <div
      style={{
        background: '#ffffff', color: '#222',
        fontFamily: "'Inter', 'Pretendard Variable', system-ui, sans-serif",
        overflowX: 'clip', minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <MainHeader locale={params.locale} activeTab="glowup" t={dict.header} />

      <section
        style={{
          flex: 1, maxWidth: 1280, width: '100%',
          margin: '0 auto', padding: '40px 40px 96px',
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>
          {q
            ? sp.resultsFor.replace('{q}', q).replace('{n}', String(total))
            : sp.title}
        </h1>

        {total === 0 ? (
          <div
            style={{
              marginTop: 32, border: '1px dashed #dddddd', background: '#fafafa',
              borderRadius: 16, padding: '56px 24px', textAlign: 'center',
            }}
          >
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#bcbcbc" strokeWidth="1.5" style={{ display: 'inline-block' }}>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '14px 0 0' }}>{sp.noResults}</h3>
            <p style={{ fontSize: 14, color: '#6a6a6a', margin: '6px 0 0' }}>{sp.noResultsBody}</p>
            <Link
              href={`/${params.locale}/glowup/pc`}
              style={{
                display: 'inline-block', marginTop: 20,
                background: '#ff385c', color: '#fff',
                padding: '10px 22px', borderRadius: 10,
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
              }}
            >
              {sp.browseAll}
            </Link>
          </div>
        ) : (
          <>
            {listings.length > 0 ? (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '28px 0 0' }}>{sp.listings}</h2>
                <div
                  style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 24, marginTop: 16,
                  }}
                >
                  {listings.map((l) => (
                    <SearchListingCard key={l.id} locale={params.locale} hit={l} d={dict.detail} />
                  ))}
                </div>
              </>
            ) : null}

            {clinics.length > 0 ? (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '36px 0 0' }}>{sp.clinics}</h2>
                <div
                  style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 20, marginTop: 16,
                  }}
                >
                  {clinics.map((c) => (
                    <Link
                      key={c.id}
                      href={`/${params.locale}/clinics/${c.slug}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div
                        style={{
                          position: 'relative', aspectRatio: '16/10',
                          borderRadius: 14, overflow: 'hidden',
                          background: c.coverImageUrl
                            ? `#f2f2f2 url(${c.coverImageUrl}) center / cover`
                            : LISTING_PLACEHOLDER_BG,
                        }}
                      >
                        {!c.coverImageUrl ? <ListingCardPlaceholder name={c.name} /> : null}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, marginTop: 10 }}>{c.name}</div>
                    </Link>
                  ))}
                </div>
              </>
            ) : null}
          </>
        )}
      </section>

      <MainFooter t={dict.siteFooter} localeNative={LOCALE_LABELS[params.locale].native} />
    </div>
  );
}

function SearchListingCard({
  locale,
  hit,
  d,
}: {
  locale: PublicLocale;
  hit: ListingHit;
  d: Dictionary['detail'];
}): JSX.Element {
  const freeform = typeof hit.details.priceRange === 'string' ? hit.details.priceRange : null;
  const price = hit.priceWon
    ? `₩${hit.priceWon.toLocaleString('ko-KR')}`
    : freeform
      ? localizeKoLabel(freeform, locale)
      : d.inquire;
  const unit = hit.priceWon ? localizePriceUnit(hit.priceUnit, hit.category, d.units, locale) : '';
  return (
    <Link
      href={`/${locale}/listings/${hit.slug}`}
      style={{
        display: 'flex', flexDirection: 'column',
        border: '1px solid #ebebeb', borderRadius: 18, overflow: 'hidden',
        background: '#fff', color: 'inherit', textDecoration: 'none',
        boxShadow: 'rgba(0,0,0,0.02) 0 1px 2px, rgba(0,0,0,0.06) 0 4px 12px',
      }}
    >
      <div
        style={{
          position: 'relative', aspectRatio: '16/10',
          background: hit.coverImageUrl
            ? `#f2f2f2 url(${hit.coverImageUrl}) center / cover`
            : LISTING_PLACEHOLDER_BG,
        }}
      >
        {!hit.coverImageUrl ? <ListingCardPlaceholder name={hit.title} /> : null}
        {hit.promoLabel ? (
          <div
            style={{
              position: 'absolute', top: 12, left: 12,
              background: '#fff', color: '#222',
              fontSize: 11, fontWeight: 600,
              borderRadius: 9999, padding: '5px 11px',
              boxShadow: 'rgba(0,0,0,0.1) 0 2px 6px',
            }}
          >
            {localizeKoLabel(hit.promoLabel, locale)}
          </div>
        ) : null}
      </div>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.3 }}>
          {hit.title}
        </span>
        {hit.locationLabel ? (
          <div style={{ fontSize: 13, color: '#6a6a6a', marginTop: 4 }}>{hit.locationLabel}</div>
        ) : null}
        <div
          style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end',
            marginTop: 14, paddingTop: 12, borderTop: '1px solid #ebebeb',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>
            {price}
            {unit ? <span style={{ color: '#6a6a6a', fontWeight: 400 }}> / {unit}</span> : null}
          </span>
        </div>
      </div>
    </Link>
  );
}
