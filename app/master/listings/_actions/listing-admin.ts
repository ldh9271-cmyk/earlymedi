'use server';

import 'server-only';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  partnerListings,
  partnerListingLocaleContent,
} from '@/drizzle/schema/partner-listings';
import { organizations } from '@/drizzle/schema/organizations';
import { hospitals } from '@/drizzle/schema/hospitals';
import { categoryListings } from '@/drizzle/schema/category-listings';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { uploadListingImage } from '@/lib/storage/listing-images';
import {
  LISTING_CATEGORIES,
  isListingCategory,
  type ListingCategory,
} from '@/lib/listings/categories';
import { FIT_PRODUCTS } from '@/lib/listings/fit-products';
import { GANGNAM_FOOD_PRODUCTS } from '@/lib/listings/gangnam-food-products';
import { SEOUL_HOTEL_PRODUCTS } from '@/lib/listings/seoul-hotel-products';
import { PLASTIC_SURGERY_PRODUCTS } from '@/lib/listings/gangnam-plastic-surgery-products';
import { DERMATOLOGY_PRODUCTS } from '@/lib/listings/seoul-dermatology-products';

async function requireMaster(): Promise<true | never> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?next=/master/listings');
  if (!isMasterEmail(auth.user.email ?? null)) redirect('/select-org');
  return true;
}

function revalidateListingSurfaces(): void {
  revalidatePath('/master/listings');
  revalidatePath('/kr', 'layout');
  revalidatePath('/en', 'layout');
  revalidatePath('/zh', 'layout');
  revalidatePath('/ja', 'layout');
}

/**
 * Pick the first agency org as the default owner when creating from
 * the master console. The org dropdown on the create form lets the
 * master override; this is just the safe fallback.
 */
async function defaultOwnerOrgId(): Promise<string | null> {
  const [row] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.accountType, 'agency'))
    .limit(1);
  return row?.id ?? null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || `listing-${Date.now().toString(36)}`;
}

/**
 * Create an empty draft for `category` and redirect to its edit page
 * so the master can fill in the rest. Default sort_order=100,
 * status='draft', owner=first agency org.
 */
export async function createListingAction(formData: FormData): Promise<void> {
  await requireMaster();
  const rawCategory = String(formData.get('category') ?? '');
  if (!isListingCategory(rawCategory)) redirect('/master/listings?error=bad_category');
  const category = rawCategory as ListingCategory;
  const title = String(formData.get('title') ?? '').trim() || '신규 상품';
  const ownerOrgId = String(formData.get('ownerOrgId') ?? '') || await defaultOwnerOrgId();
  if (!ownerOrgId) redirect('/master/listings?error=no_owner');

  const meta = LISTING_CATEGORIES.find((c) => c.key === category);
  const slug = slugify(title);

  const inserted = await db
    .insert(partnerListings)
    .values({
      ownerOrgId,
      category,
      slug,
      title,
      status: 'draft',
      featured: false,
      sortOrder: 100,
      priceUnit: meta?.defaultPriceUnit ?? null,
      interestKey: meta?.interestKey ?? null,
    })
    .returning({ id: partnerListings.id });
  const newId = inserted[0]?.id;
  if (!newId) redirect('/master/listings?error=insert_failed');

  revalidateListingSurfaces();
  redirect(`/master/listings/${newId}/edit`);
}

/**
 * Upsert the base columns of a listing.
 * Form fields handled here:
 *   - title, locationLabel, priceWon, priceUnit, promoLabel,
 *     featured, sortOrder, rating, reviewsCount, description,
 *     interestKey, status, addressJson (city)
 *   - category-specific `details` JSON (passed in as a JSON string)
 */
export async function updateListingAction(formData: FormData): Promise<void> {
  await requireMaster();
  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/master/listings?error=missing_id');

  const title = String(formData.get('title') ?? '').trim() || '제목 없음';
  const locationLabel = String(formData.get('locationLabel') ?? '').trim() || null;
  const priceWon = parseIntOrNull(formData.get('priceWon'));
  const priceUnit = String(formData.get('priceUnit') ?? '').trim() || null;
  const promoLabel = String(formData.get('promoLabel') ?? '').trim() || null;
  const featured = formData.get('featured') === 'on';
  const sortOrder = parseIntOrNull(formData.get('sortOrder')) ?? 100;
  const rating = parseIntOrNull(formData.get('rating'));
  const reviewsCount = parseIntOrNull(formData.get('reviewsCount')) ?? 0;
  const description = String(formData.get('description') ?? '').trim() || null;
  const interestKey = String(formData.get('interestKey') ?? '').trim() || null;
  const status = String(formData.get('status') ?? 'draft');
  const city = String(formData.get('city') ?? '').trim();

  // category-specific details as JSON string. Master form posts this
  // already serialized; invalid JSON is silently coerced to {} so
  // operators can't break the row by typing.
  let details: Record<string, unknown> = {};
  const detailsRaw = formData.get('detailsJson');
  if (typeof detailsRaw === 'string' && detailsRaw.trim().length > 0) {
    try {
      const parsed = JSON.parse(detailsRaw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        details = parsed;
      }
    } catch {
      /* fall through with {} */
    }
  }

  await db
    .update(partnerListings)
    .set({
      title,
      locationLabel,
      priceWon: priceWon ?? null,
      priceUnit,
      promoLabel,
      featured,
      sortOrder,
      rating,
      reviewsCount,
      description,
      interestKey,
      status,
      addressJson: city ? { city } : {},
      details,
      updatedAt: new Date(),
    })
    .where(eq(partnerListings.id, id));

  revalidateListingSurfaces();
  redirect(`/master/listings/${id}/edit?ok=1`);
}

/**
 * FIT (자유여행) 기본 11개 상품을 partner_listings 에 한 번에 등록.
 *
 *   - 각 행: status='approved', details.subType='free' (자유여행),
 *     sortOrder=100, owner=첫 agency org (createListingAction 과 동일
 *     기본값).
 *   - 멱등: 같은 slug 가 이미 있으면 skip — 단가/문구 수정은 마스터
 *     편집 페이지에서 직접.
 *   - 끝나면 inserted=N / skipped=N 쿼리로 /master/listings 로 redirect.
 */
// `<form action={fn}>` 패턴에서 Next.js 가 폼 submit 을 action 에
// 라우팅하려면 함수가 FormData 를 받는 시그니처여야 한다. seed 액션
// 은 폼 데이터를 쓰지 않지만 인자 이름을 _formData 로 받아 시그니처
// 만 맞춤 (실제 사용 안 함).
export async function seedFitProductsAction(_formData: FormData): Promise<void> {
  await requireMaster();
  const ownerOrgId = await defaultOwnerOrgId();
  if (!ownerOrgId) redirect('/master/listings?error=no_owner');

  let inserted = 0;
  let skipped = 0;

  for (const p of FIT_PRODUCTS) {
    const slug = slugify(p.title);
    // 기존 행 존재 여부 — slug 는 partner_listings.slug UNIQUE.
    const existing = await db
      .select({ id: partnerListings.id })
      .from(partnerListings)
      .where(eq(partnerListings.slug, slug))
      .limit(1);
    if (existing.length > 0) {
      skipped += 1;
      continue;
    }
    await db.insert(partnerListings).values({
      ownerOrgId: ownerOrgId as string,
      category: p.category,
      slug,
      title: p.title,
      description: p.description,
      status: 'approved',
      featured: false,
      sortOrder: 100,
      priceWon: p.priceWon,
      priceUnit: p.priceUnit,
      interestKey: p.interestKey,
      details: {
        subType: 'free',
        ...(p.detailsExtra ?? {}),
      },
    });
    inserted += 1;
  }

  revalidateListingSurfaces();
  redirect(`/master/listings?seedFit=ok&inserted=${inserted}&skipped=${skipped}`);
}

/**
 * 강남·서초 외국인 FIT 추천 맛집 10곳 일괄 등록.
 *
 *   - 각 행: category='food', status='approved', details.address
 *     설정 (지도 자동 노출), details.cuisine / details.signatureMenu
 *     도 함께 저장.
 *   - 멱등: 같은 slug 가 이미 있으면 skip.
 *   - 끝나면 seedGangnamFood=ok&inserted=N&skipped=N redirect.
 */
export async function seedGangnamFoodAction(_formData: FormData): Promise<void> {
  await requireMaster();
  const ownerOrgId = await defaultOwnerOrgId();
  if (!ownerOrgId) redirect('/master/listings?error=no_owner');

  let inserted = 0;
  let skipped = 0;

  for (const p of GANGNAM_FOOD_PRODUCTS) {
    const slug = slugify(p.title);
    const existing = await db
      .select({ id: partnerListings.id })
      .from(partnerListings)
      .where(eq(partnerListings.slug, slug))
      .limit(1);
    if (existing.length > 0) {
      skipped += 1;
      continue;
    }
    await db.insert(partnerListings).values({
      ownerOrgId: ownerOrgId as string,
      category: 'food',
      slug,
      title: p.title,
      description: p.description,
      locationLabel: p.locationLabel,
      addressJson: { city: '서울' },
      status: 'approved',
      featured: false,
      sortOrder: 100,
      priceWon: p.priceWon,
      priceUnit: p.priceUnit,
      interestKey: 'food',
      promoLabel: p.promoLabel ?? null,
      details: {
        address: p.address,
        cuisine: p.cuisine,
        signatureMenu: p.signatureMenu,
      },
    });
    inserted += 1;
  }

  revalidateListingSurfaces();
  redirect(`/master/listings?seedGangnamFood=ok&inserted=${inserted}&skipped=${skipped}`);
}

/**
 * 서울 6개 권역 외국인 FIT 추천 호텔 30곳 일괄 등록.
 *
 *   - 각 행: category='hotel', status='approved', details 에 address
 *     (구글 지도) + grade + region + recommendedFor + imageKeywords
 *     (사진 큐레이션 힌트) + seoTags (Open Graph / 검색 최적화) 까지
 *     저장.
 *   - 멱등: 같은 slug 가 이미 있으면 skip.
 *   - 끝나면 seedSeoulHotels=ok&inserted=N&skipped=N redirect.
 */
export async function seedSeoulHotelsAction(_formData: FormData): Promise<void> {
  await requireMaster();
  const ownerOrgId = await defaultOwnerOrgId();
  if (!ownerOrgId) redirect('/master/listings?error=no_owner');

  let inserted = 0;
  let skipped = 0;

  for (const p of SEOUL_HOTEL_PRODUCTS) {
    const slug = slugify(p.title);
    const existing = await db
      .select({ id: partnerListings.id })
      .from(partnerListings)
      .where(eq(partnerListings.slug, slug))
      .limit(1);
    if (existing.length > 0) {
      skipped += 1;
      continue;
    }
    await db.insert(partnerListings).values({
      ownerOrgId: ownerOrgId as string,
      category: 'hotel',
      slug,
      title: p.title,
      description: p.description,
      locationLabel: p.locationLabel,
      addressJson: { city: '서울' },
      status: 'approved',
      featured: false,
      sortOrder: 100,
      priceWon: p.priceWon,
      priceUnit: p.priceUnit,
      interestKey: 'hotel',
      promoLabel: p.promoLabel ?? null,
      details: {
        address: p.address,
        grade: p.grade,
        region: p.region,
        recommendedFor: [...p.recommendedFor],
        imageKeywords: [...p.imageKeywords],
        seoTags: [...p.seoTags],
      },
    });
    inserted += 1;
  }

  revalidateListingSurfaces();
  redirect(`/master/listings?seedSeoulHotels=ok&inserted=${inserted}&skipped=${skipped}`);
}

/**
 * 강남·서초 외국인 FIT 추천 성형외과 11곳 일괄 등록.
 *
 * 노출 surface 3곳에 모두 들어가도록 한 번에 3 테이블 insert:
 *   1) hospitals — /agency/hospitals 병원 마켓플레이스 + /kr/clinics
 *      페이지 (organizationId = 첫 agency org).
 *   2) category_listings — categoryKey='plastic_surgery', procedureSlug=''
 *      로 묶어 /kr/clinics?category=plastic_surgery 에 카드 노출.
 *   3) partner_listings — 마스터 통합 마켓플레이스 (/master/listings
 *      "병원" chip 필터에서 일관 관리).
 *
 * 멱등:
 *   - hospitals.slug 는 (organizationId, slug) UNIQUE → 같은 org 에
 *     같은 slug 있으면 skip.
 *   - category_listings 도 (categoryKey, procedureSlug, hospitalId)
 *     UNIQUE 라 한 번 더 안전.
 *   - partner_listings.slug 체크는 기존과 동일.
 */
export async function seedPlasticSurgeryAction(_formData: FormData): Promise<void> {
  await requireMaster();
  const ownerOrgId = await defaultOwnerOrgId();
  if (!ownerOrgId) redirect('/master/listings?error=no_owner');
  const orgId = ownerOrgId as string;

  let inserted = 0;
  let skipped = 0;

  for (const p of PLASTIC_SURGERY_PRODUCTS) {
    const slug = slugify(p.title);

    // 1) hospitals — agency org 소유로 insert. 이미 있으면 select 로
    //    id 만 가져와 category_listings 연결만 진행.
    const existingHospital = await db
      .select({ id: hospitals.id })
      .from(hospitals)
      .where(and(eq(hospitals.organizationId, orgId), eq(hospitals.slug, slug)))
      .limit(1);

    let hospitalId: string | null = null;
    const existingRow = existingHospital[0];
    if (existingRow) {
      hospitalId = existingRow.id;
      skipped += 1;
    } else {
      const insertResult = await db
        .insert(hospitals)
        .values({
          organizationId: orgId,
          name: p.title,
          slug,
          countryCode: 'KR',
          addressJson: { line1: p.address, city: '서울' },
          primaryCategories: ['plastic_surgery'],
          languagesSpoken: p.interpreterIncluded
            ? ['ko', 'en', 'zh', 'ja']
            : ['ko'],
          // 등록 직후 매칭 가능 상태로 — 마스터가 필요 시 비활성 가능.
          isActiveForMatching: true,
        })
        .returning({ id: hospitals.id });
      hospitalId = insertResult[0]?.id ?? null;
      if (hospitalId) inserted += 1;
    }
    if (!hospitalId) continue;

    // 2) category_listings — 성형외과 카테고리 페이지 노출. ON CONFLICT
    //    같은 row 가 있어도 unique index 가 막아주므로 try/catch 로 감쌈.
    try {
      await db.insert(categoryListings).values({
        categoryKey: 'plastic_surgery',
        procedureSlug: '',
        hospitalId,
        sortOrder: 100,
        promoLabel: p.promoLabel ?? null,
      });
    } catch {
      /* 이미 등록된 매칭 — skip */
    }

    // 3) partner_listings 인서트는 더 이상 하지 않음 — 2026-06-25 정책.
    // 병원은 hospitals + category_listings 만 단일 진실원으로 사용하며
    // 글로우업 상품관리 (partner_listings) 에는 노출하지 않음.
    // /kr/clinics 는 hospitals + category_listings 만 읽으므로 영향 없음.
  }

  revalidateListingSurfaces();
  // /agency/hospitals, /kr/clinics 도 재검증.
  revalidatePath('/agency/hospitals');
  revalidatePath('/kr/clinics', 'layout');
  redirect(`/master/listings?seedPlasticSurgery=ok&inserted=${inserted}&skipped=${skipped}`);
}

/**
 * 서울 외국인 FIT 추천 피부과/클리닉 22곳 일괄 등록.
 *
 *   1) hospitals — agency org 소유로 insert (slug 기준 멱등). 같은 slug
 *      가 이미 있으면 (예: 드림성형외과, 셀러블153강남의원, 세라성형외과
 *      성형외과 시드와 중복) 기존 hospitalId 재사용.
 *   2) category_listings — categoryKey='dermatology' 로 추가. 이미
 *      성형외과로 등록된 행도 피부과 카테고리에 cross-listing.
 *   3) partner_listings 인서트 없음 — 2026-06-25 정책 (병원은
 *      hospitals 단일 진실원).
 */
export async function seedDermatologyAction(_formData: FormData): Promise<void> {
  await requireMaster();
  const ownerOrgId = await defaultOwnerOrgId();
  if (!ownerOrgId) redirect('/master/listings?error=no_owner');
  const orgId = ownerOrgId as string;

  let inserted = 0;
  let skipped = 0;

  for (const p of DERMATOLOGY_PRODUCTS) {
    const slug = slugify(p.title);

    const existingHospital = await db
      .select({ id: hospitals.id })
      .from(hospitals)
      .where(and(eq(hospitals.organizationId, orgId), eq(hospitals.slug, slug)))
      .limit(1);

    let hospitalId: string | null = null;
    const existingRow = existingHospital[0];
    if (existingRow) {
      hospitalId = existingRow.id;
      skipped += 1;
    } else {
      const insertResult = await db
        .insert(hospitals)
        .values({
          organizationId: orgId,
          name: p.title,
          slug,
          countryCode: 'KR',
          addressJson: { line1: p.address, city: '서울' },
          primaryCategories: ['dermatology'],
          languagesSpoken: p.interpreterIncluded
            ? ['ko', 'en', 'zh', 'ja']
            : ['ko'],
          isActiveForMatching: true,
        })
        .returning({ id: hospitals.id });
      hospitalId = insertResult[0]?.id ?? null;
      if (hospitalId) inserted += 1;
    }
    if (!hospitalId) continue;

    // category_listings — dermatology 카테고리 페이지 노출. UNIQUE
    // (categoryKey, procedureSlug, hospitalId) 라 insert 중복 안전.
    // 이미 있는 경우엔 promoLabel 을 최신값으로 UPDATE (SEO 뱃지 재적용).
    try {
      await db.insert(categoryListings).values({
        categoryKey: 'dermatology',
        procedureSlug: '',
        hospitalId,
        sortOrder: 100,
        promoLabel: p.promoLabel ?? null,
      });
    } catch {
      await db
        .update(categoryListings)
        .set({ promoLabel: p.promoLabel ?? null })
        .where(and(
          eq(categoryListings.categoryKey, 'dermatology'),
          eq(categoryListings.hospitalId, hospitalId),
        ));
    }
  }

  revalidateListingSurfaces();
  revalidatePath('/agency/hospitals');
  revalidatePath('/kr/clinics', 'layout');
  redirect(`/master/listings?seedDermatology=ok&inserted=${inserted}&skipped=${skipped}`);
}

/**
 * 기존 category='restaurant' 행을 일괄 'food' 로 이전.
 *
 *   - 2026-06-25 '레스토랑' 카테고리가 dropdown 에서 제거되고 '맛집'
 *     으로 통합되면서 기존 데이터를 합치기 위한 일회성 액션.
 *   - 멱등 — 'restaurant' 행이 없으면 0건 업데이트 후 그대로 redirect.
 *   - revalidateListingSurfaces 로 /kr, /master 등 surface 캐시
 *     동시에 무효화.
 */
export async function migrateRestaurantToFoodAction(_formData: FormData): Promise<void> {
  await requireMaster();
  const updated = await db
    .update(partnerListings)
    .set({ category: 'food', updatedAt: new Date() })
    .where(eq(partnerListings.category, 'restaurant'))
    .returning({ id: partnerListings.id });
  revalidateListingSurfaces();
  redirect(`/master/listings?mergeRestaurant=ok&updated=${updated.length}`);
}

/** Delete a listing entirely. Cascades to locale_content via FK. */
export async function deleteListingAction(formData: FormData): Promise<void> {
  await requireMaster();
  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/master/listings?error=missing_id');
  await db.delete(partnerListings).where(eq(partnerListings.id, id));
  revalidateListingSurfaces();
  redirect('/master/listings');
}

/**
 * Image upload — single-file form upload. Returns by redirect to the
 * edit page so the new URL is rendered immediately. Cover replaces
 * the current cover; gallery appends to the existing array.
 */
export async function uploadListingImageAction(formData: FormData): Promise<void> {
  await requireMaster();
  const id = String(formData.get('id') ?? '');
  const purpose = String(formData.get('purpose') ?? 'cover');
  if (!id || (purpose !== 'cover' && purpose !== 'gallery' && purpose !== 'detail_landing')) {
    redirect('/master/listings?error=bad_upload');
  }
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/master/listings/${id}/edit?error=no_file`);
  }

  const res = await uploadListingImage({
    listingId: id,
    purpose: purpose as 'cover' | 'gallery' | 'detail_landing',
    file: file as File,
  });
  if (!res.ok) {
    redirect(`/master/listings/${id}/edit?error=${encodeURIComponent(res.error)}`);
  }

  if (purpose === 'cover') {
    await db
      .update(partnerListings)
      .set({ coverImageUrl: res.url, updatedAt: new Date() })
      .where(eq(partnerListings.id, id));
  } else if (purpose === 'gallery') {
    // append to existing gallery array
    const [cur] = await db
      .select({ gallery: partnerListings.galleryImageUrls })
      .from(partnerListings)
      .where(eq(partnerListings.id, id))
      .limit(1);
    const next = [...((cur?.gallery ?? []) as string[]), res.url];
    await db
      .update(partnerListings)
      .set({ galleryImageUrls: next, updatedAt: new Date() })
      .where(eq(partnerListings.id, id));
  } else {
    // detail_landing — replaces the previous landing image. Stored on
    // details.detailLandingImageUrl since partner_listings has no
    // dedicated column (no migration required).
    const [cur] = await db
      .select({ details: partnerListings.details })
      .from(partnerListings)
      .where(eq(partnerListings.id, id))
      .limit(1);
    const nextDetails = {
      ...((cur?.details ?? {}) as Record<string, unknown>),
      detailLandingImageUrl: res.url,
    };
    await db
      .update(partnerListings)
      .set({ details: nextDetails, updatedAt: new Date() })
      .where(eq(partnerListings.id, id));
  }

  revalidateListingSurfaces();
  redirect(`/master/listings/${id}/edit?ok=upload`);
}

/** Remove a single gallery image by URL. */
export async function removeGalleryImageAction(formData: FormData): Promise<void> {
  await requireMaster();
  const id = String(formData.get('id') ?? '');
  const url = String(formData.get('url') ?? '');
  if (!id || !url) redirect('/master/listings?error=bad_remove');

  const [cur] = await db
    .select({ gallery: partnerListings.galleryImageUrls })
    .from(partnerListings)
    .where(eq(partnerListings.id, id))
    .limit(1);
  const next = ((cur?.gallery ?? []) as string[]).filter((u) => u !== url);
  await db
    .update(partnerListings)
    .set({ galleryImageUrls: next, updatedAt: new Date() })
    .where(eq(partnerListings.id, id));

  revalidateListingSurfaces();
  redirect(`/master/listings/${id}/edit?ok=removed`);
}

/** Upsert one locale's title/description/locationLabel (light path —
 *  4 locales fit on the edit page as a small tabbed area). */
export async function upsertListingLocaleAction(formData: FormData): Promise<void> {
  await requireMaster();
  const id = String(formData.get('id') ?? '');
  const locale = String(formData.get('locale') ?? '');
  if (!id || !['kr', 'en', 'zh', 'ja'].includes(locale)) {
    redirect(`/master/listings/${id}/edit?error=bad_locale`);
  }
  const title = String(formData.get('title') ?? '').trim() || null;
  const description = String(formData.get('description') ?? '').trim() || null;
  const locationLabel = String(formData.get('locationLabel') ?? '').trim() || null;

  const [existing] = await db
    .select({ id: partnerListingLocaleContent.id })
    .from(partnerListingLocaleContent)
    .where(
      and(
        eq(partnerListingLocaleContent.listingId, id),
        eq(partnerListingLocaleContent.locale, locale),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(partnerListingLocaleContent)
      .set({ title, description, locationLabel, updatedAt: new Date() })
      .where(eq(partnerListingLocaleContent.id, existing.id));
  } else {
    await db.insert(partnerListingLocaleContent).values({
      listingId: id,
      locale,
      title,
      description,
      locationLabel,
    });
  }

  revalidateListingSurfaces();
  redirect(`/master/listings/${id}/edit?lng=${locale}&ok=locale`);
}

function parseIntOrNull(x: FormDataEntryValue | null): number | null {
  if (typeof x !== 'string') return null;
  const t = x.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n) : null;
}
