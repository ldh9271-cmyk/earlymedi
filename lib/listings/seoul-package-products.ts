/**
 * 테마 패키지여행 4종 (2박3일~5박6일) — founder 2026-07-24 큐레이션.
 *
 * 마켓플레이스에 실제 등록된 상품들(퍼스널컬러·헤어·메이크업·네일·
 * 반영구·사진 스튜디오·K팝 성지·맛집)을 연계해 일자별 스케줄을 구성.
 * 마스터 콘솔의 "테마 패키지 4종 일괄 등록" 버튼이 이 배열을 읽어
 * partner_listings 에 category='travel_package', details.subType=
 * 'package', status='approved' 로 insert. 같은 slug 는 skip — 멱등.
 *
 * 일정/하이라이트 번역은 scripts/translate-listing-details.mjs,
 * 제목/설명/SEO 는 scripts/translate-locale-content.mjs 가 처리.
 * 브랜드명은 모든 SEO 에서 "GlowUpTour" 통일.
 */

export type ThemePackageSeed = {
  title: string;
  slug: string;
  description: string;
  locationLabel: string;
  priceWon: number;
  durationDays: number;
  promoLabel: string;
  itinerary: Array<{ day: string; title: string; items: string[] }>;
  highlights: Array<{ icon: string; title: string; desc: string }>;
  seoTitle: string;
  seoDescription: string;
  seoTags: string[];
  ogDescription: string;
};

export const SEOUL_PACKAGE_PRODUCTS: ReadonlyArray<ThemePackageSeed> = [
  // ── 1. 2박 3일 — 글로우 스타트 ──────────────────────────────────
  {
    title: '글로우 스타트 2박 3일 — 퍼스널컬러 & 첫 메이크오버',
    slug: 'glow-start-2n3d',
    description:
      '짧은 일정에 K뷰티 핵심만 담은 입문 패키지. 도착 당일 영어 전문 퍼스널컬러 진단으로 나의 컬러를 찾고, 다음 날 K단발 헤어와 셀럽 네일 아트로 변신, 마지막 날 컬러 증명사진으로 여행을 기록한다. 통역 가이드·차량·호텔 2박 포함. 주말 단기 여행객·첫 방한 여행자에게 최적.',
    locationLabel: '강남 · 명동 · 가로수길',
    priceWon: 1_800_000,
    durationDays: 3,
    promoLabel: '퍼스널컬러 스타터',
    itinerary: [
      {
        day: '1일차',
        title: '도착 & 퍼스널컬러 진단',
        items: [
          '공항 픽업 서비스 → 강남 호텔 체크인',
          '15:00 마이컬러랩 — 영어 전문 퍼스널컬러 프리미엄 진단 (2시간·세션 녹화)',
          '진단 결과로 올리브영 맞춤 쇼핑 (컨시어지 동행)',
          '저녁: 무월식탁 — 한국 가정식 정식',
        ],
      },
      {
        day: '2일차',
        title: '메이크오버 데이 — 헤어 & 네일',
        items: [
          '11:00 인트라다 by 한지오 — K단발·레이어드컷 트렌드 헤어',
          '14:30 유니스텔라 청담 — K팝 셀럽 시그니처 네일 아트',
          '가로수길 쇼핑 산책 (신사 셀프스튜디오 옵션)',
          '저녁: 다몽집 — 직원이 초벌해주는 한우 BBQ',
        ],
      },
      {
        day: '3일차',
        title: '기념 촬영 & 출국',
        items: [
          '10:00 시현하다 모먼트 강남역 — 나의 컬러 배경 증명사진 촬영',
          '명동 쇼핑 & 뮤직코리아 K팝 굿즈 (선택)',
          '공항 드롭 서비스 → 출국',
        ],
      },
    ],
    highlights: [
      { icon: 'expert', title: '도착 당일 진단 완료', desc: '여행 첫날 퍼스널컬러를 찾고 남은 일정 내내 활용. Diagnose first, shop smart.' },
      { icon: 'concierge', title: '통역 가이드 풀 동행', desc: '진단·시술·쇼핑 전 일정 영어/중국어 통역 + 전용 차량.' },
      { icon: 'cancel', title: '컬러 초상 기록', desc: '시현하다 컬러 증명사진으로 여행의 변신을 한 장에 기록.' },
    ],
    seoTitle: '글로우 스타트 2박 3일 | 퍼스널컬러 메이크오버 패키지 | GlowUpTour',
    seoDescription:
      '2박 3일 K뷰티 입문 패키지. 영어 퍼스널컬러 진단+K단발 헤어+셀럽 네일+컬러 증명사진. 통역·차량·호텔 포함. GlowUpTour.',
    seoTags: ['2박3일패키지', '퍼스널컬러패키지', 'K뷰티투어', '단기뷰티여행', '서울메이크오버', 'K-beauty package Seoul', '2N3D Korea tour', 'personal color tour', 'GlowUpTour'],
    ogDescription: '패키지여행 | 글로우 스타트 2박 3일·퍼스널컬러+메이크오버 — GlowUpTour',
  },
  // ── 2. 3박 4일 — K팝 드림 ──────────────────────────────────────
  {
    title: 'K팝 드림 3박 4일 — 아이돌 스타일 & 성지순례',
    slug: 'kpop-dream-3n4d',
    description:
      'K팝 팬을 위한 성지순례+아이돌 스타일 체험 패키지. 하이브 본사 인증샷으로 시작해 BTS·트와이스가 다니는 청담 헤어샵과 아이돌 메이크업 살롱에서 최애 스타일로 변신, SM 광야·YG 더세임·홍대 응원봉 성지까지 4대 기획사 코스를 완주한다. 통역 가이드·차량·호텔 3박 포함.',
    locationLabel: '용산 · 청담 · 서울숲 · 홍대',
    priceWon: 2_400_000,
    durationDays: 4,
    promoLabel: 'K팝 성지순례',
    itinerary: [
      {
        day: '1일차',
        title: '도착 & 용산 성지',
        items: [
          '공항 픽업 서비스 → 하이브 본사 외벽 인증샷 (컴백 배너 시즌 체크)',
          '용산 아이파크몰 → 강남 호텔 체크인',
          '저녁: 슈퍼집 강남점 — K드라마 스타 단골 떡볶이 바',
        ],
      },
      {
        day: '2일차',
        title: '아이돌 스타일 데이',
        items: [
          '11:00 청담 본샵 — BTS·트와이스 스타일링 살롱에서 헤어',
          '14:00 꼼나나 — K팝 아이돌 무대 메이크업 체험',
          'K-스타로드 강남돌 인증샷 산책 (압구정로데오→청담)',
          '저녁: 하이디라오 강남점 — 영어 메뉴 완비 훠궈',
        ],
      },
      {
        day: '3일차',
        title: '기획사 투어 — SM & YG',
        items: [
          '11:00 광야@서울 — SM 본사 공식 스토어 (에스파·NCT 굿즈)',
          '서울숲 산책 → 합정 이동',
          '15:00 YG 더세임 카페 — 블랙핑크 성지 굿즈+베이커리',
          '17:00 위드뮤 홍대 — 응원봉 실물 구매·사인 앨범',
        ],
      },
      {
        day: '4일차',
        title: '굿즈 파이널 & 출국',
        items: [
          '10:00 케이타운포유 스퀘어 — 럭키드로우·컴백 팝업 (해외배송 연계)',
          '코엑스 3D 전광판·별마당 도서관 포토스팟',
          '공항 드롭 서비스 → 출국',
        ],
      },
    ],
    highlights: [
      { icon: 'expert', title: '4대 기획사 완주 코스', desc: 'HYBE·SM·JYP 스타일·YG 성지를 3박 4일에 모두. All 4 agencies, one trip.' },
      { icon: 'concierge', title: '아이돌과 같은 샵에서', desc: 'BTS 스타일링 헤어샵 + 아이돌 메이크업 살롱 예약 대행.' },
      { icon: 'cancel', title: '응원봉·앨범 쇼핑 최적화', desc: '위드뮤·Ktown4u 특전 일정 체크 + 면세·해외배송 안내.' },
    ],
    seoTitle: 'K팝 드림 3박 4일 | 성지순례·아이돌 스타일 패키지 | GlowUpTour',
    seoDescription:
      '3박 4일 K팝 팬 패키지. 하이브·SM 광야·YG 더세임 성지순례+BTS 헤어샵·아이돌 메이크업 체험. 통역·차량 포함. GlowUpTour.',
    seoTags: ['K팝투어패키지', '3박4일패키지', '성지순례투어', '아이돌스타일체험', '하이브투어', 'Kpop tour package', 'BTS pilgrimage tour', 'idol makeover Seoul', 'GlowUpTour'],
    ogDescription: '패키지여행 | K팝 드림 3박 4일·성지순례+아이돌 스타일 — GlowUpTour',
  },
  // ── 3. 4박 5일 — 청담 풀 메이크오버 ────────────────────────────
  {
    title: '청담 풀 메이크오버 4박 5일 — 진단부터 화보까지',
    slug: 'cheongdam-makeover-4n5d',
    description:
      '청담 프리미엄 뷰티를 총망라한 시그니처 패키지. Visit Seoul 등재 스튜디오의 퍼스널컬러+골격진단으로 시작해 로레알 파리 아티스트 헤어, 셀럽 네일, 의료기관 반영구 눈썹, K뷰티 아이콘 정샘물 메이크업을 거쳐 시현하다 컬러 초상 화보로 완성한다. 미슐랭급 파인다이닝 디너 포함. 통역 가이드·차량·호텔 4박 포함.',
    locationLabel: '청담 · 도산 · 가로수길',
    priceWon: 3_400_000,
    durationDays: 5,
    promoLabel: '청담 풀 메이크오버',
    itinerary: [
      {
        day: '1일차',
        title: '도착 & 이미지 컨설팅',
        items: [
          '공항 픽업 서비스 → 청담 호텔 체크인',
          '15:00 컬러홀릭 — 퍼스널컬러+골격진단+맞춤 메이크업 (Visit Seoul 등재)',
          '저녁: 무월식탁 — 한국 가정식 정식',
        ],
      },
      {
        day: '2일차',
        title: '프리미엄 헤어 & 네일',
        items: [
          '11:00 차홍아르더 아뜰리에 도산 — 로레알 파리 아티스트 브랜드 헤어',
          '15:00 유니스텔라 청담 — 블랙핑크·태연 작업 네일 셀렉트샵',
          '가로수길 쇼핑 산책',
          '저녁: 정돈 — 한국식 돈카츠',
        ],
      },
      {
        day: '3일차',
        title: '반영구 & 회복 데이',
        items: [
          '10:30 리앤채움의원 반영구센터 — 의료기관 자연눈썹 (위생·안전)',
          '오후: 호텔 휴식 & 스파 (회복 케어)',
          '저녁: 다몽집 — 한우 BBQ',
        ],
      },
      {
        day: '4일차',
        title: '메이크업 & 컬러 화보',
        items: [
          '13:00 정샘물 인스피레이션 — 물광 투명 메이크업 (K뷰티 아이콘)',
          '16:00 시현하다 강남 오리지널 — 나의 컬러 초상 화보 촬영',
          '저녁: 비언유주얼 — 3D 미디어 아트 한식 파인다이닝 (예약 필수)',
        ],
      },
      {
        day: '5일차',
        title: '리터치 & 출국',
        items: [
          '10:00 반영구 리터치 점검 & 애프터케어 안내',
          '올리브영·면세점 마무리 쇼핑',
          '공항 드롭 서비스 → 출국',
        ],
      },
    ],
    highlights: [
      { icon: 'expert', title: '진단→시술→화보 원스토리', desc: '퍼스널컬러 진단 결과가 헤어·메이크업·화보까지 일관되게 이어지는 설계.' },
      { icon: 'concierge', title: '청담 셀럽 라인업', desc: '차홍·유니스텔라·정샘물 — 셀럽이 실제 다니는 샵만 큐레이션.' },
      { icon: 'cancel', title: '의료기관 반영구 + 회복일', desc: '의원급 반영구 눈썹과 전용 회복 일정, 출국 전 리터치 점검까지.' },
    ],
    seoTitle: '청담 풀 메이크오버 4박 5일 | 진단부터 화보까지 | GlowUpTour',
    seoDescription:
      '4박 5일 청담 프리미엄 패키지. 퍼스널컬러+차홍 헤어+유니스텔라 네일+의료기관 반영구+정샘물 메이크업+시현하다 화보. GlowUpTour.',
    seoTags: ['4박5일패키지', '청담뷰티투어', '풀메이크오버', '정샘물패키지', '반영구패키지', 'Cheongdam beauty package', 'full makeover Seoul', 'K-beauty premium tour', 'GlowUpTour'],
    ogDescription: '패키지여행 | 청담 풀 메이크오버 4박 5일·진단부터 화보까지 — GlowUpTour',
  },
  // ── 4. 5박 6일 — K뷰티 마스터 올인원 ───────────────────────────
  {
    title: 'K뷰티 마스터 5박 6일 — 뷰티·클리닉·화보 올인원',
    slug: 'kbeauty-master-5n6d',
    description:
      '뷰티 시술과 클리닉 케어, 화보 촬영까지 모두 담은 최상위 올인원 패키지. 영어 전문 퍼스널컬러 진단, 강남 피부과 스킨케어, 프리미엄 헤어·반영구·네일·메이크업에 바디프로필 또는 컬러 화보 촬영을 선택할 수 있다. 회복일과 리터치 일정을 넉넉히 배치해 시술 후 컨디션까지 관리. 통역 가이드·차량·호텔 5박 포함.',
    locationLabel: '강남 · 청담 · 코엑스',
    priceWon: 4_500_000,
    durationDays: 6,
    promoLabel: '뷰티+클리닉 올인원',
    itinerary: [
      {
        day: '1일차',
        title: '도착 & 프리미엄 진단',
        items: [
          '공항 픽업 서비스 → 강남 호텔 체크인',
          '15:00 마이컬러랩 — 영어 전문 퍼스널컬러 프리미엄 2시간 세션',
          '저녁: 무월식탁 — 한국 가정식 정식',
        ],
      },
      {
        day: '2일차',
        title: '클리닉 데이 — 피부 케어',
        items: [
          '11:00 강남 피부과 — 맞춤 스킨케어 시술 (병원 마켓플레이스 연계·통역 동행)',
          '오후: 호텔 휴식 (시술 후 회복)',
          '저녁: 하이디라오 강남점 — 부담 없는 훠궈',
        ],
      },
      {
        day: '3일차',
        title: '헤어 & 반영구',
        items: [
          '11:00 차홍아르더 아뜰리에 도산 — 프리미엄 헤어 디자인',
          '15:00 비앤미 반영구 압구정점 — 눈썹 반영구 20년 전문 (자연 콤보 기법)',
          '저녁: 다몽집 — 한우 BBQ',
        ],
      },
      {
        day: '4일차',
        title: '메이크업 & 네일 & 산책',
        items: [
          '11:00 정샘물 인스피레이션 — 물광 투명 메이크업',
          '14:30 유니스텔라 청담 — 시그니처 네일 아트',
          'K-스타로드 강남돌 산책 & 청담 카페',
          '저녁: 정돈 — 한국식 돈카츠',
        ],
      },
      {
        day: '5일차',
        title: '화보 데이 — 선택 촬영',
        items: [
          '선택 A: 변화 스튜디오 — 바디프로필 촬영 (특화 조명·포즈 디렉팅)',
          '선택 B: 시현하다 강남 오리지널 — 컬러 초상 화보',
          '코엑스 별마당 도서관·3D 전광판 야경',
          '저녁: 비언유주얼 — 한식 파인다이닝 피날레',
        ],
      },
      {
        day: '6일차',
        title: '리터치 & 출국',
        items: [
          '10:00 반영구 리터치 점검 & 피부과 애프터케어 안내',
          '올리브영·면세점 마무리 쇼핑',
          '공항 드롭 서비스 → 출국',
        ],
      },
    ],
    highlights: [
      { icon: 'expert', title: '뷰티+클리닉 통합 설계', desc: '피부과 시술과 뷰티 일정 사이 회복일을 배치한 안전한 올인원 스케줄.' },
      { icon: 'concierge', title: '화보 선택제', desc: '바디프로필 vs 컬러 초상 화보 — 취향대로 고르는 피날레 촬영.' },
      { icon: 'cancel', title: '출국 전 리터치 보장', desc: '반영구 리터치·애프터케어까지 일정 안에 포함해 마무리.' },
    ],
    seoTitle: 'K뷰티 마스터 5박 6일 | 뷰티·클리닉·화보 올인원 | GlowUpTour',
    seoDescription:
      '5박 6일 최상위 올인원. 퍼스널컬러+피부과+차홍 헤어+반영구+정샘물 메이크업+바디프로필/화보. 회복일 포함 설계. GlowUpTour.',
    seoTags: ['5박6일패키지', 'K뷰티올인원', '피부과패키지', '바디프로필패키지', '프리미엄뷰티투어', 'K-beauty master package', 'clinic beauty tour Seoul', 'all-in-one Korea tour', 'GlowUpTour'],
    ogDescription: '패키지여행 | K뷰티 마스터 5박 6일·뷰티+클리닉+화보 올인원 — GlowUpTour',
  },
];
