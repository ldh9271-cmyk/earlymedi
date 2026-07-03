/**
 * 강남·서초 외국인 FIT 추천 안과 11곳 — founder 2026-07-03 큐레이션.
 *
 * 마스터 콘솔의 "안과 11종 일괄 등록" 버튼이 이 배열을 읽어 hospitals +
 * category_listings 에 카테고리='ophthalmology' 로 한 번에 insert.
 * partner_listings 에는 인서트하지 않음 (2026-06-25 정책).
 *
 * SEO 스킬 (`.claude/skills/seo/SKILL.md`) 규칙을 따라 각 행에 6종
 * SEO 필드를 채워 저장:
 *   - details.seoTitle       (60자 이하)
 *   - details.seoDescription (150자 이하)
 *   - details.seoTags        (5~10개)
 *   - details.englishTitle
 *   - details.ogDescription
 *   - details.imageKeywords  (사진 큐레이션 힌트)
 * hospitals.slug 는 SEO 슬러그를 직접 사용 (영문 소문자·하이픈).
 */

export type OphthalmologySeed = {
  title: string;
  englishTitle: string;
  slug: string;
  description: string;
  locationLabel: string;
  address: string;
  phone: string;
  nearestStation: string;
  signatureProcedures: ReadonlyArray<string>;
  /** 첫 대표시술 — HospitalFields.procedureName. */
  procedureName: string;
  openingYear?: number;
  promoLabel: string;
  /** 외국인 응대 언어 — hospitals.languagesSpoken 배열에 반영. */
  languagesSpoken: ReadonlyArray<'ko' | 'en' | 'zh' | 'ja' | 'ru' | 'ar'>;
  interpreterIncluded?: boolean;
  /** SEO 6종 */
  seoTitle: string;
  seoDescription: string;
  seoTags: ReadonlyArray<string>;
  ogDescription: string;
  /** 사진 큐레이션 힌트 (Google/Naver 검색용) */
  imageKeywords: ReadonlyArray<string>;
};

export const OPHTHALMOLOGY_PRODUCTS: ReadonlyArray<OphthalmologySeed> = [
  {
    title: '아이리움안과',
    englishTitle: 'Eyereum Eye Clinic',
    slug: 'eyereum-eye-clinic-gangnam',
    description:
      '2011년 개원한 강남역 직결 시력교정 전문 안과. 스마일프로를 국내 최초로 도입했으며 안과 관련 특허 6건을 보유. 세계안과학회 발표 경력 다수. 스마일라식·스마일프로·라식·라섹·ICL렌즈삽입술 등 시력교정 전 범위와 백내장·노안교정·원추각막 진료. 강남역 2번 출구 지하도 연결로 외국인 환자 접근성 최상, 영문 안내와 영어·중국어 상담 가능.',
    locationLabel: '강남',
    address: '서울특별시 강남구 강남대로 (강남센타빌딩) 7층',
    phone: '02-3420-2020',
    nearestStation: '강남역 2번 출구 (지하도 연결)',
    signatureProcedures: ['스마일라식', '스마일프로', '라식', '라섹', 'ICL렌즈삽입술', '백내장', '노안교정', '원추각막'],
    procedureName: '스마일프로·스마일라식·ICL',
    openingYear: 2011,
    promoLabel: '스마일프로 국내 최초 도입',
    languagesSpoken: ['ko', 'en', 'zh'],
    interpreterIncluded: true,
    seoTitle: '아이리움안과 | 강남 스마일라식·ICL 전문 | EarlyMedi',
    seoDescription:
      '강남역 2번 출구 직결. 스마일프로 국내 최초 도입, ICL렌즈삽입술 전문. 영어·중국어 상담 가능. EarlyMedi에서 예약 상담.',
    seoTags: ['강남안과', '강남스마일라식', 'ICL렌즈삽입술', '스마일프로', '강남역안과', 'Korea eye clinic', 'LASIK Korea', 'Seoul eye surgery', '외국인안과'],
    ogDescription: '강남 안과 | 스마일프로 최초 도입, ICL·라섹 전문 — EarlyMedi',
    imageKeywords: ['Eyereum Eye Clinic Gangnam', 'SMILE Pro LASIK Korea', 'ICL Gangnam Station', '아이리움안과 강남'],
  },
  {
    title: '비앤빛 강남밝은세상안과',
    englishTitle: 'B&VIIT Gangnam Bright World Eye Clinic',
    slug: 'bnviit-gangnam-bright-eye-clinic',
    description:
      '1994년 개원한 시력교정 1세대 병원. 2011년 국내 최초로 JCI 국제인증을 획득한 안과이며 시력교정 누적 47만 안. AI 기반 수술 가능 여부·결과 예측 시스템을 자체 운영. 스마일라식·라식·라섹·ICL·백내장·노안교정·드림렌즈까지 전 범위 진료. 강남구청 의료관광 공식 등재, 영어·중국어·일어 3개국어 상담 가능.',
    locationLabel: '서초 강남역',
    address: '서울특별시 서초구 서초대로 411 GT타워 지하2층 (서초동 1317-23)',
    phone: '홈페이지 문의',
    nearestStation: '강남역 9번 출구 앞 50m',
    signatureProcedures: ['스마일라식', '라식', '라섹', 'ICL', '백내장', '노안교정', '드림렌즈'],
    procedureName: '스마일라식·ICL·백내장',
    openingYear: 1994,
    promoLabel: 'JCI 국제인증·47만 안 시술',
    languagesSpoken: ['ko', 'en', 'zh', 'ja'],
    interpreterIncluded: true,
    seoTitle: '비앤빛강남밝은세상안과 | JCI인증 강남 라식 전문 | EarlyMedi',
    seoDescription:
      '1994년 개원, 국내 최초 JCI 국제인증 안과. 47만 안 시술 경험. 강남역 9번 출구 50m. 영어·중국어·일어 상담 가능. EarlyMedi에서 예약 상담.',
    seoTags: ['강남안과', 'JCI인증안과', '강남밝은세상안과', '비앤빛', '라식강남', '라섹강남', 'Korea LASIK', 'JCI certified eye clinic', 'Seoul medical tourism', '외국인안과'],
    ogDescription: '강남 안과 | 1994년 개원·JCI 국제인증·47만 안 경험 — EarlyMedi',
    imageKeywords: ['B&VIIT Eye Clinic Gangnam', 'JCI certified Korea eye', 'GT Tower Seocho', '강남밝은세상안과'],
  },
  {
    title: '강남서울밝은안과',
    englishTitle: 'Gangnam Seoul Bright Eye Clinic',
    slug: 'gangnam-seoul-bright-eye-clinic',
    description:
      '2008년 개원한 강남역 직결 안과. 평균 경력 18년 이상의 안과 전문의 3인 체제로 1:1 담당 집도의 관리 시스템 운영. 대학병원급 75가지 정밀 안검진, 카탈리스 레이저·자이스스마일 등 첨단 장비 보유. 스마일라식·아이디자인라식·라섹·ICL렌즈삽입술·레이저백내장·노안교정 진료. 영어 상담 가능.',
    locationLabel: '강남',
    address: '서울특별시 강남구 강남대로 390 미진프라자 18층 (역삼동 825)',
    phone: '홈페이지 문의',
    nearestStation: '강남역 1번 출구 도보 2분',
    signatureProcedures: ['스마일라식', '아이디자인라식', '라섹', 'ICL렌즈삽입술', '레이저백내장', '노안교정'],
    procedureName: '스마일라식·아이디자인라식·ICL',
    openingYear: 2008,
    promoLabel: '18년 경력 전문의 1:1 담당',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '강남서울밝은안과 | 강남역 스마일라식·ICL 전문 | EarlyMedi',
    seoDescription:
      '강남역 1번 출구 도보 2분. 평균 경력 18년 전문의, 75가지 정밀 검진. 1:1 맞춤 케어. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남안과', '강남역안과', '스마일라식', '아이디자인라식', 'ICL', 'Korea eye surgery', 'Seoul LASIK', '외국인안과', '강남시력교정'],
    ogDescription: '강남 안과 | 18년 경력 전문의·75종 정밀검진·1:1 맞춤 케어 — EarlyMedi',
    imageKeywords: ['Gangnam Seoul Bright Eye', 'Mijin Plaza 18F Yeoksam', '강남서울밝은안과'],
  },
  {
    title: '수연세안과',
    englishTitle: 'Suyonsei Eye Clinic',
    slug: 'suyonsei-eye-clinic-seocho',
    description:
      '원추각막 치료 국내 최다 증례를 보유한 서초 W타워 5층 시력교정 전문 안과 (인택스 수술 공식 인증). 아마리스 레드·EX500·비쥬맥스 3대 장비를 동시 보유해 초고도 근시·원추각막에 특화. 사전 예약제로 대기시간 최소화. 초고도라섹·라식·스마일라식·ICL·원추각막 치료·노안·백내장 진료, 영어 상담 가능.',
    locationLabel: '서초 강남',
    address: '서울특별시 서초구 서초대로77길 54 서초W타워 5층 (서초동 1303-37)',
    phone: '02-2258-0077',
    nearestStation: '신논현역 7·8번 출구 · 강남역 10번 출구 (W타워 1층 무신사 골목)',
    signatureProcedures: ['초고도라섹', '라식', '스마일라식', 'ICL렌즈삽입술', '원추각막 치료', '노안', '백내장'],
    procedureName: '원추각막 치료·초고도근시 라섹',
    promoLabel: '원추각막 국내 최다 증례',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '수연세안과 | 강남 원추각막·초고도근시 전문 | EarlyMedi',
    seoDescription:
      '원추각막 국내 최다 증례. 초고도근시 라섹·스마일라식 특화. 신논현역 7번 출구 도보 5분. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남안과', '원추각막치료', '초고도근시라섹', '수연세안과', '신논현안과', 'keratoconus Korea', 'LASEK Korea', 'Seoul eye clinic', '외국인안과'],
    ogDescription: '서초 안과 | 원추각막 국내 최다 증례·초고도근시 라섹 특화 — EarlyMedi',
    imageKeywords: ['Suyonsei Eye Clinic Seocho', 'keratoconus Korea center', 'Seocho W Tower', '수연세안과'],
  },
  {
    title: 'SNU안과',
    englishTitle: 'SNU Eye Clinic',
    slug: 'snu-eye-clinic-gangnam',
    description:
      '국내 스마일라식을 최초로 집도한 강남 신사동 안과. 스마일 계열 시술에 특화되어 있으며, 노안·백내장 수술을 직접 받아본 안과 전문의가 집도하는 것이 특징. 최첨단 장비를 기반으로 정밀 시력교정을 제공. 스마일라식·스마일프로·ICL·노안·백내장·원추각막·망막질환 진료, 영어 상담 가능.',
    locationLabel: '강남 신사',
    address: '서울특별시 강남구 강남대로 624 ICT타워 3층 (신사동)',
    phone: '02-548-0201',
    nearestStation: '신사역 인근',
    signatureProcedures: ['스마일라식', '스마일프로', 'ICL렌즈삽입술', '노안', '백내장', '원추각막', '망막질환'],
    procedureName: '스마일라식·ICL·노안',
    promoLabel: '스마일라식 국내 최초 집도',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: 'SNU안과 | 스마일라식 최초 집도·강남 ICL 전문 | EarlyMedi',
    seoDescription:
      '국내 스마일라식 최초 집도 병원. ICL렌즈삽입술·노안·백내장 전문. 강남 신사역 인근. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남안과', '스마일라식', 'SNU안과', 'ICL렌즈삽입술', '신사역안과', 'SMILE LASIK Korea', 'Seoul eye surgery', '외국인안과', '강남시력교정'],
    ogDescription: '강남 안과 | 스마일라식 국내 최초·ICL·노안백내장 전문 — EarlyMedi',
    imageKeywords: ['SNU Eye Clinic Sinsa', 'SMILE LASIK first Korea', 'ICT Tower 3F', 'SNU안과 신사'],
  },
  {
    title: '강남이오스안과',
    englishTitle: 'Gangnam EOS Eye Clinic',
    slug: 'gangnam-eos-eye-clinic-seocho',
    description:
      '"의료진이 선택한 안과"로 유명한 서초 삼성화재 서초사옥 18~20층 3개 층 대규모 안과. 가톨릭대 의과대학 출신 대표원장이 진료하며 ICL 안내렌즈삽입술·백내장·망막질환·시력교정에 특화. 정밀 진단 중심의 진료 스타일. 영어 상담 가능.',
    locationLabel: '서초 강남',
    address: '서울특별시 서초구 강남대로 355 삼성화재 서초사옥 18~20층 (서초동 1329)',
    phone: '홈페이지 문의',
    nearestStation: '강남역·교대역 인근',
    signatureProcedures: ['ICL 안내렌즈삽입술', '백내장', '망막질환', '시력교정'],
    procedureName: 'ICL·백내장·망막질환',
    promoLabel: '18~20층 3개층 규모',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '강남이오스안과 | 서초 ICL·백내장·망막 전문 | EarlyMedi',
    seoDescription:
      '서초 삼성화재 사옥 18~20층. ICL 렌즈삽입술·백내장·망막질환 전문. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['서초안과', '강남안과', 'ICL렌즈삽입술', '백내장수술', '망막질환', '이오스안과', 'ICL Korea', 'Seoul cataract surgery', '외국인안과'],
    ogDescription: '서초 안과 | ICL·백내장·망막질환 전문·3개층 규모 — EarlyMedi',
    imageKeywords: ['Gangnam EOS Eye Clinic', 'Samsung Fire Seocho building', '강남이오스안과'],
  },
  {
    title: '강남그랜드안과',
    englishTitle: 'Gangnam Grand Eye Clinic',
    slug: 'gangnam-grand-eye-clinic',
    description:
      '강남역 5번 출구 바로 앞 초역세권 강남타워 4·5층 안과. 당일 라섹(투데이라섹)을 운영하며 안과 전문의 2인 상주로 야간 진료 가능. 컨투라비전 난시 특화. 스마일라식·라섹·투데이라섹·ICL·컨투라비전·백내장·노안교정·퍼스널아이즈 진료, 영어 상담 가능.',
    locationLabel: '강남',
    address: '서울특별시 서초구 강남대로 369 강남타워 4·5층',
    phone: '홈페이지 문의',
    nearestStation: '강남역 5번 출구 바로 앞',
    signatureProcedures: ['스마일라식', '라섹', '투데이라섹', 'ICL', '컨투라비전', '백내장', '노안교정', '퍼스널아이즈'],
    procedureName: '투데이라섹·스마일라식·ICL',
    promoLabel: '당일 라섹·야간 진료',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '강남그랜드안과 | 강남역 라식·야간진료 안과 | EarlyMedi',
    seoDescription:
      '강남역 5번 출구 바로 앞. 당일 라섹(투데이라섹)·야간 진료. 스마일라식·ICL·컨투라비전 특화. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남안과', '강남역안과', '투데이라섹', '야간진료안과', '스마일라식', '컨투라비전', 'same-day LASEK Korea', 'Seoul eye clinic', '외국인안과'],
    ogDescription: '강남 안과 | 강남역 5번출구 바로 앞·당일라섹·야간진료 — EarlyMedi',
    imageKeywords: ['Gangnam Grand Eye Clinic', 'same-day LASEK Korea', 'Gangnam Tower 4F', '강남그랜드안과'],
  },
  {
    title: '서울밝은세상안과 강남점',
    englishTitle: 'Seoul Bright World Eye Clinic Gangnam',
    slug: 'seoul-bright-world-eye-clinic-gangnam',
    description:
      '1997년 개원, 국내 최초 JCI 인증 안과로 누적 시술 35만 안. C-Near 노안라식을 개발한 병원이며 9종 17대 첨단 레이저(All Laser System)를 보유. 3D 스마일엣지·아쿠아ICL·수직형 난시교정 ICL·노안·백내장·라식·라섹 진료. 강남구청 의료관광 협력기관, 영어·중국어·일어·러시아어 4개국어 상담 가능.',
    locationLabel: '강남',
    address: '서울특별시 강남구 (강남구 의료관광 공식 협력기관)',
    phone: '홈페이지 문의',
    nearestStation: '강남권',
    signatureProcedures: ['3D 스마일엣지', 'ICL(아쿠아ICL·수직형난시교정ICL)', '노안라식', '백내장', '라식', '라섹'],
    procedureName: '3D 스마일엣지·ICL·노안라식',
    openingYear: 1997,
    promoLabel: 'JCI인증·4개국어 응대',
    languagesSpoken: ['ko', 'en', 'zh', 'ja', 'ru'],
    interpreterIncluded: true,
    seoTitle: '서울밝은세상안과 | JCI인증·강남 시력교정 1세대 | EarlyMedi',
    seoDescription:
      '1997년 개원. JCI 국제인증, 35만 안 누적. 3D 스마일엣지·ICL·노안라식 전문. 영어·중국어·일어·러시아어 상담. EarlyMedi에서 예약.',
    seoTags: ['강남안과', 'JCI인증', '밝은세상안과', 'ICL', '3D스마일라식', '노안라식', 'Korea vision correction', 'JCI eye clinic Seoul', '의료관광안과', '외국인안과'],
    ogDescription: '강남 안과 | JCI인증·35만 안 시술·4개국어 응대 — EarlyMedi',
    imageKeywords: ['Seoul Bright World Eye Gangnam', 'JCI eye clinic Korea', 'C-Near presbyopia LASIK', '서울밝은세상안과'],
  },
  {
    title: '강남서울밝은안과(의료관광)',
    englishTitle: 'Gangnam Seoul Bright Eye — Medical Tourism',
    slug: 'gangnam-seoul-bright-eye-medical-tourism',
    description:
      '강남구청 의료관광 공식 협력기관 지정 안과. 박형직·박혜영·한은령 3인 대표원장 체제로 각 원장이 시력교정 수술 2만 회 이상 집도. STAAR社 ICL Expert Surgeon 인증, 서울아산병원·한림대 강동성심병원 교수 역임 경력. 스마일라식·ICL·백내장·노안교정 진료, 영어 상담 가능.',
    locationLabel: '강남 (의료관광 협력)',
    address: '서울특별시 강남구 강남대로 390 미진프라자 18층',
    phone: '홈페이지 문의',
    nearestStation: '강남역 1번 출구',
    signatureProcedures: ['스마일라식', 'ICL', '백내장', '노안교정'],
    procedureName: 'ICL Expert·스마일라식·백내장',
    promoLabel: '강남구 의료관광 협력',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '강남서울밝은안과 | 강남구 의료관광 협력 안과 | EarlyMedi',
    seoDescription:
      '강남구 의료관광 공식 협력기관. 스마일라식·ICL·백내장·노안 전문. 3인 대표원장 각 2만 회 이상 집도. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남안과', '강남구의료관광', '스마일라식', 'ICL Expert Surgeon', '백내장', 'Korea eye clinic', 'Seoul medical tourism', '외국인안과'],
    ogDescription: '강남 안과 | 의료관광 공식 협력기관·3인 전문의 각 2만 회 집도 — EarlyMedi',
    imageKeywords: ['Gangnam Seoul Bright Eye medical tourism', 'STAAR ICL Expert Surgeon', 'Mijin Plaza 18F', '강남서울밝은안과 의료관광'],
  },
  {
    title: '삼성서울병원 안과',
    englishTitle: 'Samsung Medical Center Ophthalmology',
    slug: 'samsung-medical-center-ophthalmology-gangnam',
    description:
      '국내 최고 수준의 종합병원 안과. 국제진료센터를 운영하며 영어·중국어·일어·러시아어·아랍어 5개국어 통역이 상주. 외국인 전용 원스톱 진료 시스템 보유. 망막·녹내장·백내장·각막·사시·소아안과·성형안과·시력교정 전 분야를 진료하며, 특히 복잡한 안과 질환·수술 후 합병증·재수술에 특화.',
    locationLabel: '강남 일원',
    address: '서울특별시 강남구 일원로 81 (일원동)',
    phone: '1599-3114',
    nearestStation: '수서역·일원역 인근',
    signatureProcedures: ['망막', '녹내장', '백내장', '각막', '사시', '소아안과', '성형안과', '시력교정 전 분야'],
    procedureName: '망막·녹내장·백내장 종합',
    promoLabel: '5개국어 통역 상주',
    languagesSpoken: ['ko', 'en', 'zh', 'ja', 'ru', 'ar'],
    interpreterIncluded: true,
    seoTitle: '삼성서울병원 안과 | 강남 종합병원 국제진료 | EarlyMedi',
    seoDescription:
      '국내 최고 수준 안과 종합병원. 5개국어 통역 상주. 망막·녹내장·백내장·각막 전 분야. 외국인 원스톱 진료. EarlyMedi에서 예약.',
    seoTags: ['강남안과', '삼성서울병원', '종합병원안과', '외국인안과', '국제진료', '망막치료', '백내장', 'Samsung Medical Center', 'Seoul hospital', 'Korea medical tourism'],
    ogDescription: '강남 안과 | 삼성서울병원·5개국어 통역·전 분야 종합 — EarlyMedi',
    imageKeywords: ['Samsung Medical Center Ophthalmology', 'International Health Services Seoul', 'Ilwon Samsung hospital', '삼성서울병원 안과'],
  },
  {
    title: '강남밝은미소안과',
    englishTitle: 'Gangnam Bright Smile Eye Clinic',
    slug: 'gangnam-bright-smile-eye-clinic',
    description:
      '강남역 11번 출구 도보 2분 YBM강남센터 3층 안과. 대학병원 출신 대표원장 직접 집도와 대학병원급 최첨단 장비·검진 시스템 도입. 다수 제조사 임상자문병원으로 선정된 이력, 293개 인증 리뷰 보유. 철저한 사전 검사 및 사후 관리를 강조하며 합리적 비용으로 가족 단위 외국인 환자에게 적합. 스마일라식·라식·라섹·ICL렌즈삽입술·노안교정·백내장·안구건조증 진료, 영어 상담 가능. 진료시간: 월·화·목 10:00~18:30 · 금 10:00~19:00 · 토 9:30~16:00 (수·일·공휴일 휴무).',
    locationLabel: '강남',
    address: '서울특별시 강남구 강남대로 408 YBM강남센터 3층 (역삼동)',
    phone: '1544-2271',
    nearestStation: '강남역 11번 출구 도보 2분',
    signatureProcedures: ['스마일라식', '라식', '라섹', 'ICL렌즈삽입술', '노안교정', '백내장', '안구건조증'],
    procedureName: '스마일라식·ICL·노안',
    promoLabel: '대학병원 출신 원장 직접 집도',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '강남밝은미소안과 | 강남역 스마일라식·ICL·노안 전문 | EarlyMedi',
    seoDescription:
      '강남역 11번 출구 도보 2분. 대학병원 출신 원장 직접 집도. 스마일라식·ICL·백내장·노안 전문. 철저한 사전검사·사후관리. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남안과', '강남역안과', '스마일라식', 'ICL렌즈삽입술', '노안교정', '백내장', '안구건조증', 'Korea LASIK', 'Seoul eye clinic', '외국인안과'],
    ogDescription: '강남 안과 | 대학병원 출신 원장 직접 집도·스마일라식·ICL 전문 — EarlyMedi',
    imageKeywords: ['Gangnam Bright Smile Eye Clinic', 'YBM Gangnam Center 3F', '강남밝은미소안과'],
  },
];
