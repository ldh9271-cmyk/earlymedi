/**
 * 서울 외국인 FIT 추천 치과 — founder 2026-07-03 큐레이션.
 *
 * 마스터 콘솔의 "치과 일괄 등록" 버튼이 이 배열을 읽어 hospitals +
 * category_listings + hospital_locale_content(KR/EN) 에 카테고리='dental'
 * 로 한 번에 upsert. partner_listings 인서트는 하지 않음.
 *
 * 순서 정책 (2026-07-03):
 *   사용자가 "11번, 12번" 위치로 명시적 요청 → sortOrder 110, 120.
 *   1~10번 슬롯은 향후 추가될 치과 병원 자리로 예약.
 *
 * SEO 스킬 (`.claude/skills/seo/SKILL.md`) 규칙을 따라 각 행에 6종
 * SEO 필드를 채운다.
 */

export type DentalSeed = {
  title: string;
  englishTitle: string;
  slug: string;
  description: string;
  locationLabel: string;
  address: string;
  phone: string;
  nearestStation: string;
  signatureProcedures: ReadonlyArray<string>;
  procedureName: string;
  openingYear?: number;
  promoLabel: string;
  languagesSpoken: ReadonlyArray<'ko' | 'en' | 'zh' | 'ja' | 'ru' | 'ar'>;
  interpreterIncluded?: boolean;
  /** 노출 순서. 낮을수록 먼저. */
  sortOrder: number;
  /** SEO 6종 */
  seoTitle: string;
  seoDescription: string;
  seoTags: ReadonlyArray<string>;
  ogDescription: string;
  imageKeywords: ReadonlyArray<string>;
};

export const DENTAL_PRODUCTS: ReadonlyArray<DentalSeed> = [
  {
    title: '세라치과의원',
    englishTitle: 'Cera Dental Clinic',
    slug: 'cera-dental-clinic-samsung',
    description:
      '서울 강남 삼성동 S&C TOWER B102호에 위치한 심미치과. 구 청담 디자인치과에서 이전 개원했으며 "자연스러운 한국적 아름다움을 만드는 최소 시술" 철학을 유지. 라미네이트·무삭제 라미네이트·임플란트·투명교정·치아교정·충치치료·사랑니 발치를 진료하며 심미치과 및 보존 치료 중심. 삼성중앙역 1번 출구 도보 5분, 코엑스·현대백화점 삼성동 인근 위치로 외국인 접근성 우수, 영어 상담 가능.',
    locationLabel: '강남 삼성동',
    address: '서울특별시 강남구 봉은사로 457 S&C TOWER 삼성 B102호 (삼성동 45-12)',
    phone: '홈페이지 문의',
    nearestStation: '삼성중앙역 1번 출구 도보 5분 · 삼성역 인근',
    signatureProcedures: ['라미네이트', '무삭제 라미네이트', '임플란트', '투명교정', '치아교정', '충치치료', '사랑니 발치'],
    procedureName: '무삭제 라미네이트·임플란트',
    promoLabel: '자연스러운 스마일 디자인',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    sortOrder: 110,
    seoTitle: '세라치과의원 | 강남 삼성동 라미네이트·임플란트 심미치과 | EarlyMedi',
    seoDescription:
      '삼성중앙역 5분. 무삭제 라미네이트·임플란트·투명교정 전문. 자연스러운 스마일 디자인. 코엑스 인근. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남치과', '삼성동치과', '무삭제라미네이트', '임플란트', '투명교정', '심미치과', 'Korea dental', 'dental veneer Gangnam', '외국인치과', '코엑스치과'],
    ogDescription: '강남 치과 | 삼성동·무삭제 라미네이트·자연스러운 스마일 디자인 — EarlyMedi',
    imageKeywords: ['Cera Dental Clinic Samsung-dong', 'no-prep veneer Korea', 'S&C Tower Samsung', '세라치과 삼성동'],
  },
  {
    title: '뉴욕화이트치과의원',
    englishTitle: 'New York White Dental Clinic',
    slug: 'new-york-white-dental-clinic-gangnam',
    description:
      '서울 강남 역삼동 테헤란로43길 10 2층에 위치한 임플란트·심미치과. 세계 임플란트 대회 2위 입상 김웅비 원장이 직접 집도하며 치과전용 CT·레이저·초음파 수술기구 완비. 덴토존 살균 의료정수 시스템 도입. 무절개 네비게이션 임플란트로 방문 횟수를 최소화 — 해외 거주·단기 방문 외국인 환자에게 최적화된 프로토콜. 1회 내원으로 최대 치료 완료를 추구. 치아교정·라미네이트·치아성형·충치치료·신경치료 진료, 영어 상담 가능.',
    locationLabel: '강남 역삼',
    address: '서울특별시 강남구 테헤란로43길 10 2층 (역삼동)',
    phone: '02-565-2875',
    nearestStation: '선릉역 인근',
    signatureProcedures: ['무절개 네비게이션 임플란트', '치아교정', '라미네이트', '치아성형', '충치치료', '신경치료'],
    procedureName: '무절개 네비게이션 임플란트',
    promoLabel: '세계 임플란트 대회 2위 원장',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    sortOrder: 120,
    seoTitle: '뉴욕화이트치과 | 강남 무절개 네비게이션 임플란트 전문 | EarlyMedi',
    seoDescription:
      '선릉역 인근. 세계 임플란트 대회 2위 입상 원장 직접 집도. 무절개 네비게이션 임플란트·라미네이트. 방문 횟수 최소화. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남치과', '선릉역치과', '네비게이션임플란트', '무절개임플란트', '라미네이트', '치아성형', 'Korea implant', 'navigation implant Seoul', '외국인치과', '단기방문치과'],
    ogDescription: '강남 치과 | 세계 임플란트 대회 2위·무절개 네비게이션·방문 횟수 최소화 — EarlyMedi',
    imageKeywords: ['New York White Dental Clinic Gangnam', 'navigation implant Korea', 'Teheran-ro dental', '뉴욕화이트치과 역삼'],
  },
];
