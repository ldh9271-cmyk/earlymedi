/**
 * 강남·서초·청담 외국인 FIT 추천 네일샵 12곳 — founder 2026-07-24 큐레이션.
 *
 * 마스터 콘솔의 "네일샵 12종 일괄 등록" 버튼이 이 배열을 읽어
 * partner_listings 테이블에 category='nail', status='approved' 로
 * 한 번에 insert. 이미 같은 slug 가 있으면 skip — 멱등.
 *
 * SEO(메타 타이틀·디스크립션)는 partner_listing_locale_content 의
 * kr 행에 저장 — 이후 scripts/translate-locale-content.mjs 가 KR 을
 * 소스로 en/zh/ja/ru/vi 를 생성. 브랜드명은 "GlowUpTour" 통일.
 */

export type NailShopSeed = {
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

export const SEOUL_NAIL_PRODUCTS: ReadonlyArray<NailShopSeed> = [
  {
    title: '유니스텔라 (UNISTELLA Nail Design)',
    slug: 'unistella-nail-cheongdam',
    description:
      '국내 최초 네일 셀렉트샵. 태연·에이핑크·선미·블랙핑크 등 K팝 아티스트를 다수 작업한 박은경 원장 브랜드로, 글로벌 틱톡·인스타에서 "서울에서 꼭 가야 할 네일샵"으로 꼽히는 외국인 관광객 성지. 시그니처 네일아트·젤네일·네거티브 스페이스 아트·페디큐어 ₩70,000~200,000. 영어 응대 · WhatsApp·인스타 DM 예약 가능. 평일 11:00~21:00 / 토 11:00~18:00 / 일 휴무.',
    locationLabel: '청담동 (압구정로데오역)',
    address: '서울 강남구 청담동 19-30 1층 유니스텔라',
    phone: '02-517-5884',
    station: '압구정로데오역·청담역',
    services: '시그니처 네일아트 · 젤네일 · 네거티브 스페이스 아트 · 페디큐어',
    priceRange: '₩70,000~200,000',
    priceWon: 70_000,
    foreignerSupport: '영어 가능 (WhatsApp 예약)',
    hours: '평일 11:00~21:00 / 토 11:00~18:00 / 일 휴무',
    promoLabel: 'K팝 셀럽 네일 성지',
    seoTitle: '유니스텔라 | 청담 K팝 셀럽 네일아트 | GlowUpTour',
    seoDescription:
      '청담동. 블랙핑크·태연 작업 네일 셀렉트샵. 글로벌 SNS 화제의 K뷰티 네일 성지. WhatsApp 영어 예약. GlowUpTour에서 예약.',
    seoTags: ['청담네일샵', '유니스텔라', 'K팝네일', '셀럽네일', '압구정네일', 'Unistella nail', 'Korean nail art', 'Kpop nails Seoul', '외국인네일샵'],
    ogDescription: '청담 네일 | 유니스텔라·K팝 셀럽 작업·글로벌 SNS 성지 — GlowUpTour',
  },
  {
    title: '네일탐투나 (Nail Tam2na)',
    slug: 'nail-tam2na-cheongdam',
    description:
      '한국 연예인 단골로 유명한 럭셔리 네일 살롱. K팝 아이돌 옆자리에서 시술받을 수 있는 곳으로 외국인 팬들에게 화제. 프리미엄 매니큐어·페디큐어 패키지·연예인 네일아트 ₩50,000~150,000. 직원 영어·한국어 구사, 카카오톡 예약 가능.',
    locationLabel: '신사동 (청담 인근)',
    address: '서울 강남구 신사동 네일탐투나',
    station: '압구정로데오역·신사역',
    services: '프리미엄 매니큐어 · 페디큐어 패키지 · 연예인 네일아트',
    priceRange: '₩50,000~150,000',
    priceWon: 50_000,
    foreignerSupport: '영어 가능 (카카오톡 예약)',
    promoLabel: '연예인 단골 살롱',
    seoTitle: '네일탐투나 | 청담 연예인 단골 럭셔리 네일 | GlowUpTour',
    seoDescription:
      '청담 인근. 한국 연예인 단골 네일 살롱. 영어 응대·카카오 예약. 프리미엄 매니큐어·페디큐어. GlowUpTour에서 예약.',
    seoTags: ['청담네일샵', '연예인네일', '럭셔리네일', '신사네일', 'celebrity nail salon Korea', 'luxury nails Seoul', '외국인네일샵'],
    ogDescription: '청담 네일 | 탐투나·연예인 단골·영어 응대 — GlowUpTour',
  },
  {
    title: '위치네일즈 서초점 (Witch Nails Seocho)',
    slug: 'witch-nails-seocho',
    description:
      '영어 응대 가능 네일샵으로 외국인 커뮤니티에서 잘 알려진 곳. 서초·명동 2개 지점을 운영해 관광 동선에 따라 선택할 수 있다. 합리적 가격대의 트렌디 젤네일·네일아트·매니큐어·페디큐어 ₩30,000~90,000.',
    locationLabel: '서초 (명동점 병행)',
    address: '서울 서초구 위치네일즈 서초점',
    station: '강남역·교대역 인근',
    services: '젤네일 · 네일아트 · 매니큐어 · 페디큐어',
    priceRange: '₩30,000~90,000',
    priceWon: 30_000,
    foreignerSupport: '영어 가능',
    promoLabel: '영어 응대·2개 지점',
    seoTitle: '위치네일즈 서초 | 영어 응대 네일아트 | GlowUpTour',
    seoDescription:
      '서초 소재, 명동점 병행. 영어 응대 가능으로 외국인 커뮤니티 인기. 합리적 가격 젤네일. GlowUpTour에서 예약.',
    seoTags: ['서초네일샵', '영어네일샵', '젤네일', '강남네일', 'English nail salon Seoul', 'Witch nails', '외국인네일샵'],
    ogDescription: '서초 네일 | 위치네일즈·영어 응대·2개 지점 — GlowUpTour',
  },
  {
    title: '공간네일 강남본점 (Gonggan Nail Gangnam)',
    slug: 'gonggan-nail-gangnam-main',
    description:
      '연장·아트 전문 네일 브랜드 본점. 인스타그램을 활발히 운영하는 트렌드 샵으로, 손톱 연장·연장 아트·젤네일·시즌 아트 ₩40,000~120,000. K-네일 특유의 화려한 아트를 원하는 외국인에게 적합. 영어 간단 응대 가능.',
    locationLabel: '강남역·신논현역 인근',
    address: '서울 강남구 봉은사로6길 29 1층 공간네일',
    station: '강남역·신논현역',
    services: '손톱 연장 · 연장 아트 · 젤네일 · 시즌 아트',
    priceRange: '₩40,000~120,000',
    priceWon: 40_000,
    foreignerSupport: '영어 간단 응대 가능',
    promoLabel: '연장 아트 전문 본점',
    seoTitle: '공간네일 강남본점 | 손톱연장·아트 전문 | GlowUpTour',
    seoDescription:
      '강남역 인근 봉은사로. 연장 아트 전문 브랜드 본점. K네일 화려한 아트 특화. GlowUpTour에서 예약.',
    seoTags: ['강남네일샵', '손톱연장', '연장아트', '젤네일', '강남역네일', 'nail extension Korea', 'K-nail art Seoul', '외국인네일샵'],
    ogDescription: '강남 네일 | 공간네일·연장 아트 전문 본점 — GlowUpTour',
  },
  {
    title: '미미에덴 신사점 (Mimi Eden Sinsa)',
    slug: 'mimi-eden-garosugil-nail',
    description:
      '가로수길 소재 젤 아트 전문샵. 100% 예약제 운영으로 프라이빗한 시술을 받을 수 있다. 트렌드 네일 디자인 ₩40,000~100,000. 가로수길 쇼핑 코스와 연계하기 좋은 위치로 외국인 쇼핑 관광 동선에 최적. 영어 간단 응대 가능.',
    locationLabel: '신사역 (가로수길)',
    address: '서울 강남구 강남대로154길 25 2층 미미에덴',
    station: '신사역',
    services: '젤 아트 전문 · 트렌드 네일 디자인',
    priceRange: '₩40,000~100,000',
    priceWon: 40_000,
    foreignerSupport: '영어 간단 응대 가능',
    promoLabel: '100% 예약제',
    seoTitle: '미미에덴 신사 | 가로수길 젤아트 100% 예약제 | GlowUpTour',
    seoDescription:
      '가로수길. 젤 아트 전문 100% 예약제. 쇼핑 동선 연계 최적. GlowUpTour에서 예약.',
    seoTags: ['가로수길네일', '신사네일샵', '젤아트', '예약제네일', 'Garosugil nail', 'gel nail Seoul', '외국인네일샵'],
    ogDescription: '가로수길 네일 | 미미에덴·젤아트·프라이빗 예약제 — GlowUpTour',
  },
  {
    title: '제이원네일 (J1 Nail)',
    slug: 'j1-nail-gangnam-station',
    description:
      '강남역 인근 실속형 네일샵. 네일아트·젤네일·케어 ₩30,000~80,000 의 합리적 가격과 강남역 접근성이 강점. 당일 예약은 네이버 톡톡, 첫 방문 5천원 할인. 간단 영어 응대.',
    locationLabel: '강남역 (테헤란로)',
    address: '서울 강남구 테헤란로4길 46 쌍용플래티넘밸류 지하1층 126호',
    station: '강남역',
    services: '네일아트 · 젤네일 · 케어',
    priceRange: '₩30,000~80,000',
    priceWon: 30_000,
    foreignerSupport: '간단 영어 응대',
    promoLabel: '첫 방문 할인',
    seoTitle: '제이원네일 | 강남역 실속 네일아트 | GlowUpTour',
    seoDescription:
      '강남역 테헤란로. 합리적 가격 네일아트·젤네일. 첫 방문 할인. GlowUpTour에서 예약.',
    seoTags: ['강남역네일', '강남네일샵', '젤네일', '실속네일', 'affordable nails Seoul', 'Gangnam nail salon', '외국인네일샵'],
    ogDescription: '강남역 네일 | 제이원·실속 가격·첫 방문 할인 — GlowUpTour',
  },
  {
    title: '포유뷰티 강남점 (For You Beauty Gangnam)',
    slug: 'foryou-beauty-gangnam-total',
    description:
      '네일·헤어익스텐션(붙임머리)·속눈썹을 한 곳에서 받는 프리미엄 토탈뷰티샵. 하루에 여러 시술을 끝내려는 외국인 관광객에게 시간 효율 최고. 고퀄리티 시술로 알려짐. 시술별 ₩30,000~. 영어 간단 응대.',
    locationLabel: '강남',
    address: '서울 강남구 포유뷰티 강남점',
    station: '강남역 인근',
    services: '네일아트 + 붙임머리 + 속눈썹 토탈 뷰티',
    priceRange: '시술별 상이 (₩30,000~)',
    priceWon: 30_000,
    foreignerSupport: '영어 간단 응대',
    promoLabel: '토탈뷰티 원스톱',
    seoTitle: '포유뷰티 강남 | 네일·속눈썹·붙임머리 토탈뷰티 | GlowUpTour',
    seoDescription:
      '강남. 네일+속눈썹+붙임머리 원스톱 토탈뷰티. 관광 중 하루 완성 뷰티 코스. GlowUpTour에서 예약.',
    seoTags: ['강남토탈뷰티', '네일속눈썹', '붙임머리', '원스톱뷰티', 'total beauty salon Seoul', 'eyelash nail Korea', '외국인네일샵'],
    ogDescription: '강남 토탈뷰티 | 포유뷰티·네일+속눈썹+헤어 원스톱 — GlowUpTour',
  },
  {
    title: '네일팰리스 (Nail Palace)',
    slug: 'nail-palace-daechi',
    description:
      '발톱교정·문제성 발톱 케어 특화 — 단순 아트를 넘어 발 건강 관리까지 하는 대치동 네일샵. 젤네일아트·발각질제거 ₩30,000~90,000. 여행 중 발 트러블 관리가 필요한 외국인에게 실용적. 매일 10:30~20:30 운영. 간단 영어 응대.',
    locationLabel: '대치동 (도곡역)',
    address: '서울 강남구 대치동 670 동부센트레빌상가 119호',
    phone: '02-569-4841',
    station: '도곡역·대치역',
    services: '젤네일아트 · 발톱교정 · 발각질제거 · 문제성 발톱 케어',
    priceRange: '₩30,000~90,000',
    priceWon: 30_000,
    foreignerSupport: '간단 영어 응대',
    hours: '매일 10:30~20:30',
    promoLabel: '발톱교정 특화',
    seoTitle: '네일팰리스 | 대치동 발톱교정·젤네일 | GlowUpTour',
    seoDescription:
      '대치동. 발톱교정·문제성 발톱 케어 특화. 젤네일아트·발각질 관리. GlowUpTour에서 예약.',
    seoTags: ['대치동네일', '발톱교정', '문제성발톱', '젤네일', '페디케어', 'toenail correction Korea', 'pedicure Seoul', '외국인네일샵'],
    ogDescription: '대치동 네일 | 팰리스·발톱교정·발 건강 케어 — GlowUpTour',
  },
  {
    title: '강남네일맑음 (Gangnam Nail Malgeum)',
    slug: 'gangnam-nail-malgeum',
    description:
      '강남역 인근 감성 네일샵. 깔끔한 시술과 차분한 분위기로 강남 중심 상권 접근성이 우수하다. 네일아트·젤네일·케어·페디큐어 ₩30,000~80,000. 간단 영어 응대.',
    locationLabel: '강남역·역삼역 인근',
    address: '서울 강남구 강남대로78길 24 3층 강남네일맑음',
    station: '강남역·역삼역',
    services: '네일아트 · 젤네일 · 케어 · 페디큐어',
    priceRange: '₩30,000~80,000',
    priceWon: 30_000,
    foreignerSupport: '간단 영어 응대',
    promoLabel: '감성 네일',
    seoTitle: '강남네일맑음 | 강남역 감성 네일아트 | GlowUpTour',
    seoDescription:
      '강남대로78길. 깔끔한 시술·차분한 감성 네일샵. 젤네일·페디큐어. GlowUpTour에서 예약.',
    seoTags: ['강남네일샵', '강남역네일', '감성네일', '젤네일', '페디큐어', 'cozy nail salon Seoul', 'Gangnam nails', '외국인네일샵'],
    ogDescription: '강남 네일 | 맑음·감성 시술·강남역 접근성 — GlowUpTour',
  },
  {
    title: '플로우네일 (FLOWNAIL)',
    slug: 'flownail-gangnam-yeoksam',
    description:
      '강남역 인근 트렌드 네일샵. 네일아트·젤네일·손톱연장 ₩30,000~90,000. 월~토 11:00~21:00 운영으로 저녁 늦게까지 시술 가능, 강남역 상권 내 접근성 좋은 위치. 간단 영어 응대.',
    locationLabel: '역삼동 (강남역)',
    address: '서울 강남구 역삼동 825-19 플로우네일',
    phone: '070-8845-9191',
    station: '강남역·역삼역',
    services: '네일아트 · 젤네일 · 손톱연장',
    priceRange: '₩30,000~90,000',
    priceWon: 30_000,
    foreignerSupport: '간단 영어 응대',
    hours: '월~토 11:00~21:00',
    promoLabel: '밤 9시까지 운영',
    seoTitle: '플로우네일 | 강남역 트렌드 젤네일 | GlowUpTour',
    seoDescription:
      '역삼동 강남역 인근. 트렌드 네일아트·손톱연장. 야간 9시까지 운영. GlowUpTour에서 예약.',
    seoTags: ['강남역네일', '역삼네일샵', '젤네일', '손톱연장', 'trendy nails Seoul', 'Gangnam nail art', '외국인네일샵'],
    ogDescription: '강남역 네일 | 플로우·트렌드 아트·저녁 9시까지 — GlowUpTour',
  },
  {
    title: 'H2네일 (H2 Nail)',
    slug: 'h2-nail-seocho',
    description:
      '서초동 1층 매장으로 접근이 편리한 실속형 네일샵. 네일아트·젤네일·페디큐어 ₩30,000~80,000. 매일 11:00~21:00 운영 (공휴일 휴무). 간단 영어 응대.',
    locationLabel: '서초동 (강남역·교대역)',
    address: '서울 서초구 서초동 1344-13 1층 108호 H2네일',
    station: '강남역·교대역',
    services: '네일아트 · 젤네일 · 페디큐어',
    priceRange: '₩30,000~80,000',
    priceWon: 30_000,
    foreignerSupport: '간단 영어 응대',
    hours: '매일 11:00~21:00 (공휴일 휴무)',
    promoLabel: '1층 접근성',
    seoTitle: 'H2네일 | 서초 실속 젤네일·페디 | GlowUpTour',
    seoDescription:
      '서초동 1층 매장. 실속형 네일아트·젤네일·페디큐어. 매일 저녁 9시까지. GlowUpTour에서 예약.',
    seoTags: ['서초네일샵', '강남역네일', '젤네일', '페디큐어', '실속네일', 'nail salon Seocho', 'affordable nails Seoul', '외국인네일샵'],
    ogDescription: '서초 네일 | H2·1층 접근성·실속 시술 — GlowUpTour',
  },
  {
    title: '서초 심야네일 (Seocho Late-Night Nail)',
    slug: 'seocho-latenight-nail',
    description:
      '매일 11:00~23:00 심야 운영 — 저녁 일정 후에도 시술 가능한 강남권 야간 네일샵. 젤네일·네일아트·속눈썹연장 ₩30,000~90,000. 8시 이후 예약 필수, 일요일도 운영. 낮에 관광하고 밤에 뷰티 케어를 받으려는 외국인 여행객에게 최적. 간단 영어 응대.',
    locationLabel: '서초동 (강남역 인근)',
    address: '서울 서초구 서초동 1319-13 심야네일',
    station: '강남역',
    services: '젤네일 · 네일아트 · 속눈썹연장',
    priceRange: '₩30,000~90,000',
    priceWon: 30_000,
    foreignerSupport: '간단 영어 응대',
    hours: '매일 11:00~23:00 (8시 이후 예약 필수 · 일요일 운영)',
    promoLabel: '밤 11시 심야 운영',
    seoTitle: '서초 심야네일 | 밤 11시까지 야간 네일 | GlowUpTour',
    seoDescription:
      '서초동 강남역 인근. 매일 밤 11시까지 심야 운영. 관광 후 저녁 네일 가능. 일요일 운영. GlowUpTour에서 예약.',
    seoTags: ['심야네일', '야간네일샵', '서초네일', '강남역네일', '일요일네일', 'late night nails Seoul', 'night nail salon Korea', '외국인네일샵'],
    ogDescription: '서초 네일 | 심야 밤 11시·일요일 운영·관광 후 케어 — GlowUpTour',
  },
];
