/**
 * 강남·서초 외국인 FIT 추천 사진 스튜디오 10곳 — founder 2026-07-24
 * 큐레이션.
 *
 * 마스터 콘솔의 "사진 스튜디오 10종 일괄 등록" 버튼이 이 배열을 읽어
 * partner_listings 테이블에 category='photo_studio', status='approved'
 * 로 한 번에 insert. 같은 slug 는 skip — 멱등.
 *
 * SEO(메타 타이틀·디스크립션)는 partner_listing_locale_content 의
 * kr 행에 저장 — scripts/translate-locale-content.mjs 가 KR 소스로
 * en/zh/ja/ru/vi 를 생성. 브랜드명은 "GlowUpTour" 통일.
 */

export type PhotoStudioSeed = {
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

export const SEOUL_PHOTO_PRODUCTS: ReadonlyArray<PhotoStudioSeed> = [
  {
    title: '시현하다 강남 오리지널 (Sihyunhada Gangnam Original)',
    slug: 'sihyunhada-gangnam-original',
    description:
      '한국 \'컬러 증명사진\' 열풍의 원조 브랜드 시현하다의 강남점. 개인의 컬러를 찾아 배경색으로 표현하는 시그니처 초상사진 — 외국인들에게 "한국식 컬러 프로필" 체험으로 SNS 화제다. 컬러 초상사진(오리지널·클로즈업·와이드)·개인 기록 촬영 ₩100,000~250,000. 대저택 엔틱 컨셉의 특별한 공간, 테이프 형식 아카이빙 패키지. 영어 응대 가능.',
    locationLabel: '강남 (대저택 컨셉)',
    address: '서울 강남구 시현하다 강남',
    station: '강남권',
    services: '컬러 초상사진 (오리지널·클로즈업·와이드) · 개인 기록 촬영',
    priceRange: '₩100,000~250,000',
    priceWon: 100_000,
    foreignerSupport: '영어 가능',
    promoLabel: '컬러 초상 원조',
    seoTitle: '시현하다 강남 | 컬러 초상사진 원조 스튜디오 | GlowUpTour',
    seoDescription:
      '강남. 한국 컬러 증명사진 원조 시현하다. 나만의 컬러 초상 기록. 외국인 SNS 화제 체험. GlowUpTour에서 예약.',
    seoTags: ['강남사진관', '시현하다', '컬러증명사진', '초상사진', '프로필사진', 'Korean color portrait', 'Sihyunhada photo', 'K-profile photo Seoul', '외국인사진촬영'],
    ogDescription: '강남 사진 | 시현하다·컬러 초상 원조·SNS 화제 체험 — GlowUpTour',
  },
  {
    title: '시현하다 모먼트 강남역점 (Sihyunhada Moment Gangnam Station)',
    slug: 'sihyunhada-moment-gangnam-station',
    description:
      '시현하다의 접근성 높은 \'모먼트\' 라인 강남역점. 본점 대비 합리적 가격으로 시현하다 시그니처 컬러 사진을 체험할 수 있어 짧은 일정의 관광객에게 최적. 컬러 증명사진·프로필·사원증 사진(라이트 버전) ₩60,000~150,000. 매일 11:00~20:00 운영. 영어 응대 가능.',
    locationLabel: '역삼동 (강남역)',
    address: '서울 강남구 역삼동 815-5 시현하다 모먼트',
    phone: '070-4046-8005',
    station: '강남역',
    services: '컬러 증명사진 · 프로필 · 사원증 사진 (라이트 버전)',
    priceRange: '₩60,000~150,000',
    priceWon: 60_000,
    foreignerSupport: '영어 가능',
    hours: '매일 11:00~20:00',
    promoLabel: '합리적 컬러 사진',
    seoTitle: '시현하다 모먼트 강남역 | 컬러 증명사진 라이트 | GlowUpTour',
    seoDescription:
      '강남역. 시현하다 모먼트 라인. 합리적 가격 컬러 증명사진. 매일 운영·짧은 일정 최적. GlowUpTour에서 예약.',
    seoTags: ['강남역사진관', '시현하다모먼트', '컬러증명사진', '여행중사진', 'quick photo Seoul', 'color ID photo Korea', '외국인사진촬영'],
    ogDescription: '강남역 사진 | 시현하다 모먼트·합리적 컬러 사진 — GlowUpTour',
  },
  {
    title: '레코디드 (RECORDED)',
    slug: 'recorded-self-studio-gangnam',
    description:
      '"작가 없는 퍼스널컬러 증명사진관" — 프라이빗 룸에서 리모컨으로 스스로 촬영한다. 배경색 자유 교체·정해진 포즈 없음. 카메라 앞이 어색한 사람, 언어 부담 없이 찍고 싶은 외국인에게 완벽한 시스템. 퍼스널컬러 셀프 증명사진·프라이빗 룸 셀프 촬영 ₩30,000~80,000. 셀프 시스템으로 언어 장벽 최소 (영어 안내 가능).',
    locationLabel: '역삼동 (강남역)',
    address: '서울 강남구 역삼동 레코디드',
    station: '강남역',
    services: '퍼스널컬러 셀프 증명사진 · 프라이빗 룸 셀프 촬영',
    priceRange: '₩30,000~80,000',
    priceWon: 30_000,
    foreignerSupport: '셀프 시스템 — 언어 장벽 최소 (영어 안내 가능)',
    promoLabel: '작가 없는 셀프 촬영',
    seoTitle: '레코디드 | 강남역 셀프 퍼스널컬러 증명사진 | GlowUpTour',
    seoDescription:
      '강남역. 작가 없는 셀프 촬영 시스템. 프라이빗 룸+리모컨+배경색 자유. 언어 부담 제로. GlowUpTour에서 예약.',
    seoTags: ['강남셀프사진관', '레코디드', '퍼스널컬러증명사진', '셀프촬영', '프라이빗스튜디오', 'self photo studio Seoul', 'private photo booth Korea', '외국인사진촬영'],
    ogDescription: '강남 사진 | 레코디드·셀프 촬영·언어 장벽 제로 — GlowUpTour',
  },
  {
    title: '지스튜디오 (G Studio)',
    slug: 'g-studio-seocho-bodyprofile',
    description:
      '강남역 인근 증명·프로필·바디프로필 종합 스튜디오. 일요일은 바디프로필 전용 운영 — 헬스·바디 관리 후 기록 촬영 수요에 특화. 증명사진·취업사진·이미지사진·바디프로필, 증명 ₩30,000~ / 바디프로필 ₩200,000~. 예약 권장제. 간단 영어 응대.',
    locationLabel: '서초동 (강남역)',
    address: '서울 서초구 서초동 1303-38 서초빌딩 지하1층 지스튜디오',
    phone: '02-587-5891',
    station: '강남역',
    services: '증명사진 · 취업사진 · 이미지사진 · 바디프로필 (일요일 전용)',
    priceRange: '증명 ₩30,000~ / 바디프로필 ₩200,000~',
    priceWon: 30_000,
    foreignerSupport: '간단 영어 응대',
    promoLabel: '일요일 바디프로필',
    seoTitle: '지스튜디오 | 강남역 증명·바디프로필 촬영 | GlowUpTour',
    seoDescription:
      '서초동 강남역 인근. 증명·취업·이미지 사진+일요일 바디프로필 전용. GlowUpTour에서 예약.',
    seoTags: ['강남사진관', '바디프로필', '취업사진', '증명사진', '서초스튜디오', 'body profile Korea', 'fitness photoshoot Seoul', '외국인사진촬영'],
    ogDescription: '서초 사진 | 지스튜디오·증명+바디프로필·일요일 전용 — GlowUpTour',
  },
  {
    title: '변화 스튜디오 (BYUNHWA Studio)',
    slug: 'byunhwa-bodyprofile-gangnam',
    description:
      '바디프로필 전문 스튜디오 — "변화의 시작부터 끝까지" 슬로건. 바디프로필 특화 조명·포즈 디렉팅 시스템을 갖춰, 한국 바디프로필 문화를 체험하려는 피트니스 애호 외국인에게 유니크한 경험이다. ₩200,000~500,000. 영어 응대 가능.',
    locationLabel: '신논현역·강남역 인근',
    address: '서울 강남구 강남대로120길 76 변화 스튜디오',
    station: '신논현역·강남역',
    services: '바디프로필 전문 (특화 조명 · 포즈 디렉팅)',
    priceRange: '₩200,000~500,000',
    priceWon: 200_000,
    foreignerSupport: '영어 가능',
    promoLabel: '바디프로필 전문',
    seoTitle: '변화 스튜디오 | 강남 바디프로필 전문 | GlowUpTour',
    seoDescription:
      '강남대로120길. 바디프로필 전문 스튜디오. 특화 조명·포즈 디렉팅. K바디프로필 체험. GlowUpTour에서 예약.',
    seoTags: ['강남바디프로필', '바디프로필전문', '변화스튜디오', '피트니스촬영', 'body profile studio Korea', 'fitness photography Seoul', 'K-body profile', '외국인사진촬영'],
    ogDescription: '강남 사진 | 변화·바디프로필 전문·K피트니스 문화 체험 — GlowUpTour',
  },
  {
    title: '스튜디오애플 (Studio Apple)',
    slug: 'studio-apple-business-profile-gangnam',
    description:
      '프리미엄 인물 전문 스튜디오. CEO·전문직 비즈니스 프로필부터 배우·연주자 프로필, 개인화보·앨범자켓·광고사진까지 상업 촬영급 퀄리티. LinkedIn용 비즈니스 프로필이 필요한 외국인 비즈니스맨에게 적합하다. ₩150,000~500,000. 영어 응대 가능.',
    locationLabel: '강남',
    address: '서울 강남구 스튜디오애플',
    station: '강남권',
    services: 'CEO·전문직·배우·연주자 프로필 · 개인화보 · 앨범자켓 · 광고사진',
    priceRange: '₩150,000~500,000',
    priceWon: 150_000,
    foreignerSupport: '영어 가능',
    promoLabel: 'CEO 프로필 전문',
    seoTitle: '스튜디오애플 | 강남 CEO·전문직 프로필 전문 | GlowUpTour',
    seoDescription:
      '강남. CEO·전문직·배우 프로필, 개인화보·광고 촬영. LinkedIn 비즈니스 프로필 최적. GlowUpTour에서 예약.',
    seoTags: ['강남프로필사진', 'CEO프로필', '비즈니스프로필', '개인화보', 'LinkedIn photo Seoul', 'business headshot Korea', 'professional profile', '외국인사진촬영'],
    ogDescription: '강남 사진 | 스튜디오애플·CEO 프로필·화보급 퀄리티 — GlowUpTour',
  },
  {
    title: '강남역에뜬별스튜디오 (Star Above Gangnam Studio)',
    slug: 'star-gangnam-station-studio',
    description:
      '강남역 5번 출구 1분, 아침 9시~밤 9시 연중무휴 — 접근성과 운영시간 모두 최강. 증명사진·취업사진·프로필·셀프촬영·바디프로필까지 전 장르 ₩20,000~200,000. 급하게 여권·비자용 사진이 필요한 외국인에게 구세주 같은 곳. 간단 영어 응대.',
    locationLabel: '강남역 5번 출구',
    address: '서울 강남구 강남역에뜬별스튜디오',
    phone: '070-7737-5225',
    station: '강남역 5번 출구 1분',
    services: '증명사진 · 취업사진 · 프로필 · 셀프촬영 · 바디프로필',
    priceRange: '₩20,000~200,000',
    priceWon: 20_000,
    foreignerSupport: '간단 영어 응대',
    hours: '매일 09:00~21:00 연중무휴',
    promoLabel: '연중무휴 9~21시',
    seoTitle: '강남역에뜬별스튜디오 | 연중무휴 증명·프로필 | GlowUpTour',
    seoDescription:
      '강남역 5번 출구 1분. 9시~21시 연중무휴. 증명·여권·프로필·바디프로필 전 장르. GlowUpTour에서 예약.',
    seoTags: ['강남역사진관', '연중무휴사진관', '여권사진', '증명사진', '긴급사진촬영', 'passport photo Gangnam', '365 photo studio Seoul', '외국인사진촬영'],
    ogDescription: '강남역 사진 | 에뜬별·연중무휴·여권사진 즉시 — GlowUpTour',
  },
  {
    title: '스튜디오 로이클라우드 (Studio Roy Cloud)',
    slug: 'roy-cloud-studio-seocho',
    description:
      '"사람마다 다른 조명 위치" 철학 — 개인 비대칭까지 고려한 맞춤 세팅으로 획일화된 스피드 촬영을 거부한다. 보정 퀄리티로 유명하며 채광 좋은 4층 공간. 자연스러운 여권사진·증명사진·보정 특화 ₩25,000~80,000. 네이버 예약 할인. 간단 영어 응대.',
    locationLabel: '서초 (포이사거리)',
    address: '서울 서초구 논현로17길 22 우성빌딩 4층 로이클라우드',
    station: '양재역·매봉역',
    services: '자연스러운 여권사진 · 증명사진 · 보정 특화',
    priceRange: '₩25,000~80,000',
    priceWon: 25_000,
    foreignerSupport: '간단 영어 응대',
    promoLabel: '맞춤 조명·보정 특화',
    seoTitle: '로이클라우드 | 서초 맞춤 조명 여권·증명사진 | GlowUpTour',
    seoDescription:
      '서초 포이사거리. 개인 맞춤 조명 세팅·보정 특화. 자연스러운 여권·증명사진. GlowUpTour에서 예약.',
    seoTags: ['서초사진관', '여권사진', '자연스러운증명사진', '보정잘하는사진관', '맞춤조명', 'natural passport photo Seoul', 'ID photo retouching Korea', '외국인사진촬영'],
    ogDescription: '서초 사진 | 로이클라우드·맞춤 조명·보정 맛집 — GlowUpTour',
  },
  {
    title: '비비드스튜디오 삼성점 (Vivid Studio Samseong)',
    slug: 'vivid-studio-samseong-profile',
    description:
      '매일 09:00~21:00 연중무휴 — 코엑스 일정 전후 촬영이 가능하다. 배우 프로필급 인물 촬영 노하우에 프로필 전문 라인업 다양. 프로필사진·배우프로필·여자프로필·증명·졸업사진 ₩50,000~200,000. 간단 영어 응대.',
    locationLabel: '삼성동 (삼성역·코엑스)',
    address: '서울 강남구 삼성동 24-1 지하1층 비비드스튜디오',
    phone: '070-7697-4282',
    station: '삼성역·선릉역',
    services: '프로필사진 · 배우프로필 · 여자프로필 · 증명 · 졸업사진',
    priceRange: '₩50,000~200,000',
    priceWon: 50_000,
    foreignerSupport: '간단 영어 응대',
    hours: '매일 09:00~21:00 연중무휴',
    promoLabel: '연중무휴 프로필',
    seoTitle: '비비드스튜디오 삼성 | 코엑스 인근 프로필 전문 | GlowUpTour',
    seoDescription:
      '삼성동. 매일 9시~21시 연중무휴. 배우급 프로필·증명·졸업사진. 코엑스 인근. GlowUpTour에서 예약.',
    seoTags: ['삼성동사진관', '프로필사진', '배우프로필', '코엑스사진관', 'actor profile Korea', 'portrait studio COEX', '외국인사진촬영'],
    ogDescription: '삼성동 사진 | 비비드·연중무휴·배우급 프로필 — GlowUpTour',
  },
  {
    title: '신사 셀프스튜디오 (Sinsa Self Studio)',
    slug: 'sinsa-self-studio-garosugil',
    description:
      '가로수길 셀프 스튜디오 — 조명·배경이 세팅된 공간에서 자유롭게 촬영한다. 친구·커플 여행 기념 촬영에 최적이고 가로수길 쇼핑과 연계 동선. 셀프 촬영·셀프 프로필·친구/커플 셀프 스냅 ₩30,000~100,000 (시간제). 매일 11:00~21:00 운영. 셀프 시스템으로 언어 장벽 최소.',
    locationLabel: '신사동 (가로수길)',
    address: '서울 강남구 신사동 554-31 셀프스튜디오',
    station: '신사역',
    services: '셀프 촬영 · 셀프 프로필 · 친구/커플 셀프 스냅',
    priceRange: '₩30,000~100,000 (시간제)',
    priceWon: 30_000,
    foreignerSupport: '셀프 시스템 — 언어 장벽 최소',
    hours: '매일 11:00~21:00',
    promoLabel: '셀프 스튜디오',
    seoTitle: '신사 셀프스튜디오 | 가로수길 셀프 프로필·스냅 | GlowUpTour',
    seoDescription:
      '가로수길. 셀프 촬영 스튜디오. 친구·커플 여행 기념 촬영. 쇼핑 동선 연계. GlowUpTour에서 예약.',
    seoTags: ['가로수길사진관', '셀프스튜디오', '셀프프로필', '커플스냅', '여행기념촬영', 'self studio Garosugil', 'couple photo Seoul', 'travel snap Korea', '외국인사진촬영'],
    ogDescription: '가로수길 사진 | 셀프 스튜디오·커플 스냅·여행 기념 — GlowUpTour',
  },
];
