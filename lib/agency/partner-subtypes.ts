/**
 * Partner-subtype constants shared by server actions and client UI.
 * Kept OUT of the 'use server' action modules — those may only export
 * async functions, so plain constants live here.
 *
 * Mirrors drizzle/schema/enums.ts partnerSubtypeEnum — update both
 * together when adding a subtype.
 */

export const PARTNER_SUBTYPES = [
  'hotel',
  'spa',
  'salon',
  'studio',
  'restaurant',
  'transport',
  'tour',
  'shopping',
  'wellness',
  'other',
] as const;

export type PartnerSubtype = (typeof PARTNER_SUBTYPES)[number];

export const PARTNER_SUBTYPE_LABEL_KO: Record<PartnerSubtype, string> = {
  hotel: '호텔·숙박',
  spa: '스파·마사지',
  salon: '헤어·뷰티샵',
  studio: '사진 스튜디오',
  restaurant: '식당·맛집',
  transport: '교통·의전',
  tour: '투어·관광',
  shopping: '쇼핑',
  wellness: '웰니스',
  other: '기타',
};

export const PARTNER_SUBTYPE_EMOJI: Record<PartnerSubtype, string> = {
  hotel: '🏨',
  spa: '💆',
  salon: '💇',
  studio: '📸',
  restaurant: '🍽️',
  transport: '🚐',
  tour: '🗺️',
  shopping: '🛍️',
  wellness: '🧘',
  other: '🤝',
};
