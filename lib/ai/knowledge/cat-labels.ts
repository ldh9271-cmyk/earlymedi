/** 지식 청크 카테고리 키(chunker.ts CHAPTER_RULES) → 마스터 화면용 한국어 라벨 */
export const KB_CAT_KO: Record<string, string> = {
  common: '공통', rules: '원칙', dermatology: '피부과', plastic_surgery: '성형외과', dental: '치과', ophthalmology: '안과',
  orthopedics: '정형외과', spine: '척추/통증', health_checkup: '내과/검진', obgyn: '산부인과', urology: '비뇨의학과', ent: '이비인후과',
  other: '기타', oriental: '한의', hair: '모발/헤어', personal_color: '퍼스널컬러', pmu: '반영구', makeup: '메이크업', nail: '네일',
  lash_brow: '속눈썹/왁싱', scalp: '두피', esthetic: '에스테틱/스파', photo_studio: '포토', kpop_tour: 'K-pop', travel_package: '패키지',
};
export const kbCatLabel = (c: string): string => KB_CAT_KO[c] ?? c;
