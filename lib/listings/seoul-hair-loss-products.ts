/**
 * 서울 외국인 FIT 추천 모발이식·탈모 클리닉 12곳 — founder 2026-07-03 큐레이션.
 *
 * 마스터 콘솔의 "모발이식·탈모 12종 일괄 등록" 버튼이 이 배열을 읽어
 * hospitals + category_listings + hospital_locale_content(KR/EN) 에
 * 카테고리='hair' 로 upsert (공개 /kr/clinics 칩 키와 동일 — 2026-07-03
 * 'hair_loss' 오기입을 'hair' 로 정정). partner_listings 인서트는 없음.
 *
 * 주의: 메이린클리닉·더힐피부과는 피부과 시드에도 존재하지만 여기선
 * 사용자 지정 슬러그(`maylin-clinic-hair-loss-apgujeong`,
 * `theheal-dermatology-hair-loss-dongdaemun`)로 별도 hospitals 행 생성 —
 * 탈모 카테고리 특화 프로필로 취급.
 *
 * SEO 스킬(`.claude/skills/seo/SKILL.md`) 규칙을 따라 각 행에 6종 SEO
 * 필드를 채운다.
 */

export type HairLossSeed = {
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
  openingYear?: number;
  promoLabel: string;
  languagesSpoken: ReadonlyArray<'ko' | 'en' | 'zh' | 'ja' | 'ru' | 'ar'>;
  interpreterIncluded?: boolean;
  /** SEO 6종 */
  seoTitle: string;
  seoDescription: string;
  seoTags: ReadonlyArray<string>;
  ogDescription: string;
  imageKeywords: ReadonlyArray<string>;
};

export const HAIR_LOSS_PRODUCTS: ReadonlyArray<HairLossSeed> = [
  {
    title: '맥스웰피부과의원 강남',
    englishTitle: 'Maxwell Hair Clinic Gangnam',
    slug: 'maxwell-hair-clinic-gangnam',
    description:
      '강남 테헤란로 상경빌딩 10·11층에 위치한 모발이식·탈모 전문 피부과. 피부과 전문의와 성형외과 전문의가 협진하는 20년 탈모 특화 구조. 미국모발이식자격의(ABHRS) 인증 원장이 자체 "고밀도 그라데이션" 이식 기법을 적용해 자연스러운 결과를 만듦. 모발이식과 탈모치료를 병행하며 73개 인증 리뷰. 외국인 환자 다수, 영어 상담 가능.',
    locationLabel: '강남 역삼',
    address: '서울특별시 강남구 테헤란로 120 상경빌딩 10·11층 (역삼동)',
    phone: '02-566-5824',
    nearestStation: '강남역 인근 · 역삼역',
    signatureProcedures: ['모발이식', '탈모치료', '비절개 모발이식', '절개 모발이식', '고밀도 그라데이션 이식', '탈모약 처방'],
    procedureName: '모발이식·탈모치료·고밀도 그라데이션',
    promoLabel: '피부과+성형외과 협진 20년',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '맥스웰피부과 강남 | 모발이식·탈모치료 전문 | EarlyMedi',
    seoDescription:
      '강남역 인근. 피부과+성형외과 전문의 협진 20년. 고밀도 그라데이션 모발이식. 탈모치료·약 처방. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남모발이식', '탈모치료', '비절개모발이식', '강남탈모병원', '고밀도이식', 'hair transplant Korea', 'hair loss treatment Seoul', 'Korea hair clinic', '외국인모발이식'],
    ogDescription: '강남 모발이식 | 피부과+성형외과 협진 20년·고밀도 그라데이션 — EarlyMedi',
    imageKeywords: ['Maxwell Hair Clinic Gangnam', 'high density hair transplant Korea', 'Sangkyung Building Teheran-ro', '맥스웰피부과 강남'],
  },
  {
    title: '모제림성형외과의원',
    englishTitle: 'Mojelim Hair Transplant Clinic',
    slug: 'mojelim-hair-transplant-apgujeong',
    description:
      '1997년 개원해 모발이식 단일 수술 28년 특화, 누적 10만 건 이상 시술. 압구정 논현로 압구정빌딩에 남성센터(5층)·여성헤어라인·탈모치료센터(7층)를 이원화해 운영. 의료진 1인 집도 체제, 수술 1건당 최대 7명 스태프 투입. 모발이식(절개·비절개)·헤어라인교정·이마축소·여성헤어라인·탈모치료 진료. 영어·중국어 상담 가능.',
    locationLabel: '강남 압구정',
    address: '서울특별시 강남구 논현로 842 압구정빌딩 5층(남성센터)·7층(여성헤어라인·탈모치료센터)',
    phone: '1600-5827',
    nearestStation: '압구정역',
    signatureProcedures: ['모발이식(절개)', '모발이식(비절개)', '헤어라인교정', '이마축소', '여성헤어라인', '탈모치료'],
    procedureName: '모발이식·헤어라인교정',
    openingYear: 1997,
    promoLabel: '28년·10만 건 이상 모발이식',
    languagesSpoken: ['ko', 'en', 'zh'],
    interpreterIncluded: true,
    seoTitle: '모제림성형외과 | 압구정 모발이식 28년 전문 | EarlyMedi',
    seoDescription:
      '압구정역. 1997년 개원, 모발이식 10만 건 이상. 남성·여성 센터 이원화. 헤어라인교정·이마축소. 영어·중국어 상담. EarlyMedi에서 예약.',
    seoTags: ['강남모발이식', '압구정모발이식', '헤어라인교정', '이마축소', '여성모발이식', 'hair transplant Apgujeong', 'Korea hair restoration', '외국인모발이식'],
    ogDescription: '강남 모발이식 | 1997년 개원·10만 건·남녀 전용 센터 — EarlyMedi',
    imageKeywords: ['Mojelim Hair Transplant Apgujeong', 'hairline correction Korea', 'forehead reduction Seoul', '모제림 압구정'],
  },
  {
    title: '모먼트의원',
    englishTitle: 'Moment Hair Clinic',
    slug: 'moment-hair-clinic-gangnam',
    description:
      '서초 강남대로 한승빌딩 9층에 위치한 비절개 모발이식 특화 클리닉. 자체 개발 "히든컷" 비절개 방식으로 수술 당일 일상 복귀 가능. 10년 이상 모발이식 노하우와 두피 진단기 기반 정밀 진단. 강남역 10번 출구(지오다노 강남점 옆) 초역세권 접근성으로 직장인·단기 방문 외국인 환자에게 최적. 영어 상담 가능.',
    locationLabel: '서초 강남',
    address: '서울특별시 서초구 강남대로 423 한승빌딩 9층 (서초동)',
    phone: '홈페이지 문의',
    nearestStation: '강남역 10번 출구 (지오다노 강남점 옆)',
    signatureProcedures: ['비절개 모발이식(히든컷)', '절개 모발이식', '탈모치료', '두피 진단'],
    procedureName: '히든컷 비절개 모발이식',
    promoLabel: '당일 일상복귀 히든컷',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '모먼트의원 | 강남역 히든컷 비절개 모발이식 | EarlyMedi',
    seoDescription:
      '강남역 10번 출구. 당일 일상복귀 가능한 히든컷 비절개. 탈모치료·두피진단. 단기 방문 외국인 적합. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남모발이식', '비절개모발이식', '히든컷', '당일회복이식', '탈모치료', 'FUE hair transplant Korea', 'non-shave transplant Seoul', '외국인모발이식'],
    ogDescription: '강남 모발이식 | 히든컷 비절개·당일 일상복귀 가능 — EarlyMedi',
    imageKeywords: ['Moment Hair Clinic Gangnam', 'hidden cut FUE Korea', 'same-day hair transplant Seoul', '모먼트의원 강남'],
  },
  {
    title: '모아이의원',
    englishTitle: 'MOAI Hair Clinic',
    slug: 'moai-hair-clinic-samsung',
    description:
      '강남 삼성동 테헤란로 401 13층에 위치한 AI 두피진단·모발이식 특화 클리닉. 서울대 의대 출신 대표원장이 진료하며 모발이식 관련 한·미·일 특허 12건 등록. AI·로봇 분야 CES 혁신상 수상, 자체 개발 AI 두피진단기 AFS3D 보유. 미국(ABHRS)·국제(IBHRS) 모발이식자격의 동시 인증. APEC 정상회의 VIP 의료서비스 선정 이력. 모발이식·탈모치료·두피문신(SMP)·원형탈모 치료. 영어 상담 가능.',
    locationLabel: '강남 삼성동',
    address: '서울특별시 강남구 테헤란로 401 13층 (삼성동)',
    phone: '홈페이지 문의',
    nearestStation: '선릉역 · 삼성역 인근',
    signatureProcedures: ['모발이식(절개·비절개)', '탈모치료', '두피문신(SMP)', '원형탈모 치료'],
    procedureName: 'AI 두피진단·모발이식·SMP',
    promoLabel: '서울대 출신·한미일 특허 12건',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '모아이의원 | 강남 AI 두피진단·모발이식 전문 | EarlyMedi',
    seoDescription:
      '삼성역 인근. 서울대 출신 원장. AI 두피진단기·한미일 특허 12건. 모발이식·탈모·두피문신. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남모발이식', 'AI두피진단', '두피문신', '원형탈모', '선릉역탈모', 'hair transplant Korea', 'AI hair diagnosis', 'SMP Korea', '외국인모발이식'],
    ogDescription: '강남 모발이식 | 서울대 출신·AI 두피진단·한미일 특허 12건 — EarlyMedi',
    imageKeywords: ['MOAI Hair Clinic Samsung-dong', 'AFS3D AI scalp diagnosis', 'SMP scalp micropigmentation Korea', '모아이의원 삼성'],
  },
  {
    title: '모우다의원',
    englishTitle: 'Mouda Hair Clinic',
    slug: 'mouda-hair-clinic-apgujeong',
    description:
      '강남 신사동 논현로 B&S빌딩 3층에 위치한 여성·헤어라인 특화 모발이식 클리닉. 여성 원장(여의사) 진료로 여성 환자 편의성과 신뢰도 확보. 무모증·빈모증 모발이식, 엑소좀+타겟쿨 비수술 탈모치료 특화. 해외 의사 초청 강연 다수, 압구정 위치 프리미엄 클리닉. 모발이식(비절개)·헤어라인교정·여성 모발이식·무모증·탈모치료·엑소좀 탈모치료 진료. 영어 상담 가능.',
    locationLabel: '강남 압구정 신사',
    address: '서울특별시 강남구 논현로 823 B&S빌딩 3층 (신사동)',
    phone: '홈페이지 문의',
    nearestStation: '압구정역 · 신사역 인근',
    signatureProcedures: ['모발이식(비절개)', '헤어라인교정', '여성 모발이식', '무모증 모발이식', '탈모치료', '엑소좀 탈모치료'],
    procedureName: '여성 모발이식·헤어라인',
    promoLabel: '여의사 원장·여성/헤어라인 특화',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '모우다의원 | 압구정 여성 모발이식·헤어라인 전문 | EarlyMedi',
    seoDescription:
      '압구정역 인근. 여의사 원장. 여성 모발이식·헤어라인교정·무모증 특화. 엑소좀 탈모치료. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남모발이식', '여성모발이식', '헤어라인교정', '무모증모발이식', '압구정탈모', 'female hair transplant Korea', 'hairline correction Seoul', '외국인모발이식'],
    ogDescription: '압구정 모발이식 | 여의사·여성 특화·헤어라인·무모증 전문 — EarlyMedi',
    imageKeywords: ['Mouda Hair Clinic Apgujeong', 'female hair transplant Korea', 'exosome hair treatment Seoul', '모우다의원 신사'],
  },
  {
    title: '용닥터의원',
    englishTitle: 'Yongdr Hair Clinic',
    slug: 'yongdr-hair-clinic-gangnam',
    description:
      '강남대로 509 6층에 위치한 모발이식 클리닉. 원장 본인이 탈모·지루성두피염 14년 이상 직접 경험한 "환자이자 의사" 콘텐츠가 강점. 수술 전 과정 투명 공개와 모낭 카운팅 시스템 실시간 공개로 신뢰도 확보. 책임보증제 운영, 유튜브 채널에서 탈모 정보 제공. 모발이식(절개·비절개)·탈모치료·두피문신·탈모약 처방. 영어 상담 가능.',
    locationLabel: '강남 역삼',
    address: '서울특별시 강남구 강남대로 509 6층 (역삼동)',
    phone: '홈페이지 문의',
    nearestStation: '강남역 · 역삼역 사이',
    signatureProcedures: ['모발이식(절개)', '모발이식(비절개)', '탈모치료', '두피문신', '탈모약 처방'],
    procedureName: '투명 모발이식·책임보증제',
    promoLabel: '원장 탈모 직접 경험 14년',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '용닥터의원 | 강남역 투명 모발이식·탈모치료 | EarlyMedi',
    seoDescription:
      '강남역 인근. 원장 직접 탈모 경험 14년. 수술 전 과정 투명 공개·책임보증제. 모발이식·두피문신. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남모발이식', '탈모치료', '투명한모발이식', '두피문신', '책임보증제', 'hair transplant Korea', 'scalp micropigmentation Seoul', '외국인모발이식'],
    ogDescription: '강남 모발이식 | 원장 탈모 직접 경험·수술 전 과정 투명 공개 — EarlyMedi',
    imageKeywords: ['Yongdr Hair Clinic Gangnam', 'transparent hair transplant Korea', 'follicle counting system', '용닥터의원 역삼'],
  },
  {
    title: '압구정 리치모아의원',
    englishTitle: 'Richmora Hair Clinic Apgujeong',
    slug: 'richmora-stem-cell-hair-transplant-apgujeong',
    description:
      '강남 신사동 계진빌딩 3층에 위치한 줄기세포 모발이식 특화 클리닉. SVF 지방줄기세포+모낭줄기세포+PRP 결합 모발이식으로 생착률 향상을 추구. 기존 흉터 복원 시술 가능. 압구정 325개 리뷰 보유. 모발이식·줄기세포(SVF·모낭·PRP) 모발이식·흉터복원술 진료, 영어 상담 가능.',
    locationLabel: '강남 압구정 신사',
    address: '서울특별시 강남구 논현로168길 22 3층 (신사동, 계진빌딩)',
    phone: '02-3448-0999',
    nearestStation: '압구정역 · 신사역',
    signatureProcedures: ['모발이식', '줄기세포 모발이식(SVF)', '모낭줄기세포 모발이식', 'PRP 모발이식', '흉터복원술'],
    procedureName: '줄기세포+PRP 모발이식',
    promoLabel: '줄기세포·PRP 결합 이식',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '리치모아의원 | 압구정 줄기세포 모발이식 전문 | EarlyMedi',
    seoDescription:
      '압구정역. 줄기세포(SVF·PRP) 결합 모발이식. 흉터복원술. 생착률 향상 특화. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남모발이식', '줄기세포모발이식', 'PRP모발이식', '흉터복원', '압구정탈모', 'stem cell hair transplant Korea', 'PRP hair treatment Seoul', '외국인모발이식'],
    ogDescription: '압구정 모발이식 | 줄기세포+PRP 결합·흉터복원 특화 — EarlyMedi',
    imageKeywords: ['Richmora Hair Clinic Apgujeong', 'SVF stem cell hair transplant Korea', 'PRP scar repair', '리치모아 압구정'],
  },
  {
    title: '모아만의원',
    englishTitle: 'Moaman Hair Clinic',
    slug: 'moaman-hair-clinic-sinsa',
    description:
      '강남 신사동 신사역 인근에 위치한 강남구청 의료관광 공식 협력기관 지정 모발이식 클리닉. 대표원장 경력 15년·시술건수 5,000건, 경북대학교 모발이식센터 출신, 대한모발이식학회 정보이사. 이신제 원장(경력 30년·4,000건)과 2인 협진 체제 운영. 모발이식(절개·비절개)·탈모치료·헤어라인교정 진료, 영어·중국어 상담 가능.',
    locationLabel: '강남 신사',
    address: '서울특별시 강남구 신사동 (신사역 인근 — 강남구 의료관광 협력기관)',
    phone: '홈페이지 문의',
    nearestStation: '신사역',
    signatureProcedures: ['모발이식(절개)', '모발이식(비절개)', '탈모치료', '헤어라인교정'],
    procedureName: '모발이식·탈모치료',
    promoLabel: '강남구 의료관광 공식 협력',
    languagesSpoken: ['ko', 'en', 'zh'],
    interpreterIncluded: true,
    seoTitle: '모아만의원 | 강남구 의료관광 협력 모발이식 | EarlyMedi',
    seoDescription:
      '신사역 인근. 강남구 의료관광 공식 협력기관. 2인 원장 협진. 경력 30년+15년. 모발이식·탈모치료. 영어·중국어 상담. EarlyMedi에서 예약.',
    seoTags: ['강남모발이식', '신사역탈모', '강남구의료관광', '헤어라인교정', '탈모치료', 'hair transplant Korea', 'medical tourism hair Seoul', '외국인모발이식'],
    ogDescription: '강남 모발이식 | 의료관광 협력기관·2인 전문의 협진·경력 30년 — EarlyMedi',
    imageKeywords: ['Moaman Hair Clinic Sinsa', 'Gangnam medical tourism hair transplant', 'Kyungpook Univ hair center alumni', '모아만의원 신사'],
  },
  {
    title: '세븐레마의원',
    englishTitle: 'Seven Rema Hair Clinic',
    slug: 'seven-rema-premium-hair-clinic-gangnam',
    description:
      '서초 서초4동 강남역 인근에 위치한 프리미엄 모발이식 클리닉. 모발이식 2,200만원~ 고급 케어로 VIP 외국인 환자 특화. 철저한 1:1 맞춤 케어와 최신 장비 운영. 프리미엄 모발이식·탈모치료·두피케어 진료, 영어 상담 가능.',
    locationLabel: '강남역',
    address: '서울특별시 서초구 서초4동 (강남역 인근)',
    phone: '홈페이지 문의',
    nearestStation: '강남역',
    signatureProcedures: ['프리미엄 모발이식', '탈모치료', '두피케어'],
    procedureName: 'VIP 프리미엄 모발이식',
    promoLabel: 'VIP 1:1 프리미엄 케어',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '세븐레마의원 | 강남 프리미엄 VIP 모발이식 | EarlyMedi',
    seoDescription:
      '강남역 인근. 프리미엄 VIP 모발이식 클리닉. 1:1 맞춤 케어. 외국인 VIP 환자 특화. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남모발이식', '프리미엄모발이식', 'VIP탈모치료', '강남역탈모', '외국인VIP', 'premium hair transplant Korea', 'VIP hair clinic Seoul', '외국인모발이식'],
    ogDescription: '강남 모발이식 | 프리미엄 VIP 1:1 맞춤 모발이식 — EarlyMedi',
    imageKeywords: ['Seven Rema Hair Clinic Gangnam', 'VIP premium hair transplant Korea', 'luxury hair restoration Seoul', '세븐레마의원 강남'],
  },
  {
    title: '루트의원',
    englishTitle: 'Root Hair Clinic',
    slug: 'root-hair-clinic-gangnam',
    description:
      '서초 서초4동 강남역 초근접 위치의 모발이식 클리닉. 합리적인 비용(290만원~)의 모발이식과 1:1 진료 체계. 탈모치료와 모발이식 병행 케어. 모발이식(절개·비절개)·탈모치료·탈모약 처방 진료, 영어 상담 가능.',
    locationLabel: '강남역',
    address: '서울특별시 서초구 서초4동 (강남역 인근)',
    phone: '홈페이지 문의',
    nearestStation: '강남역',
    signatureProcedures: ['모발이식(절개)', '모발이식(비절개)', '탈모치료', '탈모약 처방'],
    procedureName: '합리적 모발이식·탈모치료',
    promoLabel: '합리적 비용 290만원~',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '루트의원 | 강남역 합리적 모발이식·탈모치료 | EarlyMedi',
    seoDescription:
      '강남역 인근. 290만원~의 합리적 모발이식. 탈모치료 병행. 1:1 진료 체계. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['강남모발이식', '합리적모발이식', '탈모치료', '강남역탈모', '모발이식비용', 'affordable hair transplant Korea', 'hair loss clinic Gangnam', '외국인모발이식'],
    ogDescription: '강남 모발이식 | 합리적 비용 290만원~·1:1 진료 — EarlyMedi',
    imageKeywords: ['Root Hair Clinic Gangnam', 'affordable hair transplant Korea', 'value hair loss clinic Seoul', '루트의원 강남'],
  },
  {
    title: '메이린클리닉 (탈모)',
    englishTitle: 'Maylin Clinic — Hair Loss Care',
    slug: 'maylin-clinic-hair-loss-apgujeong',
    description:
      '강남 압구정 아크힐즈16빌딩 4·6층에 위치한 백화점·호텔 입점 프리미엄 네트워크 클리닉의 탈모 특화 프로그램. 비수술 탈모치료(약물+레이저+두피케어 통합)에 특화되어 있으며 리프팅과 탈모 동시 케어 가능한 복합 시술 제공. 압구정·더현대서울·일산 등 다지점 네트워크로 외국인 고객 응대 경험 풍부. 탈모치료(울쎄라·리프팅)·두피케어·탈모주사·탈모샴푸 처방·모낭주사, 영어·중국어·일어 상담 가능.',
    locationLabel: '강남 압구정',
    address: '서울특별시 강남구 압구정로30길 16 아크힐즈16빌딩 4·6층 (압구정점)',
    phone: '0507-1338-2488',
    nearestStation: '압구정역',
    signatureProcedures: ['비수술 탈모치료', '두피케어', '탈모주사', '탈모샴푸 처방', '모낭주사', '울쎄라 리프팅'],
    procedureName: '비수술 탈모치료·두피케어',
    promoLabel: '백화점 입점 프리미엄 네트워크',
    languagesSpoken: ['ko', 'en', 'zh', 'ja'],
    interpreterIncluded: true,
    seoTitle: '메이린클리닉 | 압구정 비수술 탈모치료·두피케어 | EarlyMedi',
    seoDescription:
      '압구정역. 백화점 입점 프리미엄 클리닉. 비수술 탈모치료·두피케어·탈모주사. 영어·중국어·일어 상담. EarlyMedi에서 예약.',
    seoTags: ['탈모치료', '두피케어', '압구정탈모', '비수술탈모', '모낭주사', 'non-surgical hair loss Korea', 'scalp care Seoul', '외국인탈모치료'],
    ogDescription: '압구정 탈모치료 | 프리미엄 네트워크·비수술·다국어 응대 — EarlyMedi',
    imageKeywords: ['Maylin Clinic hair loss Apgujeong', 'non-surgical hair loss Korea', 'scalp injection premium', '메이린클리닉 탈모 압구정'],
  },
  {
    title: '더힐피부과 동대문점 (탈모)',
    englishTitle: 'The Heal Dermatology — Hair Loss',
    slug: 'theheal-dermatology-hair-loss-dongdaemun',
    description:
      '동대문 청량리역 6번 출구 힐스테이트 청량리 더퍼스트 2층에 위치한 피부과 전문의(전 UN국제평화유지단 피부과장) 진료 클리닉의 탈모 케어 프로그램. 탈모·두피 관리 복합 케어와 리쥬란 등 두피재생 시술 가능. 청량리역 접근성으로 외국인 관광객도 방문 편리. 탈모치료·두피케어·탈모약 처방·리쥬란·피부복합시술 진료, 영어 상담 가능.',
    locationLabel: '동대문 청량리',
    address: '서울특별시 동대문구 왕산로36길 6 힐스테이트 청량리 더퍼스트 2층',
    phone: '02-960-3469',
    nearestStation: '청량리역 6번 출구',
    signatureProcedures: ['탈모치료', '두피케어', '탈모약 처방', '리쥬란 두피재생', '피부복합시술'],
    procedureName: '피부과 전문의 탈모케어·리쥬란',
    promoLabel: '피부과 전문의 직접 진료',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '더힐피부과 | 청량리역 탈모치료·두피케어 피부과 | EarlyMedi',
    seoDescription:
      '청량리역 6번 출구. 피부과 전문의 직접 진료. 탈모치료·두피케어·탈모약 처방. 영어 상담 가능. EarlyMedi에서 예약.',
    seoTags: ['탈모치료', '두피케어', '피부과탈모', '청량리탈모', '탈모약처방', 'hair loss dermatology Korea', 'scalp treatment Seoul', '외국인탈모치료'],
    ogDescription: '청량리 탈모치료 | 피부과 전문의·두피케어·탈모약 처방 — EarlyMedi',
    imageKeywords: ['The Heal Dermatology hair loss Dongdaemun', 'scalp regeneration Rejuran', 'Cheongnyangni dermatology', '더힐피부과 청량리 탈모'],
  },
];
