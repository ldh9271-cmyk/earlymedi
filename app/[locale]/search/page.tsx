import Link from 'next/link';
import { and, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
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
import type { ListingCategory } from '@/lib/listings/categories';
import { MainHeader } from '../_components/main-header';
import { MainFooter } from '../_components/main-footer';
import { ListingCardPlaceholder, LISTING_PLACEHOLDER_BG } from '../_components/listing-card-placeholder';

export const dynamic = 'force-dynamic';

/**
 * /search — 헤더 검색바의 통합 검색 결과.
 *
 * 검색어는 토큰으로 분해된다: 공백 분리 + 붙여쓴 한국어 복합어에서
 * 알려진 키워드 추출 ("강남여행" → 강남 + 여행). 각 토큰은
 *   1) 상품 title/description/location + 현재 로케일 번역본 ILIKE
 *   2) 카테고리 키워드 매핑 (여행→travel_package, 네일→nail …)
 *      → 해당 카테고리 대표 상품 합류
 *   3) 병원 이름 (기본+로케일) ILIKE, 병원 키워드면 대표 병원 합류
 * 로 확장되고, 더 많은 토큰과 일치하는 결과가 앞에 온다.
 */

// ── 토큰 추출 ────────────────────────────────────────────────────
// 붙여쓴 복합어에서 분리해낼 알려진 키워드 (지역 + 분야).
const KNOWN_KEYWORDS = [
  '강남', '청담', '압구정', '서초', '신사', '가로수길', '명동', '홍대',
  '삼성동', '역삼', '논현', '반포', '대치', '성수', '용산', '동대문', '서울',
  '여행', '패키지', '투어', '병원', '피부과', '성형외과', '성형', '치과',
  '안과', '한방', '검진', '클리닉', '호텔', '숙소', '맛집', '식당',
  '퍼스널컬러', '컬러', '헤어', '미용실', '메이크업', '네일', '반영구',
  '눈썹', '문신', '사진', '스튜디오', '화보', '케이팝', 'k팝', '아이돌', '굿즈',
];

function extractTokens(q: string): string[] {
  const out = new Set<string>();
  for (const part of q.split(/\s+/).filter(Boolean)) {
    out.add(part);
    const lower = part.toLowerCase();
    for (const k of KNOWN_KEYWORDS) {
      if (lower !== k.toLowerCase() && lower.includes(k.toLowerCase())) out.add(k);
    }
  }
  return [...out].slice(0, 8);
}

// ── 토큰 → 카테고리 매핑 (다국어 키워드 포함) ────────────────────
const TOKEN_TO_CATEGORIES: Array<{ words: string[]; cats: ListingCategory[] }> = [
  { words: ['여행', '패키지', '투어', 'travel', 'package', 'tour', 'тур', 'ツアー', '跟团', 'パッケージ'], cats: ['travel_package'] },
  { words: ['호텔', '숙소', 'hotel', 'отель', 'ホテル', '酒店', 'khách sạn'], cats: ['hotel'] },
  { words: ['맛집', '식당', 'food', 'restaurant', 'グルメ', '美食', 'ресторан', 'quán'], cats: ['food', 'restaurant'] },
  { words: ['퍼스널컬러', '컬러', 'color', 'パーソナルカラー', '色彩', 'цветотип', 'màu'], cats: ['personal_color'] },
  { words: ['헤어', '미용실', 'hair', 'ヘア', '美发', 'волосы', 'tóc'], cats: ['hair'] },
  { words: ['메이크업', 'makeup', 'メイク', '化妆', 'макияж', 'trang điểm'], cats: ['makeup'] },
  { words: ['네일', 'nail', 'ネイル', '美甲', 'маникюр'], cats: ['nail'] },
  { words: ['반영구', '눈썹', '문신', 'pmu', 'eyebrow', 'アートメイク', '半永久', 'перманент', 'phun xăm'], cats: ['pmu'] },
  { words: ['사진', '스튜디오', '화보', 'photo', 'studio', 'フォト', '写真', 'фото', 'ảnh'], cats: ['photo_studio'] },
  { words: ['케이팝', 'k팝', 'kpop', 'k-pop', '아이돌', '굿즈', 'idol', 'アイドル', 'мерч'], cats: ['kpop_tour'] },
];

const HOSPITAL_WORDS = ['병원', '피부과', '성형외과', '성형', '치과', '안과', '한방', '검진', '클리닉', 'hospital', 'clinic', '医院', '病院', 'клиника', 'bệnh viện'];

function categoriesForTokens(tokens: string[]): ListingCategory[] {
  const cats = new Set<ListingCategory>();
  for (const t of tokens) {
    const lower = t.toLowerCase();
    for (const m of TOKEN_TO_CATEGORIES) {
      if (m.words.some((w) => lower.includes(w.toLowerCase()))) m.cats.forEach((c) => cats.add(c));
    }
  }
  return [...cats];
}

function wantsHospitals(tokens: string[]): boolean {
  return tokens.some((t) => HOSPITAL_WORDS.some((w) => t.toLowerCase().includes(w.toLowerCase())));
}

// ── 상품 검색 ────────────────────────────────────────────────────
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
  details: Record<string, unknown>;
  score: number;
};

const LIMIT = 24;

async function searchListings(q: string, tokens: string[], locale: PublicLocale): Promise<ListingHit[]> {
  try {
    const tokenConds: SQL[] = tokens.map(
      (t) =>
        or(
          ilike(partnerListings.title, `%${t}%`),
          ilike(partnerListings.description, `%${t}%`),
          ilike(partnerListings.locationLabel, `%${t}%`),
        ) as SQL,
    );
    const base = tokenConds.length
      ? await db
          .select()
          .from(partnerListings)
          .where(and(eq(partnerListings.status, 'approved'), or(...tokenConds)))
          .limit(48)
      : [];

    // 현재 로케일 번역본에서만 매칭되는 상품 (예: EN/ZH 검색어)
    const lcConds: SQL[] = tokens.map(
      (t) =>
        or(
          ilike(partnerListingLocaleContent.title, `%${t}%`),
          ilike(partnerListingLocaleContent.description, `%${t}%`),
        ) as SQL,
    );
    const lcHits = lcConds.length
      ? await db
          .select({ listingId: partnerListingLocaleContent.listingId })
          .from(partnerListingLocaleContent)
          .where(and(eq(partnerListingLocaleContent.locale, locale), or(...lcConds)))
          .limit(48)
      : [];

    // 카테고리 키워드 매핑 — 해당 카테고리 대표 상품(커버 우선) 합류
    const cats = categoriesForTokens(tokens);
    const catRows = cats.length
      ? await db
          .select()
          .from(partnerListings)
          .where(and(inArray(partnerListings.category, cats), eq(partnerListings.status, 'approved')))
          .orderBy(
            sql`(${partnerListings.coverImageUrl} IS NULL)`,
            sql`${partnerListings.sortOrder} asc`,
          )
          .limit(cats.length * 4)
      : [];

    const byId = new Map<string, typeof partnerListings.$inferSelect>();
    for (const r of base) byId.set(r.id, r);
    for (const r of catRows) if (!byId.has(r.id)) byId.set(r.id, r);
    const extraIds = lcHits.map((r) => r.listingId).filter((id) => !byId.has(id));
    if (extraIds.length) {
      const extra = await db
        .select()
        .from(partnerListings)
        .where(and(inArray(partnerListings.id, extraIds), eq(partnerListings.status, 'approved')));
      for (const r of extra) byId.set(r.id, r);
    }
    const rows = [...byId.values()];
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
    } catch { /* keep base */ }

    const lcMatched = new Set(lcHits.map((r) => r.listingId));
    const qLower = q.toLowerCase();
    const catSet = new Set(cats);
    const scored = rows.map((r): ListingHit => {
      const o = overrides.get(r.id);
      const haystack = `${r.title} ${r.description ?? ''} ${r.locationLabel ?? ''} ${o?.title ?? ''} ${o?.description ?? ''}`.toLowerCase();
      let score = 0;
      for (const t of tokens) if (haystack.includes(t.toLowerCase())) score += 2;
      if (haystack.includes(qLower)) score += 3; // 전체 검색어 일치 보너스
      if (catSet.has(r.category as ListingCategory)) score += 1.5;
      if (lcMatched.has(r.id)) score += 1;
      if (r.coverImageUrl || o?.coverImageUrl) score += 0.5;
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
        details: (r.details ?? {}) as Record<string, unknown>,
        score,
      };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, LIMIT);
  } catch {
    return [];
  }
}

// ── 병원 검색 ────────────────────────────────────────────────────
type ClinicHit = {
  id: string;
  slug: string;
  name: string;
  coverImageUrl: string | null;
};

async function searchClinics(tokens: string[], locale: PublicLocale): Promise<ClinicHit[]> {
  try {
    const nameConds: SQL[] = tokens.map((t) => ilike(hospitals.name, `%${t}%`) as SQL);
    const base = nameConds.length
      ? await db
          .select({ id: hospitals.id, slug: hospitals.slug, name: hospitals.name, coverImageUrl: hospitals.coverImageUrl })
          .from(hospitals)
          .where(and(eq(hospitals.countryCode, 'KR'), or(...nameConds)))
          .limit(12)
      : [];

    const lcConds: SQL[] = tokens.map((t) => ilike(hospitalLocaleContent.name, `%${t}%`) as SQL);
    const lcHits = lcConds.length
      ? await db
          .select({ hospitalId: hospitalLocaleContent.hospitalId })
          .from(hospitalLocaleContent)
          .where(and(eq(hospitalLocaleContent.locale, locale), or(...lcConds)))
          .limit(12)
      : [];

    const byId = new Map<string, ClinicHit>();
    for (const r of base) byId.set(r.id, r);
    const extraIds = lcHits.map((r) => r.hospitalId).filter((id) => !byId.has(id));
    if (extraIds.length) {
      const extra = await db
        .select({ id: hospitals.id, slug: hospitals.slug, name: hospitals.name, coverImageUrl: hospitals.coverImageUrl })
        .from(hospitals)
        .where(inArray(hospitals.id, extraIds));
      for (const r of extra) byId.set(r.id, r);
    }

    // 병원 키워드('병원'·'피부과' 등)면 대표 병원(커버 우선) 합류
    if (wantsHospitals(tokens) && byId.size < 8) {
      const top = await db
        .select({ id: hospitals.id, slug: hospitals.slug, name: hospitals.name, coverImageUrl: hospitals.coverImageUrl })
        .from(hospitals)
        .where(eq(hospitals.countryCode, 'KR'))
        .orderBy(sql`(${hospitals.coverImageUrl} IS NULL), ${hospitals.sortOrder} asc`)
        .limit(8);
      for (const r of top) if (!byId.has(r.id)) byId.set(r.id, r);
    }

    const rows = [...byId.values()].slice(0, 12);
    if (rows.length === 0) return [];

    const overrides = new Map<string, { name: string | null; coverImageUrl: string | null }>();
    try {
      const lcRows = await db
        .select({ hospitalId: hospitalLocaleContent.hospitalId, name: hospitalLocaleContent.name, coverImageUrl: hospitalLocaleContent.coverImageUrl })
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
      return { ...r, name: o?.name?.trim() || r.name, coverImageUrl: o?.coverImageUrl || r.coverImageUrl };
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
  const tokens = q ? extractTokens(q) : [];

  const [listings, clinics] = q
    ? await Promise.all([searchListings(q, tokens, params.locale), searchClinics(tokens, params.locale)])
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
          <SearchGuide locale={params.locale} sp={sp} showNoResults={q.length > 0} />
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

/** 검색 방법 안내 + 인기 검색어 칩 — 결과 0건/검색어 없음일 때. */
function SearchGuide({
  locale,
  sp,
  showNoResults,
}: {
  locale: PublicLocale;
  sp: Dictionary['searchPage'];
  showNoResults: boolean;
}): JSX.Element {
  return (
    <div style={{ marginTop: 28 }}>
      {showNoResults ? (
        <p style={{ fontSize: 15, color: '#6a6a6a', margin: '0 0 20px' }}>
          <strong style={{ color: '#222' }}>{sp.noResults}</strong> — {sp.noResultsBody}
        </p>
      ) : null}

      <div
        style={{
          border: '1px solid #ebebeb', borderRadius: 16,
          padding: '22px 24px', background: '#fafafa',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{sp.tipsTitle}</h3>
        <p style={{ fontSize: 14, color: '#3f3f3f', lineHeight: 1.6, margin: '8px 0 0', maxWidth: 720 }}>
          {sp.tipsBody}
        </p>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, margin: '26px 0 0' }}>{sp.popularTitle}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {sp.popular.map((word) => (
          <Link
            key={word}
            href={`/${locale}/search?q=${encodeURIComponent(word)}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: '1px solid #dddddd', borderRadius: 9999,
              padding: '9px 16px', fontSize: 14, fontWeight: 500,
              color: '#222', textDecoration: 'none', background: '#fff',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            {word}
          </Link>
        ))}
      </div>

      <div style={{ marginTop: 28 }}>
        <Link
          href={`/${locale}/glowup/pc`}
          style={{
            display: 'inline-block',
            background: '#ff385c', color: '#fff',
            padding: '11px 24px', borderRadius: 10,
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}
        >
          {sp.browseAll}
        </Link>
      </div>
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
  const freeform = typeof hit.details.priceRange === 'string' ? (hit.details.priceRange as string) : null;
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
