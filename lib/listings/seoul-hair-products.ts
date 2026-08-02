/**
 * 청담·압구정·강남역 외국인 FIT 추천 헤어샵 10곳 — founder 2026-07-24
 * 큐레이션 (2026-08-02 리안헤어 강남역점 추가).
 *
 * 마스터 콘솔의 "헤어샵 일괄 등록" 버튼이 이 배열을 읽어
 * partner_listings 테이블에 category='hair', status='approved' 로
 * 한 번에 insert. 같은 slug 는 skip — 멱등.
 *
 * SEO(메타 타이틀·디스크립션)는 partner_listing_locale_content 의
 * kr 행에 저장 — scripts/translate-locale-content.mjs 가 KR 소스로
 * en/zh/ja/ru/vi 를 생성. 브랜드명은 "GlowUpTour" 통일.
 */

export type HairShopSeed = {
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
  /** 영업시간 — 확인된 곳만. details.hours 로 저장. */
  hours?: string;
  /** ₩ 표시용 가격 (하한값 — 컷 기준). */
  priceWon: number;
  foreignerSupport: string;
  promoLabel: string;
  seoTitle: string;
  seoDescription: string;
  seoTags: string[];
  ogDescription: string;
};

export const SEOUL_HAIR_PRODUCTS: ReadonlyArray<HairShopSeed> = [
  {
    title: '차홍아르더 아뜰리에 도산 (Chahong Ardor Atelier Dosan)',
    slug: 'chahong-ardor-dosan-hair',
    description:
      '한국인 최초 로레알 프로페셔널 파리 세계적 아티스트로 선정된 차홍 원장의 플래그십. 2015~2019년 5년 연속 국가브랜드 대상, 셀럽 다수 담당. 프리미엄 컷·펌·염색에 헤어+메이크업+네일 토탈 뷰티까지 — 컷 ₩60,000~ / 펌·염색 ₩200,000~. 도산·본점·청담점 운영, 프라이빗 고급 서비스로 외국인 VIP 선호. 영어 응대 가능.',
    locationLabel: '도산공원 (청담)',
    address: '서울 강남구 언주로152길 10 차홍아르더 아뜰리에 도산',
    phone: '02-3445-8520',
    station: '압구정로데오역·청담역',
    services: '프리미엄 컷 · 펌 · 염색 · 헤어+메이크업+네일 토탈 뷰티',
    priceRange: '컷 ₩60,000~ / 펌·염색 ₩200,000~',
    priceWon: 60_000,
    foreignerSupport: '영어 가능',
    promoLabel: '로레알 파리 아티스트',
    seoTitle: '차홍아르더 도산 | 청담 프리미엄 헤어 플래그십 | GlowUpTour',
    seoDescription:
      '도산공원 인근. 로레알 파리 아티스트 차홍 원장. 5년 연속 국가브랜드 대상. 헤어+메이크업+네일 토탈. GlowUpTour에서 예약.',
    seoTags: ['청담헤어샵', '차홍아르더', '프리미엄미용실', '셀럽헤어', '토탈뷰티', 'Chahong hair Seoul', 'luxury hair salon Korea', '외국인헤어샵'],
    ogDescription: '청담 헤어 | 차홍아르더·로레알 파리 아티스트·국가브랜드 대상 — GlowUpTour',
  },
  {
    title: '청담 본샵 (Cheongdam Bon Shop Hair)',
    slug: 'cheongdam-bonshop-kpop-hair',
    description:
      '방탄소년단(BTS)·트와이스·수지·엑소가 스타일링 받는 곳으로 알려진 K팝 성지 헤어샵. 해외 팬들이 "내 아이돌과 같은 샵" 체험으로 가장 많이 검색하는 살롱 중 하나다. 아이돌 스타일링·컷·펌·염색·화보 헤어 — 컷 ₩50,000~ / 펌·염색 ₩150,000~. 영어 응대 가능.',
    locationLabel: '청담동 (압구정로데오역)',
    address: '서울 강남구 청담동 본샵 헤어',
    station: '압구정로데오역·청담역',
    services: '아이돌 스타일링 · 컷 · 펌 · 염색 · 화보 헤어',
    priceRange: '컷 ₩50,000~ / 펌·염색 ₩150,000~',
    priceWon: 50_000,
    foreignerSupport: '영어 가능',
    promoLabel: 'BTS·트와이스 스타일링',
    seoTitle: '청담 본샵 | BTS·트와이스 스타일링 K팝 헤어 성지 | GlowUpTour',
    seoDescription:
      '청담동. BTS·트와이스·수지·엑소 스타일링 샵. K팝 팬 버킷리스트 헤어 체험. GlowUpTour에서 예약.',
    seoTags: ['청담헤어샵', 'BTS헤어샵', '아이돌헤어', 'K팝헤어', '본샵', 'BTS hair salon', 'Kpop idol hair Seoul', 'idol hair experience', '외국인헤어샵'],
    ogDescription: '청담 헤어 | 본샵·BTS 트와이스 스타일링·K팝 성지 — GlowUpTour',
  },
  {
    title: '제니하우스 청담힐 (Jenny House Cheongdam Hill)',
    slug: 'jennyhouse-cheongdamhill-hair',
    description:
      '건물 전체가 토탈 뷰티숍인 청담 랜드마크. 웨딩 헤어&메이크업 최고 명성에 박신혜·손예진 등 톱배우 단골로, 헤어부터 메이크업까지 한 건물에서 완성할 수 있다. 헤어 ₩60,000~ / 웨딩 패키지 ₩300,000~. 청담힐·프리모 지점 운영. 영어·중국어 응대.',
    locationLabel: '청담동 (압구정로데오역)',
    address: '서울 강남구 청담동 제니하우스 청담힐',
    station: '압구정로데오역',
    services: '웨딩 헤어&메이크업 · 토탈 뷰티(건물 전체) · 셀럽 스타일링',
    priceRange: '헤어 ₩60,000~ / 웨딩 패키지 ₩300,000~',
    priceWon: 60_000,
    foreignerSupport: '영어·중국어 가능',
    promoLabel: '토탈 뷰티 랜드마크',
    seoTitle: '제니하우스 청담힐 | 건물 전체 토탈 뷰티 랜드마크 | GlowUpTour',
    seoDescription:
      '청담동. 건물 전체 토탈 뷰티숍. 웨딩 헤어&메이크업 명성. 톱배우 단골. GlowUpTour에서 예약.',
    seoTags: ['청담헤어샵', '제니하우스', '웨딩헤어', '토탈뷰티', '셀럽헤어샵', 'Jenny House hair', 'wedding hair Seoul', '외국인헤어샵'],
    ogDescription: '청담 헤어 | 제니하우스·토탈 뷰티 랜드마크·웨딩 명성 — GlowUpTour',
  },
  {
    title: '조이187 (Joy187)',
    slug: 'joy187-aespa-hair-cheongdam',
    description:
      '에스파(aespa)가 이용하는 헤어샵으로 알려진 곳. 4세대 아이돌 트렌드 스타일 특화로 최신 K팝 헤어 트렌드를 경험하려는 젊은 외국인 팬들에게 인기 급상승 중. 아이돌 스타일링·트렌드 컷·펌·염색 — 컷 ₩50,000~ / 펌·염색 ₩150,000~. 영어 응대 가능.',
    locationLabel: '청담동 (청담역)',
    address: '서울 강남구 청담동 조이187',
    station: '청담역·압구정로데오역',
    services: '아이돌 스타일링 · 트렌드 컷 · 펌 · 염색',
    priceRange: '컷 ₩50,000~ / 펌·염색 ₩150,000~',
    priceWon: 50_000,
    foreignerSupport: '영어 가능',
    promoLabel: '에스파 단골',
    seoTitle: '조이187 | 에스파 단골 청담 아이돌 헤어 | GlowUpTour',
    seoDescription:
      '청담동. 에스파 이용 헤어샵. 4세대 아이돌 트렌드 스타일 특화. K팝 팬 인기 급상승. GlowUpTour에서 예약.',
    seoTags: ['청담헤어샵', '에스파헤어', '아이돌헤어', '조이187', 'K팝트렌드헤어', 'aespa hair salon', 'Kpop 4th gen hair', '외국인헤어샵'],
    ogDescription: '청담 헤어 | 조이187·에스파 단골·4세대 아이돌 트렌드 — GlowUpTour',
  },
  {
    title: '멥시 (MEPCI)',
    slug: 'mepci-iu-hair-cheongdam',
    description:
      '아이유(IU) 단골 샵으로 알려진 청담 헤어샵. 아이유 특유의 내추럴하면서 세련된 스타일을 원하는 팬들의 방문 성지로, 청담 감성의 차분한 살롱 분위기가 특징. 셀럽 스타일링·컷·펌·염색 — 컷 ₩50,000~ / 펌·염색 ₩150,000~. 영어 응대 가능.',
    locationLabel: '청담동 (청담역)',
    address: '서울 강남구 청담동 멥시',
    station: '청담역',
    services: '셀럽 스타일링 · 컷 · 펌 · 염색',
    priceRange: '컷 ₩50,000~ / 펌·염색 ₩150,000~',
    priceWon: 50_000,
    foreignerSupport: '영어 가능',
    promoLabel: '아이유 단골',
    seoTitle: '멥시 | 아이유 단골 청담 헤어샵 | GlowUpTour',
    seoDescription:
      '청담동. 아이유 단골 샵. 내추럴 셀럽 스타일 특화. IU 팬 방문 성지. GlowUpTour에서 예약.',
    seoTags: ['청담헤어샵', '아이유헤어', '멥시', '셀럽헤어', '내추럴헤어', 'IU hair salon', 'celebrity hair Seoul', '외국인헤어샵'],
    ogDescription: '청담 헤어 | 멥시·아이유 단골·내추럴 셀럽 스타일 — GlowUpTour',
  },
  {
    title: '드엔 (De\'N)',
    slug: 'den-actress-hair-cheongdam',
    description:
      '송혜교·임수향·김현주 등 톱배우들이 이용하는 샵. 깨끗한 피부 표현·내추럴 스타일로 유명해 배우급 우아한 스타일링을 원하는 외국인 고객에게 적합하다. 배우 스타일링·헤어&메이크업·웨딩 — 헤어 ₩60,000~ / 헤어+메이크업 ₩250,000~. 영어 응대 가능.',
    locationLabel: '청담동 (청담역)',
    address: '서울 강남구 청담동 드엔',
    station: '청담역',
    services: '배우 스타일링 · 헤어&메이크업 · 웨딩',
    priceRange: '헤어 ₩60,000~ / 헤어+메이크업 ₩250,000~',
    priceWon: 60_000,
    foreignerSupport: '영어 가능',
    promoLabel: '송혜교 스타일링',
    seoTitle: '드엔 | 송혜교 스타일링 청담 배우 헤어 | GlowUpTour',
    seoDescription:
      '청담동. 송혜교·김현주 이용 샵. 배우급 내추럴 우아 스타일. 헤어+메이크업. GlowUpTour에서 예약.',
    seoTags: ['청담헤어샵', '송혜교헤어', '배우헤어', '드엔', '우아한스타일', 'Song Hye-kyo hair', 'actress hair salon Seoul', '외국인헤어샵'],
    ogDescription: '청담 헤어 | 드엔·송혜교 스타일링·배우급 우아함 — GlowUpTour',
  },
  {
    title: '스틸 앤 스톤 (Steel and Stone)',
    slug: 'steel-and-stone-mens-hair-cheongdam',
    description:
      '샤이니 키·엑소 세훈 단골 샵. 남성 아이돌 스타일링이 강점으로 남성 외국인 K팝 팬에게 특히 추천. 아담한 규모지만 맨즈 컷·펌 등 다양한 토탈 서비스를 제공한다. 컷 ₩40,000~ / 펌 ₩120,000~. 영어 응대 가능.',
    locationLabel: '청담동 (청담역)',
    address: '서울 강남구 청담동 스틸앤스톤',
    station: '청담역·압구정로데오역',
    services: '남성 아이돌 스타일링 · 맨즈 컷 · 펌 · 토탈 서비스',
    priceRange: '컷 ₩40,000~ / 펌 ₩120,000~',
    priceWon: 40_000,
    foreignerSupport: '영어 가능',
    promoLabel: '맨즈 아이돌 특화',
    seoTitle: '스틸앤스톤 | 샤이니 키·세훈 단골 맨즈 헤어 | GlowUpTour',
    seoDescription:
      '청담동. 샤이니 키·엑소 세훈 단골. 남성 아이돌 스타일링 강점. 맨즈 K팝 헤어. GlowUpTour에서 예약.',
    seoTags: ['청담헤어샵', '남자아이돌헤어', '엑소헤어', '샤이니헤어', '맨즈헤어', 'EXO hair salon', 'mens Kpop hair Seoul', '외국인헤어샵'],
    ogDescription: '청담 헤어 | 스틸앤스톤·키·세훈 단골·맨즈 아이돌 스타일 — GlowUpTour',
  },
  {
    title: '준오헤어 청담사옥점 (Juno Hair Cheongdam)',
    slug: 'juno-hair-cheongdam-flagship',
    description:
      '국내 최대 헤어 프랜차이즈 준오헤어의 본사 사옥점. 검증된 시스템·표준화된 서비스로 첫 방문 외국인도 안심할 수 있고, 전국 100개+ 지점의 노하우가 집약돼 있다. 컷·펌·염색·클리닉·웨딩 — 컷 ₩40,000~ / 펌·염색 ₩120,000~. 카카오헤어샵 예약 가능. 영어 응대 가능.',
    locationLabel: '청담동 (청담역)',
    address: '서울 강남구 청담동 63-14 준오헤어 사옥',
    phone: '02-2138-0605',
    station: '청담역·압구정로데오역',
    services: '컷 · 펌 · 염색 · 클리닉 · 웨딩',
    priceRange: '컷 ₩40,000~ / 펌·염색 ₩120,000~',
    priceWon: 40_000,
    foreignerSupport: '영어 가능',
    promoLabel: '국내 최대 브랜드 본점',
    seoTitle: '준오헤어 청담사옥 | 국내 최대 헤어 브랜드 본점 | GlowUpTour',
    seoDescription:
      '청담동 준오 사옥. 국내 최대 헤어 프랜차이즈 본사점. 표준화 서비스로 첫 방문 안심. GlowUpTour에서 예약.',
    seoTags: ['청담헤어샵', '준오헤어', '프랜차이즈미용실', '헤어클리닉', 'Juno hair Seoul', 'Korean hair franchise', 'reliable hair salon Korea', '외국인헤어샵'],
    ogDescription: '청담 헤어 | 준오헤어 사옥점·국내 최대 브랜드·안심 서비스 — GlowUpTour',
  },
  {
    title: '인트라다 by 한지오 (Intrada by Han Jio)',
    slug: 'intrada-hanjio-apgujeong-hair',
    description:
      '단발·레이어드컷·무빙펌 등 한국 트렌드 스타일 특화 살롱. "한국식 단발"과 K레이어드컷은 외국인이 가장 많이 요청하는 스타일 — 트렌드 컷 맛집으로 통하는 곳이다. 컷 ₩40,000~ / 펌 ₩130,000~. 영어 응대 가능.',
    locationLabel: '신사동 (압구정)',
    address: '서울 강남구 신사동 665-10 승승장구빌딩 3층 인트라다',
    phone: '02-540-2992',
    station: '압구정로데오역·압구정역',
    services: '단발머리 · 무빙펌 · 레이어드컷 트렌드 스타일',
    priceRange: '컷 ₩40,000~ / 펌 ₩130,000~',
    priceWon: 40_000,
    foreignerSupport: '영어 가능',
    promoLabel: 'K단발·레이어드컷',
    seoTitle: '인트라다 by 한지오 | 압구정 K단발·레이어드컷 | GlowUpTour',
    seoDescription:
      '압구정 신사동. 한국식 단발·레이어드컷·무빙펌 트렌드 특화. K헤어 스타일 체험. GlowUpTour에서 예약.',
    seoTags: ['압구정헤어샵', '한국단발', '레이어드컷', '무빙펌', '트렌드헤어', 'Korean bob haircut', 'K-layered cut Seoul', 'Korean perm', '외국인헤어샵'],
    ogDescription: '압구정 헤어 | 인트라다·K단발·레이어드컷 트렌드 맛집 — GlowUpTour',
  },
  {
    title: '리안헤어 강남역점 (Riahn Hair Gangnam Station)',
    slug: 'riahn-hair-gangnam-station',
    description:
      '강남역 3번 출구 도보 1분, 전국 단위 미용 프랜차이즈 리안헤어의 강남역 지점. 카카오헤어샵 평점 4.7 / 리뷰 598건으로 강남권 헤어샵 중 검증된 후기 규모를 갖췄다. 여성 컷 ₩20,000 · 남성 컷 ₩18,000 으로, 강남 주요 프랜차이즈 10곳 평균(₩25,500) 대비 저렴해 "강남 한복판 가성비"가 강점 — 청담 셀럽 살롱이 부담스러운 첫 방문 외국인에게 적합하다. 1:1 디자이너 맞춤 상담으로 컷·펌·염색·볼륨매직·클리닉을 진행하며, 프랜차이즈 표준 교육을 거친 디자이너가 응대한다. 카카오헤어샵 앱으로 사전 예약 가능.',
    locationLabel: '역삼동 (강남역)',
    address: '서울 강남구 강남대로84길 6 2층 리안헤어 강남역점',
    phone: '02-3453-7910',
    station: '강남역 3번 출구 도보 1분',
    services: '컷 · 펌 · 염색 · 볼륨매직 · 클리닉 · 1:1 디자이너 맞춤 시술',
    priceRange: '여성 컷 ₩20,000 / 남성 컷 ₩18,000 · 펌·염색 문의',
    hours: '10:30~21:30 (시술별 예약 마감 상이 · 주말·공휴일 조기 마감)',
    priceWon: 18_000,
    foreignerSupport: '카카오헤어샵 예약 가능 (영어 응대 사전 문의)',
    promoLabel: '강남역 가성비 · 평점 4.7',
    seoTitle: '리안헤어 강남역점 | 강남역 가성비 헤어샵 | GlowUpTour',
    seoDescription:
      '강남역 3번 출구 도보 1분. 컷 ₩18,000~ 강남 평균 대비 저렴. 카카오헤어샵 평점 4.7·리뷰 598건. 1:1 디자이너 맞춤 시술. GlowUpTour에서 예약.',
    seoTags: ['강남역헤어샵', '리안헤어', '가성비미용실', '강남컷', '프랜차이즈미용실', 'Gangnam hair salon', 'affordable haircut Seoul', 'Korean haircut Gangnam', '외국인헤어샵'],
    ogDescription: '강남역 헤어 | 리안헤어·역 도보 1분·컷 ₩18,000~ 가성비 — GlowUpTour',
  },
];
