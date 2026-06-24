/**
 * Single source of truth for non-medical listing categories.
 *
 * Used by:
 *   - /master/listings UI (category select + per-category form fields)
 *   - Server actions (validates `category` before insert)
 *   - /kr landing page (groups DB rows into the right section)
 *   - Account-type permission gate (which actor can create what)
 *
 * Hospitals are NOT in this list — they're managed via the existing
 * hospitals table and /master/hospitals. This file only covers the
 * "everything else" surface (hotel / restaurants / 맛집 / beauty /
 * photo / K-pop).
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
  | 'kpop_tour';

export const LISTING_CATEGORIES: ReadonlyArray<{
  key: ListingCategory;
  label: string;
  /** Where this category surfaces on the /kr landing. */
  surface: 'programs' | 'foods' | 'kpop' | 'hotel';
  /** Default price unit suggestion shown in the master form. */
  defaultPriceUnit: string;
  /** Pre-checked interest chip on /inquiry?interest=. */
  interestKey: string;
}> = [
  { key: 'hotel',          label: '호텔',           surface: 'hotel',    defaultPriceUnit: '박',   interestKey: 'hotel' },
  { key: 'restaurant',     label: '레스토랑',       surface: 'foods',    defaultPriceUnit: '1인',  interestKey: 'food' },
  { key: 'food',           label: '맛집',           surface: 'foods',    defaultPriceUnit: '1인',  interestKey: 'food' },
  { key: 'personal_color', label: '퍼스널 컬러',    surface: 'programs', defaultPriceUnit: '세션', interestKey: 'dermatology' },
  { key: 'hair',           label: '헤어샵',         surface: 'programs', defaultPriceUnit: '세션', interestKey: 'makeup' },
  { key: 'makeup',         label: '메이크업샵',     surface: 'programs', defaultPriceUnit: '세션', interestKey: 'makeup' },
  { key: 'photo_studio',   label: '사진 스튜디오',  surface: 'programs', defaultPriceUnit: '세션', interestKey: 'photo' },
  { key: 'kpop_tour',      label: 'K-팝 투어',      surface: 'kpop',     defaultPriceUnit: '1인',  interestKey: 'kpop' },
];

export const LISTING_CATEGORY_KEYS = LISTING_CATEGORIES.map((c) => c.key);

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
  if (accountType === 'agency') return true;
  if (accountType === 'medical') {
    // hospitals are managed elsewhere; medical orgs can register
    // ancillary services attached to their hospital.
    return category === 'restaurant' || category === 'food';
  }
  if (accountType === 'non_medical') {
    if (partnerSubtype === 'hotel') return category === 'hotel' || category === 'restaurant';
    if (partnerSubtype === 'restaurant') return category === 'restaurant' || category === 'food';
    if (partnerSubtype === 'beauty') return ['personal_color', 'hair', 'makeup'].includes(category);
    if (partnerSubtype === 'photo')  return category === 'photo_studio';
    if (partnerSubtype === 'tour')   return category === 'kpop_tour';
    return false;
  }
  return false; // freelancer / null
}
