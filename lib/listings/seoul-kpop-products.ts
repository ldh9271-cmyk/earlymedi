/**
 * 서울 K팝 성지/굿즈샵 12곳 — founder 2026-07-24 큐레이션.
 * (HYBE 2 · SM 2 · JYP 1 · YG 1 · 강남권 스팟/대형 굿즈샵 6)
 *
 * 마스터 콘솔의 "K팝 투어 12종 일괄 등록" 버튼이 이 배열을 읽어
 * partner_listings 테이블에 category='kpop_tour', status='approved' 로
 * 한 번에 insert. 같은 slug 는 skip — 멱등.
 *
 * 입장 무료 스팟이 대부분이라 priceWon 은 null — 카드/상세의 가격
 * 자리에는 details.priceRange('무료 입장' 등)가 로케일 번역되어
 * 표시된다 (lib/i18n/ko-label 맵).
 *
 * SEO(메타 타이틀·디스크립션)는 partner_listing_locale_content 의
 * kr 행에 저장 — scripts/translate-locale-content.mjs 가 KR 소스로
 * en/zh/ja/ru/vi 를 생성. 브랜드명은 "GlowUpTour" 통일.
 */

export type KpopSpotSeed = {
  title: string;
  /** SEO 영문 슬러그 — partner_listings.slug 로 그대로 사용. */
  slug: string;
  description: string;
  locationLabel: string;
  /** Google Maps 검색 쿼리 — details.address 로 저장. */
  address: string;
  station: string;
  /** 주요 콘텐츠. */
  contents: string;
  /** 입장/가격 — 자유형 라벨 (ko-label 맵으로 번역). */
  priceRange: string;
  /** 방문 팁. */
  tip: string;
  promoLabel: string;
  seoTitle: string;
  seoDescription: string;
  seoTags: string[];
  ogDescription: string;
};

export const SEOUL_KPOP_PRODUCTS: ReadonlyArray<KpopSpotSeed> = [
  {
    title: '하이브 본사 (HYBE Headquarters)',
    slug: 'hybe-headquarters-yongsan-bts',
    description:
      'BTS·세븐틴·TXT·뉴진스·르세라핌의 소속사 하이브 사옥. 전 세계 아미(ARMY)의 필수 순례지 — 건물 앞 인증샷은 K팝 팬 여행의 상징이다. 건물 내부는 일반인 출입 불가지만 외부 촬영은 자유. 용산역 아이파크몰과 연계 동선. 방문 팁: 아티스트 컴백 시즌에는 외벽 대형 배너가 걸려 포토 타이밍 최고.',
    locationLabel: '용산 (신용산역)',
    address: '서울 용산구 한강대로 42 하이브',
    station: '신용산역·용산역',
    contents: 'BTS 소속사 본사 건물 외관 포토스팟 · 팬 인증샷 성지',
    priceRange: '외부 촬영 무료',
    tip: '아티스트 컴백 시즌에는 외벽 대형 배너 게시 — 포토 타이밍 최고.',
    promoLabel: '아미 필수 성지',
    seoTitle: '하이브 본사 | BTS 소속사 용산 성지순례 | GlowUpTour',
    seoDescription:
      '용산 한강대로 42. BTS·세븐틴·뉴진스 소속사 사옥. 전 세계 아미 필수 인증샷 성지. GlowUpTour K팝 투어.',
    seoTags: ['하이브본사', 'BTS성지', 'K팝투어', '용산하이브', '아미성지순례', 'HYBE building', 'BTS pilgrimage Seoul', 'Kpop tour Korea', 'ARMY tour'],
    ogDescription: 'K팝 투어 | 하이브 본사·BTS 성지·아미 인증샷 — GlowUpTour',
  },
  {
    title: '하이브 인사이트 (HYBE INSIGHT)',
    slug: 'hybe-insight-museum-yongsan',
    description:
      '하이브 아티스트의 음악 세계관을 담은 복합 전시 공간 — BTS·하이브 아티스트 뮤지엄·전시·체험·공식 굿즈까지 한 번에. 유료·사전 예약제이며 휴관·재개관이 반복되므로 방문 전 공식 채널 확인이 필수다. 방문 팁: 예약 오픈 즉시 매진되는 경우가 많으니 여행 일정 확정 전 예약 우선.',
    locationLabel: '용산 (신용산역)',
    address: '서울 용산구 한강대로 42 하이브 인사이트',
    station: '신용산역',
    contents: 'BTS·하이브 아티스트 뮤지엄 · 전시 · 체험 · 공식 굿즈',
    priceRange: '유료 · 사전 예약제',
    tip: '예약 오픈 즉시 매진 많음 — 여행 일정 확정 전 예약 우선. 운영 재개 여부 공식 홈페이지 확인.',
    promoLabel: '사전 예약제',
    seoTitle: '하이브 인사이트 | BTS 뮤지엄·전시 체험 | GlowUpTour',
    seoDescription:
      '용산 하이브 사옥. BTS·하이브 아티스트 뮤지엄. 전시+포토존+굿즈. 사전 예약제. GlowUpTour K팝 투어.',
    seoTags: ['하이브인사이트', 'BTS뮤지엄', 'K팝전시', 'BTS굿즈', 'HYBE INSIGHT', 'BTS museum Seoul', 'Kpop exhibition', 'BTS goods'],
    ogDescription: 'K팝 투어 | 하이브 인사이트·BTS 뮤지엄·예약 필수 — GlowUpTour',
  },
  {
    title: '광야@서울 (KWANGYA@SEOUL)',
    slug: 'kwangya-seoul-sm-store',
    description:
      'SM엔터테인먼트 본사 1층 공식 스토어. 에스파·NCT·라이즈·엑소·레드벨벳 공식 굿즈 총집합에 SM 세계관 \'광야\' 컨셉 공간 — 운 좋으면 출근하는 아티스트 목격담도 있다. 입장 무료(굿즈 구매 별도), 서울숲 데이트 코스 연계. 방문 팁: 컴백 시즌 한정 팝업·포토카드 이벤트 체크.',
    locationLabel: '성수 (서울숲역)',
    address: '서울 성동구 왕십리로 83-21 광야앳서울',
    station: '서울숲역 (수인분당선)',
    contents: 'SM 공식 굿즈샵 · 아티스트 MD · 포토존 · 시즌 한정 팝업',
    priceRange: '무료 입장',
    tip: '컴백 시즌 한정 팝업·포토카드 이벤트 체크.',
    promoLabel: 'SM 본사 스토어',
    seoTitle: '광야@서울 | SM 본사 공식 굿즈샵 서울숲 | GlowUpTour',
    seoDescription:
      '서울숲역. SM 본사 1층 공식 스토어. 에스파·NCT·라이즈 굿즈 총집합. 광야 세계관 공간. GlowUpTour K팝 투어.',
    seoTags: ['광야서울', 'SM굿즈샵', '에스파굿즈', 'NCT굿즈', '서울숲SM', 'KWANGYA SEOUL', 'SM official store', 'aespa goods', 'Kpop store Seoul'],
    ogDescription: 'K팝 투어 | 광야@서울·SM 본사 스토어·광야 세계관 — GlowUpTour',
  },
  {
    title: 'SMTOWN &STORE @DDP (SM타운 앤스토어 동대문)',
    slug: 'smtown-andstore-ddp',
    description:
      'SM 브랜드마케팅이 운영하는 공식 리테일 스토어 — 앨범·MD·시즌 그리팅을 DDP(동대문디자인플라자) 안에서 만난다. 입장 무료(굿즈 구매 별도). DDP 관광과 연계해 야경·전시·쇼핑을 한 동선에, 동대문 쇼핑 일정과 묶기 최적. 방문 팁: DDP 야간 개장일에 방문하면 쇼핑+야경 동시 해결.',
    locationLabel: '동대문 (DDP 직결)',
    address: '서울 중구 을지로 281 DDP SMTOWN 스토어',
    station: '동대문역사문화공원역 직결',
    contents: 'SM 공식 리테일 스토어 · 앨범 · MD · 시즌 그리팅',
    priceRange: '무료 입장',
    tip: 'DDP 야간 개장일에 방문하면 쇼핑+야경 동시 해결.',
    promoLabel: 'DDP 직결',
    seoTitle: 'SM타운 앤스토어 DDP | 동대문 SM 공식 스토어 | GlowUpTour',
    seoDescription:
      'DDP 내 SM 공식 리테일. 앨범·MD·시즌그리팅. 동대문 관광 연계 최적. GlowUpTour K팝 투어.',
    seoTags: ['SM타운스토어', 'DDP굿즈샵', '동대문K팝', 'SM앨범', 'SMTOWN store', 'DDP Kpop shop', 'SM official goods', 'Kpop shopping Seoul'],
    ogDescription: 'K팝 투어 | SM타운 앤스토어·DDP 직결·쇼핑 연계 — GlowUpTour',
  },
  {
    title: 'JYP 더스퀘어 (JYP THE SQUARE)',
    slug: 'jyp-the-square-store-cafe',
    description:
      'JYP 신사옥 내 공식 스토어 & 카페 복합 공간. 트와이스·스트레이키즈·있지·엔믹스 MD 쇼핑과 함께 JYP 아티스트 테마 음료·디저트를 즐긴다. 스트레이키즈 글로벌 팬덤의 서울 필수 코스이며 사옥 자체가 포토스팟. 입장 무료(굿즈·카페 이용 별도). 방문 팁: 아티스트 생일 시즌 카페 스페셜 메뉴 운영.',
    locationLabel: '강동 (둔촌동역)',
    address: '서울 강동구 강동대로 205 JYP센터',
    station: '둔촌동역·강동역',
    contents: 'JYP 공식 굿즈샵 + 카페 — 트와이스·스키즈·있지·엔믹스 MD',
    priceRange: '무료 입장',
    tip: '아티스트 생일 시즌 카페 스페셜 메뉴 운영.',
    promoLabel: '굿즈샵+카페',
    seoTitle: 'JYP 더스퀘어 | 스키즈·트와이스 공식 굿즈샵+카페 | GlowUpTour',
    seoDescription:
      'JYP센터. 공식 스토어+카페 복합. 스트레이키즈·트와이스·있지 MD. 아티스트 테마 카페. GlowUpTour K팝 투어.',
    seoTags: ['JYP더스퀘어', '스키즈굿즈', '트와이스굿즈', 'JYP카페', 'JYP THE SQUARE', 'Stray Kids goods', 'TWICE store Seoul', 'JYP official shop'],
    ogDescription: 'K팝 투어 | JYP 더스퀘어·굿즈샵+카페·스키즈 성지 — GlowUpTour',
  },
  {
    title: 'YG 본사 & 더세임 (YG Headquarters & THE SameE)',
    slug: 'yg-thesamee-blackpink-hapjeong',
    description:
      '블랙핑크·트레저·베이비몬스터 소속 YG 사옥과 바로 옆 공식 카페 더세임. 카페에서 YG 굿즈+베이커리+아티스트 관련 전시 요소를 즐길 수 있어 블링크(BLINK) 글로벌 팬 필수 코스다. 사옥 출입은 불가, 더세임 카페는 자유 이용. 합정·망원 카페 투어 연계. 방문 팁: 사옥 신축 이전 이슈가 있을 수 있으니 방문 전 최신 위치 확인.',
    locationLabel: '합정 (합정역·망원역)',
    address: '서울 마포구 희우정로1길 7 YG 더세임',
    station: '합정역·망원역',
    contents: 'YG 사옥 포토스팟 + 공식 카페 더세임 (굿즈·베이커리)',
    priceRange: '무료 입장',
    tip: '사옥 신축 이전 이슈 가능 — 방문 전 최신 위치 확인.',
    promoLabel: '블랙핑크 성지',
    seoTitle: 'YG 본사 & 더세임 | 블랙핑크 성지·공식 카페 | GlowUpTour',
    seoDescription:
      '합정. 블랙핑크·베이비몬스터 소속 YG 사옥+공식 카페 더세임. 굿즈+베이커리. 블링크 필수 코스. GlowUpTour K팝 투어.',
    seoTags: ['YG본사', '블랙핑크성지', '더세임카페', 'YG굿즈', 'THE SameE', 'BLACKPINK pilgrimage', 'YG cafe Seoul', 'BLINK tour', 'Kpop tour'],
    ogDescription: 'K팝 투어 | YG 사옥·더세임 카페·블랙핑크 성지 — GlowUpTour',
  },
  {
    title: 'K-스타로드 (K-Star Road)',
    slug: 'k-star-road-apgujeong-gangnamdol',
    description:
      '강남구 공식 한류 거리 — 압구정로데오역에서 청담사거리까지 약 1km. BTS·엑소·소녀시대 등 아티스트별 대형 곰돌이 조형물 \'강남돌(GangnamDol)\' 17개+와 인증샷을 찍는 무료 야외 코스. 청담 기획사 밀집 지역과 연결 — 갤러리아 명품관·청담 카페 투어 연계. 방문 팁: 전 구간 도보 30분, 압구정로데오에서 시작해 청담 방향 추천.',
    locationLabel: '압구정로데오~청담',
    address: '서울 강남구 압구정로 K-Star Road',
    station: '압구정로데오역 2번 출구',
    contents: '강남돌(GangnamDol) 아트토이 거리 · 한류스타 상징 조형물 17개+',
    priceRange: '무료 입장',
    tip: '전 구간 도보 30분 — 압구정로데오에서 시작해 청담 방향 추천.',
    promoLabel: '무료 도보 코스',
    seoTitle: 'K스타로드 | 압구정 강남돌 한류거리 | GlowUpTour',
    seoDescription:
      '압구정로데오. 강남구 공식 한류거리. BTS·엑소 강남돌 조형물 인증샷. 청담 연계 도보 코스. GlowUpTour K팝 투어.',
    seoTags: ['K스타로드', '강남돌', '압구정한류거리', 'K팝포토스팟', 'K-Star Road', 'GangnamDol', 'Hallyu street Seoul', 'Kpop photo spot', '청담K팝'],
    ogDescription: 'K팝 투어 | K스타로드·강남돌 인증샷·무료 도보 코스 — GlowUpTour',
  },
  {
    title: '케이타운포유 스퀘어 (Ktown4u Square)',
    slug: 'ktown4u-square-samseong',
    description:
      '243개국 배송 글로벌 K팝 플랫폼 Ktown4u의 오프라인 메가스토어. 앨범 발매 기념 럭키드로우·사인회·컴백 팝업이 상시 열리고, 면세 혜택·해외 배송 연계로 외국인 쇼핑에 최적화되어 있다. 입장 무료(구매 별도). 방문 팁: 컴백 시즌 특전 포토카드 이벤트 필수 체크.',
    locationLabel: '삼성동 (코엑스 인근)',
    address: '서울 강남구 삼성동 Ktown4u',
    station: '삼성역·봉은사역',
    contents: '글로벌 K팝 플랫폼 오프라인 메가스토어 · 앨범 · 굿즈 · 팝업',
    priceRange: '무료 입장',
    tip: '컴백 시즌 특전 포토카드 이벤트 필수 체크.',
    promoLabel: '럭키드로우 성지',
    seoTitle: '케이타운포유 스퀘어 | 삼성동 K팝 메가스토어 | GlowUpTour',
    seoDescription:
      '삼성동 코엑스 인근. 글로벌 K팝 플랫폼 오프라인 거점. 앨범·굿즈·럭키드로우·팝업. 해외배송 연계. GlowUpTour K팝 투어.',
    seoTags: ['케이타운포유', 'K팝앨범샵', '럭키드로우', '삼성동굿즈샵', 'Ktown4u', 'Kpop album store Seoul', 'lucky draw event', 'Kpop mega store'],
    ogDescription: 'K팝 투어 | Ktown4u 스퀘어·럭키드로우·글로벌 배송 — GlowUpTour',
  },
  {
    title: '핫트랙스 강남점 (Hottracks Gangnam)',
    slug: 'hottracks-gangnam-kpop-album',
    description:
      '교보문고 계열 대형 음반·문구 체인. K팝 앨범 초동 구매·특전 포토카드 이벤트에 참여할 수 있고, 교보문고 강남점과 같은 건물이라 서점+음반+굿즈를 한 번에 해결한다. 신논현역 직결로 강남권 접근성 최고. 입장 무료(구매 별도). 방문 팁: 발매 첫 주 방문 시 초동 특전 확보 확률 높음.',
    locationLabel: '신논현역 직결',
    address: '서울 서초구 강남대로 465 교보타워 핫트랙스',
    station: '신논현역 직결',
    contents: '대형 음반 매장 · K팝 앨범 · 공식 MD · 문구',
    priceRange: '무료 입장',
    tip: '발매 첫 주 방문 시 초동 특전 확보 확률 높음.',
    promoLabel: '특전 포토카드',
    seoTitle: '핫트랙스 강남 | 신논현 K팝 앨범·특전 | GlowUpTour',
    seoDescription:
      '신논현역 교보타워. 대형 음반 매장. K팝 앨범 초동·특전 포토카드. 교보문고 연계. GlowUpTour K팝 투어.',
    seoTags: ['핫트랙스강남', 'K팝앨범', '특전포토카드', '신논현굿즈', 'Hottracks', 'Kpop album Gangnam', 'photocard event Seoul', 'album store Korea'],
    ogDescription: 'K팝 투어 | 핫트랙스 강남·앨범 초동·특전 이벤트 — GlowUpTour',
  },
  {
    title: '위드뮤 AK플라자 홍대점 (WITHMUU AK Plaza Hongdae)',
    slug: 'withmuu-hongdae-lightstick',
    description:
      'Visit Seoul 공식 등재 K팝 굿즈 전문점. 아이돌 응원봉을 실물로 비교하고 구매할 수 있어 콘서트를 앞두고 응원봉을 사러 오는 외국인들의 성지다. 아티스트 친필 사인 앨범 판매, 홍대입구역 직결로 홍대 관광 연계. 입장 무료(구매 별도). 방문 팁: 콘서트 일정이 있다면 응원봉 재고 미리 전화 확인.',
    locationLabel: '홍대 (홍대입구역 직결)',
    address: '서울 마포구 양화로 188 AK플라자 홍대 위드뮤',
    station: '홍대입구역 직결',
    contents: 'K팝 응원봉 · 공식 MD · 사인 앨범 · 드라마 굿즈',
    priceRange: '무료 입장',
    tip: '콘서트 일정 있다면 응원봉 재고 미리 전화 확인.',
    promoLabel: '응원봉 성지',
    seoTitle: '위드뮤 홍대 | 응원봉·사인앨범 K팝 전문점 | GlowUpTour',
    seoDescription:
      '홍대입구역 AK플라자. 응원봉 실물 구매·친필 사인 앨범. Visit Seoul 등재. 콘서트 준비 성지. GlowUpTour K팝 투어.',
    seoTags: ['위드뮤', '응원봉구매', '사인앨범', '홍대K팝샵', 'WITHMUU', 'lightstick store Seoul', 'signed album Korea', 'Kpop merch Hongdae'],
    ogDescription: 'K팝 투어 | 위드뮤·응원봉 실물 구매·사인 앨범 — GlowUpTour',
  },
  {
    title: '뮤직코리아 명동점 (Music Korea Myeongdong)',
    slug: 'musickorea-myeongdong-kpop',
    description:
      '명동 대표 K팝 전문 매장 — 외국인 관광객 비중 최상위. 앨범 구매 시 팬사인회 응모가 가능한 공식 판매처이며 다국어 응대에 익숙한 직원이 있다. 명동 쇼핑·환전·숙소 동선과 완벽 연계. 입장 무료(구매 별도). 방문 팁: 사인회 응모 대상 앨범인지 구매 전 확인.',
    locationLabel: '명동 (명동역)',
    address: '서울 중구 명동 뮤직코리아',
    station: '명동역',
    contents: 'K팝 앨범 · 응원봉 · 공식 굿즈 · 팬사인회 응모',
    priceRange: '무료 입장',
    tip: '사인회 응모 대상 앨범인지 구매 전 확인.',
    promoLabel: '팬사인회 응모',
    seoTitle: '뮤직코리아 명동 | K팝 앨범·팬사인회 응모 | GlowUpTour',
    seoDescription:
      '명동역 인근. 명동 대표 K팝 매장. 앨범·응원봉·팬사인회 응모 공식 판매처. 외국인 응대 특화. GlowUpTour K팝 투어.',
    seoTags: ['뮤직코리아', '명동K팝샵', '팬사인회응모', 'K팝앨범명동', 'Music Korea', 'fansign event album', 'Kpop store Myeongdong', 'Kpop shopping'],
    ogDescription: 'K팝 투어 | 뮤직코리아 명동·사인회 응모·외국인 특화 — GlowUpTour',
  },
  {
    title: '코엑스 아티움 & 별마당 K팝 스팟 (COEX Artium & Byeolmadang)',
    slug: 'coex-kpop-billboard-popup',
    description:
      'SM타운 코엑스아티움의 상징성을 이어받은 K팝 문화 존. 코엑스 3D 대형 전광판은 아티스트 생일·컴백 광고 성지 — 팬덤 서포트 광고 관람 명소다. 별마당 도서관 포토스팟과 K팝 팝업스토어가 수시로 열린다. 삼성역·봉은사역 직결, 입장 무료. 방문 팁: 방문 시기 팬덤 전광판 광고 일정을 X(트위터)에서 검색하면 원하는 아티스트 광고 시간 확인 가능.',
    locationLabel: '삼성동 (코엑스)',
    address: '서울 강남구 영동대로 513 코엑스몰 별마당도서관',
    station: '삼성역·봉은사역 직결',
    contents: '대형 K팝 옥외광고(3D 파사드) · 별마당 도서관 · 아티스트 팝업스토어',
    priceRange: '무료 입장',
    tip: '팬덤 전광판 광고 일정을 X(트위터)에서 검색하면 원하는 아티스트 광고 시간 확인 가능.',
    promoLabel: '3D 전광판 성지',
    seoTitle: '코엑스 K팝 스팟 | 3D 전광판·팝업 성지 | GlowUpTour',
    seoDescription:
      '삼성역 코엑스. K팝 3D 전광판 광고 성지·별마당 도서관·아티스트 팝업. 팬덤 서포트 광고 명소. GlowUpTour K팝 투어.',
    seoTags: ['코엑스K팝', '3D전광판', '생일광고성지', '별마당도서관', 'K팝팝업', 'COEX billboard', 'Kpop birthday ad', 'fandom support Seoul', 'Kpop popup store'],
    ogDescription: 'K팝 투어 | 코엑스·3D 전광판·팬덤 광고 성지 — GlowUpTour',
  },
];
