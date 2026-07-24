/**
 * 청담·강남 외국인 FIT 추천 메이크업샵 9곳 — founder 2026-07-24 큐레이션.
 *
 * 마스터 콘솔의 "메이크업샵 9종 일괄 등록" 버튼이 이 배열을 읽어
 * partner_listings 테이블에 category='makeup', status='approved' 로
 * 한 번에 insert. 같은 slug 는 skip — 멱등.
 *
 * SEO(메타 타이틀·디스크립션)는 partner_listing_locale_content 의
 * kr 행에 저장 — scripts/translate-locale-content.mjs 가 KR 소스로
 * en/zh/ja/ru/vi 를 생성. 브랜드명은 "GlowUpTour" 통일.
 */

export type MakeupShopSeed = {
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

export const SEOUL_MAKEUP_PRODUCTS: ReadonlyArray<MakeupShopSeed> = [
  {
    title: '정샘물 인스피레이션 (Jung Saem Mool Inspiration)',
    slug: 'jungsaemmool-inspiration-cheongdam',
    description:
      'K뷰티를 대표하는 메이크업 아티스트 정샘물의 플래그십 살롱. \'물광 피부\' 투명 메이크업의 원조로 전 세계 K뷰티 팬들의 버킷리스트 샵이다. 시그니처 투명 메이크업·웨딩 메이크업·헤어 스타일링·데일리 메이크업 ₩150,000~400,000. 자체 코스메틱 브랜드(JSM) 보유, 일요일도 운영. 영어 응대 가능.',
    locationLabel: '삼성동 (청담 인근)',
    address: '서울 강남구 삼성동 115-8 5층 정샘물 인스피레이션',
    station: '청담역·압구정로데오역',
    services: '시그니처 투명 메이크업 · 웨딩 메이크업 · 헤어 스타일링 · 데일리 메이크업',
    priceRange: '₩150,000~400,000',
    priceWon: 150_000,
    foreignerSupport: '영어 가능',
    hours: '일요일 운영',
    promoLabel: '물광 메이크업 원조',
    seoTitle: '정샘물 인스피레이션 | 청담 K뷰티 대표 메이크업 | GlowUpTour',
    seoDescription:
      '삼성동. K뷰티 아이콘 정샘물 플래그십. 물광 투명 메이크업 원조. 글로벌 팬 버킷리스트. 영어 응대. GlowUpTour에서 예약.',
    seoTags: ['청담메이크업', '정샘물', 'K뷰티메이크업', '물광메이크업', '웨딩메이크업', 'Jung Saem Mool', 'K-beauty makeup Seoul', 'glass skin makeup', '외국인메이크업'],
    ogDescription: '청담 메이크업 | 정샘물·물광 피부 원조·K뷰티 아이콘 — GlowUpTour',
  },
  {
    title: '제니하우스 (Jenny House)',
    slug: 'jenny-house-cheongdam-makeup',
    description:
      '박신혜·손예진·한지민·송지효·이민정 등 톱배우가 방문하는 럭셔리 토탈 뷰티 살롱 — "웨딩 메이크업의 성지". 카메라에 잘 받는 맑고 투명한 피부 표현 특화, 웨딩·동안 메이크업·헤어·하객/가족 스타일링 ₩150,000~500,000. 드라마·화보 스타일 재현으로 K드라마 팬 외국인에게 인기, 가족 단위 스타일링 가능. 영어·중국어 응대.',
    locationLabel: '청담동 (압구정로데오역)',
    address: '서울 강남구 청담동 제니하우스 청담',
    station: '압구정로데오역·청담역',
    services: '웨딩 메이크업 · 동안 메이크업 · 헤어 · 하객/가족 스타일링',
    priceRange: '₩150,000~500,000',
    priceWon: 150_000,
    foreignerSupport: '영어·중국어 가능',
    promoLabel: '톱배우 단골 살롱',
    seoTitle: '제니하우스 | 청담 톱배우 단골 럭셔리 메이크업 | GlowUpTour',
    seoDescription:
      '청담동. 박신혜·손예진 방문 럭셔리 살롱. 웨딩 메이크업 성지·동안 메이크업. 가족 스타일링 가능. GlowUpTour에서 예약.',
    seoTags: ['청담메이크업', '제니하우스', '연예인메이크업', '웨딩메이크업', '동안메이크업', 'Jenny House Korea', 'celebrity makeup Seoul', 'K-drama makeup', '외국인메이크업'],
    ogDescription: '청담 메이크업 | 제니하우스·톱배우 단골·웨딩 성지 — GlowUpTour',
  },
  {
    title: '순수 청담본점 (Soonsoo Cheongdam)',
    slug: 'soonsoo-cheongdam-makeup',
    description:
      '아나운서 스타일 단정·지적인 메이크업으로 유명한 청담 대표 살롱. 뉴스 앵커·방송인 다수를 담당하며, 아나운서 스타일 메이크업·웨딩·헤어·단정 스타일링 ₩120,000~350,000. 면접·비즈니스·포멀 행사용 메이크업을 원하는 외국인에게도 적합. 영어 응대 가능.',
    locationLabel: '청담동 (청담역)',
    address: '서울 강남구 청담동 141-9 순수 청담본점',
    phone: '02-518-8100',
    station: '청담역',
    services: '아나운서 스타일 메이크업 · 웨딩 · 헤어 · 단정 스타일링',
    priceRange: '₩120,000~350,000',
    priceWon: 120_000,
    foreignerSupport: '영어 가능',
    promoLabel: '아나운서 스타일',
    seoTitle: '순수 청담본점 | 아나운서 스타일 메이크업 | GlowUpTour',
    seoDescription:
      '청담동. 아나운서·방송인 단골 살롱. 단정하고 지적인 스타일 특화. 비즈니스·포멀 메이크업. GlowUpTour에서 예약.',
    seoTags: ['청담메이크업', '순수청담', '아나운서메이크업', '단정메이크업', '웨딩메이크업', 'announcer makeup Korea', 'formal makeup Seoul', '외국인메이크업'],
    ogDescription: '청담 메이크업 | 순수·아나운서 스타일·방송인 단골 — GlowUpTour',
  },
  {
    title: '김청경 헤어페이스 (Kim Chung Kyung Hair Face)',
    slug: 'kimchungkyung-hairface-cheongdam',
    description:
      '김정은·정지소 등 배우 스타일링을 맡아온 "뷰티계의 전설" 김청경 원장 살롱. 밝은 톤 피부 표현과 세련된 아이 메이크업으로 청담 클래식 메이크업의 기준으로 불린다. 단아한 클래식 메이크업·웨딩·헤어 ₩130,000~400,000. 영어 응대 가능.',
    locationLabel: '청담동 (청담역)',
    address: '서울 강남구 청담동 김청경 헤어페이스',
    station: '청담역·압구정로데오역',
    services: '단아한 클래식 메이크업 · 웨딩 · 헤어',
    priceRange: '₩130,000~400,000',
    priceWon: 130_000,
    foreignerSupport: '영어 가능',
    promoLabel: '뷰티계의 전설',
    seoTitle: '김청경 헤어페이스 | 청담 클래식 메이크업 전설 | GlowUpTour',
    seoDescription:
      '청담동. 배우 스타일링 전설 김청경 원장. 단아한 클래식·세련된 아이 메이크업. GlowUpTour에서 예약.',
    seoTags: ['청담메이크업', '김청경', '클래식메이크업', '단아한메이크업', '배우메이크업', 'classic makeup Korea', 'actress makeup Seoul', '외국인메이크업'],
    ogDescription: '청담 메이크업 | 김청경·뷰티계 전설·클래식의 기준 — GlowUpTour',
  },
  {
    title: '본샵 (Bon Shop)',
    slug: 'bonshop-celebrity-makeup-cheongdam',
    description:
      '연예인들이 많이 찾는 청담 대표 셀럽 살롱. 드라마·화보 현장 스타일링 경험이 풍부한 아티스트진이 연예인 메이크업·화보·웨딩·헤어를 담당한다. ₩130,000~400,000. K셀럽과 같은 아티스트에게 받는 경험 자체가 관광 콘텐츠. 영어 응대 가능.',
    locationLabel: '청담동 (청담역)',
    address: '서울 강남구 청담동 본샵',
    station: '청담역·압구정로데오역',
    services: '연예인 메이크업 · 화보 · 웨딩 · 헤어',
    priceRange: '₩130,000~400,000',
    priceWon: 130_000,
    foreignerSupport: '영어 가능',
    promoLabel: '화보 아티스트진',
    seoTitle: '본샵 | 청담 연예인 단골 메이크업 | GlowUpTour',
    seoDescription:
      '청담동. 연예인 다수 방문 셀럽 살롱. 드라마·화보 현장 아티스트진. K셀럽 스타일 체험. GlowUpTour에서 예약.',
    seoTags: ['청담메이크업', '본샵', '연예인메이크업', '화보메이크업', '셀럽살롱', 'celebrity salon Korea', 'K-star makeup Seoul', '외국인메이크업'],
    ogDescription: '청담 메이크업 | 본샵·연예인 단골·화보 아티스트진 — GlowUpTour',
  },
  {
    title: '애브뉴준오 청담 (Avenue Juno Cheongdam)',
    slug: 'avenue-juno-cheongdam',
    description:
      '전국 프리미엄 헤어 브랜드 준오헤어의 하이엔드 라인. 자연스러운 스타일링이 강점 — 과하지 않은 데일리 룩을 선호하는 외국인에게 적합하다. 자연스러운 스타일링·웨딩 헤어&메이크업·커트·염색 ₩100,000~350,000. 헤어+메이크업 원스톱. 영어 응대 가능.',
    locationLabel: '청담동 (청담역)',
    address: '서울 강남구 청담동 애브뉴준오 청담',
    station: '청담역·압구정로데오역',
    services: '자연스러운 스타일링 · 웨딩 헤어&메이크업 · 커트 · 염색',
    priceRange: '₩100,000~350,000',
    priceWon: 100_000,
    foreignerSupport: '영어 가능',
    promoLabel: '헤어+메이크업 원스톱',
    seoTitle: '애브뉴준오 청담 | 자연스러운 헤어+메이크업 | GlowUpTour',
    seoDescription:
      '청담동. 준오헤어 하이엔드 라인. 자연스러운 스타일링 특화. 헤어+메이크업 원스톱. GlowUpTour에서 예약.',
    seoTags: ['청담메이크업', '애브뉴준오', '자연스러운메이크업', '헤어메이크업', 'natural makeup Korea', 'hair makeup Seoul', '외국인메이크업'],
    ogDescription: '청담 뷰티 | 애브뉴준오·내추럴 스타일·원스톱 — GlowUpTour',
  },
  {
    title: '정남 (Jung Nam)',
    slug: 'jungnam-trendy-makeup-cheongdam',
    description:
      '꼼꼼함+트렌디함으로 셀럽들이 즐겨 찾는 청담 샵. 신속하면서 섬세한 터치로 최신 유행 메이크업 스타일을 부담스럽지 않게 소화한다. 트렌디 메이크업·꼼꼼한 스타일링·웨딩 ₩120,000~350,000. 요즘 K뷰티 트렌드를 경험하고 싶은 외국인에게 최적. 영어 응대 가능.',
    locationLabel: '청담동 (청담역)',
    address: '서울 강남구 청담동 정남',
    station: '청담역',
    services: '트렌디 메이크업 · 꼼꼼한 스타일링 · 웨딩',
    priceRange: '₩120,000~350,000',
    priceWon: 120_000,
    foreignerSupport: '영어 가능',
    promoLabel: '트렌디+꼼꼼',
    seoTitle: '정남 | 청담 트렌디 셀럽 메이크업 | GlowUpTour',
    seoDescription:
      '청담동. 셀럽 단골 트렌디 메이크업. 꼼꼼하고 섬세한 터치. 최신 K뷰티 트렌드 체험. GlowUpTour에서 예약.',
    seoTags: ['청담메이크업', '트렌디메이크업', '셀럽메이크업', 'K뷰티트렌드', 'trendy makeup Korea', 'K-beauty trend Seoul', '외국인메이크업'],
    ogDescription: '청담 메이크업 | 정남·트렌디+꼼꼼·셀럽 단골 — GlowUpTour',
  },
  {
    title: '꼼나나 (Ccomnana)',
    slug: 'ccomnana-idol-makeup-cheongdam',
    description:
      'K팝 아이돌 메이크업으로 유명한 살롱 — 소녀 감성·아이돌 무대 스타일 재현 특화. 해외 K팝 팬들이 "아이돌 메이크업 체험"으로 가장 많이 찾는 샵 중 하나로 SNS 화제성이 높다. 아이돌 메이크업·소녀 감성 메이크업·트렌드 룩 ₩100,000~300,000. 영어 응대 가능.',
    locationLabel: '청담동 (압구정로데오역)',
    address: '서울 강남구 청담동 꼼나나',
    station: '압구정로데오역·청담역',
    services: '아이돌 메이크업 · 소녀 감성 메이크업 · 트렌드 룩',
    priceRange: '₩100,000~300,000',
    priceWon: 100_000,
    foreignerSupport: '영어 가능',
    promoLabel: 'K팝 아이돌 메이크업',
    seoTitle: '꼼나나 | 청담 K팝 아이돌 메이크업 체험 | GlowUpTour',
    seoDescription:
      '청담동. K팝 아이돌 메이크업 유명 살롱. 소녀 감성·무대 스타일 재현. 해외 K팝 팬 성지. GlowUpTour에서 예약.',
    seoTags: ['청담메이크업', '아이돌메이크업', 'K팝메이크업', '꼼나나', '소녀감성메이크업', 'Kpop idol makeup', 'idol makeup experience Seoul', '외국인메이크업'],
    ogDescription: '청담 메이크업 | 꼼나나·K팝 아이돌 스타일·팬 성지 — GlowUpTour',
  },
  {
    title: '모니카뷰티 (Monica Beauty)',
    slug: 'monica-beauty-private-makeup-cheongdam',
    description:
      '개별룸+출장 메이크업으로 프라이빗 서비스 특화. 호텔 출장 메이크업이 가능해 숙소에서 편하게 받으려는 외국인 VIP·웨딩 촬영 고객에게 최적이다. 개별룸 프라이빗 메이크업·출장 메이크업·웨딩 ₩130,000~400,000 (출장 별도). 프라이버시 중시 고객 선호. 영어 응대 가능.',
    locationLabel: '청담동 (청담역)',
    address: '서울 강남구 청담동 모니카뷰티',
    station: '청담역',
    services: '개별룸 프라이빗 메이크업 · 출장 메이크업 · 웨딩',
    priceRange: '₩130,000~400,000 (출장 별도)',
    priceWon: 130_000,
    foreignerSupport: '영어 가능',
    promoLabel: '호텔 출장 가능',
    seoTitle: '모니카뷰티 | 청담 개별룸·호텔 출장 메이크업 | GlowUpTour',
    seoDescription:
      '청담동. 개별룸 프라이빗+호텔 출장 메이크업. VIP·웨딩 촬영 특화. 숙소 방문 가능. GlowUpTour에서 예약.',
    seoTags: ['청담메이크업', '출장메이크업', '프라이빗메이크업', '호텔메이크업', 'VIP메이크업', 'hotel makeup service Seoul', 'private makeup Korea', '외국인메이크업'],
    ogDescription: '청담 메이크업 | 모니카뷰티·개별룸·호텔 출장 가능 — GlowUpTour',
  },
];
