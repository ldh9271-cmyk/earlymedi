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
    title: '에이플러스치과병원',
    englishTitle: 'A+ Dental Hospital',
    slug: 'aplus-dental-hospital-gangnam',
    description:
      '1996년 개원한 국내 최초 치과종합병원. 서울대 치과대학 출신 의료진과 미국 보스턴·컬럼비아·뉴욕대 전문의 과정 수료진이 분과별 협진 시스템으로 진료한다. 임플란트·치아교정·보철·보존·치주·라미네이트·치아미백·충치치료 전 분야. 강남구 의료관광 외국인환자 유치우수기관 4회 선정(2012·2013·2014·2016), Whatclinic.com 외국인환자 상담 만족도상 4회 수상. 압구정역 인근, 영어·중국어·일어 응대.',
    locationLabel: '강남 신사동',
    address: '서울 강남구 언주로 860 서우프라퍼티 4·5·6층 (신사동)',
    phone: '02-3442-7575',
    nearestStation: '압구정역 인근',
    signatureProcedures: ['임플란트', '치아교정', '보철', '보존', '치주', '라미네이트', '치아미백', '충치치료'],
    procedureName: '임플란트·치아교정',
    openingYear: 1996,
    promoLabel: '국내 최초 치과종합병원',
    languagesSpoken: ['ko', 'en', 'zh', 'ja'],
    interpreterIncluded: true,
    sortOrder: 10,
    seoTitle: '에이플러스치과병원 | 강남 외국인 치과·임플란트·교정 | EarlyMedi',
    seoDescription:
      '1996년 개원 국내 최초 치과종합병원. 강남구 외국인환자 우수기관 선정. 서울대 출신 분과별 협진. 영어·중국어·일어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남치과', '강남임플란트', '치과종합병원', '외국인치과', '강남교정', 'Korea dental', 'dental implant Korea', 'Seoul dental clinic', '의료관광치과'],
    ogDescription: '강남 치과 | 국내 최초 치과종합병원·외국인환자 우수기관·4개국어 응대 — EarlyMedi',
    imageKeywords: ['A Plus Dental Hospital Gangnam', 'Korea dental hospital', 'Sinsa dental', '에이플러스치과 강남'],
  },
  {
    title: '에스플란트치과병원',
    englishTitle: 'S.Plant Dental Hospital',
    slug: 'splant-dental-hospital-cheongdam',
    description:
      '서울대 치과대학 출신 6인 의료진 전원이 보철·교정·보존·치주 분과 협진으로 진료하는 청담동 치과병원. 3D CT 기반 모의수술 후 가이드 임플란트 식립, 전용 에어샤워 수술실 보유. 임플란트(3D 모의수술·가이드임플란트·뼈이식)·크라운·라미네이트·치아미백·양악수술·교정 진료. 강남구 의료관광 공식 협력기관으로 세계 각국 외국인 환자가 내원한다. 영어·중국어·일어·러시아어 응대, WhatsApp 상담 가능.',
    locationLabel: '강남 청담동',
    address: '서울 강남구 도산대로 410 5~9층 (청담동)',
    phone: '02-512-0700',
    nearestStation: '강남구청역 4번 출구 도보 10분 (학동사거리 방면)',
    signatureProcedures: ['가이드 임플란트', '3D 모의수술', '뼈이식', '크라운', '라미네이트', '치아미백', '양악수술', '교정'],
    procedureName: '3D 가이드 임플란트',
    promoLabel: '서울대 출신 6인 협진',
    languagesSpoken: ['ko', 'en', 'zh', 'ja', 'ru'],
    interpreterIncluded: true,
    sortOrder: 20,
    seoTitle: '에스플란트치과병원 | 강남 청담 임플란트 전문 | EarlyMedi',
    seoDescription:
      '서울대 출신 6인 전문의. 3D 모의수술 기반 가이드 임플란트. 청담동 위치. 영어·중국어·러시아어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남치과', '청담치과', '임플란트전문', '3D임플란트', '가이드임플란트', '외국인치과', 'Korea implant', 'Seoul dental surgery', '의료관광치과'],
    ogDescription: '강남 치과 | 서울대 출신 6인·3D 모의수술·임플란트 전문 — EarlyMedi',
    imageKeywords: ['S.Plant Dental Hospital Cheongdam', 'guided implant Korea', 'Dosan-daero dental', '에스플란트치과 청담'],
  },
  {
    title: '레브치과의원',
    englishTitle: 'REVE Dental Clinic',
    slug: 'reve-dental-clinic-sinsa',
    description:
      '신사역 1번 출구 도산대로의 280평 규모 대형 치과. 대통령자문의 출신 대표원장이 "자연스럽고 조화로운 스마일 디자인" 철학으로 무삭제 라미네이트에 특화했다. 무삭제 라미네이트·치아교정·임플란트·치아미백·스마일 디자인 진료. 연예인·셀럽 단골 클리닉으로 알려져 있으며 외국인 VIP 환자가 많다. 영어·중국어 응대.',
    locationLabel: '강남 신사동',
    address: '서울 강남구 도산대로 138 지하2층 (신사동)',
    phone: '홈페이지 문의',
    nearestStation: '신사역 1번 출구',
    signatureProcedures: ['무삭제 라미네이트', '치아교정', '임플란트', '치아미백', '스마일 디자인'],
    procedureName: '무삭제 라미네이트',
    promoLabel: '대통령자문의 출신 원장',
    languagesSpoken: ['ko', 'en', 'zh'],
    interpreterIncluded: true,
    sortOrder: 30,
    seoTitle: '레브치과 | 강남 무삭제 라미네이트·스마일디자인 전문 | EarlyMedi',
    seoDescription:
      '신사역 1번 출구. 280평 대형치과. 대통령자문의 출신 원장. 무삭제 라미네이트·스마일디자인 특화. 영어·중국어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남치과', '신사역치과', '무삭제라미네이트', '스마일디자인', '라미네이트전문', 'Korea veneer', 'dental veneer Seoul', '외국인치과', '심미치과'],
    ogDescription: '강남 치과 | 대통령자문의·무삭제 라미네이트·스마일디자인 전문 — EarlyMedi',
    imageKeywords: ['REVE Dental Clinic Sinsa', 'no-prep veneer Seoul', 'smile design Korea', '레브치과 신사'],
  },
  {
    title: '뉴엔치과의원',
    englishTitle: 'NUEN Dental Clinic',
    slug: 'nuen-dental-clinic-gangnam',
    description:
      '강남역 10번 출구 21m 초역세권 치과. 치과교정과 전문의 2명·통합치의학과 전문의 2명 등 5명의 전문의가 진료하며, 3D 프린터로 당일 보철물을 제작한다. 무삭제 퍼스널 라미네이트(퍼스널 컬러 맞춤)·투명교정·임플란트(3D 디지털)·앞니 레진·치아미백 진료. 리뷰 3,467건 보유, 발렛파킹 운영, 화·금 21시 야간 진료. 영어 응대.',
    locationLabel: '강남역 (서초동)',
    address: '서울 서초구 강남대로 405 통영빌딩 3층 (서초동)',
    phone: '홈페이지 문의',
    nearestStation: '강남역 10번 출구 21m',
    signatureProcedures: ['무삭제 퍼스널 라미네이트', '투명교정', '3D 디지털 임플란트', '앞니 레진', '치아미백'],
    procedureName: '퍼스널 라미네이트·투명교정',
    promoLabel: '3D 당일 보철',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    sortOrder: 40,
    seoTitle: '뉴엔치과 | 강남역 라미네이트·투명교정·임플란트 | EarlyMedi',
    seoDescription:
      '강남역 10번 출구 21m. 무삭제 퍼스널 라미네이트·투명교정 전문. 3D 당일 보철. 야간 진료. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남치과', '강남역치과', '무삭제라미네이트', '투명교정', '임플란트', '당일보철', 'Korea dental', 'teeth veneer Seoul', '외국인치과', '야간진료치과'],
    ogDescription: '강남 치과 | 강남역 바로 앞·무삭제 라미네이트·투명교정·야간진료 — EarlyMedi',
    imageKeywords: ['NUEN Dental Clinic Gangnam Station', 'clear aligner Seoul', 'same-day prosthesis Korea', '뉴엔치과 강남역'],
  },
  {
    title: '원진치과의원',
    englishTitle: 'Wonjin Dental Clinic',
    slug: 'wonjin-dental-clinic-gangnam',
    description:
      '강남역 1번 출구 도보 30초 최고 접근성의 심미치과. 무삭제 라미네이트 자체 브랜드 "브리네이트"를 운영하고 무통마취 시스템을 도입했다. 브리네이트·임플란트·투명교정·치아미백·잇몸치료 진료. 평일 10:00~21:00 야간 진료, 토요일 16:00까지. 트렌디한 인테리어. 영어 응대.',
    locationLabel: '강남역',
    address: '서울 강남구 강남대로 (강남역 1번 출구 도보 30초)',
    phone: '02-3476-2879',
    nearestStation: '강남역 1번 출구 30초',
    signatureProcedures: ['브리네이트(무삭제 라미네이트)', '임플란트', '투명교정', '치아미백', '잇몸치료'],
    procedureName: '브리네이트',
    promoLabel: '평일 21시 야간 진료',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    sortOrder: 50,
    seoTitle: '원진치과 | 강남역 브리네이트·임플란트 심미치과 | EarlyMedi',
    seoDescription:
      '강남역 1번 출구 30초. 브리네이트(무삭제 라미네이트)·임플란트·투명교정. 평일 21시 야간 진료. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남치과', '강남역치과', '브리네이트', '무삭제라미네이트', '야간진료치과', '임플란트', 'Korea dental veneer', 'Seoul dental', '외국인치과'],
    ogDescription: '강남 치과 | 강남역 30초·브리네이트·야간 21시 진료 — EarlyMedi',
    imageKeywords: ['Wonjin Dental Clinic Gangnam', 'veneer Gangnam Station', 'night dental Seoul', '원진치과 강남역'],
  },
  {
    title: '화이트드림치과의원',
    englishTitle: 'White Dream Dental Clinic',
    slug: 'white-dream-dental-clinic-seocho',
    description:
      '타치과에서 치료가 어려운 고난이도 임상을 전문으로 하는 강남역 인근 치과. 자체기공실을 운영해 보철물 품질을 직접 관리하고, 자가치아뼈이식 임플란트에 특화했다. 당일즉시 임플란트·컴퓨터분석 임플란트·"화이티니" 자체 라미네이트·치아성형·치아미백·잇몸성형·올세라믹·충치치료 진료. 셀럽 내원 다수. 영어·중국어 응대.',
    locationLabel: '서초 (강남역)',
    address: '서울 서초구 서초동 1307-21 Block77 5층',
    phone: '02-558-0037',
    nearestStation: '강남역 인근',
    signatureProcedures: ['당일즉시 임플란트', '자가치아뼈이식', '화이티니 라미네이트', '치아성형', '치아미백', '잇몸성형', '올세라믹'],
    procedureName: '자가치아뼈이식 임플란트',
    promoLabel: '자체기공실 운영',
    languagesSpoken: ['ko', 'en', 'zh'],
    interpreterIncluded: true,
    sortOrder: 60,
    seoTitle: '화이트드림치과 | 강남 임플란트·라미네이트·치아성형 | EarlyMedi',
    seoDescription:
      '서초 강남역 인근. 자가치아뼈이식 임플란트·화이티니 라미네이트. 자체기공실 보유. 고난이도 임상 전문. 영어·중국어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남치과', '서초치과', '임플란트', '라미네이트', '자가치아뼈이식', '치아성형', 'Korea dental implant', 'Seoul cosmetic dentistry', '외국인치과'],
    ogDescription: '서초 치과 | 자체기공실·자가치아뼈이식 임플란트·화이티니 라미네이트 — EarlyMedi',
    imageKeywords: ['White Dream Dental Clinic Seocho', 'autogenous bone graft implant', 'Block77 dental', '화이트드림치과 서초'],
  },
  {
    title: 'CDC어린이치과',
    englishTitle: "CDC Children's Dental Clinic",
    slug: 'cdc-childrens-dental-clinic-cheongdam',
    description:
      '누적 내원 12만 명, 국내외 5개 네트워크를 운영하는 청담동 소아 전문 치과. 영어 원어민 의료진(Justin J.C. Lee 원장)이 상주해 외국인 가족·주재원 자녀에 특화되어 있다. 충치치료·교정·발치·예방치료·불소도포 등 소아·어린이 치과 전 분야 진료. 강남구 외국인환자 우수의료기관 선정(2026), 서울특별시 의료관광 협력기관. 영어·일어 응대.',
    locationLabel: '강남 청담동',
    address: '서울 강남구 학동로97길 11 (청담동 70-15)',
    phone: '02-515-0926',
    nearestStation: '청담역 12번 출구 (경기고 사거리)',
    signatureProcedures: ['소아 충치치료', '소아 교정', '발치', '예방치료', '불소도포'],
    procedureName: '소아치과·교정',
    promoLabel: '영어 원어민 의료진',
    languagesSpoken: ['ko', 'en', 'ja'],
    interpreterIncluded: true,
    sortOrder: 70,
    seoTitle: 'CDC어린이치과 | 강남 외국인 소아치과·교정 | EarlyMedi',
    seoDescription:
      '청담역 12번 출구. 영어 원어민 의료진 상주. 강남구 외국인환자 우수기관. 소아치과·교정 전문. 외국인 주재원 가족 환영. EarlyMedi에서 예약.',
    seoTags: ['강남소아치과', '청담치과', '외국인치과', '어린이치과', '영어치과', 'English dentist Seoul', 'children dentist Korea', 'expat dental Seoul', '의료관광치과'],
    ogDescription: '강남 치과 | 영어 원어민 의료진·소아치과 전문·외국인 우수기관 — EarlyMedi',
    imageKeywords: ['CDC Children Dental Clinic Cheongdam', 'English pediatric dentist Seoul', 'kids dental Korea', 'CDC어린이치과 청담'],
  },
  {
    title: '강남젠틀치과의원',
    englishTitle: 'Gangnam Gentle Dental Clinic',
    slug: 'gangnam-gentle-dental-clinic-seocho',
    description:
      '신논현역 인근 태영데시앙루브빌딩 2층의 치과. 토·일 주말 진료와 야간 진료를 운영해 출장·관광 외국인에게 강점이 있다. 임플란트·교정·보철·치아미백·라미네이트·충치치료 진료. 영문 병원명·주소 병기로 외국인 접근성 우수. 영어 응대.',
    locationLabel: '서초 (신논현역)',
    address: '서울 서초구 강남대로 455 태영데시앙루브빌딩 2층',
    phone: '홈페이지 문의',
    nearestStation: '신논현역 인근',
    signatureProcedures: ['임플란트', '교정', '보철', '치아미백', '라미네이트', '충치치료'],
    procedureName: '임플란트·교정',
    promoLabel: '주말·야간 진료',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    sortOrder: 80,
    seoTitle: '강남젠틀치과 | 신논현역 주말·야간진료 치과 | EarlyMedi',
    seoDescription:
      '서초 강남대로 위치. 토·일 주말 진료·야간 진료. 임플란트·교정·보철 전문. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남치과', '신논현역치과', '주말진료치과', '야간진료치과', '임플란트', '교정', 'weekend dentist Seoul', 'Korea dental clinic', '외국인치과'],
    ogDescription: '서초 치과 | 신논현역·주말·야간 진료·임플란트·교정 전문 — EarlyMedi',
    imageKeywords: ['Gangnam Gentle Dental Clinic', 'weekend dental Seoul', 'Sinnonhyeon dental', '강남젠틀치과'],
  },
  {
    title: '드림치과 강남',
    englishTitle: 'Dream Dental Clinic Gangnam',
    slug: 'dream-dental-clinic-apgujeong',
    description:
      '압구정역 3번 출구, 드림성형외과·드림피부과와 동일 건물의 원스톱 메디컬 센터 치과. 성형+피부+치과 통합 케어가 가능해 한 번의 방한으로 여러 시술을 마치려는 외국인에게 최적이다. 임플란트·치아교정·라미네이트·치아미백·충치치료 진료. 강남구청 의료관광 협력기관, 다국어 응대 체계 보유. 영어·중국어·일어 응대.',
    locationLabel: '강남 신사동 (압구정역)',
    address: '서울 강남구 논현로 848 (신사동, 드림성형외과 동일 건물)',
    phone: '홈페이지 문의',
    nearestStation: '압구정역 3번 출구',
    signatureProcedures: ['임플란트', '치아교정', '라미네이트', '치아미백', '충치치료'],
    procedureName: '임플란트·라미네이트',
    promoLabel: '성형·피부·치과 원스톱',
    languagesSpoken: ['ko', 'en', 'zh', 'ja'],
    interpreterIncluded: true,
    sortOrder: 90,
    seoTitle: '드림치과 강남 | 압구정역 성형·피부·치과 원스톱 | EarlyMedi',
    seoDescription:
      '압구정역 3번 출구. 드림성형외과·드림피부과 동일 건물 원스톱. 임플란트·교정·라미네이트 전문. 영어·중국어·일어 상담. EarlyMedi에서 예약.',
    seoTags: ['강남치과', '압구정치과', '원스톱메디컬', '임플란트', '라미네이트', '외국인치과', 'Korea dental', 'one-stop medical Seoul', '의료관광치과'],
    ogDescription: '강남 치과 | 성형·피부·치과 원스톱·압구정역·다국어 응대 — EarlyMedi',
    imageKeywords: ['Dream Dental Clinic Apgujeong', 'one-stop medical building Gangnam', 'Nonhyeon-ro dental', '드림치과 압구정'],
  },
  {
    title: '유씨강남치과의원',
    englishTitle: 'UC Gangnam Dental Clinic',
    slug: 'uc-gangnam-dental-clinic',
    description:
      '강남구 의료관광 공식 협력기관으로 등재된 치과. 외국인 환자 유치 전문 시스템을 운영하며 강남메디컬투어센터 협력 의료기관이다. 임플란트·치아교정·보철·라미네이트·치아미백·일반치료 진료. 영어·중국어 응대. (정확 주소는 현장 확인 권장)',
    locationLabel: '강남 일대',
    address: '서울 강남구 유씨강남치과의원',
    phone: '홈페이지 문의',
    nearestStation: '강남 일대',
    signatureProcedures: ['임플란트', '치아교정', '보철', '라미네이트', '치아미백', '일반치료'],
    procedureName: '임플란트·치아교정',
    promoLabel: '의료관광 공식 협력기관',
    languagesSpoken: ['ko', 'en', 'zh'],
    interpreterIncluded: true,
    sortOrder: 100,
    seoTitle: '유씨강남치과 | 강남구 의료관광 협력 치과 | EarlyMedi',
    seoDescription:
      '강남구 의료관광 공식 협력기관. 임플란트·교정·라미네이트 전문. 영어·중국어 상담 가능. 외국인 환자 전문 시스템. EarlyMedi에서 예약.',
    seoTags: ['강남치과', '강남구의료관광', '임플란트', '치아교정', '라미네이트', '외국인치과', 'Korea dental tourism', 'Seoul dental clinic', '의료관광치과'],
    ogDescription: '강남 치과 | 의료관광 공식 협력기관·영어·중국어 응대 — EarlyMedi',
    imageKeywords: ['UC Gangnam Dental Clinic', 'Gangnam medical tour dental', 'dental tourism Korea', '유씨강남치과'],
  },
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
