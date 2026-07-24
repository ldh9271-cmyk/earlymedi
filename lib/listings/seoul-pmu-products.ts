/**
 * 강남·서초 외국인 FIT 추천 반영구(PMU) 전문샵/클리닉 10곳 —
 * founder 2026-07-24 큐레이션.
 *
 * 마스터 콘솔의 "반영구샵 10종 일괄 등록" 버튼이 이 배열을 읽어
 * partner_listings 테이블에 category='pmu', status='approved' 로
 * 한 번에 insert. 같은 slug 는 skip — 멱등.
 *
 * SEO(메타 타이틀·디스크립션)는 partner_listing_locale_content 의
 * kr 행에 저장 — scripts/translate-locale-content.mjs 가 KR 소스로
 * en/zh/ja/ru/vi 를 생성. 브랜드명은 "GlowUpTour" 통일.
 */

export type PmuShopSeed = {
  title: string;
  /** SEO 영문 슬러그 — partner_listings.slug 로 그대로 사용. */
  slug: string;
  description: string;
  locationLabel: string;
  /** Google Maps 검색 쿼리 — details.address 로 저장. */
  address: string;
  phone?: string;
  station: string;
  services: string;
  priceRange: string;
  /** ₩ 표시용 가격 (하한값). */
  priceWon: number;
  foreignerSupport: string;
  hours?: string;
  promoLabel: string;
  seoTitle: string;
  seoDescription: string;
  seoTags: string[];
  ogDescription: string;
};

export const SEOUL_PMU_PRODUCTS: ReadonlyArray<PmuShopSeed> = [
  {
    title: '비앤미 반영구 압구정점 (Ben&Me Semi-Permanent Apgujeong)',
    slug: 'benme-eyebrow-tattoo-apgujeong',
    description:
      '눈썹 반영구만 20년 외길 전문샵. 남자 눈썹문신 특화 — 비대칭·퍼짐·처짐 교정으로 인상을 개선한다. 엠보로 결을 살리고 면으로 채우는 자연스러운 콤보 기법, 시술 전후 상세 분석 시스템. 눈썹 반영구(엠보·면채움 콤보)·남자 눈썹문신·눈썹 디자인 교정 ₩200,000~400,000. 영어 응대 가능.',
    locationLabel: '압구정 (압구정역)',
    address: '서울 강남구 압구정 비앤미 반영구',
    station: '압구정역',
    services: '눈썹 반영구(엠보·면채움 콤보) · 남자 눈썹문신 · 눈썹 디자인 교정',
    priceRange: '₩200,000~400,000',
    priceWon: 200_000,
    foreignerSupport: '영어 가능',
    promoLabel: '눈썹 반영구 20년',
    seoTitle: '비앤미 반영구 압구정 | 눈썹 반영구 20년 전문 | GlowUpTour',
    seoDescription:
      '압구정. 눈썹 반영구 20년 외길. 남자 눈썹문신 특화·자연 콤보 기법. 인상 개선 디자인. GlowUpTour에서 예약.',
    seoTags: ['압구정반영구', '눈썹반영구', '남자눈썹문신', '엠보눈썹', '눈썹디자인', 'eyebrow tattoo Korea', 'microblading Seoul', 'mens eyebrow Korea', '외국인반영구'],
    ogDescription: '압구정 반영구 | 비앤미·눈썹 20년 전문·남자 눈썹 특화 — GlowUpTour',
  },
  {
    title: '미프로반영구클리닉 (Mipro Semi-Permanent Clinic)',
    slug: 'mipro-semipermanent-cheongdam',
    description:
      '청담역 인근 반영구 전문 클리닉. 눈썹·아이라인·헤어라인·입술까지 반영구 전 부위를 시술하며, 반영구 수강(아카데미)을 병행하는 교육기관 수준의 검증된 기술력이 강점. 반영구 눈썹문신·남자눈썹·아이라인문신·헤어라인문신·입술문신 ₩150,000~400,000. 평일 10:30~20:30 운영. 영어 응대 가능.',
    locationLabel: '청담동 (청담역)',
    address: '서울 강남구 청담동 32-3 미프로반영구클리닉',
    phone: '02-514-5558',
    station: '청담역',
    services: '반영구 눈썹문신 · 남자눈썹 · 아이라인문신 · 헤어라인문신 · 입술문신',
    priceRange: '₩150,000~400,000',
    priceWon: 150_000,
    foreignerSupport: '영어 가능',
    hours: '평일 10:30~20:30',
    promoLabel: '전 부위 시술',
    seoTitle: '미프로반영구클리닉 | 청담 반영구 전 부위 전문 | GlowUpTour',
    seoDescription:
      '청담역 인근. 눈썹·아이라인·헤어라인·입술 반영구 전 부위. 아카데미 병행 검증 기술. GlowUpTour에서 예약.',
    seoTags: ['청담반영구', '눈썹문신', '아이라인문신', '헤어라인문신', '입술문신', 'permanent makeup Korea', 'lip tattoo Seoul', 'hairline tattoo', '외국인반영구'],
    ogDescription: '청담 반영구 | 미프로·전 부위 시술·아카데미급 기술 — GlowUpTour',
  },
  {
    title: '리앤채움의원 반영구센터 (Lee&Chaeum Semi-Permanent Center)',
    slug: 'leechaeum-medical-semipermanent-apgujeong',
    description:
      '의원(의료기관)에서 시행하는 반영구 — 위생·안전 관리 수준이 높다. 대규모 시술진 보유로 예약 회전이 빠르고, 해외 거주 한인·외국인 방문 후기 다수 — "도착 직후 1차, 출국 전 리터치" 일정에 익숙한 곳. 의료기관 반영구 눈썹·아이라인·헤어라인·자연눈썹 ₩150,000~350,000. 성형·피부 시술 병행 가능. 영어 응대 가능.',
    locationLabel: '신사동 (압구정역)',
    address: '서울 강남구 논현로 837 원방빌딩 4층 리앤채움의원',
    station: '압구정역',
    services: '의료기관 반영구 눈썹 · 아이라인 · 헤어라인 · 자연눈썹',
    priceRange: '₩150,000~350,000',
    priceWon: 150_000,
    foreignerSupport: '영어 가능',
    promoLabel: '의료기관 시술',
    seoTitle: '리앤채움의원 | 압구정 의료기관 반영구 눈썹 | GlowUpTour',
    seoDescription:
      '압구정역 인근. 의원급 위생·안전 반영구. 대규모 시술진·해외 방문객 일정 최적화. GlowUpTour에서 예약.',
    seoTags: ['압구정반영구', '의료기관반영구', '눈썹반영구', '안전반영구', 'medical permanent makeup Korea', 'eyebrow clinic Seoul', '외국인반영구'],
    ogDescription: '압구정 반영구 | 리앤채움·의료기관 시술·해외 방문 최적 — GlowUpTour',
  },
  {
    title: '강남제이에스의원 (Gangnam JS Clinic)',
    slug: 'gangnam-js-natural-eyebrow',
    description:
      '신논현 엠보 자연눈썹으로 알려진 의원. 자연스러운 결 표현 특화 — "티 안 나는 눈썹"을 원하는 고객이 선호한다. 의료기관 시술로 안전성 확보. 엠보 자연눈썹·반영구 눈썹문신 ₩150,000~350,000. 영어 응대 가능.',
    locationLabel: '신논현역 인근',
    address: '서울 강남구 강남제이에스의원',
    station: '신논현역·강남역',
    services: '엠보 자연눈썹 · 반영구 눈썹문신 · 의료기관 반영구',
    priceRange: '₩150,000~350,000',
    priceWon: 150_000,
    foreignerSupport: '영어 가능',
    promoLabel: '엠보 자연눈썹',
    seoTitle: '강남제이에스의원 | 신논현 엠보 자연눈썹 | GlowUpTour',
    seoDescription:
      '신논현역 인근. 엠보 자연눈썹 특화 의원. 자연스러운 결 표현·의료기관 안전 시술. GlowUpTour에서 예약.',
    seoTags: ['강남반영구', '자연눈썹', '엠보눈썹', '신논현눈썹문신', 'natural eyebrow Korea', 'embo eyebrow Seoul', '외국인반영구'],
    ogDescription: '강남 반영구 | 제이에스·엠보 자연눈썹·의료기관 — GlowUpTour',
  },
  {
    title: '센스반영구클리닉 (Sense Semi-Permanent Clinic)',
    slug: 'sense-semipermanent-gangnam',
    description:
      '강남역 인근 반영구 전문 클리닉. 눈썹문신·강남 눈썹반영구·반영구 화장 ₩150,000~300,000. 평일 10:00~18:30, 토요일 오전 운영. 강남역 도보권으로 관광 일정 중 방문이 편리하다. 간단 영어 응대.',
    locationLabel: '서초동 (강남역)',
    address: '서울 서초구 서초동 1317-11 센스반영구클리닉',
    station: '강남역',
    services: '눈썹문신 · 눈썹반영구 · 반영구 화장',
    priceRange: '₩150,000~300,000',
    priceWon: 150_000,
    foreignerSupport: '간단 영어 응대',
    hours: '평일 10:00~18:30 · 토요일 오전',
    promoLabel: '강남역 도보권',
    seoTitle: '센스반영구클리닉 | 강남역 눈썹 반영구 | GlowUpTour',
    seoDescription:
      '서초동 강남역 인근. 눈썹문신·반영구 화장 전문. 관광 일정 중 방문 편리. GlowUpTour에서 예약.',
    seoTags: ['강남반영구', '강남역눈썹문신', '반영구화장', '서초반영구', 'eyebrow tattoo Gangnam', 'permanent makeup Seoul', '외국인반영구'],
    ogDescription: '강남역 반영구 | 센스·눈썹 전문·도보권 접근 — GlowUpTour',
  },
  {
    title: '압구정로데오 반영구 아카데미샵 (Apgujeong Rodeo Semi-Permanent Studio)',
    slug: 'apgujeong-rodeo-semipermanent-studio',
    description:
      '압구정로데오 소재 반영구 시술+아카데미 병행 스튜디오. 매일 10:00~20:00, 100% 예약제로 프라이빗한 시술 환경을 제공한다. 눈썹문신·헤어라인·반영구 화장 ₩150,000~350,000. 간단 영어 응대.',
    locationLabel: '신사동 (압구정로데오역)',
    address: '서울 강남구 신사동 635-13 반영구 스튜디오',
    station: '압구정로데오역',
    services: '눈썹문신 · 헤어라인 · 반영구 화장 (100% 예약제)',
    priceRange: '₩150,000~350,000',
    priceWon: 150_000,
    foreignerSupport: '간단 영어 응대',
    hours: '매일 10:00~20:00 (100% 예약제)',
    promoLabel: '100% 예약제',
    seoTitle: '압구정로데오 반영구 스튜디오 | 눈썹·헤어라인 예약제 | GlowUpTour',
    seoDescription:
      '압구정로데오. 100% 예약제 프라이빗 반영구. 눈썹·헤어라인. 매일 운영. GlowUpTour에서 예약.',
    seoTags: ['압구정반영구', '헤어라인반영구', '예약제반영구', '프라이빗반영구', 'hairline tattoo Korea', 'private studio Seoul', '외국인반영구'],
    ogDescription: '압구정로데오 반영구 | 100% 예약제·헤어라인 보유 — GlowUpTour',
  },
  {
    title: '신사 반영구 전문샵 (Sinsa Semi-Permanent Specialist)',
    slug: 'sinsa-semipermanent-specialist',
    description:
      '평일·토요일 밤 9시까지 운영 — 저녁 일정 후에도 시술이 가능하다. 눈썹·아이라인·헤어라인 3대 부위 전문으로 신사·압구정 뷰티 상권 중심에 위치. 눈썹문신·반영구 눈썹·아이라인문신·헤어라인문신 ₩150,000~300,000. 간단 영어 응대.',
    locationLabel: '신사동 (압구정역)',
    address: '서울 강남구 신사동 626-4 반영구 전문샵',
    phone: '02-514-0887',
    station: '압구정역·신사역',
    services: '눈썹문신 · 반영구 눈썹 · 아이라인문신 · 헤어라인문신',
    priceRange: '₩150,000~300,000',
    priceWon: 150_000,
    foreignerSupport: '간단 영어 응대',
    hours: '평일·토요일 밤 9시까지',
    promoLabel: '밤 9시까지 운영',
    seoTitle: '신사 반영구 전문샵 | 밤 9시까지 눈썹·아이라인 | GlowUpTour',
    seoDescription:
      '신사동. 밤 9시까지 운영. 눈썹·아이라인·헤어라인 3대 부위. 저녁 시술 가능. GlowUpTour에서 예약.',
    seoTags: ['신사반영구', '야간반영구', '아이라인문신', '눈썹문신', 'evening appointment Korea', 'eyeline tattoo Seoul', '외국인반영구'],
    ogDescription: '신사 반영구 | 밤 9시까지·3대 부위 전문 — GlowUpTour',
  },
  {
    title: '반포 반영구샵 (Banpo Semi-Permanent Studio)',
    slug: 'banpo-semipermanent-terminal',
    description:
      '고속터미널·JW메리어트 인근 — 반포에 숙박하는 외국인의 도보권 반영구샵. 눈썹 반영구·반영구 화장 ₩130,000~280,000. 평일 10:00~20:00 운영(점심 13~14시). 간단 영어 응대.',
    locationLabel: '반포동 (고속터미널역)',
    address: '서울 서초구 반포동 707-2 반영구샵',
    phone: '02-549-0043',
    station: '고속터미널역',
    services: '눈썹 반영구 · 반영구 화장',
    priceRange: '₩130,000~280,000',
    priceWon: 130_000,
    foreignerSupport: '간단 영어 응대',
    hours: '평일 10:00~20:00 (점심 13~14시)',
    promoLabel: '터미널 도보권',
    seoTitle: '반포 반영구샵 | 고속터미널 인근 눈썹 반영구 | GlowUpTour',
    seoDescription:
      '반포동. 고속터미널·호텔 도보권. 눈썹 반영구·반영구 화장. GlowUpTour에서 예약.',
    seoTags: ['반포반영구', '서초눈썹문신', '고속터미널반영구', '호텔인근반영구', 'eyebrow tattoo Banpo', 'permanent makeup Seocho', '외국인반영구'],
    ogDescription: '반포 반영구 | 터미널·호텔 도보권·눈썹 전문 — GlowUpTour',
  },
  {
    title: '서초 반영구 메디컬샵 (Seocho Semi-Permanent Medical)',
    slug: 'seocho-semipermanent-medical-combo',
    description:
      '반영구+쁘띠 시술을 한 곳에서 받는 메디컬 결합형 — 눈썹 반영구와 보톡스·필러를 같은 날 완성할 수 있다. 시간 효율을 중시하는 외국인 관광객에게 실용적. 반영구 눈썹문신+비만관리+필러·보톡스·리프팅 통합, 반영구 ₩150,000~300,000. 간단 영어 응대.',
    locationLabel: '서초동 (강남역·서초역)',
    address: '서울 서초구 서초동 1306-4 4층 반영구 메디컬',
    phone: '02-1600-9083',
    station: '강남역·서초역',
    services: '반영구 눈썹문신 + 필러·보톡스·리프팅 통합',
    priceRange: '반영구 ₩150,000~300,000',
    priceWon: 150_000,
    foreignerSupport: '간단 영어 응대',
    promoLabel: '눈썹+쁘띠 통합',
    seoTitle: '서초 반영구 메디컬 | 눈썹+쁘띠 통합 시술 | GlowUpTour',
    seoDescription:
      '서초동. 반영구 눈썹+보톡스·필러 같은 날 통합 시술. 시간 효율 최적. GlowUpTour에서 예약.',
    seoTags: ['서초반영구', '반영구쁘띠', '눈썹보톡스', '통합시술', 'combo beauty treatment Korea', 'eyebrow filler Seoul', '외국인반영구'],
    ogDescription: '서초 반영구 | 눈썹+쁘띠 통합·하루 완성 — GlowUpTour',
  },
  {
    title: '대치 반영구+왁싱 스튜디오 (Daechi Semi-Permanent & Waxing)',
    slug: 'daechi-semipermanent-waxing-studio',
    description:
      '반영구+눈썹왁싱+메이크업 결합 뷰티 스튜디오. 눈썹 정리부터 반영구까지 원스톱으로 완성한다. 눈썹문신·눈썹왁싱·메이크업·왁싱 결합 케어 — 반영구 ₩130,000~250,000 / 왁싱 별도. 평일 11:00~20:00, 토요일 운영. 간단 영어 응대.',
    locationLabel: '대치동 (선릉역)',
    address: '서울 강남구 대치동 985 반영구 왁싱 스튜디오',
    phone: '02-556-4309',
    station: '선릉역·대치역',
    services: '눈썹문신 · 눈썹왁싱 · 메이크업 · 왁싱 결합 케어',
    priceRange: '반영구 ₩130,000~250,000 / 왁싱 별도',
    priceWon: 130_000,
    foreignerSupport: '간단 영어 응대',
    hours: '평일 11:00~20:00 · 토요일 운영',
    promoLabel: '왁싱+반영구 원스톱',
    seoTitle: '대치 반영구+왁싱 | 눈썹 원스톱 스튜디오 | GlowUpTour',
    seoDescription:
      '대치동. 눈썹왁싱+반영구+메이크업 원스톱. 눈썹 토탈 케어. GlowUpTour에서 예약.',
    seoTags: ['대치반영구', '눈썹왁싱', '눈썹토탈케어', '왁싱반영구', 'eyebrow waxing Korea', 'brow studio Seoul', '외국인반영구'],
    ogDescription: '대치 반영구 | 왁싱+반영구+메이크업 원스톱 — GlowUpTour',
  },
];
