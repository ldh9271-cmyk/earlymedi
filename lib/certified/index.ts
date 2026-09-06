/**
 * 글로우 인증 — 정의는 이 한 곳에서.
 *
 *  글로우 인증 = 우리 플랫폼에 "직접 등록"한 병원과 업체.
 *   - 병원: hospitals (country_code='KR', is_active_for_matching=true)
 *   - 업체: partner_listings (status='approved') 중 장소가 있는 카테고리
 *  공공 레지스트리(심평원·행안부) 행은 이들과 연결(contracted_*_id)될 수는 있어도
 *  그 자체로는 인증이 아니다. 예외: 레지스트리 claim_status='approved' 는 업체가
 *  직접 소유권 승인을 받은 것이라 인증으로 본다.
 *
 *  지도(/api/map/markers)·목록(clinics/shops/stays/eats all) 모두 이 정의를 쓴다.
 *  레지스트리에 연결되지 않은 직접 등록 업체도 좌표만 있으면 컬러 마커로 나온다
 *  (좌표는 연결된 레지스트리에서 복사하거나 lib/geo/geocode 로 채운다).
 */
export const CERTIFIED_LISTING_CATS = {
  beauty: ['hair', 'makeup', 'nail', 'pmu', 'personal_color', 'photo_studio'],
  lodging: ['hotel'],
  food: ['food'],
} as const;

export type CertifiedListingKind = keyof typeof CERTIFIED_LISTING_CATS;

/** 장소(좌표)가 의미 있는 업체 카테고리 전체 — 여행상품·K-pop 투어는 제외. */
export const CERTIFIED_PLACE_LISTING_CATS: readonly string[] = [
  ...CERTIFIED_LISTING_CATS.beauty, ...CERTIFIED_LISTING_CATS.lodging, ...CERTIFIED_LISTING_CATS.food,
];

/** hospitals.primary_categories 값 → 소비자 과별 그룹 키(DEPT_GROUPS.key). */
export const HOSPITAL_CAT_TO_DEPT: Record<string, string[]> = {
  plastic_surgery: ['plastic_surgery'], dermatology: ['dermatology'], hair: ['dermatology', 'plastic_surgery'],
  dental: ['dental'], cosmetic_dental: ['dental'], ophthalmology: ['ophthalmology'], obstetrics: ['obgyn'], fertility: ['obgyn'],
  oriental: ['oriental'], checkup: ['internal', 'family'], health_checkup: ['internal', 'family'], orthopedic: ['orthopedics'], cardiology: ['internal', 'thoracic'],
  oncology: ['internal'], gastroenterology: ['internal'], neurology: ['neurology'], urology: ['urology'], ent: ['ent'], general: ['family', 'internal'],
};

/** 과별 그룹 키 → 그 과에 해당하는 hospitals.primary_categories 값들 (역방향). */
export function hospitalCatsForDept(dept: string): string[] {
  return Object.entries(HOSPITAL_CAT_TO_DEPT).filter(([, ds]) => ds.includes(dept)).map(([c]) => c);
}

/** SQL 조각 (테이블 별칭 없이). */
export const CERTIFIED_HOSPITAL_WHERE = "country_code = 'KR' and is_active_for_matching = true";
export const CERTIFIED_LISTING_WHERE = "status = 'approved'";

/** 시도 셀렉트 값('서울특별시')과 address_json.city('서울') 를 느슨하게 비교. */
export function sidoMatches(sido: string, addressJson: unknown): boolean {
  if (!sido) return true;
  const head = sido.slice(0, 2);
  return JSON.stringify(addressJson ?? {}).includes(head);
}
