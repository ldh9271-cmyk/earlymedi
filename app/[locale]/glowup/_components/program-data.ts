import type { PublicLocale } from '@/lib/i18n/locales';

/**
 * Static program/course catalog for the glowup mobile app.
 *
 * Why static (for now): the source design ships fixed copy and stock
 * images. Once master fills hospital_locale_content + category_listings
 * the real data, this file can be swapped for a `await db.select()...`
 * call inside each page's server component.
 *
 * EARLYMEDI B2B integration:
 *  - `hospitalSlug` is the canonical id used by the existing patient
 *    portal flow (/[locale]/clinics/[slug], /[locale]/inquiry?hospital=…).
 *    Clicking "예약하기" on any program/course routes through the same
 *    inquiry pipeline that lands the message in /agency/inbox — agency
 *    staff respond there as if it were a Kakao/LINE/WhatsApp message.
 *  - `categoryKey` matches `category_listings.category_key` so when the
 *    master curates which programs appear under each category, the
 *    Glowup mobile feed can pull from that table.
 *
 * Images live in /public/images/glowup-mobile/<uuid>.jpg (extracted
 * from the design bundle); UUIDs preserved as filenames for traceback.
 */

export const IMG = '/images/glowup-mobile';

export type Program = {
  id: string;
  name: string;
  rating: number;
  place: string;
  duration: string;
  price: string;
  featured?: boolean;
  img: string;
  /** Mapped to existing hospitals.slug when available, else null. */
  hospitalSlug?: string;
  /** Mapped to category_listings.category_key — see drizzle/schema/category-listings.ts. */
  categoryKey: 'plastic_surgery' | 'dermatology' | 'photo' | 'makeup' | 'kpop' | 'food' | 'hotel' | 'spot';
};

export const FEATURED_COURSE = {
  id: 'glowup-4n5d',
  name: '4박 5일 글로우업 코스',
  tagline: '뷰티 케어 · 찐맛집 · K-팝 성지 · 5성 호텔',
  duration: '올인원 · 4박 5일',
  price: 1890000,
  rating: 4.9,
  reviews: 318,
  img: `${IMG}/3e2c060f-7bf0-491f-ab0c-d5632d55f409.jpg`,
  itinerary: [
    { n: 1, title: '도착 · 퍼스널 컬러 진단', desc: '차량 픽업 · 통역 가이드 · 명동 5성 호텔 체크인' },
    { n: 2, title: '피부 케어 · 한우 다이닝',    desc: '스킨 진단 · 현지인 추천 한우구이·간장게장' },
    { n: 3, title: 'K-팝 성지 · 화보 촬영',     desc: 'HYBE·SM·JYP·YG · 프로필 화보 스튜디오' },
    { n: 4, title: '경복궁 · 한강 · 성수 쇼핑',   desc: '필수 명소 투어 · 청담·성수 감성 쇼핑' },
    { n: 5, title: '롯데월드 · 출국',            desc: '아쿠아리움 · 면세 쇼핑 · 공항 샌딩' },
  ],
} as const;

/** Top-level home page program cards (3 individual + 1 featured). */
export const HOME_PROGRAMS: Program[] = [
  {
    id: 'personal-color',
    name: '퍼스널 컬러 진단',
    rating: 4.9,
    place: '강남 스튜디오',
    duration: '1:1 드레이핑 90분',
    price: '₩180,000',
    featured: true,
    img: `${IMG}/b1b9ae01-0a98-4e13-ad68-cc67f0075f2c.jpg`,
    categoryKey: 'dermatology',
  },
  {
    id: 'profile-photo',
    name: '프로필 화보 촬영',
    rating: 5.0,
    place: '성수 스튜디오',
    duration: '헤어·메이크업 포함 150분',
    price: '₩320,000',
    featured: true,
    img: `${IMG}/7334afc3-2f11-4e9d-b14f-3124151c08ab.jpg`,
    categoryKey: 'photo',
  },
  {
    id: 'skin-diagnosis',
    name: '피부 진단 케어',
    rating: 4.8,
    place: '청담 클리닉',
    duration: 'AI 피부 분석 120분',
    price: '₩240,000',
    img: `${IMG}/07fc41ee-79e3-47f9-a40b-d4e7767da8e9.jpg`,
    categoryKey: 'dermatology',
  },
];

/** Restaurants grid on Explore screen — 2×2. */
export const EXPLORE_FOODS = [
  { id: 'hanwoo',   name: '한우구이',      place: '강남 · ★ 4.9',   img: `${IMG}/5d80e17a-1b1c-42e9-85ff-1c81f42846bb.jpg` },
  { id: 'bibimbap', name: '전주 비빔밥',    place: '북촌 · ★ 4.8',   img: `${IMG}/ac50c136-7af1-4b95-8dca-edb5370505dd.jpg` },
  { id: 'tteok',    name: '신당동 떡볶이',  place: '신당동 · ★ 4.7', img: `${IMG}/f17b7d75-4cf8-4344-8be9-1af74902055a.jpg` },
  { id: 'banghan',  name: '한정식 반상',    place: '인사동 · ★ 4.9', img: `${IMG}/5a881432-d8b7-4024-9332-3d0ce3d43918.jpg` },
] as const;

/** Categories feed (screen 4) — each row scrolls horizontally. */
export const CATEGORIES_FEED: Array<{
  key: MobileCategoryKey;
  title: string;
  items: Array<{ name: string; meta: string; img?: string; label?: string; featured?: boolean }>;
}> = [
  {
    key: 'color',
    title: '퍼스널 컬러',
    items: [
      { name: '퍼스널 컬러 진단', meta: '★ 4.9 · ₩180,000', img: `${IMG}/35d71594-d921-4b6f-be59-627cc243ae3f.jpg`, featured: true },
      { name: '컬러 메이크업 매칭', meta: '★ 4.8 · ₩120,000', img: `${IMG}/8567de0a-2125-4b56-bda6-d0634df7e03e.jpg` },
    ],
  },
  {
    key: 'skin',
    title: '피부 케어',
    items: [
      { name: '피부 진단 케어',   meta: '★ 4.8 · ₩240,000', img: `${IMG}/85d0e623-e210-4977-8908-d1c480147a83.jpg` },
      { name: '프리미엄 페이셜', meta: '★ 4.9 · ₩280,000', img: `${IMG}/ca3746a8-fe43-4a83-9cef-0af649ce1e6f.jpg` },
    ],
  },
  {
    key: 'photo',
    title: '화보 촬영',
    items: [
      { name: '프로필 화보 촬영', meta: '★ 5.0 · ₩320,000', img: `${IMG}/ba24affc-ac1f-429d-a50b-fe19d0fa4d5c.jpg`, featured: true },
      { name: '한복 화보 패키지', meta: '★ 4.9 · ₩380,000', img: `${IMG}/2c214c94-7cc0-4756-8e27-f87d5e120319.jpg` },
    ],
  },
  {
    key: 'makeup',
    title: '메이크업',
    items: [
      { name: 'K-뷰티 메이크업 클래스', meta: '★ 4.9 · ₩150,000', img: `${IMG}/8567de0a-2125-4b56-bda6-d0634df7e03e.jpg` },
      { name: '데일리 메이크업',        meta: '★ 4.7 · ₩90,000',  img: `${IMG}/35d71594-d921-4b6f-be59-627cc243ae3f.jpg` },
    ],
  },
  {
    key: 'kpop',
    title: 'K-팝 성지',
    items: [
      { name: 'HYBE 인사이트', meta: '용산 · ★ 4.8', label: 'HYBE' },
      { name: 'SM 타운',       meta: '성수 · ★ 4.7', label: 'SM' },
      { name: 'JYP 사옥 투어', meta: '강동 · ★ 4.9', label: 'JYP' },
    ],
  },
  {
    key: 'food',
    title: '현지인 맛집',
    items: [
      { name: '한우구이',      meta: '강남 · ★ 4.9',   img: `${IMG}/0010f6e8-e5a6-4440-90f0-771df70bb667.jpg` },
      { name: '전주 비빔밥',    meta: '북촌 · ★ 4.8',   img: `${IMG}/d1753dc2-f101-4f92-884e-92bdbc307d01.jpg` },
      { name: '신당동 떡볶이',  meta: '신당동 · ★ 4.7', img: `${IMG}/3acb60d7-3abe-4294-9dd7-92bb2b75ea90.jpg` },
    ],
  },
  {
    key: 'hotel',
    title: '프리미엄 호텔',
    items: [
      { name: '명동 프리미엄 호텔', meta: '명동 · ₩320,000/박', img: `${IMG}/0cdba536-b97c-495d-930f-3f7a12100f8e.jpg`, label: '★ 5성' },
      { name: '강남 부티크 호텔',   meta: '강남 · ₩280,000/박', img: `${IMG}/02b0819e-3eb7-4368-a2ac-6d094ad005b8.jpg` },
    ],
  },
  {
    key: 'spot',
    title: '관광 명소',
    items: [
      { name: '경복궁 · 한복 체험',   meta: '종로 · ★ 4.9', img: `${IMG}/75b3e015-c8ab-43c4-a32b-deaed0fed48e.jpg` },
      { name: '남산서울타워 야경',     meta: '용산 · ★ 4.8', img: `${IMG}/71b93dbb-aa42-4d7a-9d8b-9f00a12ffd74.jpg` },
    ],
  },
];

/**
 * Build a deep-link to the existing patient inquiry flow with the
 * program name + categoryKey carried as query params. Form prefilling
 * happens in app/[locale]/(public-portal)/inquiry/page.tsx — agency
 * staff see "관심 분야: photo · 프로필 화보 촬영" in /agency/inbox.
 */
export function bookingHref(locale: PublicLocale, program: { name: string; categoryKey: string }): string {
  const qs = new URLSearchParams({
    program: program.name,
    interest: program.categoryKey,
  }).toString();
  return `/${locale}/inquiry?${qs}`;
}

type MobileCategoryKey =
  | 'color' | 'skin' | 'photo' | 'makeup' | 'kpop' | 'food' | 'hotel' | 'spot';
