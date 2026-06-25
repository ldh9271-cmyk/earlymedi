/**
 * 강남·서초 외국인 FIT 추천 맛집 10곳 — founder 2026-06-25 큐레이션.
 *
 * 마스터 콘솔의 "강남 맛집 10종 일괄 등록" 버튼이 이 배열을 읽어
 * partner_listings 테이블에 category='food', status='approved' 로
 * 한 번에 insert. 이미 같은 slug 가 있으면 skip — 멱등.
 *
 * 가격은 단가표 범위의 하한값/대표값. details.address 가 채워져
 * 있으므로 상세 페이지의 "상세 정보" 섹션에서 Google 지도 자동
 * 노출.
 */

export type GangnamFoodSeed = {
  title: string;
  description: string;
  /** /master/listings 표·카드의 "위치" 라벨. */
  locationLabel: string;
  /** Google Maps 검색 쿼리 — details.address 로 저장. */
  address: string;
  /** ₩ 표시용 가격 (하한값). */
  priceWon: number;
  priceUnit: string;
  /** 카테고리별 메타 — 상세 페이지·관리 UI 에서 활용 가능. */
  cuisine: string;
  signatureMenu: string;
  /** "예약 필수" 같은 짧은 promo pill. */
  promoLabel?: string;
};

export const GANGNAM_FOOD_PRODUCTS: ReadonlyArray<GangnamFoodSeed> = [
  {
    title: '비언유주얼 (Be:N Unusual)',
    description:
      '테이블 위 3D 미디어 아트 영상과 함께 즐기는 한식 파인다이닝 코스. 블루리본 3년 연속 선정, 외국인 사이에서 "경험형 한식"으로 극강 인기. 시즌 코스 1인 ₩150,000~200,000. 예약 필수.',
    locationLabel: '강남구 선릉',
    address: '서울 강남구 선릉로108길 5 지하1층',
    priceWon: 150_000,
    priceUnit: '1인 (코스)',
    cuisine: '한식 파인다이닝',
    signatureMenu: '시즌 코스 (1인 ₩150,000~200,000)',
    promoLabel: '예약 필수',
  },
  {
    title: '무월식탁',
    description:
      '식판 스타일로 차려내는 한국 가정식 정식. 매일 바뀌는 반찬과 제철 재료로, 강남역 도보 6분에서 늘 줄 서는 집. 옛날 소불고기 정식 ₩16,500 등 합리적 가격대.',
    locationLabel: '강남역 인근',
    address: '서울 강남구 강남대로 396 무월식탁',
    priceWon: 16_500,
    priceUnit: '1인',
    cuisine: '한식 가정식 정식',
    signatureMenu: '옛날 소불고기 정식 ₩16,500',
  },
  {
    title: '다몽집',
    description:
      '직원이 직접 초벌해서 서빙해주는 한우 BBQ. 외국인 혼자서도 편하게 즐길 수 있도록 시스템화. 1++ 한우 살치살, 한우 육회비빔밥 등 다양한 부위·메뉴.',
    locationLabel: '강남역·신논현역',
    address: '서울 강남구 강남대로100길 13',
    priceWon: 80_000,
    priceUnit: '1인',
    cuisine: '한우 BBQ',
    signatureMenu: '1++ 한우살치살 130g · 한우육회비빔밥',
  },
  {
    title: '하이디라오 강남점',
    description:
      '서비스로 유명한 글로벌 훠궈 브랜드 하이디라오의 강남 매장. 영어 메뉴 완비로 외국인에게 안정감 있는 선택, 다이닝코드 ★4.5. 훠궈 1인 ₩25,000~40,000.',
    locationLabel: '강남역',
    address: '서울 강남구 강남대로 422 하이디라오 강남점',
    priceWon: 25_000,
    priceUnit: '1인',
    cuisine: '중국 훠궈',
    signatureMenu: '훠궈 (1인 ₩25,000~40,000)',
  },
  {
    title: '타이엘리펀트 (Thai Elephant) 강남점',
    description:
      '파인다이닝급 태국 요리. 태국식 족발덮밥 카우카무 ₩15,000, 팟타이꿍 ₩18,000. 데이트·외국인 손님 모두 만족도 높음.',
    locationLabel: '강남역',
    address: '서울 강남구 강남대로 396 타이엘리펀트 강남점',
    priceWon: 15_000,
    priceUnit: '1인',
    cuisine: '태국 요리',
    signatureMenu: '카우카무 ₩15,000 · 팟타이꿍 ₩18,000',
  },
  {
    title: '마을양조장',
    description:
      '한국 최초의 도심형 막걸리 양조장. 봄·여름·가을·겨울 4종 생막걸리와 전·수육·칵테일 막걸리를 함께 즐길 수 있어 전통주에 관심 있는 외국인에게 독보적인 경험.',
    locationLabel: '강남구',
    address: '서울 강남구 마을양조장',
    priceWon: 30_000,
    priceUnit: '1인',
    cuisine: '한국 전통주·막걸리 펍',
    signatureMenu: '생막걸리 4종 + 전·수육·칵테일 막걸리',
  },
  {
    title: '정돈 (Jeongdon) 강남점',
    description:
      '한국 최고 돈카츠 맛집 중 하나로 손꼽힘. 바삭하고 두꺼운 한국식 돈카츠로 현지인과 외국인 모두 줄 서는 집. 등심 돈카츠 ₩16,000~22,000.',
    locationLabel: '강남구 압구정·청담',
    address: '서울 강남구 압구정동 정돈',
    priceWon: 16_000,
    priceUnit: '1인',
    cuisine: '돈카츠',
    signatureMenu: '등심 돈카츠 ₩16,000~22,000',
  },
  {
    title: '슈퍼집 강남점',
    description:
      'K-드라마 스타들의 단골 떡볶이·분식 바로 유명. 힙하고 트렌디한 인테리어와 마늘떡볶이·해물치즈떡볶이 같은 SNS 감성 메뉴.',
    locationLabel: '강남구 언주로',
    address: '서울 강남구 언주로14길 130 슈퍼집 강남점',
    priceWon: 12_000,
    priceUnit: '1인',
    cuisine: '떡볶이·분식 바',
    signatureMenu: '마늘떡볶이 · 해물치즈떡볶이 ₩12,000~18,000',
  },
  {
    title: '까마리',
    description:
      '청담동 한우 특수부위 구이 전문점. 유명인 단골집으로 한우 퀄리티 최상, 콜키지 프리로 와인 반입 가능. 청담의 고급 저녁 코스로 인기.',
    locationLabel: '강남구 청담',
    address: '서울 강남구 청담동 까마리',
    priceWon: 100_000,
    priceUnit: '1인',
    cuisine: '한우 특수부위 구이',
    signatureMenu: '한우 특수부위 모둠 · 등심 (시가)',
    promoLabel: '콜키지 프리',
  },
  {
    title: '백종원 원조쌈밥집',
    description:
      '유명 셰프 백종원이 운영하는 한식 쌈밥집. 20가지 야채 쌈채소와 삼겹살 구이로 외국인에게 "진짜 한국 밥상" 경험을 제공. K-콘텐츠 팬 필수 방문지. 삼겹살 쌈밥 세트 ₩15,000~20,000.',
    locationLabel: '서초구 반포 (고속터미널역)',
    address: '서울 서초구 신반포로 194 고속버스터미널 지하1층 백종원 원조쌈밥집',
    priceWon: 15_000,
    priceUnit: '1인',
    cuisine: '한식 쌈밥',
    signatureMenu: '삼겹살 쌈밥 세트 ₩15,000~20,000',
  },
];
