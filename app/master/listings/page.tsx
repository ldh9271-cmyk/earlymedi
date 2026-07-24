import Link from 'next/link';
import { redirect } from 'next/navigation';
import { asc, desc, eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { organizations } from '@/drizzle/schema/organizations';
import {
  LISTING_CATEGORIES,
  TRAVEL_PACKAGE_SUB_TYPES,
  categoryLabel,
  travelSubTypeLabel,
} from '@/lib/listings/categories';
import {
  createListingAction,
  seedFitProductsAction,
  seedGangnamFoodAction,
  seedSeoulHotelsAction,
  seedPlasticSurgeryAction,
  seedDermatologyAction,
  seedOphthalmologyAction,
  seedDentalAction,
  seedHairLossAction,
  seedHealthCheckupAction,
  seedStemCellAction,
  seedOrientalAction,
  seedPartnerAction,
  seedSeoulNailAction,
  seedSeoulPersonalColorAction,
  migrateRestaurantToFoodAction,
} from './_actions/listing-admin';
import { updateListingSortOrderAction } from './_actions/sort-order';
import { DeleteListingButton } from './_components/delete-listing-button';

export const metadata = { title: '글로우업 상품 관리 · 마스터' };
export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  category: string;
  title: string;
  status: string;
  featured: boolean;
  sortOrder: number;
  priceWon: number | null;
  priceUnit: string | null;
  coverImageUrl: string | null;
  ownerName: string | null;
  updatedAt: Date | null;
  details: Record<string, unknown>;
};

/**
 * Master-only listings index — cross-org table of every non-medical
 * marketplace card. Top of the page is a "신규 등록" form (category
 * select + title) that drops a draft and redirects into edit.
 *
 * If the migration (drizzle/sql/partner-listings.sql) hasn't been run
 * yet, the SELECT throws and we render the "no DB yet" empty state
 * with copy/paste SQL instructions instead of a 500.
 */
export default async function MasterListingsPage({
  searchParams,
}: {
  searchParams: {
    category?: string; error?: string;
    seedFit?: string; seedGangnamFood?: string;
    seedSeoulHotels?: string; seedPlasticSurgery?: string; seedDermatology?: string; seedOphthalmology?: string; seedDental?: string; seedHairLoss?: string; seedHealthCheckup?: string; seedStemCell?: string; seedOriental?: string; seedPartner?: string;
    mergeRestaurant?: string;
    inserted?: string; skipped?: string;
    updated?: string;
    sort?: string;
  };
}): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?next=/master/listings');
  if (!isMasterEmail(auth.user.email ?? null)) redirect('/select-org');

  const filter = searchParams.category;

  let rows: Row[] = [];
  let dbError: string | null = null;
  try {
    const all = await db
      .select({
        id: partnerListings.id,
        category: partnerListings.category,
        title: partnerListings.title,
        status: partnerListings.status,
        featured: partnerListings.featured,
        sortOrder: partnerListings.sortOrder,
        priceWon: partnerListings.priceWon,
        priceUnit: partnerListings.priceUnit,
        coverImageUrl: partnerListings.coverImageUrl,
        ownerName: organizations.name,
        updatedAt: partnerListings.updatedAt,
        details: partnerListings.details,
      })
      .from(partnerListings)
      .leftJoin(organizations, eq(organizations.id, partnerListings.ownerOrgId))
      // sortOrder 우선 → 최근 업데이트 순. /master/hospitals 와 동일 컨벤션.
      .orderBy(asc(partnerListings.sortOrder), desc(partnerListings.updatedAt));
    rows = (filter ? all.filter((r) => r.category === filter) : all).map((r) => ({
      ...r,
      details: (r.details ?? {}) as Record<string, unknown>,
    }));
  } catch (e) {
    dbError = e instanceof Error ? e.message : 'db_error';
  }

  // Agency-org dropdown for the create form's optional owner override.
  let agencyOrgs: Array<{ id: string; name: string }> = [];
  try {
    agencyOrgs = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.accountType, 'agency'))
      .limit(50);
  } catch {
    /* if orgs unreadable, the form still works using server-side default */
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">글로우업 상품 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            호텔 · 맛집 · 퍼스널컬러 · 헤어 · 메이크업 · 사진 · K-팝 투어 등 비의료
            카테고리 상품을 등록하고 메인 페이지(/kr) 노출을 제어합니다.
          </p>
        </div>
        <Link
          href="/master"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← 마스터 홈
        </Link>
      </div>

      {/* FIT 일괄 등록 결과 배너 — seedFitProductsAction 완료 시 표시. */}
      {searchParams.seedFit === 'ok' ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="font-semibold">FIT 자유여행 상품 일괄 등록 완료</span>
          {' — '}
          신규 {searchParams.inserted ?? '0'}건 등록, 기존 {searchParams.skipped ?? '0'}건 스킵.
        </div>
      ) : null}

      {/* 강남 맛집 일괄 등록 결과 배너. */}
      {searchParams.seedGangnamFood === 'ok' ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="font-semibold">강남·서초 맛집 10종 일괄 등록 완료</span>
          {' — '}
          신규 {searchParams.inserted ?? '0'}건 등록, 기존 {searchParams.skipped ?? '0'}건 스킵.
        </div>
      ) : null}

      {/* FIT 자유여행 기본 상품 일괄 등록 트리거 */}
      <form
        action={seedFitProductsAction}
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-rose-200 bg-rose-50/40 px-4 py-3"
      >
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">FIT 자유여행 기본 상품 일괄 등록</p>
          <p className="mt-0.5">
            이동·픽업 5종 · 통역 2종 · 숙소 3종 · 예약대행 1종 = 총 11개. 자유여행 sub-type
            으로 status=공개, 같은 이름의 상품이 이미 있으면 자동 스킵 (멱등).
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
        >
          FIT 11종 일괄 등록
        </button>
      </form>

      {/* 레스토랑 → 맛집 일괄 마이그레이션 트리거 */}
      {searchParams.mergeRestaurant === 'ok' ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="font-semibold">레스토랑 → 맛집 통합 완료</span>
          {' — '}
          {searchParams.updated ?? '0'}건 카테고리 이전.
        </div>
      ) : null}
      <form
        action={migrateRestaurantToFoodAction}
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3"
      >
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">레스토랑 → 맛집 통합 (일회성)</p>
          <p className="mt-0.5">
            2026-06-25 기준 &lsquo;레스토랑&rsquo; 카테고리가 dropdown 에서 제거되고 &lsquo;맛집&rsquo;으로 통합됐어요.
            기존 category=&lsquo;restaurant&rsquo; 행이 있으면 한 번에 food 로 이전. 없으면 0건 업데이트.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          레스토랑 → 맛집 통합
        </button>
      </form>

      {/* 서울 호텔 일괄 등록 결과 배너 */}
      {searchParams.seedSeoulHotels === 'ok' ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="font-semibold">서울 호텔 30종 일괄 등록 완료</span>
          {' — '}
          신규 {searchParams.inserted ?? '0'}건 등록, 기존 {searchParams.skipped ?? '0'}건 스킵.
        </div>
      ) : null}

      {/* 성형외과 일괄 등록 결과 배너 */}
      {searchParams.seedPlasticSurgery === 'ok' ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="font-semibold">강남·서초 성형외과 11종 일괄 등록 완료</span>
          {' — '}
          신규 {searchParams.inserted ?? '0'}건 등록, 기존 {searchParams.skipped ?? '0'}건 스킵.
        </div>
      ) : null}

      {/* 강남·서초 외국인 FIT 성형외과 11종 일괄 등록 트리거 */}
      <form
        action={seedPlasticSurgeryAction}
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-fuchsia-300 bg-fuchsia-50/50 px-4 py-3"
      >
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">강남·서초 외국인 FIT 성형외과 11종 일괄 등록</p>
          <p className="mt-0.5">
            드림·스템케이·셀러블153·세라·나비·유니크·서울동안·김지연위쉬·리앤채움·글로비·순플러스.
            병원 카테고리 + 진료과 sub-type=성형외과, details 에 주소(지도) · 전화 · 근처 역 ·
            대표시술 · 이미지 키워드 · SEO 태그 일괄 저장.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md border border-fuchsia-400 bg-white px-3 py-1.5 text-xs font-semibold text-fuchsia-800 hover:bg-fuchsia-50"
        >
          성형외과 11종 일괄 등록
        </button>
      </form>

      {/* 피부과 일괄 등록 결과 배너 */}
      {searchParams.seedDermatology === 'ok' ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="font-semibold">서울 피부과 22종 일괄 등록 완료</span>
          {' — '}
          신규 {searchParams.inserted ?? '0'}건 등록, 기존 {searchParams.skipped ?? '0'}건 스킵
          (중복 슬러그는 dermatology 카테고리로 cross-listing 만 추가).
        </div>
      ) : null}

      {/* 서울 외국인 FIT 피부과 22종 일괄 등록 트리거 */}
      <form
        action={seedDermatologyAction}
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-pink-300 bg-pink-50/50 px-4 py-3"
      >
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">서울 외국인 FIT 피부과 22종 일괄 등록</p>
          <p className="mt-0.5">
            드림피부과·스템케이·도자기·오라클·청담아르덴·메이린(압구정/일산/더현대)·셀러블153·
            클림(홍대/명동)·오테나·세라·리앤채움·얼라이브·닥터손유나·라미체·비오페이스·더힐(동대문)·
            리베리(명동)·엠레드(청담)·페이브(용산) 등. dermatology 카테고리 + details 풀세트.
            중복 슬러그(드림·셀러블153·세라)는 cross-listing 만 등록.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md border border-pink-400 bg-white px-3 py-1.5 text-xs font-semibold text-pink-800 hover:bg-pink-50"
        >
          피부과 22종 일괄 등록
        </button>
      </form>

      {/* 안과 일괄 등록 결과 배너 */}
      {searchParams.seedOphthalmology === 'ok' ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="font-semibold">서울 안과 11종 일괄 등록 완료</span>
          {' — '}
          신규 {searchParams.inserted ?? '0'}건 등록, 기존 {searchParams.skipped ?? '0'}건 스킵.
        </div>
      ) : null}

      {/* 서울 외국인 FIT 안과 11종 일괄 등록 트리거 */}
      <form
        action={seedOphthalmologyAction}
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-cyan-300 bg-cyan-50/50 px-4 py-3"
      >
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">서울 외국인 FIT 안과 11종 일괄 등록</p>
          <p className="mt-0.5">
            아이리움·비앤빛(강남밝은세상)·강남서울밝은·수연세·SNU·이오스·그랜드·서울밝은세상(강남점)·
            강남서울밝은(의료관광)·삼성서울병원·강남밝은미소. ophthalmology 카테고리 + hospital_locale_content
            (KR/EN) 에 SEO 6종 저장. 슬러그·태그·OG 스킬 규칙 준수.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md border border-cyan-400 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-50"
        >
          안과 11종 일괄 등록
        </button>
      </form>

      {/* 치과 일괄 등록 결과 배너 */}
      {searchParams.seedDental === 'ok' ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="font-semibold">서울 치과 일괄 등록 완료</span>
          {' — '}
          신규 {searchParams.inserted ?? '0'}건 등록, 기존 {searchParams.skipped ?? '0'}건 재정렬.
        </div>
      ) : null}

      {/* 서울 외국인 FIT 치과 일괄 등록 트리거 */}
      <form
        action={seedDentalAction}
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-teal-300 bg-teal-50/50 px-4 py-3"
      >
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">서울 외국인 FIT 치과 일괄 등록</p>
          <p className="mt-0.5">
            세라치과(삼성동) · 뉴욕화이트치과(선릉). dental 카테고리 + hospital_locale_content
            (KR/EN) 에 SEO 6종 저장. sortOrder=110·120 으로 향후 1~10번 슬롯 예약.
            재실행 시 순서·SEO 만 최신값으로 UPDATE.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md border border-teal-400 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50"
        >
          치과 2종 일괄 등록
        </button>
      </form>

      {/* 모발이식·탈모 일괄 등록 결과 배너 */}
      {searchParams.seedHairLoss === 'ok' ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="font-semibold">서울 모발이식·탈모 12종 일괄 등록 완료</span>
          {' — '}
          신규 {searchParams.inserted ?? '0'}건 등록, 기존 {searchParams.skipped ?? '0'}건 스킵.
        </div>
      ) : null}

      {/* 서울 외국인 FIT 모발이식·탈모 12종 일괄 등록 트리거 */}
      <form
        action={seedHairLossAction}
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 px-4 py-3"
      >
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">서울 외국인 FIT 모발이식·탈모 12종 일괄 등록</p>
          <p className="mt-0.5">
            맥스웰·모제림·모먼트·모아이·모우다·용닥터·리치모아·모아만·세븐레마·루트·
            메이린(탈모)·더힐피부과(탈모). hair_loss 카테고리 + hospital_locale_content
            (KR/EN) SEO 6종 저장. 메이린·더힐은 피부과와 별도 슬러그로 탈모 특화 프로필 신규 등록.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50"
        >
          모발이식·탈모 12종 일괄 등록
        </button>
      </form>

      {/* 건강검진 일괄 등록 결과 배너 */}
      {searchParams.seedHealthCheckup === 'ok' ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="font-semibold">서울 건강검진 12종 일괄 등록 완료</span>
          {' — '}
          신규 {searchParams.inserted ?? '0'}건 등록, 기존 {searchParams.skipped ?? '0'}건 스킵.
        </div>
      ) : null}

      {/* 서울 외국인 FIT 건강검진 12종 일괄 등록 트리거 */}
      <form
        action={seedHealthCheckupAction}
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-lime-300 bg-lime-50/50 px-4 py-3"
      >
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">서울 외국인 FIT 건강검진 12종 일괄 등록</p>
          <p className="mt-0.5">
            필수 6곳(서울아산·삼성서울·서울성모·중앙대·강남세브란스·강남웰니스) + 추천 6곳
            (서울대강남센터·차움·KMI·하나로·건강관리협회·셀러블153). health_checkup 카테고리 +
            hospital_locale_content(KR/EN) SEO 6종 — 브랜드 GlowUpTour 통일.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md border border-lime-500 bg-white px-3 py-1.5 text-xs font-semibold text-lime-800 hover:bg-lime-50"
        >
          건강검진 12종 일괄 등록
        </button>
      </form>

      {/* 줄기세포 일괄 등록 결과 배너 */}
      {searchParams.seedStemCell === 'ok' ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="font-semibold">서울 줄기세포·재생의료 12종 일괄 등록 완료</span>
          {' — '}
          신규 {searchParams.inserted ?? '0'}건 등록, 기존 {searchParams.skipped ?? '0'}건 스킵.
        </div>
      ) : null}

      {/* 서울 외국인 FIT 줄기세포 12종 일괄 등록 트리거 */}
      <form
        action={seedStemCellAction}
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-violet-300 bg-violet-50/50 px-4 py-3"
      >
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">서울 외국인 FIT 줄기세포·재생의료 12종 일괄 등록</p>
          <p className="mt-0.5">
            EHL바이오(필수)·셀러블153·강남세란·셀피아·밴셀·셀리크·모즈·리숨·메종프리베·
            리치모아·글로비·스템케이. stem_cell 카테고리 + hospital_locale_content(KR/EN)
            SEO — 브랜드 GlowUpTour. 중복 병원은 줄기세포 전용 슬러그로 별도 프로필.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md border border-violet-400 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-50"
        >
          줄기세포 12종 일괄 등록
        </button>
      </form>

      {/* 한방병원 일괄 등록 결과 배너 */}
      {searchParams.seedOriental === 'ok' ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="font-semibold">서울 한방병원 12종 일괄 등록 완료</span>
          {' — '}
          신규 {searchParams.inserted ?? '0'}건 등록, 기존 {searchParams.skipped ?? '0'}건 스킵.
        </div>
      ) : null}

      {/* 서울 외국인 FIT 한방병원 12종 일괄 등록 트리거 */}
      <form
        action={seedOrientalAction}
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-orange-300 bg-orange-50/50 px-4 py-3"
      >
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">서울 외국인 FIT 한방병원/한의원 12종 일괄 등록</p>
          <p className="mt-0.5">
            리봄(필수)·인산(필수)·강남자생·광동병원·차움한의원·광덕안정·강남한방·강남동약·
            두보·함소아·하늘체·광동한방병원. oriental 카테고리 + hospital_locale_content(KR/EN)
            SEO — 브랜드 GlowUpTour.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md border border-orange-400 bg-white px-3 py-1.5 text-xs font-semibold text-orange-800 hover:bg-orange-50"
        >
          한방병원 12종 일괄 등록
        </button>
      </form>

      {/* 파트너병원 일괄 등록 결과 배너 */}
      {searchParams.seedPartner === 'ok' ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="font-semibold">서울 파트너병원 24종 일괄 등록 완료</span>
          {' — '}
          신규 {searchParams.inserted ?? '0'}건 등록, 기존 {searchParams.skipped ?? '0'}건 스킵.
        </div>
      ) : null}

      {/* 서울 외국인 FIT 파트너병원 24종 일괄 등록 트리거 */}
      <form
        action={seedPartnerAction}
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-3"
      >
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">서울 외국인 FIT 파트너병원 24종 일괄 등록</p>
          <p className="mt-0.5">
            정형·척추·관절 7 (연세사랑·강남세브란스척추·베드로·우리들·나누리·청담튼튼·SNU서울) +
            비뇨 3 (스탠탑·서울N·강남J) + 산부인과 2 (강남차병원·차 여성의학연구소) +
            이비인후 2 (하나·코아) + 내과 3 (강남탑·지인·속편한) +
            외과·화상·통증·재활·신경·소아 7 (기쁨·베스티안·안강·연세베스트·미래신경과·곰돌이·제일정형).
            partner 카테고리 + SEO — 브랜드 GlowUpTour.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md border border-slate-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
        >
          파트너병원 24종 일괄 등록
        </button>
      </form>

      {/* 서울 6개 권역 외국인 FIT 호텔 30종 일괄 등록 트리거 */}
      <form
        action={seedSeoulHotelsAction}
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-sky-300 bg-sky-50/50 px-4 py-3"
      >
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">서울 6개 권역 외국인 FIT 호텔 30종 일괄 등록</p>
          <p className="mt-0.5">
            강남·서초·건대·성수·명동·홍대 각 5개씩. 3성·4성·5성 골고루. 각 행에
            details.address (지도 자동 노출) + grade · region · recommendedFor ·
            imageKeywords (사진 큐레이션 힌트) · seoTags 포함.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md border border-sky-400 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-50"
        >
          호텔 30종 일괄 등록
        </button>
      </form>

      {/* 강남·서초 외국인 FIT 맛집 일괄 등록 트리거 */}
      <form
        action={seedGangnamFoodAction}
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 px-4 py-3"
      >
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">강남·서초 외국인 FIT 맛집 10종 일괄 등록</p>
          <p className="mt-0.5">
            비언유주얼·무월식탁·다몽집·하이디라오·타이엘리펀트·마을양조장·정돈·슈퍼집·까마리·
            백종원 원조쌈밥집. 각 행에 details.address 가 들어가 상세 페이지에서 Google 지도
            자동 노출. 같은 이름의 상품이 이미 있으면 자동 스킵 (멱등).
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50"
        >
          맛집 10종 일괄 등록
        </button>
      </form>

      {/* 강남·서초·청담 외국인 FIT 네일샵 일괄 등록 트리거 */}
      <form
        action={seedSeoulNailAction}
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-pink-300 bg-pink-50/50 px-4 py-3"
      >
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">강남·서초·청담 네일샵 12종 일괄 등록</p>
          <p className="mt-0.5">
            유니스텔라·네일탐투나·위치네일즈·공간네일·미미에덴·제이원·포유뷰티·네일팰리스·
            강남네일맑음·플로우네일·H2네일·서초 심야네일. category=nail, SEO 메타는
            locale content(kr) 에 저장. 같은 slug 가 이미 있으면 자동 스킵 (멱등).
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md border border-pink-400 bg-white px-3 py-1.5 text-xs font-semibold text-pink-800 hover:bg-pink-50"
        >
          네일샵 12종 일괄 등록
        </button>
      </form>

      {/* 강남·서초 외국인 FIT 퍼스널컬러 일괄 등록 트리거 */}
      <form
        action={seedSeoulPersonalColorAction}
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-purple-300 bg-purple-50/50 px-4 py-3"
      >
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">강남·서초 퍼스널컬러 9종 일괄 등록</p>
          <p className="mt-0.5">
            컬러홀릭·컬러라이즈·컬러플레이스·마이컬러랩·이미지호·에이타입·강남 이미지메이킹·
            삼성동 아카데미·논현 헤어+컬러 살롱. category=personal_color, SEO 메타는
            locale content(kr) 에 저장. 같은 slug 가 이미 있으면 자동 스킵 (멱등).
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md border border-purple-400 bg-white px-3 py-1.5 text-xs font-semibold text-purple-800 hover:bg-purple-50"
        >
          퍼스널컬러 9종 일괄 등록
        </button>
      </form>

      {/* New-listing form (top of page, always visible) */}
      <form
        action={createListingAction}
        className="mb-8 grid grid-cols-12 items-end gap-3 rounded-xl border bg-card p-5"
      >
        <div className="col-span-12 sm:col-span-3">
          <label className="block text-xs font-semibold uppercase tracking-wide">카테고리</label>
          <select
            name="category"
            required
            defaultValue=""
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>선택…</option>
            {LISTING_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="col-span-12 sm:col-span-5">
          <label className="block text-xs font-semibold uppercase tracking-wide">상품명</label>
          <input
            name="title"
            placeholder="예: 명동 5성 호텔 디럭스 더블"
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="col-span-12 sm:col-span-3">
          <label className="block text-xs font-semibold uppercase tracking-wide">소유 조직</label>
          <select
            name="ownerOrgId"
            defaultValue=""
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— 첫 번째 Agency org 자동 선택 —</option>
            {agencyOrgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <div className="col-span-12 sm:col-span-1">
          <button
            type="submit"
            className="h-10 w-full rounded-md bg-[#ff385c] px-3 text-sm font-semibold text-white"
          >
            + 등록
          </button>
        </div>
      </form>

      {/* Category filter chips */}
      <div className="mb-5 flex flex-wrap gap-2 text-xs">
        <Link
          href="/master/listings"
          className={`rounded-full border px-3 py-1.5 ${
            !filter ? 'border-foreground bg-foreground text-background' : 'border-input bg-card'
          }`}
        >
          전체
        </Link>
        {LISTING_CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={`/master/listings?category=${c.key}`}
            className={`rounded-full border px-3 py-1.5 ${
              filter === c.key ? 'border-foreground bg-foreground text-background' : 'border-input bg-card'
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {dbError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">DB 마이그레이션이 아직 실행되지 않았습니다.</p>
          <p className="mt-1 text-xs">
            Supabase SQL Editor 에서 <code className="rounded bg-amber-100 px-1">drizzle/sql/partner-listings.sql</code> 파일을 실행하세요. 적용 후 새로고침하면 이 페이지가 정상 동작합니다.
          </p>
          <p className="mt-1 text-[11px] text-amber-900/70">
            원본 에러: {dbError}
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
          {filter
            ? <>해당 카테고리에 등록된 상품이 없습니다. 위 폼에서 추가하세요.</>
            : <>등록된 상품이 없습니다. 위 폼에서 카테고리를 선택해 첫 상품을 등록하세요.</>}
        </div>
      ) : filter === 'travel_package' ? (
        // travel_package — group by details.subType so 자유여행 /
        // 패키지여행 / 연수패키지 each get their own section header.
        // Listings missing a subType fall into "미분류".
        <TravelGroupedTable rows={rows} />
      ) : filter ? (
        // 특정 카테고리 필터: 단일 flat 테이블. sortOrder 로 정렬됨.
        <ListingTable rows={rows} />
      ) : (
        // 전체 뷰: 카테고리별로 섹션 분할. 각 섹션 안에서 sortOrder 로 정렬.
        // /master/hospitals 처럼 카테고리별 노출 순서를 독립적으로 관리 가능.
        <CategoryGroupedTable rows={rows} />
      )}
    </div>
  );
}

function ListingTable({ rows }: { rows: Row[] }): JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide">
          <tr>
            <th className="px-3 py-3 text-left w-[100px]">
              순서<span className="ml-1 text-[10px] font-normal normal-case text-muted-foreground/70">(낮을수록 먼저)</span>
            </th>
            <th className="px-4 py-3 text-left">상품</th>
            <th className="px-3 py-3 text-left">카테고리</th>
            <th className="px-3 py-3 text-left">상태</th>
            <th className="px-3 py-3 text-left">노출</th>
            <th className="px-3 py-3 text-right">가격</th>
            <th className="px-3 py-3 text-left">소유 조직</th>
            <th className="px-3 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <ListingRow key={r.id} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 전체 뷰: 카테고리별로 섹션 분할. 각 섹션에서 sortOrder 로 정렬되어
 * 카테고리마다 노출 순서를 독립적으로 관리할 수 있음. LISTING_CATEGORIES
 * 순서를 따라 상단부터 노출.
 */
function CategoryGroupedTable({ rows }: { rows: Row[] }): JSX.Element {
  const buckets = new Map<string, Row[]>();
  for (const c of LISTING_CATEGORIES) buckets.set(c.key, []);
  buckets.set('__other__', []);
  for (const r of rows) {
    if (buckets.has(r.category)) {
      buckets.get(r.category)!.push(r);
    } else {
      buckets.get('__other__')!.push(r);
    }
  }
  return (
    <div className="space-y-6">
      {Array.from(buckets.entries()).map(([key, group]) => {
        if (group.length === 0) return null; // 빈 카테고리는 숨김
        const label = key === '__other__' ? '기타' : categoryLabel(key);
        return (
          <section key={key}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">
                {label}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {group.length}개
                </span>
              </h2>
            </div>
            <ListingTable rows={group} />
          </section>
        );
      })}
    </div>
  );
}

function TravelGroupedTable({ rows }: { rows: Row[] }): JSX.Element {
  // Bucket by subType in the fixed order (free → package → training →
  // 미분류 last). Empty buckets are still shown so the master sees
  // which sub-types still need content.
  const buckets = new Map<string, Row[]>();
  for (const sub of TRAVEL_PACKAGE_SUB_TYPES) buckets.set(sub.key, []);
  buckets.set('__unset__', []);
  for (const r of rows) {
    const key = typeof r.details.subType === 'string' && r.details.subType
      ? r.details.subType
      : '__unset__';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(r);
  }
  return (
    <div className="space-y-6">
      {Array.from(buckets.entries()).map(([key, group]) => (
        <section key={key}>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">
              {key === '__unset__' ? '미분류' : travelSubTypeLabel(key)}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {group.length}개
              </span>
            </h2>
          </div>
          {group.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-6 text-center text-xs text-muted-foreground">
              이 하위 카테고리에 등록된 상품이 없습니다.
            </div>
          ) : (
            <ListingTable rows={group} />
          )}
        </section>
      ))}
    </div>
  );
}

function ListingRow({ row: r }: { row: Row }): JSX.Element {
  return (
    <tr className="border-t">
      <td className="px-3 py-3 align-middle">
        <form action={updateListingSortOrderAction} className="flex items-center gap-1">
          <input type="hidden" name="id" value={r.id} />
          <input
            type="number"
            name="sortOrder"
            defaultValue={r.sortOrder}
            min={0}
            max={9999}
            className="h-7 w-[60px] rounded border border-input bg-background px-2 text-xs"
          />
          <button
            type="submit"
            title="순서 저장"
            className="rounded border border-input bg-background px-1.5 py-1 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ✓
          </button>
        </form>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted"
            style={{
              background: r.coverImageUrl
                ? `#f2f2f2 url(${r.coverImageUrl}) center / cover`
                : '#f2f2f2',
            }}
          />
          <span className="font-medium">{r.title}</span>
        </div>
      </td>
      <td className="px-3 py-3">{categoryLabel(r.category)}</td>
      <td className="px-3 py-3">
        <StatusBadge status={r.status} />
      </td>
      <td className="px-3 py-3">
        {r.featured ? (
          <span className="rounded-full bg-[#ff385c]/10 px-2 py-0.5 text-[10px] font-medium text-[#ff385c]">
            FEATURED
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">
        {r.priceWon
          ? `₩${r.priceWon.toLocaleString('ko-KR')} / ${r.priceUnit ?? ''}`
          : '—'}
      </td>
      <td className="px-3 py-3 text-muted-foreground">{r.ownerName ?? '—'}</td>
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/master/listings/${r.id}/edit`}
            className="text-xs font-medium text-foreground underline-offset-4 hover:underline"
          >
            편집 →
          </Link>
          <span className="text-muted-foreground/40">|</span>
          <DeleteListingButton id={r.id} title={r.title} />
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }): JSX.Element {
  const palette = {
    draft:    { bg: '#f3f4f6', text: '#374151', label: '초안' },
    pending:  { bg: '#fef3c7', text: '#92400e', label: '검수 대기' },
    approved: { bg: '#ecfdf5', text: '#047857', label: '공개' },
    rejected: { bg: '#fee2e2', text: '#991b1b', label: '반려' },
  }[status] ?? { bg: '#f3f4f6', text: '#374151', label: status };
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ background: palette.bg, color: palette.text }}
    >
      {palette.label}
    </span>
  );
}
