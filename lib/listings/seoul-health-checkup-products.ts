/**
 * 서울 외국인 FIT 추천 건강검진 병원/센터 12곳 — founder 2026-07-24 큐레이션.
 *
 * 마스터 콘솔의 "건강검진 12종 일괄 등록" 버튼이 이 배열을 읽어
 * hospitals + category_listings + hospital_locale_content(KR/EN) 에
 * 카테고리='health_checkup' (공개 /kr/clinics 칩 키와 동일) 로 upsert.
 * partner_listings 인서트는 없음.
 *
 * 브랜드명: 이 시드부터 SEO 요소의 브랜드가 "GlowUpTour" (기존
 * EarlyMedi → 도메인 이전에 따른 리브랜딩, 2026-07-24 사용자 지정).
 *
 * 셀러블153강남의원은 성형외과·피부과 시드와 별도 슬러그
 * (`cellable153-gangnam-health-checkup`)로 건강검진 특화 프로필 생성.
 */

export type HealthCheckupSeed = {
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
  promoLabel: string;
  languagesSpoken: ReadonlyArray<'ko' | 'en' | 'zh' | 'ja' | 'ru' | 'ar' | 'mn' | 'vi'>;
  interpreterIncluded?: boolean;
  /** SEO 6종 — 브랜드 GlowUpTour */
  seoTitle: string;
  seoDescription: string;
  seoTags: ReadonlyArray<string>;
  ogDescription: string;
  imageKeywords: ReadonlyArray<string>;
};

export const HEALTH_CHECKUP_PRODUCTS: ReadonlyArray<HealthCheckupSeed> = [
  // ── 필수 등록 6곳 ────────────────────────────────────────────────
  {
    title: '서울아산병원 건강증진센터',
    englishTitle: 'Asan Medical Center Health Screening & Promotion Center',
    slug: 'asan-medical-center-health-screening',
    description:
      '국내 최대 규모(2,432병상) 병원의 건강검진센터. 국제진료센터 연계로 중국·러시아·일본·중동·몽골·베트남 원어민 코디네이터가 상주. 기본종합검진·암정밀·심뇌혈관 정밀·프리미엄·숙박검진·청소년 프로그램 운영. 검진 이상 소견 발견 시 아산병원 외래로 즉시 연계되는 해외 환자 원스톱 검진 시스템. 잠실나루역 인근, 셔틀 운영.',
    locationLabel: '서울 송파',
    address: '서울특별시 송파구 올림픽로43길 88',
    phone: '1688-7575',
    nearestStation: '잠실나루역 인근 (셔틀 운영)',
    signatureProcedures: ['기본종합검진', '암정밀검진', '심뇌혈관 정밀검진', '프리미엄 검진', '숙박검진', '청소년 프로그램'],
    procedureName: '종합검진·암정밀·숙박검진',
    promoLabel: '국내 최대·7개국어 코디네이터',
    languagesSpoken: ['ko', 'en', 'zh', 'ja', 'ru', 'ar', 'mn', 'vi'],
    interpreterIncluded: true,
    seoTitle: '서울아산병원 건강증진센터 | 국내 최대 종합검진 | GlowUpTour',
    seoDescription:
      '국내 최대 병원 검진센터. 7개국어 코디네이터 상주. 암·심뇌혈관 정밀검진, 숙박검진. 이상 소견 즉시 외래 연계. GlowUpTour에서 예약.',
    seoTags: ['서울아산병원', '종합건강검진', '외국인건강검진', '암정밀검진', '숙박검진', 'Korea health checkup', 'Asan Medical Center', 'medical tourism Korea', '국제진료'],
    ogDescription: '건강검진 | 서울아산병원·국내 최대 규모·7개국어 원스톱 — GlowUpTour',
    imageKeywords: ['Asan Medical Center health screening', 'largest hospital Korea checkup', 'Jamsillnaru health center', '서울아산병원 건강증진센터'],
  },
  {
    title: '삼성서울병원 건강의학본부',
    englishTitle: 'Samsung Medical Center Health Promotion Center',
    slug: 'samsung-medical-center-health-checkup',
    description:
      '강남권 대표 종합병원 검진센터. 국제진료센터 연계 5개국어 통역 상주. PET-CT·3T MRI 등 최첨단 영상장비 기반 정밀 검진. 종합검진·암정밀·심장정밀·뇌정밀·프리미엄·VIP 숙박검진 운영. 검진-진료-치료 원스톱, 외국인 환자 전용 프로그램 보유. 수서역·일원역 인근.',
    locationLabel: '강남 일원',
    address: '서울특별시 강남구 일원로 81 (일원동)',
    phone: '1599-3114',
    nearestStation: '수서역 · 일원역',
    signatureProcedures: ['종합검진', '암정밀검진', '심장정밀검진', '뇌정밀검진', '프리미엄 검진', 'VIP 숙박검진'],
    procedureName: '종합검진·PET-CT·MRI 정밀',
    promoLabel: '5개국어 통역·검진-치료 원스톱',
    languagesSpoken: ['ko', 'en', 'zh', 'ja', 'ru', 'ar'],
    interpreterIncluded: true,
    seoTitle: '삼성서울병원 건강의학본부 | 강남 프리미엄 종합검진 | GlowUpTour',
    seoDescription:
      '강남 일원동. 5개국어 통역 상주. PET-CT·MRI 정밀검진. 검진-치료 원스톱. 외국인 전용 프로그램. GlowUpTour에서 예약.',
    seoTags: ['삼성서울병원', '강남건강검진', '종합검진', '암정밀검진', '외국인건강검진', 'Samsung Medical Center checkup', 'Korea premium health screening', '국제진료'],
    ogDescription: '강남 건강검진 | 삼성서울병원·5개국어·정밀 영상검진 — GlowUpTour',
    imageKeywords: ['Samsung Medical Center health promotion', 'PET-CT MRI screening Korea', 'Ilwon premium checkup', '삼성서울병원 건강의학본부'],
  },
  {
    title: '서울성모병원 평생건강증진센터',
    englishTitle: "Seoul St. Mary's Hospital Health Promotion Center",
    slug: 'seoul-st-marys-health-promotion-center',
    description:
      '가톨릭대학교 의과대학 부속 상급종합병원의 검진센터. 국제진료센터 보유. 고속터미널역 접근성 최상으로 JW메리어트 등 인근 호텔 숙박 외국인에게 최적. 종합검진·암정밀·심혈관정밀·소화기정밀·프리미엄 검진 운영, 검진 후 서울성모병원 각 과 즉시 연계. 셔틀버스 운영, 영어·중국어·일어 응대.',
    locationLabel: '서초 반포',
    address: '서울특별시 서초구 반포대로 222',
    phone: '1588-1511',
    nearestStation: '고속터미널역 3번 출구 · 서초역 7번 출구 (셔틀버스 운영)',
    signatureProcedures: ['종합검진', '암정밀검진', '심혈관정밀검진', '소화기정밀검진', '프리미엄 검진'],
    procedureName: '종합검진·암·심혈관 정밀',
    promoLabel: '상급종합병원·호텔 인접',
    languagesSpoken: ['ko', 'en', 'zh', 'ja'],
    interpreterIncluded: true,
    seoTitle: '서울성모병원 평생건강증진센터 | 서초 종합검진 | GlowUpTour',
    seoDescription:
      '고속터미널역 인근. 가톨릭대 상급종합병원 검진센터. 암·심혈관·소화기 정밀검진. 영어·중국어·일어 응대. GlowUpTour에서 예약.',
    seoTags: ['서울성모병원', '서초건강검진', '종합검진', '고속터미널검진', '암정밀검진', 'St Marys hospital checkup', 'Korea health screening', '외국인건강검진'],
    ogDescription: '서초 건강검진 | 서울성모병원·상급종합병원·호텔 인접 — GlowUpTour',
    imageKeywords: ["Seoul St Mary's health promotion center", 'Express Bus Terminal hospital', 'Banpo checkup center', '서울성모병원 평생건강증진센터'],
  },
  {
    title: '중앙대학교병원 건강증진센터',
    englishTitle: 'Chung-Ang University Hospital Health Promotion Center',
    slug: 'chung-ang-university-hospital-checkup',
    description:
      '대학병원급 검진 인프라를 합리적 비용으로 제공하는 흑석동 검진센터. 9호선 급행으로 강남권 접근 용이. 국제진료소 운영으로 외국인 검진 상담 가능. 종합검진·암정밀·심뇌혈관·소화기 정밀·공단검진 운영. K메디컬투어 협력 검진기관. 영어·중국어 상담 가능.',
    locationLabel: '서울 동작 흑석',
    address: '서울특별시 동작구 흑석로 102 (흑석동)',
    phone: '1800-1114',
    nearestStation: '흑석역 (9호선) — 강남·서초 접근 편리',
    signatureProcedures: ['종합검진', '암정밀검진', '심뇌혈관 정밀검진', '소화기 정밀검진', '공단검진'],
    procedureName: '대학병원 종합검진',
    promoLabel: 'K메디컬투어 협력기관',
    languagesSpoken: ['ko', 'en', 'zh'],
    interpreterIncluded: true,
    seoTitle: '중앙대학교병원 건강증진센터 | 대학병원 종합검진 | GlowUpTour',
    seoDescription:
      '흑석역 인근, 9호선 강남 접근 용이. 대학병원급 암·심뇌혈관 정밀검진. 합리적 비용. 영어·중국어 상담. GlowUpTour에서 예약.',
    seoTags: ['중앙대병원', '대학병원검진', '종합건강검진', '암정밀검진', '외국인건강검진', 'Chung-Ang University Hospital', 'Korea university hospital checkup', '국제진료'],
    ogDescription: '건강검진 | 중앙대병원·대학병원급·합리적 비용 — GlowUpTour',
    imageKeywords: ['Chung-Ang University Hospital checkup', 'Heukseok station hospital', 'university hospital screening Korea', '중앙대병원 건강증진센터'],
  },
  {
    title: '강남세브란스병원 헬스체크업',
    englishTitle: 'Gangnam Severance Hospital Health Checkup',
    slug: 'gangnam-severance-health-checkup',
    description:
      '연세대학교 의과대학 부속 프리미엄 검진센터. 스탠다드·프리미엄(남 498만원/여 494만원)·노블레스(복부MRI·심장CT)·국내 최초 신체디자인 검진(운동처방 연계) 운영. 외국인 전용 영문 브로셔와 국제수가 체계 완비, 검진 후 세브란스 진료 연계. 도곡동 매봉역·한티역 인근.',
    locationLabel: '강남 도곡',
    address: '서울특별시 강남구 언주로 211 (도곡동)',
    phone: '1599-6114',
    nearestStation: '매봉역 · 한티역 인근',
    signatureProcedures: ['스탠다드 검진', '프리미엄 검진', '노블레스 검진(복부MRI·심장CT)', '신체디자인 검진'],
    procedureName: '프리미엄·노블레스 MRI 검진',
    promoLabel: '국내 최초 신체디자인 검진',
    languagesSpoken: ['ko', 'en', 'zh', 'ja'],
    interpreterIncluded: true,
    seoTitle: '강남세브란스 헬스체크업 | 강남 프리미엄 검진 | GlowUpTour',
    seoDescription:
      '도곡동. 연세대 의대 프리미엄 검진. 노블레스 MRI 검진·신체디자인 프로그램. 영문 브로셔 완비. GlowUpTour에서 예약.',
    seoTags: ['강남세브란스', '강남건강검진', '프리미엄검진', '노블레스검진', '외국인건강검진', 'Severance health checkup', 'Korea premium screening', '국제수가'],
    ogDescription: '강남 건강검진 | 강남세브란스·프리미엄·영문 프로그램 완비 — GlowUpTour',
    imageKeywords: ['Gangnam Severance health checkup', 'noblesse MRI screening', 'body design program Korea', '강남세브란스 헬스체크업'],
  },
  {
    title: '강남웰니스건강검진센터',
    englishTitle: 'Gangnam Wellness Health Checkup Center',
    slug: 'gangnam-wellness-health-checkup-center',
    description:
      '언주역 인근 원에디션 지하1층의 프리미엄 맞춤검진 센터. 서울대 의대 출신·분당서울대병원 임상교수 출신 원장이 운영하며 소화기내시경 세부전문의가 직접 검사. 검진+에스테틱+피트니스 통합 케어, JTBC 방송 출연. 기본검진(위내시경+상복부초음파)·스마트·프리미엄(유전자검사 포함)·개인·가족 맞춤 패키지·국가검진 운영. 영어 상담 가능.',
    locationLabel: '강남 역삼',
    address: '서울특별시 강남구 언주로 563 원에디션 지하1층 (역삼동 653-4)',
    phone: '02-6958-7590',
    nearestStation: '언주역 380m · 학동역 인근',
    signatureProcedures: ['기본검진(위내시경+상복부초음파)', '스마트 검진', '프리미엄 검진(유전자검사)', '맞춤 패키지', '국가검진'],
    procedureName: '맞춤 검진·유전자검사',
    promoLabel: '검진+에스테틱+피트니스 통합',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '강남웰니스건강검진센터 | 언주역 프리미엄 맞춤검진 | GlowUpTour',
    seoDescription:
      '언주역 인근 원에디션. 서울대 출신 전문의. 검진+에스테틱+피트니스 통합. 유전자검사 프리미엄 프로그램. 영어 상담. GlowUpTour에서 예약.',
    seoTags: ['강남건강검진', '언주역검진', '프리미엄검진', '맞춤형검진', '유전자검사', 'wellness checkup Korea', 'Gangnam health screening', '외국인건강검진'],
    ogDescription: '강남 건강검진 | 웰니스 통합케어·서울대 출신·맞춤 설계 — GlowUpTour',
    imageKeywords: ['Gangnam Wellness checkup center', 'One Edition Eonju station', 'genetic test screening Korea', '강남웰니스건강검진'],
  },
  // ── 추천 등록 6곳 (강남·서초) ─────────────────────────────────────
  {
    title: '서울대학교병원 강남센터',
    englishTitle: 'SNUH Gangnam Healthcare Center',
    slug: 'snuh-gangnam-healthcare-center',
    description:
      '서울대학교병원 직영 검진센터. 역삼역 2번 출구 직결 강남파이낸스센터 38~40층 최상층 시티뷰. 연 45,000명 내원. 국제진료팀 1:1 상담과 전문 코디네이터 에스코트로 외국인 특화 시스템 운영. 기본·암정밀·프리미엄·맞춤 검진 프로그램. 강남구 의료관광 공식 협력기관.',
    locationLabel: '강남 역삼',
    address: '서울특별시 강남구 테헤란로 152 강남파이낸스센터 38~40층 (역삼동)',
    phone: '02-2112-5500',
    nearestStation: '역삼역 2번 출구 직결',
    signatureProcedures: ['기본 검진', '암정밀검진', '프리미엄 검진', '맞춤 검진'],
    procedureName: '프리미엄·맞춤 검진',
    promoLabel: '서울대병원 직영·역삼역 직결',
    languagesSpoken: ['ko', 'en', 'zh', 'ja'],
    interpreterIncluded: true,
    seoTitle: '서울대병원 강남센터 | 역삼역 직결 프리미엄 검진 | GlowUpTour',
    seoDescription:
      '역삼역 직결 강남파이낸스센터. 서울대병원 직영. 외국인 1:1 코디네이터 에스코트. 연 4.5만 명 검진. GlowUpTour에서 예약.',
    seoTags: ['서울대병원강남센터', '강남건강검진', '역삼역검진', '프리미엄검진', '외국인건강검진', 'SNUH Gangnam', 'Korea executive checkup', '의료관광검진'],
    ogDescription: '강남 건강검진 | 서울대병원 직영·역삼역 직결·외국인 에스코트 — GlowUpTour',
    imageKeywords: ['SNUH Gangnam Healthcare Center', 'Gangnam Finance Center 38F', 'executive checkup Seoul', '서울대병원 강남센터'],
  },
  {
    title: '차움',
    englishTitle: 'Chaum Life Center',
    slug: 'chaum-life-center-cheongdam',
    description:
      '차병원그룹의 청담동 프리미엄 라이프센터. 독립된 개인 전용공간(HIVE)에서 명의와 장비가 직접 찾아가는 VIP 검진 시스템. 프리미엄 개인검진·암정밀·뇌정밀·심장정밀·치매특화·항노화 검진 운영. 검진+항노화+한의학 통합, 글로벌 셀럽·VIP 외국인 다수 이용, 호텔급 인테리어. 영어·중국어·일어·러시아어 응대.',
    locationLabel: '강남 청담',
    address: '서울특별시 강남구 도산대로 442 피엔폴루스 빌딩 2·3층 (청담동 4-1)',
    phone: '02-3015-5000',
    nearestStation: '청담역 · 압구정로데오역 인근',
    signatureProcedures: ['프리미엄 개인검진(HIVE)', '암정밀검진', '뇌정밀검진', '심장정밀검진', '치매특화 검진', '항노화 검진'],
    procedureName: 'HIVE VIP 검진·항노화',
    promoLabel: '개인전용 HIVE·VIP 특화',
    languagesSpoken: ['ko', 'en', 'zh', 'ja', 'ru'],
    interpreterIncluded: true,
    seoTitle: '차움 | 청담 VIP 프리미엄 검진·항노화 | GlowUpTour',
    seoDescription:
      '청담동. 차병원그룹 프리미엄. 개인전용공간 HIVE VIP 검진. 항노화·치매특화. 글로벌 VIP 특화. 다국어 응대. GlowUpTour에서 예약.',
    seoTags: ['차움', '청담건강검진', 'VIP검진', '프리미엄검진', '항노화검진', 'Chaum Korea', 'VIP health screening Seoul', 'luxury checkup Korea', '외국인검진'],
    ogDescription: '청담 건강검진 | 차움·개인전용 HIVE·VIP 항노화 검진 — GlowUpTour',
    imageKeywords: ['Chaum Life Center Cheongdam', 'HIVE private VIP screening', 'anti-aging checkup Korea', '차움 청담'],
  },
  {
    title: 'KMI 한국의학연구소 강남센터',
    englishTitle: 'KMI Korea Medical Institute Gangnam Center',
    slug: 'kmi-gangnam-global-health-checkup',
    description:
      '선릉역 10번 출구 도보 100m 성담빌딩 5~8층의 검진 전문기관. 외국인 전용 KMI 글로벌검진과 재외동포 전용 검진 프로그램을 별도 운영 — 국내 최고 수준의 외국인 검진 시스템. 검진센터 내 외래 진료 시스템으로 이상 소견 즉시 전문의 진료. Visit Seoul 의료관광 공식 등재, 법무부 지정 비자 신체검사 기관. 영어·중국어·일어·러시아어·몽골어 응대.',
    locationLabel: '강남 삼성',
    address: '서울특별시 강남구 테헤란로 411 성담빌딩 5~8층 (삼성동)',
    phone: '02-3496-3300',
    nearestStation: '선릉역 10번 출구 도보 100m',
    signatureProcedures: ['KMI 글로벌검진(외국인 전용)', '재외동포 전용 검진', '종합검진', '기업검진', '비자 신체검사'],
    procedureName: '외국인 전용 글로벌검진',
    promoLabel: '외국인 전용 프로그램·비자검사 지정',
    languagesSpoken: ['ko', 'en', 'zh', 'ja', 'ru', 'mn'],
    interpreterIncluded: true,
    seoTitle: 'KMI 강남센터 | 선릉역 외국인 전용 글로벌검진 | GlowUpTour',
    seoDescription:
      '선릉역 100m. 외국인·재외동포 전용 검진 프로그램. 검진+외래 원스톱. 비자 신체검사 지정기관. 5개국어 응대. GlowUpTour에서 예약.',
    seoTags: ['KMI강남', '외국인건강검진', '글로벌검진', '재외동포검진', '비자신체검사', 'KMI global checkup', 'foreigner health screening Korea', '선릉역검진', '의료관광검진'],
    ogDescription: '강남 건강검진 | KMI·외국인 전용 프로그램·비자검사 지정 — GlowUpTour',
    imageKeywords: ['KMI Gangnam global checkup', 'Seolleung station medical institute', 'visa medical exam Korea', 'KMI 강남센터'],
  },
  {
    title: '하나로의료재단 강남센터',
    englishTitle: 'Hanaro Medical Foundation Gangnam Center',
    slug: 'hanaro-medical-foundation-gangnam',
    description:
      '선릉역 4번 출구 역삼아이타워 6~11층, 6개 층 대규모 검진 전문 의료재단. 법무부 지정 채용·비자 신체검사 발급기관으로 외국인 취업·비자 관련 검진 가능. 종합건강검진·기업검진·공단검진·예방접종·외래진료·채용신체검사 운영. 종로·강남 2개 센터, 검진+외래진료 병행. 영어·중국어 상담 가능.',
    locationLabel: '강남 역삼',
    address: '서울특별시 강남구 테헤란로 326 역삼아이타워 6~11층 (역삼동)',
    phone: '02-590-1111',
    nearestStation: '선릉역 4번 출구',
    signatureProcedures: ['종합건강검진', '기업검진', '공단검진', '예방접종', '채용신체검사', '비자 신체검사'],
    procedureName: '종합검진·비자검사',
    promoLabel: '비자검사 지정·6개층 대규모',
    languagesSpoken: ['ko', 'en', 'zh'],
    interpreterIncluded: true,
    seoTitle: '하나로의료재단 강남센터 | 선릉역 종합검진·비자검사 | GlowUpTour',
    seoDescription:
      '선릉역 4번 출구. 6개 층 대규모 검진센터. 비자·채용 신체검사 지정기관. 종합검진+예방접종. 영어·중국어 상담. GlowUpTour에서 예약.',
    seoTags: ['하나로의료재단', '강남건강검진', '선릉역검진', '비자신체검사', '채용검진', 'Hanaro medical checkup', 'visa medical exam Korea', '외국인건강검진'],
    ogDescription: '강남 건강검진 | 하나로의료재단·비자검사 지정·대규모 센터 — GlowUpTour',
    imageKeywords: ['Hanaro Medical Foundation Gangnam', 'Yeoksam iTower checkup', 'employment visa medical Korea', '하나로의료재단 강남'],
  },
  {
    title: '한국건강관리협회 서울강남지부',
    englishTitle: 'KAHP Seoul Gangnam Branch',
    slug: 'kahp-gangnam-health-checkup',
    description:
      '공익 의료기관으로 합리적인 검진 비용이 강점인 강남 소재 검진기관. MRI·CT·내시경 완비, 인터넷 검진 예약 시스템 운영. 종합건강검진·국민건강보험공단검진·암검진·맞춤형검진까지 폭넓은 선택지. 예산형 외국인 장기체류자에게 적합. 영어 상담 가능.',
    locationLabel: '강남',
    address: '서울특별시 강남구 (서울강남지부 — 상세 주소 홈페이지 확인)',
    phone: '홈페이지 문의',
    nearestStation: '강남권',
    signatureProcedures: ['종합건강검진', '공단검진', '암검진', 'MRI·CT', '내시경', '맞춤형검진'],
    procedureName: '합리적 종합검진·암검진',
    promoLabel: '공익기관·합리적 비용',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '한국건강관리협회 강남지부 | 합리적 종합검진 | GlowUpTour',
    seoDescription:
      '강남 소재 공익 의료기관. MRI·CT·내시경 완비. 합리적 비용의 종합·암검진. 장기체류 외국인 적합. GlowUpTour에서 예약.',
    seoTags: ['건강관리협회', '강남건강검진', '합리적검진', '암검진', '공단검진', 'affordable checkup Korea', 'KAHP Gangnam', '외국인건강검진'],
    ogDescription: '강남 건강검진 | 건강관리협회·공익기관·합리적 비용 — GlowUpTour',
    imageKeywords: ['KAHP Gangnam branch', 'affordable health screening Korea', 'public medical institution Seoul', '한국건강관리협회 강남'],
  },
  {
    title: '셀러블153강남의원(건강검진)',
    englishTitle: 'Cellable153 Gangnam Clinic — Health Checkup',
    slug: 'cellable153-gangnam-health-checkup',
    description:
      '논현동 언주로 720 B1~B3층 통합 프리미엄 메디컬센터의 건강검진 부문. B2층 건강검진·암치료·VIP 병실·여성클리닉, B1층 세포치료·안과검진·스포츠퍼포먼스 — 검진+치료+세포클리닉 통합 구조. 검진 후 줄기세포·면역세포 치료 연계 가능. 외국인 환자 특화 글로벌 헬스케어 기관. 학동역·강남구청역·압구정로데오역 인근, 영어·중국어 상담.',
    locationLabel: '강남 논현',
    address: '서울특별시 강남구 언주로 720 B1~B3층 (논현동)',
    phone: '홈페이지 문의',
    nearestStation: '학동역 · 강남구청역 · 압구정로데오역',
    signatureProcedures: ['프리미엄 건강검진', '암치료 연계', '안과검진', '여성클리닉', '세포치료 연계 검진'],
    procedureName: '프리미엄 검진·세포치료 연계',
    promoLabel: '검진+세포치료 통합·VIP',
    languagesSpoken: ['ko', 'en', 'zh'],
    interpreterIncluded: true,
    seoTitle: '셀러블153강남의원 | 논현 프리미엄 검진·세포치료 | GlowUpTour',
    seoDescription:
      '학동역 인근. 검진+세포치료+VIP병실 통합 메디컬센터. 암치료 연계·여성클리닉. 외국인 특화. 영어·중국어 상담. GlowUpTour에서 예약.',
    seoTags: ['강남건강검진', '프리미엄검진', '줄기세포검진', 'VIP검진', '여성검진', 'premium health checkup Korea', 'stem cell clinic Seoul', '외국인건강검진'],
    ogDescription: '강남 건강검진 | 셀러블153·검진+세포치료 통합·VIP 특화 — GlowUpTour',
    imageKeywords: ['Cellable153 Gangnam health checkup', 'stem cell integrated medical center', 'VIP ward Nonhyeon', '셀러블153 건강검진'],
  },
];
