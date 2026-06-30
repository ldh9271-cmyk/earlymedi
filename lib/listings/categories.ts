/**
 * Single source of truth for marketplace listing categories.
 *
 * Used by:
 *   - /master/listings UI (category select + per-category form fields)
 *   - Server actions (validates `category` before insert)
 *   - /kr landing page (groups DB rows into the right section)
 *   - Account-type permission gate (which actor can create what)
 *
 * Hospitals (`hospital`) live here too as of 2026-06-25 — masters can
 * register promotional hospital cards via this same UI alongside
 * hotels, restaurants and lifestyle services. The authoritative
 * clinical record (KOIHA registration, RLS-gated patient data, etc.)
 * still belongs to the `hospitals` table reachable from
 * /master/hospitals; partner_listings rows tagged `hospital` are
 * marketing-surface entries that point at one of those records.
 */

export type ListingCategory =
  | 'hotel'
  | 'restaurant'
  | 'food'           // 찐맛집 — same shape as restaurant, kept distinct so
                     // the /kr "현지인만 아는 찐맛집" section can pull a
                     // curated list without dragging in chains.
  | 'personal_color'
  | 'hair'
  | 'makeup'
  | 'photo_studio'
  | 'kpop_tour'
  | 'travel_package'
  | 'hospital';      // 병원 — split into 8 진료과 via details.subType.

export const LISTING_CATEGORIES: ReadonlyArray<{
  key: ListingCategory;
  label: string;
  /** Where this category surfaces on the /kr landing. */
  surface: 'programs' | 'foods' | 'kpop' | 'hotel' | 'travel' | 'clinics';
  /** Default price unit suggestion shown in the master form. */
  defaultPriceUnit: string;
  /** Pre-checked interest chip on /inquiry?interest=. */
  interestKey: string;
}> = [
  { key: 'hotel',          label: '호텔',           surface: 'hotel',    defaultPriceUnit: '박',   interestKey: 'hotel' },
  // 2026-06-25: 'restaurant' 가 dropdown 에서 제거됨 — '맛집' 으로 통합.
  // 기존 restaurant 행은 마이그레이션 액션 (migrateRestaurantToFoodAction)
  // 으로 일괄 food 로 이전. ListingCategory 타입 유니온에는 'restaurant'
  // 가 남아있어 historical 데이터 읽기는 그대로 호환.
  { key: 'food',           label: '맛집',           surface: 'foods',    defaultPriceUnit: '1인',  interestKey: 'food' },
  { key: 'personal_color', label: '퍼스널 컬러',    surface: 'programs', defaultPriceUnit: '세션', interestKey: 'dermatology' },
  { key: 'hair',           label: '헤어샵',         surface: 'programs', defaultPriceUnit: '세션', interestKey: 'makeup' },
  { key: 'makeup',         label: '메이크업샵',     surface: 'programs', defaultPriceUnit: '세션', interestKey: 'makeup' },
  { key: 'photo_studio',   label: '사진 스튜디오',  surface: 'programs', defaultPriceUnit: '세션', interestKey: 'photo' },
  { key: 'kpop_tour',      label: 'K-팝 투어',      surface: 'kpop',     defaultPriceUnit: '1인',  interestKey: 'kpop' },
  { key: 'travel_package', label: '여행 패키지',    surface: 'travel',   defaultPriceUnit: '1인',  interestKey: 'beauty_tour' },
  { key: 'hospital',       label: '병원',           surface: 'clinics',  defaultPriceUnit: '회',   interestKey: 'plastic_surgery' },
];

/**
 * Sub-types for travel_package — three commerce models the agency
 * sells: 자유여행 (self-guided), 패키지여행 (fully-guided), 연수패키지
 * (training/study-tour bundles for groups). Stored on a listing's
 * `details.subType` field; master/agency picks it on the edit form
 * and the /master/listings page groups travel_package rows by it.
 */
export type TravelPackageSubType = 'free' | 'package' | 'training';

export const TRAVEL_PACKAGE_SUB_TYPES: ReadonlyArray<{
  key: TravelPackageSubType;
  label: string;
}> = [
  { key: 'free',     label: '자유여행' },
  { key: 'package',  label: '패키지여행' },
  { key: 'training', label: '연수패키지' },
];

export function travelSubTypeLabel(key: string | undefined): string {
  return TRAVEL_PACKAGE_SUB_TYPES.find((s) => s.key === key)?.label ?? '미분류';
}

/**
 * Sub-types for `hospital` — 8 진료과 matching the existing /clinics
 * filter chips (성형외과 / 피부과 / 치과 / 모발 / 건강검진 / 줄기세포 /
 * 한방병원 / 파트너병원). Stored on a listing's `details.subType` so
 * /master/listings can group hospital rows by department the same way
 * travel_package groups by sub-type.
 */
export type HospitalSubType =
  | 'plastic_surgery'
  | 'dermatology'
  | 'dental'
  | 'hair_loss'
  | 'health_checkup'
  | 'stem_cell'
  | 'oriental'
  | 'partner';

export const HOSPITAL_SUB_TYPES: ReadonlyArray<{
  key: HospitalSubType;
  label: string;
}> = [
  { key: 'plastic_surgery', label: '성형외과' },
  { key: 'dermatology',     label: '피부과' },
  { key: 'dental',          label: '치과' },
  { key: 'hair_loss',       label: '모발' },
  { key: 'health_checkup',  label: '건강검진' },
  { key: 'stem_cell',       label: '줄기세포' },
  { key: 'oriental',        label: '한방병원' },
  { key: 'partner',         label: '파트너병원' },
];

export function hospitalSubTypeLabel(key: string | undefined): string {
  return HOSPITAL_SUB_TYPES.find((s) => s.key === key)?.label ?? '미분류';
}

export const LISTING_CATEGORY_KEYS = LISTING_CATEGORIES.map((c) => c.key);

/**
 * 글로우업 상품관리 (partner_listings) 마켓플레이스 표면에서 노출되는
 * 카테고리만. `hospital` 은 hospitals 테이블이 단일 진실원이므로
 * 마켓플레이스 UI 에서 제외 (병원 마켓플레이스 /agency/hospitals 에서
 * 별도 관리). 2026-06-25 정책.
 */
export const LISTING_CATEGORIES_MARKETPLACE = LISTING_CATEGORIES.filter(
  (c) => c.key !== 'hospital',
);

export function isListingCategory(x: string): x is ListingCategory {
  return (LISTING_CATEGORY_KEYS as readonly string[]).includes(x);
}

export function categoryLabel(key: string): string {
  return LISTING_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

/** Status lifecycle. */
export const LISTING_STATUSES = ['draft', 'pending', 'approved', 'rejected'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

/** Which account types can create which categories.
 *  Master/agency: everything. Partner: locked to their subtype's
 *  natural fit. Medical: only hospital-adjacent additions. */
export function canCreateCategory(
  accountType: 'agency' | 'medical' | 'non_medical' | 'freelancer' | null,
  partnerSubtype: string | null,
  category: ListingCategory,
): boolean {
  if (accountType === 'agency') return true; // agency = 여행사 등록 → 전 카테고리
  if (accountType === 'medical') {
    // Medical orgs register their own hospital + ancillary services
    // attached to it (in-house cafe / 식당 etc.). 'restaurant' is no
    // longer in the dropdown — 'food' covers both.
    return category === 'hospital' || category === 'food';
  }
  if (accountType === 'non_medical') {
    if (partnerSubtype === 'hotel') return category === 'hotel' || category === 'food';
    if (partnerSubtype === 'restaurant') return category === 'food';
    if (partnerSubtype === 'beauty') return ['personal_color', 'hair', 'makeup'].includes(category);
    if (partnerSubtype === 'photo')  return category === 'photo_studio';
    if (partnerSubtype === 'tour')   return category === 'kpop_tour' || category === 'travel_package';
    return false;
  }
  return false; // freelancer / null
}
