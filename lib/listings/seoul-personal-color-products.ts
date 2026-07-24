/**
 * 강남·서초 외국인 FIT 추천 퍼스널컬러 스튜디오 9곳 — founder
 * 2026-07-24 큐레이션.
 *
 * 마스터 콘솔의 "퍼스널컬러 9종 일괄 등록" 버튼이 이 배열을 읽어
 * partner_listings 테이블에 category='personal_color',
 * status='approved' 로 한 번에 insert. 같은 slug 는 skip — 멱등.
 *
 * SEO(메타 타이틀·디스크립션)는 partner_listing_locale_content 의
 * kr 행에 저장 — scripts/translate-locale-content.mjs 가 KR 소스로
 * en/zh/ja/ru/vi 를 생성. 브랜드명은 "GlowUpTour" 통일.
 */

export type PersonalColorSeed = {
  title: string;
  /** SEO 영문 슬러그 — partner_listings.slug 로 그대로 사용. */
  slug: string;
  description: string;
  locationLabel: string;
  /** Google Maps 검색 쿼리 — details.address 로 저장. */
  address: string;
  phone?: string;
  station: string;
  programs: string;
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

export const SEOUL_PERSONAL_COLOR_PRODUCTS: ReadonlyArray<PersonalColorSeed> = [
  {
    title: '컬러홀릭 (Colorholic)',
    slug: 'colorholic-personal-color-gangnam',
    description:
      'Visit Seoul(서울관광공사) 공식 등재 프리미엄 이미지 진단 스튜디오. 퍼스널컬러 진단·골격진단·맞춤 메이크업을 한 번에 — 진단 후 바로 풀 메이크업까지 완성하는 체험형 프로그램으로 K-뷰티 체험 관광 콘텐츠로 외국인에게 인기. ₩80,000~200,000. 영어 응대 가능.',
    locationLabel: '강남구청역 인근',
    address: '서울 강남구 컬러홀릭 퍼스널컬러',
    station: '강남구청역',
    programs: '퍼스널컬러 진단 + 골격진단 + 풀 메이크업 원스톱',
    priceRange: '₩80,000~200,000',
    priceWon: 80_000,
    foreignerSupport: '영어 가능',
    promoLabel: 'Visit Seoul 공식 등재',
    seoTitle: '컬러홀릭 | 강남 퍼스널컬러+골격진단+메이크업 | GlowUpTour',
    seoDescription:
      '강남구청역. Visit Seoul 공식 등재. 퍼스널컬러·골격진단·풀메이크업 원스톱 체험. 영어 응대. GlowUpTour에서 예약.',
    seoTags: ['강남퍼스널컬러', '골격진단', '퍼스널컬러메이크업', 'K뷰티체험', 'personal color analysis Korea', 'body type analysis Seoul', 'K-beauty experience', '외국인퍼스널컬러'],
    ogDescription: '강남 퍼스널컬러 | 컬러홀릭·진단+메이크업 원스톱·서울시 등재 — GlowUpTour',
  },
  {
    title: '컬러라이즈 강남점 (COLORIZE Gangnam)',
    slug: 'colorize-personal-color-gangnam',
    description:
      '전국 4개 지점(강남·명동 2곳·청량리)을 운영하는 대형 퍼스널컬러 전문 브랜드. 1:1 프라이빗 진단·2~3인 그룹 진단·프리미엄(패션·헤어·메이크업 추천)·퀵메이크업 추가 ₩60,000~150,000. 10시~22시 야간 운영으로 관광 후 저녁 진단 가능, 컨설턴트 지정 예약 시스템과 리뷰 다수의 검증된 진단 품질. 영어 응대 가능.',
    locationLabel: '서초 (교대역·강남역)',
    address: '서울 서초구 사임당로 173 서전빌딩 컬러라이즈',
    phone: '02-587-5205',
    station: '교대역·강남역',
    programs: '1:1 프라이빗 진단 · 2~3인 그룹 진단 · 프리미엄(패션·헤어·메이크업 추천) · 퀵메이크업 추가',
    priceRange: '₩60,000~150,000',
    priceWon: 60_000,
    foreignerSupport: '영어 가능',
    hours: '매일 10:00~22:00',
    promoLabel: '밤 10시까지 운영',
    seoTitle: '컬러라이즈 강남 | 서초 퍼스널컬러 1:1 진단 | GlowUpTour',
    seoDescription:
      '교대역 인근. 전국 4개점 전문 브랜드. 1:1·그룹 진단, 밤 10시까지. 영어 응대. GlowUpTour에서 예약.',
    seoTags: ['강남퍼스널컬러', '서초퍼스널컬러', '1:1컬러진단', '그룹퍼스널컬러', '야간퍼스널컬러', 'Colorize Korea', 'personal color Seoul', '외국인퍼스널컬러'],
    ogDescription: '서초 퍼스널컬러 | 컬러라이즈·전국 브랜드·밤 10시까지 — GlowUpTour',
  },
  {
    title: '컬러플레이스 (Color Place)',
    slug: 'colorplace-image-consulting-yeoksam',
    description:
      '"연예인도 찾아오는 프리미엄 퍼스널컬러 & 이미지 컨설팅"을 표방하는 역삼동 스튜디오. 퍼스널컬러 진단을 넘어 라이프스타일 전반의 이미지 컨설팅을 제공하고, 컨설턴트 양성과정·기업교육까지 운영하는 전문성 검증된 교육기관. ₩80,000~200,000. 영어 응대 가능.',
    locationLabel: '역삼동 (선릉역)',
    address: '서울 강남구 봉은사로30길 54 5층 컬러플레이스',
    phone: '02-3443-5461',
    station: '선릉역·역삼역',
    programs: '퍼스널컬러 진단 · 이미지 컨설팅 · 컨설턴트 양성과정 · 기업교육',
    priceRange: '₩80,000~200,000',
    priceWon: 80_000,
    foreignerSupport: '영어 가능',
    promoLabel: '연예인 방문 컨설팅',
    seoTitle: '컬러플레이스 | 역삼 연예인 프리미엄 컬러 컨설팅 | GlowUpTour',
    seoDescription:
      '역삼동. 연예인 방문 프리미엄 이미지 컨설팅. 진단+라이프스타일 스타일링. 컨설턴트 양성 기관. GlowUpTour에서 예약.',
    seoTags: ['강남퍼스널컬러', '이미지컨설팅', '연예인퍼스널컬러', '프리미엄컬러진단', 'celebrity color analysis Korea', 'image consulting Seoul', '외국인퍼스널컬러'],
    ogDescription: '역삼 퍼스널컬러 | 컬러플레이스·연예인 방문·이미지 컨설팅 — GlowUpTour',
  },
  {
    title: '마이컬러랩 (My Color Lab)',
    slug: 'mycolorlab-english-personal-color',
    description:
      '외국인 영어 컨설팅 전문기관 — 영어 리뷰 다수 보유. "여행 초반에 진단받고 올리브영 쇼핑하러 가라"는 후기로 유명하다. 대면 퍼스널컬러 진단·온라인(줌) 사진진단·프리미엄 2시간 세션 ₩80,000~180,000. 한국어·영어 완벽 이중언어 컨설턴트, 혼자 방문 시 세션 녹화 지원, 일정 변경 유연 대응 — 여행객 친화 시스템.',
    locationLabel: '강남권',
    address: '서울 강남구 마이컬러랩',
    station: '강남권 (온라인 줌 진단 병행)',
    programs: '대면 퍼스널컬러 진단 · 온라인(줌) 사진진단 · 프리미엄 2시간 세션',
    priceRange: '₩80,000~180,000',
    priceWon: 80_000,
    foreignerSupport: '영어 완벽 (영어 컨설팅 전문)',
    promoLabel: '영어 컨설팅 전문',
    seoTitle: '마이컬러랩 | 외국인 영어 퍼스널컬러 전문 | GlowUpTour',
    seoDescription:
      '강남권. 영어 컨설팅 전문기관. 프리미엄 2시간 세션·세션 녹화 지원. 여행객 친화 예약. GlowUpTour에서 예약.',
    seoTags: ['외국인퍼스널컬러', '영어퍼스널컬러', '강남컬러진단', 'English personal color Korea', 'color analysis for foreigners', 'Seoul color consultation', 'K-beauty shopping guide'],
    ogDescription: '퍼스널컬러 | 마이컬러랩·영어 전문·여행객 친화 세션 — GlowUpTour',
  },
  {
    title: '이미지호 (Image Ho)',
    slug: 'imageho-personal-color-seoul',
    description:
      '2007년부터 운영한 퍼스널컬러 전문기업. 특허 실용신안 \'셀프 테스터\'를 자체 개발했고, 마이리얼트립 등 외국인 관광 플랫폼에 입점해 그룹 컨설팅 상품을 판매 중. 퍼스널컬러 진단(베이직/디테일)·메이크업 코치·12톤 세부진단 ₩50,000~120,000. 진단 결과 워크북·컬러칩 제공으로 여행 후에도 활용 가능. 영어 응대 가능.',
    locationLabel: '서울 (강남권)',
    address: '서울 이미지호 퍼스널컬러',
    station: '강남권',
    programs: '퍼스널컬러 진단(베이직/디테일) · 메이크업 코치 · 12톤 세부진단 · 워크북 제공',
    priceRange: '₩50,000~120,000',
    priceWon: 50_000,
    foreignerSupport: '영어 가능 (관광 플랫폼 판매)',
    promoLabel: '특허 셀프테스터',
    seoTitle: '이미지호 | 특허 셀프테스터 퍼스널컬러 진단 | GlowUpTour',
    seoDescription:
      '2007년부터 운영. 특허 셀프테스터·12톤 세부진단·워크북 제공. 외국인 관광 플랫폼 입점. GlowUpTour에서 예약.',
    seoTags: ['퍼스널컬러진단', '12톤진단', '퍼스널컬러워크북', '그룹퍼스널컬러', 'personal color group Korea', 'color workbook Seoul', '외국인퍼스널컬러'],
    ogDescription: '퍼스널컬러 | 이미지호·특허 진단 도구·워크북 제공 — GlowUpTour',
  },
  {
    title: '에이타입 퍼스널컬러 서초점 (A-Type Personal Color Seocho)',
    slug: 'atype-personal-color-banpo',
    description:
      '서초 반포 소재 퍼스널컬러 전문 스튜디오. 퍼스널컬러 컨설팅·진단 ₩50,000~120,000. 평일 11:00~21:30, 주말도 운영(월요일 휴무) — 고속터미널 인근에 숙박하는 외국인의 저녁 일정에 적합. 간단 영어 응대.',
    locationLabel: '반포동 (고속터미널역)',
    address: '서울 서초구 반포동 717-6 에이타입 퍼스널컬러',
    station: '고속터미널역·신논현역',
    programs: '퍼스널컬러 컨설팅 · 진단',
    priceRange: '₩50,000~120,000',
    priceWon: 50_000,
    foreignerSupport: '간단 영어 응대',
    hours: '평일 11:00~21:30 · 주말 운영 (월요일 휴무)',
    promoLabel: '주말 운영',
    seoTitle: '에이타입 퍼스널컬러 | 반포 컬러 컨설팅 | GlowUpTour',
    seoDescription:
      '서초 반포동. 고속터미널 인근. 평일 밤 9시반·주말 운영. 퍼스널컬러 전문 컨설팅. GlowUpTour에서 예약.',
    seoTags: ['서초퍼스널컬러', '반포퍼스널컬러', '고속터미널컬러진단', '주말퍼스널컬러', 'personal color Banpo', 'color consulting Seoul', '외국인퍼스널컬러'],
    ogDescription: '반포 퍼스널컬러 | 에이타입·주말 운영·터미널 인근 — GlowUpTour',
  },
  {
    title: '강남 이미지메이킹 스튜디오 (Gangnam Image Making Studio)',
    slug: 'gangnam-image-making-studio-seocho',
    description:
      '퍼스널컬러를 넘어 스피치·보이스까지 다루는 종합 이미지 컨설팅 스튜디오. 퍼스널컬러 진단+이미지메이킹+스피치·보이스 컨설팅 ₩70,000~200,000. 비즈니스 목적으로 방한한 외국인의 프레젠테이션·미팅 이미지 준비에도 적합. 평일 09:30~18:30 운영. 간단 영어 응대.',
    locationLabel: '서초동 (강남역·교대역)',
    address: '서울 서초구 서초동 1328-7 이미지메이킹 스튜디오',
    station: '강남역·교대역',
    programs: '퍼스널컬러 진단 + 이미지메이킹 + 스피치·보이스 컨설팅',
    priceRange: '₩70,000~200,000',
    priceWon: 70_000,
    foreignerSupport: '간단 영어 응대',
    hours: '평일 09:30~18:30',
    promoLabel: '컬러+스피치 종합',
    seoTitle: '강남 이미지메이킹 | 퍼스널컬러+스피치 컨설팅 | GlowUpTour',
    seoDescription:
      '서초동. 퍼스널컬러+이미지메이킹+보이스 종합 컨설팅. 비즈니스 이미지 준비 적합. GlowUpTour에서 예약.',
    seoTags: ['강남이미지메이킹', '퍼스널컬러', '스피치컨설팅', '비즈니스이미지', 'image making Korea', 'business styling Seoul', '외국인퍼스널컬러'],
    ogDescription: '서초 이미지 컨설팅 | 컬러+스피치+보이스 종합 — GlowUpTour',
  },
  {
    title: '삼성동 퍼스널컬러 아카데미 (Samseong Personal Color Academy)',
    slug: 'samseong-personal-color-academy',
    description:
      '진단+컨설턴트 자격증 과정을 겸업하는 아카데미 — 교육기관 수준의 체계적 진단을 받을 수 있다. 진단 기준 ₩60,000~150,000. 평일·주말 09:00~22:00 100% 예약제 운영으로 시간 유연성 최고, 코엑스 인근으로 관광 동선 연계 우수. 간단 영어 응대.',
    locationLabel: '삼성동 (삼성역·코엑스)',
    address: '서울 강남구 삼성동 78-3 7층 퍼스널컬러 아카데미',
    phone: '050-6990-0316',
    station: '삼성역·선릉역',
    programs: '퍼스널컬러 진단 · 컨설턴트 자격증 과정 (100% 예약제)',
    priceRange: '₩60,000~150,000 (진단 기준)',
    priceWon: 60_000,
    foreignerSupport: '간단 영어 응대',
    hours: '평일·주말 09:00~22:00 (100% 예약제)',
    promoLabel: '주 7일 예약제',
    seoTitle: '삼성동 퍼스널컬러 아카데미 | 코엑스 인근 진단 | GlowUpTour',
    seoDescription:
      '삼성동 7층. 아카데미급 체계적 진단. 주 7일 밤 10시까지 100% 예약제. 코엑스 인근. GlowUpTour에서 예약.',
    seoTags: ['삼성동퍼스널컬러', '코엑스퍼스널컬러', '컬러진단아카데미', '예약제퍼스널컬러', 'personal color COEX', 'color academy Seoul', '외국인퍼스널컬러'],
    ogDescription: '삼성동 퍼스널컬러 | 아카데미급 진단·주7일 운영 — GlowUpTour',
  },
  {
    title: '논현 헤어+퍼스널컬러 살롱 (Nonhyeon Hair & Personal Color Salon)',
    slug: 'nonhyeon-color-hair-salon',
    description:
      '미용실 결합형 퍼스널컬러 살롱 — 진단 결과를 바로 헤어 컬러 염색으로 연결하는 원스톱 구조. 진단 ₩50,000~ / 헤어 시술 별도. 진단 후 실제 변신까지 한 번에 완성하려는 외국인 관광객에게 최적. 화요일 휴무, 일요일 운영. 간단 영어 응대.',
    locationLabel: '논현동 (강남구청역)',
    address: '서울 강남구 논현동 111-27 헤어 퍼스널컬러 살롱',
    phone: '02-3447-9898',
    station: '강남구청역·학동역',
    programs: '퍼스널컬러 진단 + 헤어 컬러 매칭 + 미용실 시술 연계',
    priceRange: '진단 ₩50,000~ / 헤어 시술 별도',
    priceWon: 50_000,
    foreignerSupport: '간단 영어 응대',
    hours: '일요일 운영 · 화요일 휴무',
    promoLabel: '진단+헤어염색 원스톱',
    seoTitle: '논현 퍼스널컬러 살롱 | 진단+헤어염색 원스톱 | GlowUpTour',
    seoDescription:
      '강남구청역 인근. 퍼스널컬러 진단 후 바로 헤어 컬러 시술. 진단+변신 원스톱. 일요일 운영. GlowUpTour에서 예약.',
    seoTags: ['강남퍼스널컬러', '퍼스널컬러헤어', '헤어컬러매칭', '논현미용실', 'hair color matching Korea', 'personal color salon Seoul', '외국인퍼스널컬러'],
    ogDescription: '논현 퍼스널컬러 | 진단+헤어염색 원스톱·일요일 운영 — GlowUpTour',
  },
];
