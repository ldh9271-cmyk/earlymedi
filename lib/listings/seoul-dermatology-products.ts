/**
 * 서울 외국인 FIT 추천 피부과/클리닉 22곳 — founder 2026-06-30 큐레이션.
 *
 * 마스터 콘솔의 "피부과 22종 일괄 등록" 버튼이 이 배열을 읽어
 * hospitals + category_listings 두 테이블에 카테고리='dermatology' 로
 * 한 번에 insert. partner_listings 에는 인서트하지 않음 (2026-06-25
 * 정책 — 병원은 hospitals 단일 진실원).
 *
 * 멱등 동작:
 *   - hospitals.(organizationId, slug) UNIQUE → 같은 슬러그가
 *     이미 있으면 (예: 드림성형외과·셀러블153강남의원·세라성형외과
 *     성형외과 시드에 포함됨) 그 hospitalId 를 재사용하고
 *     category_listings 만 'dermatology' 키로 추가 → 한 병원이
 *     성형외과 + 피부과 두 카테고리에 모두 노출됨.
 *
 * 원본 큐레이션 노트 (사용자 입력 23 → 22):
 *   - #8 연세엘레슈의원은 서울 소재 여부 미확인으로 제외.
 *   - #1, #9, #13 은 성형외과 시드에 이미 있어 cross-category 등록만.
 */

export type DermatologySeed = {
  title: string;
  description: string;
  locationLabel: string;
  address: string;
  phone: string;
  nearestStation: string;
  signatureProcedures: ReadonlyArray<string>;
  /** 첫 대표시술 — HospitalFields.procedureName 매칭. */
  procedureName: string;
  openingYear?: number;
  promoLabel?: string;
  /** 외국인 통역 가능 여부 (HospitalFields.interpreterIncluded). */
  interpreterIncluded?: boolean;
  imageKeywords: ReadonlyArray<string>;
  seoTags: ReadonlyArray<string>;
};

export const DERMATOLOGY_PRODUCTS: ReadonlyArray<DermatologySeed> = [
  {
    title: '드림성형외과(드림피부과)',
    description:
      '1999년 개원한 강남 압구정 종합 미용 클리닉. 드림성형외과·드림피부과·드림치과를 한 건물에서 원스톱으로 운영하며, 서울대 의대 출신 전문의진이 안티에이징·보톡스·필러·피부클리닉을 진료. 같은 빌딩 안에서 피부과 시술과 성형 상담을 동시에 받을 수 있어 외국인 FIT 환자의 시간 효율이 높음.',
    locationLabel: '강남 압구정',
    address: '서울특별시 강남구 논현로 848 (신사동)',
    phone: '02-546-1616',
    nearestStation: '압구정역 3번 출구',
    signatureProcedures: ['안티에이징', '보톡스', '필러', '피부클리닉', '레이저 토닝'],
    procedureName: '안티에이징·보톡스·필러',
    openingYear: 1999,
    promoLabel: '원스톱 메디컬 빌딩',
    interpreterIncluded: true,
    imageKeywords: ['Dream Dermatology Apgujeong', 'one-stop clinic', 'anti-aging Seoul', '드림피부과 압구정'],
    seoTags: ['압구정 피부과', '강남 안티에이징', 'Dream Dermatology', '외국인 의료관광 피부과'],
  },
  {
    title: '스템케이피부과',
    description:
      '신사역 인근 피부·미용 통합 클리닉. 성형외과 전문의가 직접 시술하며 이물질제거센터를 특화 운영. 한·영·중·일 4개국어 진료가 가능해 외국인 비중이 높으며, 줄기세포·광채주사·리본리프팅 등 차세대 안티에이징 메뉴를 운영.',
    locationLabel: '강남 신사',
    address: '서울특별시 강남구 신사동 (신사역 인근)',
    phone: '홈페이지 문의',
    nearestStation: '신사역',
    signatureProcedures: ['이물질제거', '피지낭종치료', '안티에이징', '줄기세포', '광채주사', '리본리프팅'],
    procedureName: '이물질제거·피지낭종 치료',
    promoLabel: '4개국어 진료',
    interpreterIncluded: true,
    imageKeywords: ['Stem K Dermatology', 'Sinsa-dong', 'foreign body removal center', '광채주사 줄기세포'],
    seoTags: ['신사역 피부과', '이물질 제거 클리닉', '다국어 피부과', '줄기세포 안티에이징'],
  },
  {
    title: '도자기의원',
    description:
      '"회복 기반 클리닉" 컨셉의 압구정 통합 미용 클리닉. 세포치료·실리프팅(무제한 부위)·성형·피부과 진료를 한 곳에서 통합 제공하며 K-뷰티 글로벌 고객층에 특화. 시술 후 회복 프로토콜에 집중하는 점이 차별 포인트.',
    locationLabel: '강남 압구정',
    address: '서울특별시 강남구 압구정 인근',
    phone: '홈페이지 문의',
    nearestStation: '압구정역',
    signatureProcedures: ['세포치료', '실리프팅 무제한', '성형', '피부과 통합'],
    procedureName: '세포치료·실리프팅',
    promoLabel: '회복 기반 클리닉',
    interpreterIncluded: true,
    imageKeywords: ['Dojagi Clinic Apgujeong', 'K-beauty cell therapy', 'thread lift unlimited', '도자기의원'],
    seoTags: ['압구정 피부과', '실리프팅 무제한', '세포치료 클리닉', 'K-뷰티 통합 클리닉'],
  },
  {
    title: '압구정오라클피부과',
    description:
      '서울대 피부과 전문의 박제영 대표원장 진료. 국내외 90여 지점을 보유한 오라클 네트워크의 본원격으로, 울쎄라·써마지·티타늄 마스터 키닥터 인증을 보유. 보건복지부장관상 수상 이력이 있으며 안다즈호텔 뒷편 4층에 위치해 호텔 투숙 외국인 환자 동선이 좋음.',
    locationLabel: '강남 압구정',
    address: '서울특별시 강남구 압구정로30길 23 미승빌딩 4층',
    phone: '02-544-2777',
    nearestStation: '압구정역 3번 출구 (안다즈호텔 뒷편)',
    signatureProcedures: ['울쎄라', '써마지', '티타늄 리프팅', '주름탄력개선', '비수술 얼굴윤곽'],
    procedureName: '울쎄라·써마지·티타늄',
    promoLabel: '보건복지부장관상 수상',
    interpreterIncluded: true,
    imageKeywords: ['Apgujeong Oracle Dermatology', 'Ulthera Thermage Titanium', 'Andaz Hotel area', '박제영 오라클'],
    seoTags: ['압구정 피부과', '오라클 피부과', '울쎄라 마스터', '써마지 키닥터', '비수술 윤곽'],
  },
  {
    title: '청담아르덴의원',
    description:
      '압구정역과 청담역 사이 청담동 88-37 위치한 피부과 클리닉. 압구정현대 인근 프리미엄 입지로 청담 럭셔리 고객층 대상 진료. 통합 미용 시술과 안티에이징 메뉴 운영.',
    locationLabel: '강남 청담',
    address: '서울특별시 강남구 선릉로152길 17 5층 (청담동 88-37)',
    phone: '0507-1307-1427',
    nearestStation: '압구정역·청담역 (압구정현대 인근)',
    signatureProcedures: ['안티에이징', '리프팅', '레이저 토닝', '쁘띠 시술', '맞춤 스킨케어'],
    procedureName: '안티에이징·리프팅',
    promoLabel: '청담 럭셔리 라인',
    interpreterIncluded: false,
    imageKeywords: ['Cheongdam Arden Clinic', 'luxury dermatology Apgujeong', '청담아르덴'],
    seoTags: ['청담 피부과', '압구정 청담 안티에이징', '청담 럭셔리 클리닉'],
  },
  {
    title: '메이린클리닉 압구정',
    description:
      '백화점·호텔 등 프리미엄 입지 특화 네트워크 클리닉. 압구정 아크힐즈16빌딩 4층(접수/시술)과 6층(VIP 센터) 2개층 운영. 울쎄라·리프팅·토닝·쁘띠·탈모·비만관리까지 통합 패키지로 제공.',
    locationLabel: '강남 압구정',
    address: '서울특별시 강남구 압구정로30길 16 아크힐즈16빌딩 4층(접수/시술)·6층(VIP센터)',
    phone: '0507-1338-2488',
    nearestStation: '압구정역',
    signatureProcedures: ['울쎄라', '리프팅', '토닝', '쁘띠 시술', '탈모 치료', '비만 관리'],
    procedureName: '울쎄라·리프팅·토닝',
    promoLabel: 'VIP 센터 운영',
    interpreterIncluded: true,
    imageKeywords: ['Maylin Clinic Apgujeong', 'Arc Hills building', 'VIP dermatology', '메이린 압구정'],
    seoTags: ['압구정 피부과', '메이린 클리닉', '울쎄라 리프팅', 'VIP 피부 관리'],
  },
  {
    title: '메이린클리닉 일산점',
    description:
      '현대백화점 킨텍스점 9층 입점 피부 클리닉. 백화점 쇼핑과 안티에이징·리프팅 시술을 동시에 받을 수 있는 동선이 강점. 울쎄라·리프팅·토닝·탈모·비만관리 등 메이린 네트워크 시그니처 메뉴 운영.',
    locationLabel: '경기 일산',
    address: '경기 고양시 일산서구 호수로 817 현대백화점 킨텍스점 9층',
    phone: '031-919-0000',
    nearestStation: '대화역·주엽역 (현대백화점 킨텍스)',
    signatureProcedures: ['울쎄라', '리프팅', '토닝', '탈모 치료', '비만 관리'],
    procedureName: '울쎄라·리프팅·토닝',
    promoLabel: '현대백화점 입점',
    interpreterIncluded: false,
    imageKeywords: ['Maylin Clinic Ilsan', 'Hyundai Department Store KINTEX', '일산 메이린'],
    seoTags: ['일산 피부과', '현대백화점 킨텍스', '메이린 일산', '백화점 피부 클리닉'],
  },
  {
    title: '셀러블153강남의원(피부과)',
    description:
      '논현동 언주로 720 B1~B3층 3개 층 복합 프리미엄 메디컬센터의 피부과 부문. 같은 빌딩 안에서 성형외과·줄기세포·건강검진·피부클리닉을 통합 제공해 외국인 FIT 환자가 한 번 방문으로 다과목 진료를 받을 수 있는 원스톱 구조.',
    locationLabel: '강남 논현',
    address: '서울특별시 강남구 언주로 720 B1~B3층 (논현동)',
    phone: '홈페이지 문의',
    nearestStation: '학동역·강남구청역·압구정로데오역',
    signatureProcedures: ['피부클리닉', '안티에이징', '줄기세포 시술', '리프팅', '레이저 토닝'],
    procedureName: '피부클리닉·줄기세포',
    promoLabel: '3개층 통합 메디컬',
    interpreterIncluded: true,
    imageKeywords: ['Cellable 153 Gangnam', 'multi-floor medical center', '셀러블 153 피부과'],
    seoTags: ['논현 피부과', '강남 통합 메디컬', '셀러블 153', '원스톱 클리닉'],
  },
  {
    title: '클림의원 홍대점',
    description:
      '롯데호텔 L7홍대 3층 입점. 홍대입구역 1번 출구에서 100m 거리. 야간·주말 진료 운영으로 외국인 관광객 동선에 최적화. Tax refund·WeChat Pay·Alipay 결제 지원. 보톡스·필러·스킨부스터·피코슈어·클림주사 시그니처 메뉴.',
    locationLabel: '서울 홍대',
    address: '서울특별시 마포구 양화로 141 (롯데호텔 L7홍대) 3층',
    phone: '+82 10-7368-4441',
    nearestStation: '홍대입구역 1번 출구 100m',
    signatureProcedures: ['보톡스', '필러', '스킨부스터', '피코슈어', '클림주사'],
    procedureName: '보톡스·필러·스킨부스터',
    promoLabel: 'Tax refund·WeChat·Alipay',
    interpreterIncluded: true,
    imageKeywords: ['Klim Clinic Hongdae', 'L7 Hotel Hongdae', 'night weekend dermatology', 'WeChat Pay clinic'],
    seoTags: ['홍대 피부과', '외국인 관광객 피부과', 'L7 호텔 클리닉', 'Tax refund 피부과'],
  },
  {
    title: '클림의원 명동점',
    description:
      '명동길 43 4·5층에 위치한 명동 도보 접근성 최상의 피부 클리닉. 을지로입구역 320m. "클림 시그니처" 4종 프리미엄 시술(턱선교정필러·눈썹뼈눈매교정·액체실리프팅·보톡스·필러)을 운영하며 명동 관광객·면세점 동선과 결합한 진료 패키지.',
    locationLabel: '서울 명동',
    address: '서울특별시 중구 명동길 43, 4·5층 (명동1가)',
    phone: '홈페이지 문의',
    nearestStation: '을지로입구역 320m',
    signatureProcedures: ['턱선교정필러', '눈썹뼈눈매교정', '액체실리프팅', '보톡스', '필러'],
    procedureName: '턱선교정필러·눈썹뼈눈매교정',
    promoLabel: '클림 시그니처 4종',
    interpreterIncluded: true,
    imageKeywords: ['Klim Clinic Myeongdong', 'jawline filler signature', '명동 피부과 클림'],
    seoTags: ['명동 피부과', '클림 시그니처', '턱선교정 필러', '외국인 관광객 명동 클리닉'],
  },
  {
    title: '오테나의원',
    description:
      '남대문로 90 17층에 위치한 명동·을지로입구·시청권 통합 미용 클리닉. 신세계백화점 본점에서 도보 거리. 외국인 쇼핑객과 비즈니스 출장 환자 동선에 최적화된 입지.',
    locationLabel: '서울 명동·남대문',
    address: '서울특별시 중구 남대문로 90 17층 (남대문로2가 5-3)',
    phone: '0507-1384-5642',
    nearestStation: '명동역·을지로입구역·시청역',
    signatureProcedures: ['보톡스', '필러', '리프팅', '레이저 토닝', '피부 진정 케어'],
    procedureName: '보톡스·필러·리프팅',
    promoLabel: '신세계 본점 도보권',
    interpreterIncluded: true,
    imageKeywords: ['Otena Clinic Namdaemun', 'Shinsegae Main flagship', '오테나의원'],
    seoTags: ['명동 피부과', '남대문 클리닉', '신세계백화점 인근 피부과', '외국인 쇼핑 피부과'],
  },
  {
    title: '세라성형외과(피부과)',
    description:
      '눈·코 재수술과 안면거상·동안성형 전문 강남 클리닉. 성형 후 피부 컨디션 회복과 안티에이징 진료를 병행 운영해 재수술 환자에게 트리트먼트 패키지를 제공.',
    locationLabel: '강남 압구정·청담',
    address: '서울특별시 강남구 (압구정·청담 인근)',
    phone: '홈페이지 문의',
    nearestStation: '압구정역·청담역',
    signatureProcedures: ['눈재수술 회복관리', '동안성형 보조 피부케어', '안면거상 후 안티에이징', '레이저 토닝'],
    procedureName: '재수술 후 피부 회복',
    promoLabel: '재수술 회복 케어',
    interpreterIncluded: false,
    imageKeywords: ['Sera Plastic Surgery dermatology', 'revision recovery skin care', '세라 피부과'],
    seoTags: ['강남 피부과', '재수술 회복 피부과', '동안성형 보조 케어'],
  },
  {
    title: '메이린의원 더현대서울',
    description:
      '더현대서울 백화점 2층 입점. 여의도 쇼핑과 울쎄라·리프팅·토닝·쁘띠 시술을 동시에 받을 수 있는 동선이 강점. 메이린 네트워크 시그니처 메뉴를 백화점 환경에서 프리미엄 인테리어로 제공.',
    locationLabel: '서울 여의도',
    address: '서울특별시 영등포구 여의대로 108 더현대서울 2층',
    phone: '홈페이지 문의',
    nearestStation: '여의나루역·여의도역',
    signatureProcedures: ['울쎄라', '리프팅', '토닝', '쁘띠 시술', '안티에이징'],
    procedureName: '울쎄라·리프팅·토닝',
    promoLabel: '더현대서울 입점',
    interpreterIncluded: false,
    imageKeywords: ['Maylin Clinic The Hyundai Seoul', 'Yeouido department store dermatology', '여의도 메이린'],
    seoTags: ['여의도 피부과', '더현대서울 피부과', '메이린 더현대', '백화점 피부 클리닉'],
  },
  {
    title: '리앤채움의원(피부과)',
    description:
      '신사동 논현로 837 원방빌딩 4층 위치. 압구정역 인근 접근성 우수. 성형과 피부 통합 시술(눈·코·리프팅·쁘띠·피부관리) 운영으로 외국인 FIT 환자에게 다과목 동시 진료 동선 제공.',
    locationLabel: '강남 신사',
    address: '서울특별시 강남구 논현로 837 원방빌딩 4층 (신사동)',
    phone: '홈페이지 문의',
    nearestStation: '압구정역',
    signatureProcedures: ['피부관리', '리프팅', '쁘띠 시술', '레이저 토닝', '안티에이징'],
    procedureName: '피부관리·리프팅',
    promoLabel: '성형+피부 통합',
    interpreterIncluded: true,
    imageKeywords: ['Re&Chaeum Clinic Sinsa', 'Apgujeong dermatology', '리앤채움 신사'],
    seoTags: ['신사 피부과', '압구정 통합 클리닉', '리앤채움'],
  },
  {
    title: '얼라이브피부과',
    description:
      '반포 원베일리 스퀘어 4층에 위치한 피부과 전문의 프리미엄 클리닉. 안티에이징과 난치성 피부질환 치료를 중점 운영. 고속터미널역 인근으로 강남 권역 환자 접근성 우수.',
    locationLabel: '서초 반포',
    address: '서울특별시 서초구 반포대로 291 원베일리 스퀘어 4층 437~440호 (반포동)',
    phone: '홈페이지 문의',
    nearestStation: '고속터미널역',
    signatureProcedures: ['안티에이징', '난치성 피부질환', '프리미엄 스킨케어', '레이저 색소', '맞춤 트리트먼트'],
    procedureName: '안티에이징·난치성 피부질환',
    promoLabel: '난치성 피부질환 전문',
    interpreterIncluded: false,
    imageKeywords: ['Alive Dermatology Banpo', 'One Bailey Square', '원베일리 피부과'],
    seoTags: ['반포 피부과', '서초 피부과', '난치성 피부질환', '원베일리 클리닉'],
  },
  {
    title: '닥터손유나의원',
    description:
      '신사동 도산대로53길 지우빌딩 1~5층 5개층 단독 운영. 인스타그램 팔로워 4만+의 원장 브랜드 클리닉으로 리프팅·보톡스·필러 등 종합 미용 시술. 야간 상담 채널 운영해 외국인 시차 환자도 응대.',
    locationLabel: '강남 신사',
    address: '서울특별시 강남구 도산대로53길 6 (지우빌딩) 1~5층 (신사동)',
    phone: '02-3443-1117',
    nearestStation: '신사역',
    signatureProcedures: ['리프팅', '보톡스', '필러', '레이저 토닝', '맞춤 안티에이징'],
    procedureName: '리프팅·보톡스·필러',
    promoLabel: '인스타 4만+ 원장 브랜드',
    interpreterIncluded: true,
    imageKeywords: ['Dr Son Yuna Clinic Sinsa', 'influencer dermatology Seoul', '닥터손유나'],
    seoTags: ['신사 피부과', '닥터손유나', '인플루언서 피부과', '도산대로 클리닉'],
  },
  {
    title: '라미체의원(클럽미즈라미체)',
    description:
      '잠실새내역 4번 출구 인근에 위치한 20년+ 역사의 송파 피부과. 2002년 개원으로 여드름·모공·리프팅·색소 4대 특화 진료를 일관되게 운영. 맞춤시술 컨셉으로 단골 환자 비중이 높음.',
    locationLabel: '서울 잠실',
    address: '서울특별시 송파구 잠실새내역 4번 출구 인근',
    phone: '홈페이지 문의',
    nearestStation: '잠실새내역 4번 출구',
    signatureProcedures: ['여드름 치료', '모공 관리', '리프팅', '색소 치료', '맞춤 시술'],
    procedureName: '여드름·모공·리프팅·색소',
    openingYear: 2002,
    promoLabel: '20년+ 송파 피부과',
    interpreterIncluded: false,
    imageKeywords: ['Lamiche Clinic Jamsil', 'Club Miz Lamiche', '라미체 잠실'],
    seoTags: ['잠실 피부과', '라미체의원', '여드름 모공 전문', '송파 피부과'],
  },
  {
    title: '비오페이스의원',
    description:
      '신사역 4번 출구 인근 피부 클리닉. "개인맞춤 시술법" 컨셉으로 리프팅·페이스라인·바디라인·레이저 시술 운영. 다양한 의료장비를 보유해 시술분야별 사후관리 시스템 가동.',
    locationLabel: '강남 신사',
    address: '서울특별시 강남구 신사역 4번 출구 인근',
    phone: '1833-8838',
    nearestStation: '신사역 4번 출구',
    signatureProcedures: ['리프팅', '페이스라인', '바디라인', '레이저 시술', '맞춤 안티에이징'],
    procedureName: '리프팅·페이스라인·바디라인',
    promoLabel: '개인맞춤 시술',
    interpreterIncluded: false,
    imageKeywords: ['Bioface Clinic Sinsa', 'personalized treatment dermatology', '비오페이스 신사'],
    seoTags: ['신사 피부과', '비오페이스', '맞춤 시술 클리닉', '바디라인 클리닉'],
  },
  {
    title: '더힐피부과 동대문점',
    description:
      '청량리역 6번 출구 힐스테이트 청량리 더퍼스트 2층 위치. 전 UN국제평화유지단 피부과장 경력 원장 진료. 쥬비덤·울트라펄스알파·리투오·써마지FLX 자문의 활동. 온다 리프팅·맞춤형 색소치료·여드름&흉터 치료 특화.',
    locationLabel: '서울 청량리',
    address: '서울특별시 동대문구 왕산로36길 6 힐스테이트 청량리 더퍼스트 2층 (전농동)',
    phone: '02-960-3469',
    nearestStation: '청량리역 6번 출구',
    signatureProcedures: ['온다 리프팅', '맞춤형 색소치료', '여드름 치료', '흉터 치료', '써마지FLX'],
    procedureName: '온다 리프팅·색소치료',
    promoLabel: '국제 자문의 (Juvederm·Thermage)',
    interpreterIncluded: true,
    imageKeywords: ['The Hill Dermatology Cheongnyangni', 'Hillstate first 2F', '청량리 더힐 피부과'],
    seoTags: ['청량리 피부과', '동대문 피부과', '더힐 피부과', '온다 리프팅', '써마지FLX 자문의'],
  },
  {
    title: '리베리의원 명동점',
    description:
      '명동10길 58 2~3층 위치 명동 도심 피부 클리닉. 3D 정밀 피부진단 기반 맞춤 케어와 "1대1 지정 원장제" 운영으로 진료 일관성 확보. 전국 네트워크 브랜드라 외국인 재방문 환자도 타 지점 연계 가능.',
    locationLabel: '서울 명동',
    address: '서울특별시 중구 명동10길 58, 2층 201호·3층 301호 (충무로2가)',
    phone: '홈페이지 문의',
    nearestStation: '명동역·을지로입구역',
    signatureProcedures: ['3D 정밀 피부진단', '맞춤 안티에이징', '리프팅', '레이저 토닝', '여드름 케어'],
    procedureName: '3D 정밀 피부진단·맞춤 케어',
    promoLabel: '1대1 지정 원장제',
    interpreterIncluded: true,
    imageKeywords: ['Liberi Clinic Myeongdong', '3D skin diagnosis', '리베리 명동'],
    seoTags: ['명동 피부과', '리베리의원', '1대1 원장제 피부과', '3D 피부진단'],
  },
  {
    title: '엠레드의원 청담',
    description:
      '청담동에 위치한 "프리미엄 리프팅의 기준" 컨셉 피부과. 울쎄라·써마지·티타늄·튠페이스·스컬트라 운영, 튠페이스·튠라이트 키닥터 전문병원. 1인실 개별 맞춤 디자인 진료로 프라이버시 확보.',
    locationLabel: '강남 청담',
    address: '서울특별시 강남구 청담동',
    phone: '홈페이지 문의',
    nearestStation: '청담역·압구정로데오역',
    signatureProcedures: ['울쎄라', '써마지', '티타늄', '튠페이스', '스컬트라'],
    procedureName: '울쎄라·티타늄·튠페이스',
    promoLabel: '튠페이스 키닥터 전문병원',
    interpreterIncluded: true,
    imageKeywords: ['MRED Clinic Cheongdam', 'premium lifting Tune Face', '엠레드 청담'],
    seoTags: ['청담 피부과', '엠레드의원', '튠페이스 키닥터', '프리미엄 리프팅 클리닉'],
  },
  {
    title: '페이브피부과의원',
    description:
      '용산푸르지오써밋 2층 위치. 용산·신용산·삼각지·이촌역 4역 권역. 피부과 전문의 겸 화장품조제관리사 손지희 원장 직접 진료. EMFACE·티타늄리프팅·튠페이스·울쎄라 등 비수술 윤곽 메뉴 운영, 영·중·일어 지원하며 서울시 의료관광(Visit Seoul) 공식 등재 기관.',
    locationLabel: '서울 용산',
    address: '서울특별시 용산구 한강대로 69 (한강로2가, 용산푸르지오써밋) 2층 217-1·217-2호',
    phone: '홈페이지 문의',
    nearestStation: '용산역·신용산역·삼각지역·이촌역',
    signatureProcedures: ['EMFACE', '티타늄리프팅', '튠페이스', '울쎄라', '비수술 윤곽개선', '여드름', '색소', '탈모'],
    procedureName: 'EMFACE·티타늄리프팅·튠페이스',
    promoLabel: 'Visit Seoul 의료관광 공식 등재',
    interpreterIncluded: true,
    imageKeywords: ['Pave Dermatology Yongsan', 'Visit Seoul medical tourism', 'EMFACE Korea', '페이브 용산'],
    seoTags: ['용산 피부과', '신용산 피부과', '페이브피부과', 'Visit Seoul 의료관광', 'EMFACE 한국'],
  },
];
