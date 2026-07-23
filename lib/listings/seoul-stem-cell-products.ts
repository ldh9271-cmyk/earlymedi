/**
 * 서울 외국인 FIT 추천 줄기세포·재생의료 병의원 12곳 — founder 2026-07-24 큐레이션.
 *
 * 마스터 콘솔의 "줄기세포 12종 일괄 등록" 버튼이 이 배열을 읽어
 * hospitals + category_listings + hospital_locale_content(KR/EN) 에
 * 카테고리='stem_cell' (공개 /kr/clinics 칩 키와 동일) 로 upsert.
 * partner_listings 인서트는 없음. SEO 브랜드는 GlowUpTour.
 *
 * 중복 병원 처리: 셀러블153·리치모아·글로비·스템케이는 타 카테고리
 * 시드에 이미 존재하지만 여기선 사용자 지정 별도 슬러그로 줄기세포
 * 특화 프로필을 신규 생성 — 카테고리별 SEO 독립 관리.
 */

export type StemCellSeed = {
  title: string;
  englishTitle: string;
  slug: string;
  description: string;
  locationLabel: string;
  address: string;
  phone: string;
  nearestStation: string;
  signatureProcedures: ReadonlyArray<string>;
  procedureName: string;
  promoLabel: string;
  languagesSpoken: ReadonlyArray<'ko' | 'en' | 'zh' | 'ja' | 'ru' | 'ar' | 'mn' | 'vi'>;
  interpreterIncluded?: boolean;
  /** SEO 6종 — 브랜드 GlowUpTour */
  seoTitle: string;
  seoDescription: string;
  seoTags: ReadonlyArray<string>;
  ogDescription: string;
  imageKeywords: ReadonlyArray<string>;
};

export const STEM_CELL_PRODUCTS: ReadonlyArray<StemCellSeed> = [
  {
    title: '이에이치엘바이오 셀센터',
    englishTitle: 'EHL Bio Cell Center',
    slug: 'ehl-bio-cell-center-apgujeong',
    description:
      '국내 최초 세포처리시설 허가·인체세포 관리업 허가 1호 기업의 압구정 셀센터. 독자적 지방줄기세포 분리·배양 원천기술 보유, 국내 100여 개·해외 50여 개 협력병원 네트워크. 아토피 줄기세포 치료제 임상 2상, 세계 최초 요유래 줄기세포 만성신질환 치료제 임상 1상 승인. 일본 후생노동성 CPC 허가, 강남세브란스·화순전남대병원 등과 첨단재생의료 MOU. 자가 지방유래 줄기세포·면역세포(NK·T·수지상·iNKT) 치료·세포 보관 — 1회 채혈로 면역세포 6회분 보관 가능. 일본·베트남·인도네시아·캄보디아 해외 거점 보유, 영어·일어 응대.',
    locationLabel: '강남 압구정',
    address: '서울특별시 강남구 압구정 (EHLBio Cell Center 압구정)',
    phone: '02-6301-2101',
    nearestStation: '압구정역 인근',
    signatureProcedures: ['자가 지방유래 줄기세포 치료', '면역세포 치료(NK·T·수지상·iNKT)', '줄기세포 보관', '항암 면역세포 치료(키셀아이엠주)'],
    procedureName: '줄기세포·NK면역세포·세포보관',
    promoLabel: '국내 1호 세포시설·글로벌 네트워크',
    languagesSpoken: ['ko', 'en', 'ja'],
    interpreterIncluded: true,
    seoTitle: '이에이치엘바이오 | 압구정 줄기세포·면역세포 전문 | GlowUpTour',
    seoDescription:
      '압구정 셀센터. 국내 최초 세포처리시설 허가 기업. 줄기세포·NK면역세포 치료·세포보관. 글로벌 150개 협력병원. 영어·일어 응대. GlowUpTour에서 예약.',
    seoTags: ['줄기세포치료', '압구정줄기세포', '면역세포치료', 'NK세포', '줄기세포보관', 'stem cell Korea', 'immune cell therapy Seoul', 'EHL Bio', '재생의료', '외국인줄기세포'],
    ogDescription: '압구정 줄기세포 | EHL바이오·국내 1호 세포시설·글로벌 네트워크 — GlowUpTour',
    imageKeywords: ['EHL Bio Cell Center Apgujeong', 'GMP cell processing facility Korea', 'NK immune cell therapy', '이에이치엘바이오 셀센터'],
  },
  {
    title: '셀러블153강남의원(줄기세포)',
    englishTitle: 'Cellable153 Gangnam Clinic — Stem Cell',
    slug: 'cellable153-stem-cell-gangnam',
    description:
      '논현동 언주로 720 통합 프리미엄 메디컬센터의 세포치료 부문. B1층 세포치료 전용 공간 운영, 검진+세포치료+VIP병실 통합 구조. 건강검진에서 발견된 이상 소견을 줄기세포·면역세포 치료로 즉시 연계하는 원스톱 시스템. 안티에이징·스포츠퍼포먼스 프로그램 병행. 외국인 환자 특화 글로벌 헬스케어 기관, 영어·중국어 상담.',
    locationLabel: '강남 논현',
    address: '서울특별시 강남구 언주로 720 B1~B3층 (논현동)',
    phone: '홈페이지 문의',
    nearestStation: '학동역 · 강남구청역 · 압구정로데오역',
    signatureProcedures: ['줄기세포 치료', '면역세포 치료', '세포치료 연계 건강검진', '안티에이징', '스포츠퍼포먼스'],
    procedureName: '줄기세포·면역세포 통합',
    promoLabel: '검진+세포치료 원스톱·VIP',
    languagesSpoken: ['ko', 'en', 'zh'],
    interpreterIncluded: true,
    seoTitle: '셀러블153강남의원 | 논현 줄기세포·면역세포 통합센터 | GlowUpTour',
    seoDescription:
      '학동역 인근. 검진+세포치료 원스톱 통합 메디컬센터. 줄기세포·면역세포·안티에이징. 외국인 특화. 영어·중국어 상담. GlowUpTour에서 예약.',
    seoTags: ['강남줄기세포', '면역세포치료', '세포치료검진', '안티에이징', 'VIP세포치료', 'stem cell clinic Seoul', 'immune therapy Korea', '외국인줄기세포'],
    ogDescription: '강남 줄기세포 | 셀러블153·검진+세포치료 원스톱·VIP 특화 — GlowUpTour',
    imageKeywords: ['Cellable153 stem cell center', 'B1 cell therapy floor Nonhyeon', 'integrated medical center Gangnam', '셀러블153 줄기세포'],
  },
  {
    title: '강남세란의원',
    englishTitle: 'Gangnam Seran Clinic',
    slug: 'gangnam-seran-stem-cell-clinic',
    description:
      '"대한민국 No.1 줄기세포 치료 병원"을 표방하는 강남 재생의학 클리닉. 재생의학 전문 김수연 원장 1:1 맞춤 진료. 전신 항노화 줄기세포·폐섬유증 줄기세포(코로나 후유증)·킬레이션 혈관청소·NAD+ 항노화·탈모·피부 재생·성장호르몬 진료. 줄기세포+도수치료·운동치료 센터 결합 VVIP 토탈 케어, 자가 세포 정맥투여로 다운타임 최소화. 영어 상담 가능.',
    locationLabel: '강남',
    address: '서울특별시 강남구 (강남 소재)',
    phone: '홈페이지 문의',
    nearestStation: '강남권',
    signatureProcedures: ['전신 항노화 줄기세포', '폐섬유증 줄기세포', '킬레이션 혈관청소', 'NAD+ 항노화', '탈모·피부 재생', '성장호르몬'],
    procedureName: '항노화 줄기세포·킬레이션',
    promoLabel: 'VVIP 토탈 케어',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '강남세란의원 | 강남 줄기세포 항노화·재생치료 | GlowUpTour',
    seoDescription:
      '강남 소재. 전신 항노화 줄기세포·킬레이션·NAD+. 재생의학 전문의 1:1 진료. VVIP 토탈 케어. 영어 상담. GlowUpTour에서 예약.',
    seoTags: ['강남줄기세포', '항노화치료', '킬레이션', 'NAD주사', '재생의료', 'anti-aging stem cell Korea', 'chelation Seoul', '외국인줄기세포'],
    ogDescription: '강남 줄기세포 | 세란의원·항노화·킬레이션·VVIP 케어 — GlowUpTour',
    imageKeywords: ['Gangnam Seran stem cell clinic', 'NAD anti-aging IV Korea', 'chelation therapy Seoul', '강남세란의원'],
  },
  {
    title: '셀피아의원',
    englishTitle: 'Cellpia Clinic',
    slug: 'cellpia-stem-cell-clinic-seolleung',
    description:
      '선릉역 4번 출구 태현빌딩 1층의 줄기세포 치료·보관 전문 클리닉. 줄기세포 분리 후 셀카운트 테스트로 치료 세포 수를 정량 확인하는 과학적 프로세스가 강점. 혈액·지방·골수 유래 줄기세포 치료, 혈관 내벽 치료·근육/인대/신경 재생 특화. 줄기세포 종류·용도별 분석 및 보관 기술·설비 보유, 안티에이징+질환 치료 병행. 영어 상담 가능.',
    locationLabel: '강남 역삼',
    address: '서울특별시 강남구 언주로 413 태현빌딩 1층 (역삼동)',
    phone: '홈페이지 문의',
    nearestStation: '선릉역 4번 출구',
    signatureProcedures: ['줄기세포 치료(혈액·지방·골수)', '혈관 재생', '관절·통증 줄기세포', '줄기세포 보관'],
    procedureName: '줄기세포 치료·보관',
    promoLabel: '셀카운트 정량 검증',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '셀피아의원 | 선릉역 줄기세포 치료·보관 전문 | GlowUpTour',
    seoDescription:
      '선릉역 4번 출구. 혈액·지방·골수 줄기세포 치료. 셀카운트 정량 검증. 관절·혈관 재생 특화. 세포보관 설비. 영어 상담. GlowUpTour에서 예약.',
    seoTags: ['강남줄기세포', '선릉역줄기세포', '줄기세포보관', '관절줄기세포', '혈관재생', 'stem cell storage Korea', 'joint stem cell Seoul', '외국인줄기세포'],
    ogDescription: '강남 줄기세포 | 셀피아·정량 검증 프로세스·보관 설비 완비 — GlowUpTour',
    imageKeywords: ['Cellpia stem cell clinic Seolleung', 'cell count verification Korea', 'stem cell banking Seoul', '셀피아의원 선릉'],
  },
  {
    title: '밴셀의원',
    englishTitle: 'Vencell Clinic',
    slug: 'vencell-stem-cell-clinic-sinsa',
    description:
      '신사동의 줄기세포+피부클리닉 결합 전문 의원. 줄기세포 기반 피부 재생·안티에이징에 특화. 강남·신사 접근성 우수. 줄기세포 치료·줄기세포 피부클리닉·재생 시술 운영, 영어 상담 가능.',
    locationLabel: '강남 신사',
    address: '서울특별시 강남구 신사동 (신사역 인근)',
    phone: '홈페이지 문의',
    nearestStation: '신사역 인근',
    signatureProcedures: ['줄기세포 치료', '줄기세포 피부클리닉', '재생 시술'],
    procedureName: '줄기세포 피부재생',
    promoLabel: '줄기세포+피부클리닉 결합',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '밴셀의원 | 신사 줄기세포·피부재생 클리닉 | GlowUpTour',
    seoDescription:
      '신사역 인근. 줄기세포 치료+피부클리닉 결합. 피부 재생·안티에이징 특화. 영어 상담. GlowUpTour에서 예약.',
    seoTags: ['강남줄기세포', '신사줄기세포', '줄기세포피부', '피부재생', '안티에이징', 'stem cell skin Korea', 'Vencell clinic', '외국인줄기세포'],
    ogDescription: '신사 줄기세포 | 밴셀의원·줄기세포 피부재생 특화 — GlowUpTour',
    imageKeywords: ['Vencell stem cell clinic Sinsa', 'stem cell skin regeneration Korea', '밴셀의원 신사'],
  },
  {
    title: '셀리크의원',
    englishTitle: 'Cellique Clinic',
    slug: 'cellique-stem-cell-clinic-apgujeong',
    description:
      '압구정로데오역 도보 1분 초역세권의 줄기세포 클리닉. 줄기세포+리프팅+재생 결합 시술을 전문 의료진 1:1 맞춤 진료로 제공. K-뷰티 중심지 위치로 외국인 관광객 접근성 최상. 영어 상담 가능.',
    locationLabel: '강남 압구정로데오',
    address: '서울특별시 강남구 압구정로데오역 도보 1분',
    phone: '홈페이지 문의',
    nearestStation: '압구정로데오역 도보 1분',
    signatureProcedures: ['줄기세포 시술', '리프팅', '피부재생'],
    procedureName: '줄기세포·리프팅 재생',
    promoLabel: '로데오역 1분 초역세권',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '셀리크의원 | 압구정로데오 줄기세포·리프팅 재생 | GlowUpTour',
    seoDescription:
      '압구정로데오역 도보 1분. 줄기세포 시술+리프팅+피부재생. 전문 의료진 1:1 맞춤 진료. 영어 상담. GlowUpTour에서 예약.',
    seoTags: ['압구정줄기세포', '줄기세포리프팅', '피부재생', '압구정로데오', '재생시술', 'stem cell lifting Korea', 'skin regeneration Seoul', '외국인줄기세포'],
    ogDescription: '압구정 줄기세포 | 셀리크·로데오역 1분·리프팅 재생 특화 — GlowUpTour',
    imageKeywords: ['Cellique clinic Apgujeong Rodeo', 'stem cell lifting Korea', '셀리크의원 압구정'],
  },
  {
    title: '모즈클리닉',
    englishTitle: 'Mods Clinic',
    slug: 'mods-clinic-stem-cell-apgujeong',
    description:
      '압구정로데오역 도보 7분 뷰티 상권에 위치한 줄기세포 재생 의료 클리닉. 재생 의료 분야 다수 수상 경력, 1:1 전담 의사제 운영. 일본·중화권 관광객에게 널리 알려진 미용 클리닉으로 트립닷컴 등재. 줄기세포 재생 의료·미용 시술·안티에이징 운영, 영어·일어·중국어 응대.',
    locationLabel: '강남 압구정로데오',
    address: '서울특별시 강남구 압구정로데오역 도보 7분',
    phone: '홈페이지 문의',
    nearestStation: '압구정로데오역 도보 7분',
    signatureProcedures: ['줄기세포 재생 의료', '미용 시술', '안티에이징'],
    procedureName: '줄기세포 재생·안티에이징',
    promoLabel: '재생의료 다수 수상·1:1 전담의',
    languagesSpoken: ['ko', 'en', 'ja', 'zh'],
    interpreterIncluded: true,
    seoTitle: '모즈클리닉 | 압구정 줄기세포 재생·1:1 전담의 | GlowUpTour',
    seoDescription:
      '압구정로데오역 7분. 줄기세포 재생 의료 다수 수상. 1:1 전담 의사제. 외국인 관광객 다수 방문. 영·일·중 응대. GlowUpTour에서 예약.',
    seoTags: ['압구정줄기세포', '줄기세포재생', '전담의사제', 'K뷰티클리닉', '재생의료', 'Mods clinic Korea', 'stem cell beauty Seoul', '외국인줄기세포'],
    ogDescription: '압구정 줄기세포 | 모즈클리닉·수상 경력·1:1 전담의 — GlowUpTour',
    imageKeywords: ['Mods Clinic Apgujeong Rodeo', 'K-beauty stem cell clinic', 'Trip.com listed clinic Seoul', '모즈클리닉 압구정'],
  },
  {
    title: '리숨성형외과',
    englishTitle: 'Resum Plastic Surgery',
    slug: 'resum-stem-cell-clinic-apgujeong',
    description:
      '압구정역 3번 출구 도보 5분의 한일 공동 줄기세포 재생 클리닉. 일본 줄기세포·재생의료 전문 클리닉과 정식 제휴 — 일본 재생의학 선두 연구자 Jun Noguchi 박사와 공동 임상 협약. 국제 표준 프로토콜 적용, 국제 GMP 시설에서 분리·배양한 고순도 줄기세포만 임상 적용. 미국성형학회지 게재 등 학술 활동. 줄기세포 재생 시술·눈코 재수술·울쎄라·써마지 리프팅·제대혈 유래 세포치료 임상. 영어·일어 상담.',
    locationLabel: '강남 압구정',
    address: '서울특별시 강남구 신사동 (압구정역 3번 출구 도보 5분)',
    phone: '홈페이지 문의',
    nearestStation: '압구정역 3번 출구 도보 5분',
    signatureProcedures: ['줄기세포 재생 시술', '눈코 재수술', '울쎄라·써마지 리프팅', '제대혈 유래 세포치료 임상'],
    procedureName: '한일 공동 줄기세포 재생',
    promoLabel: '일본 공동 임상·GMP 고순도',
    languagesSpoken: ['ko', 'en', 'ja'],
    interpreterIncluded: true,
    seoTitle: '리숨성형외과 | 압구정 한일 공동 줄기세포 재생 | GlowUpTour',
    seoDescription:
      '압구정역 5분. 일본 재생의료 클리닉 정식 제휴·공동 임상. GMP 고순도 줄기세포. 리프팅 병행. 영어·일어 상담. GlowUpTour에서 예약.',
    seoTags: ['압구정줄기세포', '한일재생의료', 'GMP줄기세포', '제대혈세포치료', '줄기세포리프팅', 'Korea Japan stem cell', 'regenerative medicine Seoul', '외국인줄기세포'],
    ogDescription: '압구정 줄기세포 | 리숨·일본 공동 임상·국제 표준 프로토콜 — GlowUpTour',
    imageKeywords: ['Resum Plastic Surgery stem cell', 'Korea Japan joint clinical', 'GMP stem cell Apgujeong', '리숨성형외과'],
  },
  {
    title: '메종프리베 클리닉',
    englishTitle: 'Maison Privée Clinic',
    slug: 'maison-privee-stem-cell-apgujeong',
    description:
      '유튜브 구독자 50만 뷰티에이징 채널을 운영하는 글로벌 인지도 높은 압구정 클리닉. 자가혈 유래 줄기세포+엑소좀+성장인자+광양자를 결합한 시그니처 시술 "셀힐러" 운영. 피부 직접 주사와 정맥 주사를 병행해 전신 컨디션·면역 밸런스까지 관리. 줄기세포주사·안티에이징·비만치료 병행, 영어 상담 가능.',
    locationLabel: '강남 압구정',
    address: '서울특별시 강남구 압구정 (압구정 소재)',
    phone: '홈페이지 문의',
    nearestStation: '압구정역 인근',
    signatureProcedures: ['셀힐러(자가혈 줄기세포+엑소좀+성장인자+광양자)', '줄기세포주사', '안티에이징', '비만치료'],
    procedureName: '셀힐러·줄기세포+엑소좀',
    promoLabel: '유튜브 50만 뷰티에이징',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '메종프리베 클리닉 | 압구정 셀힐러 줄기세포·엑소좀 | GlowUpTour',
    seoDescription:
      '압구정. 유튜브 50만 뷰티에이징 클리닉. 자가혈 줄기세포+엑소좀 셀힐러. 전신 항노화 관리. 영어 상담. GlowUpTour에서 예약.',
    seoTags: ['압구정줄기세포', '셀힐러', '엑소좀', '자가혈줄기세포', '뷰티에이징', 'exosome Korea', 'stem cell facial Seoul', '외국인줄기세포'],
    ogDescription: '압구정 줄기세포 | 메종프리베·셀힐러·유튜브 50만 클리닉 — GlowUpTour',
    imageKeywords: ['Maison Privee Clinic Apgujeong', 'Cell Healer exosome treatment', 'beauty aging YouTube clinic', '메종프리베 클리닉'],
  },
  {
    title: '압구정 리치모아의원(줄기세포)',
    englishTitle: 'Richmora Clinic Apgujeong — Stem Cell',
    slug: 'richmora-stem-cell-hair-apgujeong',
    description:
      '신사동 계진빌딩 3층의 줄기세포 특화 클리닉. SVF 지방줄기세포·모낭줄기세포·PRP 를 모발이식에 접목해 생착률 향상을 추구하는 특화 시술 운영. 흉터 복원 시술 병행, 압구정 325개 리뷰 보유. 영어 상담 가능.',
    locationLabel: '강남 압구정 신사',
    address: '서울특별시 강남구 논현로168길 22 3층 (신사동, 계진빌딩)',
    phone: '02-3448-0999',
    nearestStation: '압구정역 · 신사역',
    signatureProcedures: ['SVF 지방줄기세포', '모낭줄기세포', 'PRP 결합 모발이식', '흉터복원술'],
    procedureName: 'SVF·PRP 줄기세포 이식',
    promoLabel: '줄기세포 모발이식 특화',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '리치모아의원 | 압구정 줄기세포 모발이식·흉터복원 | GlowUpTour',
    seoDescription:
      '압구정역. SVF·모낭줄기세포·PRP 결합 모발이식. 생착률 향상 특화. 흉터복원. 영어 상담. GlowUpTour에서 예약.',
    seoTags: ['압구정줄기세포', '줄기세포모발이식', 'SVF줄기세포', 'PRP치료', '흉터복원', 'stem cell hair transplant Korea', 'PRP Seoul', '외국인줄기세포'],
    ogDescription: '압구정 줄기세포 | 리치모아·줄기세포 모발이식·흉터복원 — GlowUpTour',
    imageKeywords: ['Richmora stem cell clinic', 'SVF PRP hair transplant Korea', '리치모아 줄기세포'],
  },
  {
    title: '글로비성형외과(줄기세포)',
    englishTitle: 'Globee Plastic Surgery — Stem Cell',
    slug: 'globee-stem-cell-fat-graft-apgujeong',
    description:
      '압구정역 4번 출구 인근, 국내 최장 기간 줄기세포 연구소를 운영(1997년~)해 온 성형외과의 줄기세포 부문. 줄기세포 지방이식 특화 — 생착률 향상 목적으로 줄기세포를 활용. 20년+ 임상 경험 원장 직접 집도, 눈코성형·가슴성형·바디성형·항노화 병행. 강남구청 의료관광 협력기관, 강남언니 리뷰 8,361개. 영어·중국어·일어 응대.',
    locationLabel: '강남 압구정 신사',
    address: '서울특별시 강남구 논현로 843 (신사동)',
    phone: '02-515-3399',
    nearestStation: '압구정역 4번 출구',
    signatureProcedures: ['줄기세포 지방이식', '눈코성형', '가슴성형', '바디성형', '항노화'],
    procedureName: '줄기세포 지방이식',
    promoLabel: '1997년~ 줄기세포 연구소',
    languagesSpoken: ['ko', 'en', 'zh', 'ja'],
    interpreterIncluded: true,
    seoTitle: '글로비성형외과 | 압구정 줄기세포 지방이식 전문 | GlowUpTour',
    seoDescription:
      '압구정역 4번 출구. 1997년부터 줄기세포 연구소 운영. 줄기세포 지방이식·항노화. 의료관광 협력기관. 다국어 응대. GlowUpTour에서 예약.',
    seoTags: ['압구정줄기세포', '줄기세포지방이식', '지방이식', '항노화성형', '의료관광성형', 'stem cell fat graft Korea', 'fat transfer Seoul', '외국인줄기세포'],
    ogDescription: '압구정 줄기세포 | 글로비·1997년~ 연구소·줄기세포 지방이식 — GlowUpTour',
    imageKeywords: ['Globee stem cell fat graft', 'stem cell research since 1997', '글로비 줄기세포 지방이식'],
  },
  {
    title: '스템케이의원(줄기세포)',
    englishTitle: 'StemK Clinic — Stem Cell',
    slug: 'stemk-stem-cell-clinic-sinsa',
    description:
      '신사역 인근의 줄기세포 기반 안티에이징·재생 특화 의원. 이물질제거·성형부작용 교정과 줄기세포 재생 치료를 결합한 독자적 진료 구조. 성형외과 전문의 직접 시술, 한·영·중·일 4개국어 진료 시스템으로 외국인 환자 응대 최적화. 리프팅 병행.',
    locationLabel: '강남 신사',
    address: '서울특별시 강남구 신사동 (신사역 인근)',
    phone: '홈페이지 문의',
    nearestStation: '신사역 인근',
    signatureProcedures: ['줄기세포 시술', '안티에이징', '이물질제거', '성형부작용 교정', '리프팅'],
    procedureName: '줄기세포 재생+교정 결합',
    promoLabel: '4개국어 진료 시스템',
    languagesSpoken: ['ko', 'en', 'zh', 'ja'],
    interpreterIncluded: true,
    seoTitle: '스템케이의원 | 신사 줄기세포 안티에이징·재생교정 | GlowUpTour',
    seoDescription:
      '신사역 인근. 줄기세포 안티에이징+이물질제거·부작용 교정 결합. 4개국어 진료. 전문의 직접 시술. GlowUpTour에서 예약.',
    seoTags: ['신사줄기세포', '줄기세포안티에이징', '이물질제거', '부작용교정', '재생치료', 'stem cell anti-aging Korea', 'revision clinic Seoul', '외국인줄기세포'],
    ogDescription: '신사 줄기세포 | 스템케이·재생+교정 결합·4개국어 진료 — GlowUpTour',
    imageKeywords: ['StemK stem cell clinic Sinsa', 'foreign body removal regeneration', '스템케이 줄기세포'],
  },
];
