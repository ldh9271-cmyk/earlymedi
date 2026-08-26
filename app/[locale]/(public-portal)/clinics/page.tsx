import Link from 'next/link';
import { eq, inArray, sql, and, gte } from 'drizzle-orm';
import { BrandMark } from '../../_components/brand-mark';
import type { PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { coverByLocale, localesForMedia } from '@/lib/i18n/locale-cover';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import { localizeKoLabel } from '@/lib/i18n/ko-label';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { categoryListings } from '@/drizzle/schema/category-listings';
import { hospitalLocaleContent } from '@/drizzle/schema/hospital-locale-content';

export const dynamic = 'force-dynamic';

/**
 * 상품 카탈로그 (구 병원 찾기) — 2026-08-27 리드 수집 모델로 개편.
 *
 * 병원 시술을 "상품"으로 묶어 메인 화면처럼 카테고리 섹션(성형외과
 * 상품 · 피부과 상품 · …)으로 보여주고, 결제 대신 [문의하기]로 환자
 * DB(리드)를 수집한다. 문의는 /inquiry?hospital=&interest= 프리필로
 * 이어지고, 병원은 리드 마켓(/medical/leads)에서 충전금으로 열람한다.
 *
 * 데이터: master 큐레이션 category_listings 우선, 비어 있으면 legacy
 * hospitals.primary_categories 매칭. hospital_locale_content 가 이름·
 * 커버를 로케일별로 덮어쓴다. '전체' 칩은 제거 — 무필터 진입 시
 * 카테고리 섹션 전체가 곧 전체 보기다.
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

function cityFilterMatch(
  addressJson: { city?: string } | null,
  cityWhitelist: ReadonlyArray<string>,
): boolean {
  if (cityWhitelist.length === 0) return true;
  const city = (addressJson?.city ?? '').trim();
  if (!city) return false;
  return cityWhitelist.some((w) => city.includes(w));
}

/** 상품 카테고리 — 사용자 지정 9종 (전체 칩 없음). */
const SUB_CHIP_KEYS: ReadonlyArray<CategoryLabelKey> = [
  'plastic_surgery', 'dermatology', 'dental', 'ophthalmology', 'hair',
  'health_checkup', 'stem_cell', 'oriental', 'partner',
];

type CategoryLabelKey = keyof Dictionary['clinicsPage']['categories'];

function categoryLabel(
  key: string,
  labels: Dictionary['clinicsPage']['categories'],
): string {
  return (labels as Record<string, string>)[key] || key;
}

const CLINICS_MOBILE_CSS =
  '.m-cl-hscroll::-webkit-scrollbar { display: none; }'
  + '@media (max-width: 768px) {'
  + '.m-cl-page { padding: 20px 16px 80px !important; }'
  + '.m-cl-title { font-size: 22px !important; }'
  + '.m-cl-subtitle { font-size: 13px !important; }'
  + '.m-cl-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 14px !important; margin-top: 18px !important; }'
  + '.m-cl-card-name { font-size: 14px !important; }'
  + '.m-cl-card-tags { font-size: 12px !important; }'
  + '.m-cl-chips-row { padding: 0 16px !important; gap: 8px !important; }'
  + '.m-cl-hcard { width: 168px !important; }'
  + '.m-cl-sec-title { font-size: 18px !important; }'
  + '}';

/** 로케일 오버라이드(이름·커버) 일괄 적용. */
async function applyLocaleOverrides(
  rows: ClinicRow[],
  locale: PublicLocale,
): Promise<ClinicRow[]> {
  if (rows.length === 0) return rows;
  try {
    const ids = rows.map((h) => h.id);
    const overrides = await db
      .select({
        hospitalId: hospitalLocaleContent.hospitalId,
        locale: hospitalLocaleContent.locale,
        name: hospitalLocaleContent.name,
        coverImageUrl: hospitalLocaleContent.coverImageUrl,
      })
      .from(hospitalLocaleContent)
      .where(
        and(
          inArray(hospitalLocaleContent.hospitalId, ids),
          inArray(hospitalLocaleContent.locale, localesForMedia(locale)),
        ),
      );
    const nameById = new Map(
      overrides.filter((o) => o.locale === locale).map((o) => [o.hospitalId, o.name]),
    );
    const coverById = coverByLocale(
      overrides.map((o) => ({ id: o.hospitalId, locale: o.locale, coverImageUrl: o.coverImageUrl })),
      locale,
    );
    return rows.map((h) => ({
      ...h,
      name: nameById.get(h.id)?.trim() || h.name,
      coverImageUrl: coverById.get(h.id) || h.coverImageUrl,
    }));
  } catch {
    return rows;
  }
}

export default async function ClinicsListPage({
  params,
  searchParams,
}: {
  params: { locale: PublicLocale };
  searchParams: {
    category?: string;
    procedure?: string;
    priceMin?: string;
    priceMax?: string;
    minRating?: string;
    loc?: string;
  };
}): Promise<JSX.Element> {
  const dict = await getDictionary(params.locale);

  const categoryFilter = searchParams.category;
  const procedureFilter = searchParams.procedure;

  const minRating = (() => {
    const n = Number(searchParams.minRating);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
  const wantedCities = (searchParams.loc ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const LOC_TO_CITY: Record<string, string> = {
    gangnam: '강남',
    myeongdong: '명동',
    seongsu: '성수',
    cheongdam: '청담',
    hongdae: '홍대',
    itaewon: '이태원',
  };
  const cityWhitelist = wantedCities
    .map((k) => LOC_TO_CITY[k])
    .filter((v): v is string => typeof v === 'string');

  let dbError: string | null = null;

  // ── 카테고리 지정 뷰: 해당 상품 카테고리의 병원 그리드 ─────────────
  if (categoryFilter) {
    let filtered: ClinicRow[] = [];
    try {
      let listingRows: Array<{ hospitalId: string; promoLabel: string | null }> = [];
      try {
        listingRows = await db
          .select({
            hospitalId: categoryListings.hospitalId,
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
        // curated 테이블 없음 — legacy 로 폴백
      }

      if (listingRows.length > 0) {
        const ids = listingRows.map((r) => r.hospitalId);
        const hospitalRows = await db
          .select({
            id: hospitals.id,
            name: hospitals.name,
            slug: hospitals.slug,
            countryCode: hospitals.countryCode,
            primaryCategories: hospitals.primaryCategories,
            coverImageUrl: hospitals.coverImageUrl,
            sortOrder: hospitals.sortOrder,
          })
          .from(hospitals)
          .where(inArray(hospitals.id, ids));
        const hospitalsById = new Map(hospitalRows.map((h) => [h.id, h]));
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
              _sortOrder: h.sortOrder,
            };
          })
          .filter((r): r is ClinicRow & { _sortOrder: number } => r !== null)
          .sort((a, b) => a._sortOrder - b._sortOrder)
          .map(({ _sortOrder: _, ...rest }) => rest);
      } else {
        const whereParts = [
          eq(hospitals.countryCode, 'KR'),
          eq(hospitals.isActiveForMatching, true),
        ];
        if (minRating !== null) whereParts.push(gte(hospitals.rating, minRating));
        const fetched = await db
          .select({
            id: hospitals.id,
            name: hospitals.name,
            slug: hospitals.slug,
            countryCode: hospitals.countryCode,
            primaryCategories: hospitals.primaryCategories,
            coverImageUrl: hospitals.coverImageUrl,
            addressJson: hospitals.addressJson,
          })
          .from(hospitals)
          .where(and(...whereParts))
          .orderBy(sql`${hospitals.sortOrder} asc, ${hospitals.createdAt} desc`)
          .limit(50);
        filtered = fetched
          .map((r) => ({
            ...r,
            primaryCategories: (r.primaryCategories ?? []) as string[],
            promoLabel: null,
          }))
          .filter((h) => h.primaryCategories.includes(categoryFilter))
          .filter((h) => cityFilterMatch(h.addressJson, cityWhitelist));
      }
    } catch (err) {
      dbError = err instanceof Error ? err.message : 'db_error';
    }

    const localized = await applyLocaleOverrides(filtered, params.locale);
    const title = categoryLabel(categoryFilter, dict.clinicsPage.categories);

    return (
      <section className="m-cl-page" style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px 80px' }}>
        <style dangerouslySetInnerHTML={{ __html: CLINICS_MOBILE_CSS }} />
        <h1 className="m-cl-title" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>
          {title}
        </h1>
        <p className="m-cl-subtitle" style={{ fontSize: 14, color: '#6a6a6a', margin: '6px 0 0' }}>
          {dict.clinicsPage.productsSubtitle}
        </p>

        <Chips locale={params.locale} dict={dict} active={categoryFilter} />

        {dbError ? <ErrorBox message={dbError} /> : null}

        {localized.length === 0 ? (
          <EmptyClinics dict={dict} locale={params.locale} categoryFilter={categoryFilter} />
        ) : (
          <div
            className="m-cl-grid"
            style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}
          >
            {localized.map((h) => (
              <ClinicCard
                key={h.id}
                hospital={h}
                locale={params.locale}
                categoryKey={categoryFilter}
                dict={dict}
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  // ── 기본 뷰: 메인화면처럼 카테고리별 상품 섹션 ─────────────────────
  let sections: Array<{ key: CategoryLabelKey; rows: ClinicRow[] }> = [];
  try {
    let curated: Array<{ categoryKey: string; hospitalId: string; promoLabel: string | null; sortOrder: number }> = [];
    try {
      curated = await db
        .select({
          categoryKey: categoryListings.categoryKey,
          hospitalId: categoryListings.hospitalId,
          promoLabel: categoryListings.promoLabel,
          sortOrder: categoryListings.sortOrder,
        })
        .from(categoryListings)
        .where(eq(categoryListings.procedureSlug, ''));
    } catch {
      curated = [];
    }

    const allIds = Array.from(new Set(curated.map((c) => c.hospitalId)));
    const hospitalRows = allIds.length
      ? await db
          .select({
            id: hospitals.id,
            name: hospitals.name,
            slug: hospitals.slug,
            countryCode: hospitals.countryCode,
            primaryCategories: hospitals.primaryCategories,
            coverImageUrl: hospitals.coverImageUrl,
            sortOrder: hospitals.sortOrder,
            isActiveForMatching: hospitals.isActiveForMatching,
          })
          .from(hospitals)
          .where(inArray(hospitals.id, allIds))
      : [];
    const hospitalsById = new Map(hospitalRows.map((h) => [h.id, h]));

    const base: ClinicRow[] = [];
    const seen = new Set<string>();
    for (const c of curated) {
      const h = hospitalsById.get(c.hospitalId);
      if (!h || h.isActiveForMatching === false || seen.has(h.id)) continue;
      seen.add(h.id);
      base.push({
        id: h.id,
        name: h.name,
        slug: h.slug,
        countryCode: h.countryCode,
        primaryCategories: (h.primaryCategories ?? []) as string[],
        promoLabel: null,
        coverImageUrl: h.coverImageUrl,
      });
    }
    const localized = await applyLocaleOverrides(base, params.locale);
    const localizedById = new Map(localized.map((h) => [h.id, h]));

    sections = SUB_CHIP_KEYS.map((key) => {
      const rows = curated
        .filter((c) => c.categoryKey === key)
        .sort((a, b) => {
          const ha = hospitalsById.get(a.hospitalId);
          const hb = hospitalsById.get(b.hospitalId);
          return (ha?.sortOrder ?? 999) - (hb?.sortOrder ?? 999);
        })
        .map((c) => {
          const h = localizedById.get(c.hospitalId);
          if (!h) return null;
          return { ...h, promoLabel: c.promoLabel };
        })
        .filter((r): r is ClinicRow => r !== null)
        .slice(0, 12);
      return { key, rows };
    }).filter((s) => s.rows.length > 0);
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'db_error';
  }

  return (
    <section className="m-cl-page" style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px 80px' }}>
      <style dangerouslySetInnerHTML={{ __html: CLINICS_MOBILE_CSS }} />
      <h1 className="m-cl-title" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>
        {dict.clinicsPage.recommended}
      </h1>
      <p className="m-cl-subtitle" style={{ fontSize: 14, color: '#6a6a6a', margin: '6px 0 0' }}>
        {dict.clinicsPage.productsSubtitle}
      </p>

      <Chips locale={params.locale} dict={dict} active={null} />

      {dbError ? <ErrorBox message={dbError} /> : null}

      {sections.length === 0 ? (
        <EmptyClinics dict={dict} locale={params.locale} />
      ) : (
        sections.map((s) => (
          <div key={s.key} style={{ marginTop: 36 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <h2 className="m-cl-sec-title" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px', margin: 0 }}>
                {categoryLabel(s.key, dict.clinicsPage.categories)}
              </h2>
              <Link
                href={`/${params.locale}/clinics?category=${s.key}`}
                style={{ fontSize: 13, fontWeight: 600, color: '#222', textDecoration: 'underline', whiteSpace: 'nowrap' }}
              >
                {dict.categories.viewAll} →
              </Link>
            </div>
            <div
              className="m-cl-hscroll"
              style={{
                display: 'flex', gap: 16, marginTop: 14,
                overflowX: 'auto', paddingBottom: 6,
                scrollbarWidth: 'none',
              }}
            >
              {s.rows.map((h) => (
                <div key={h.id} className="m-cl-hcard" style={{ width: 220, flexShrink: 0 }}>
                  <ClinicCard hospital={h} locale={params.locale} categoryKey={s.key} dict={dict} compact />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

function Chips({
  locale,
  dict,
  active,
}: {
  locale: PublicLocale;
  dict: Dictionary;
  active: string | null;
}): JSX.Element {
  return (
    <div
      className="m-cl-chips-row"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18, padding: 0, overflowX: 'auto' }}
    >
      <Link
        href={`/${locale}/clinics`}
        style={{
          flexShrink: 0,
          display: 'inline-flex', alignItems: 'center',
          padding: '8px 14px', borderRadius: 9999,
          border: `1px solid ${active === null ? '#222' : '#dddddd'}`,
          background: active === null ? '#222' : '#fff',
          color: active === null ? '#fff' : '#222',
          fontSize: 13, fontWeight: 500,
          textDecoration: 'none', whiteSpace: 'nowrap',
        }}
      >
        {dict.clinicsPage.recommended}
      </Link>
      {SUB_CHIP_KEYS.map((key) => (
        <Link
          key={key}
          href={`/${locale}/clinics?category=${key}`}
          style={{
            flexShrink: 0,
            display: 'inline-flex', alignItems: 'center',
            padding: '8px 14px', borderRadius: 9999,
            border: `1px solid ${active === key ? '#222' : '#dddddd'}`,
            background: active === key ? '#222' : '#fff',
            color: active === key ? '#fff' : '#222',
            fontSize: 13, fontWeight: 500,
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          {dict.clinicsPage.categories[key]}
        </Link>
      ))}
    </div>
  );
}

function ClinicCard({
  hospital,
  locale,
  categoryKey,
  dict,
  compact,
}: {
  hospital: ClinicRow;
  locale: PublicLocale;
  categoryKey: string;
  dict: Dictionary;
  compact?: boolean;
}): JSX.Element {
  const inquiryHref = `/${locale}/inquiry?hospital=${hospital.id}&interest=${categoryKey}`;
  return (
    <div>
      <Link
        href={`/${locale}/clinics/${hospital.slug}`}
        style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit', display: 'block' }}
      >
        <div
          style={{
            position: 'relative',
            aspectRatio: '1', borderRadius: 14, overflow: 'hidden',
            background: hospital.coverImageUrl
              ? `#f2f2f2 url(${hospital.coverImageUrl}) center / cover`
              : 'linear-gradient(150deg, #fff7f8 0%, #ffeef1 55%, #ffe3e9 100%)',
          }}
        >
          {!hospital.coverImageUrl ? (
            <div
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: compact ? 8 : 12, padding: '16%',
              }}
            >
              <div
                style={{
                  position: 'absolute', inset: 0,
                  background:
                    'radial-gradient(90% 70% at 50% 18%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 60%)',
                }}
              />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
                <BrandMark size={compact ? 22 : 30} color="#ff385c" />
                <span style={{ fontSize: compact ? 12 : 15, fontWeight: 700, letterSpacing: '-0.02em', color: '#ff385c' }}>
                  glow-up
                </span>
              </div>
              <div
                style={{
                  position: 'relative',
                  fontSize: compact ? 14 : 17, fontWeight: 700, lineHeight: 1.35,
                  letterSpacing: '-0.02em',
                  color: '#222222', textAlign: 'center',
                  wordBreak: 'keep-all',
                }}
              >
                {hospital.name}
              </div>
              <div style={{ position: 'relative', width: 26, height: 3, borderRadius: 9999, background: 'rgba(255,56,92,0.35)' }} />
            </div>
          ) : null}
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
              {localizeKoLabel(hospital.promoLabel, locale)}
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <span className="m-cl-card-name" style={{ fontSize: compact ? 14 : 16, fontWeight: 600, lineHeight: 1.3 }}>
            {hospital.name}
          </span>
        </div>
        <div className="m-cl-card-tags" style={{ fontSize: compact ? 12 : 14, color: '#6a6a6a', marginTop: 2 }}>
          {hospital.primaryCategories
            .slice(0, 2)
            .map((c) => categoryLabel(c, dict.clinicsPage.categories))
            .join(' · ')}
        </div>
      </Link>
      <Link
        href={inquiryHref}
        style={{
          display: 'block', textAlign: 'center',
          marginTop: 8,
          background: '#ff385c', color: '#fff',
          borderRadius: 10, padding: compact ? '8px 0' : '9px 0',
          fontSize: compact ? 13 : 14, fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        {dict.clinicsPage.inquireCta}
      </Link>
    </div>
  );
}

function ErrorBox({ message }: { message: string }): JSX.Element {
  return (
    <div
      style={{
        marginTop: 24,
        border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c',
        borderRadius: 12, padding: '12px 16px', fontSize: 14,
      }}
    >
      {message}
    </div>
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
        border: '1px dashed #dddddd', background: '#fafafa',
        borderRadius: 16, padding: '56px 24px', textAlign: 'center',
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
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
        {categoryFilter ? (
          <Link
            href={`/${locale}/clinics`}
            style={{
              border: '1px solid #222', borderRadius: 8, padding: '10px 18px',
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
            border: 'none', borderRadius: 8, padding: '10px 18px',
            fontWeight: 500, fontSize: 14, textDecoration: 'none',
          }}
        >
          {dict.inquiryCta.submit}
        </Link>
      </div>
    </div>
  );
}
