/**
 * 강남·서초 외국인 FIT 추천 성형외과 11곳 — founder 2026-06-25 큐레이션.
 *
 * 마스터 콘솔의 "성형외과 11종 일괄 등록" 버튼이 이 배열을 읽어
 * partner_listings 테이블에 category='hospital', details.subType=
 * 'plastic_surgery', status='approved' 로 한 번에 insert.
 *
 * 각 행에 들어가는 정보:
 *   - 기본: title, description, locationLabel, priceWon=0 (상담 기반
 *     이라 정량 가격 없음), priceUnit='상담', promoLabel (의료관광
 *     협력기관 등 특이사항)
 *   - details: address (Google Maps), subType='plastic_surgery',
 *     procedureName (HospitalFields 호환), phone, nearestStation,
 *     signatureProcedures (대표 시술 배열), openingYear,
 *     imageKeywords (사진 큐레이션 힌트), seoTags
 *   - addressJson.city = '서울'
 */

export type PlasticSurgerySeed = {
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

export const PLASTIC_SURGERY_PRODUCTS: ReadonlyArray<PlasticSurgerySeed> = [
  {
    title: '드림성형외과',
    description:
      '1999년 개원한 강남 압구정 성형외과. 서울대 의대 동문 8명의 성형외과 전문의와 마취과 전문의가 상주하며, 드림성형외과·드림피부과·드림치과를 같은 건물에서 원스톱으로 운영. 싱가포르 분원과 강남구청 의료관광 협력기관 지정으로 외국인 환자 인프라가 풍부. 대표시술: 눈·코·가슴·안면윤곽·지방이식·지방흡입·양악수술·보톡스·필러.',
    locationLabel: '강남 압구정',
    address: '서울특별시 강남구 논현로 848 (신사동)',
    phone: '02-546-1616',
    nearestStation: '압구정역 3번 출구 (CGV 건물)',
    signatureProcedures: ['눈성형', '코성형', '가슴성형', '안면윤곽', '지방이식', '지방흡입', '양악수술', '보톡스', '필러'],
    procedureName: '눈성형·코성형·가슴성형',
    openingYear: 1999,
    promoLabel: '강남구청 의료관광 협력',
    interpreterIncluded: true,
    imageKeywords: ['Dream Plastic Surgery Seoul', 'Apgujeong CGV building', 'one-stop medical', 'Singapore branch', '강남 압구정 성형외과'],
    seoTags: ['압구정 성형외과', '강남 성형외과', 'Dream Plastic Surgery', '외국인 의료관광 성형', '서울대 성형외과', '의료관광 협력기관'],
  },
  {
    title: '스템케이성형외과',
    description:
      '신사역 인근 성형 전문 클리닉. 성형외과 전문의가 직접 집도하며, 특히 이물질 제거와 성형 부작용 교정에 특화. 한국어·영어·중국어·일본어 다국어 진료가 가능해 외국인 환자 비중이 높음. 중년 눈성형, 줄기세포 시술, 안티에이징, 리프팅도 주요 메뉴.',
    locationLabel: '강남 신사',
    address: '서울특별시 강남구 신사동 스템케이성형외과',
    phone: '홈페이지 문의',
    nearestStation: '신사역',
    signatureProcedures: ['눈성형', '이물질제거', '성형부작용 교정', '줄기세포 시술', '안티에이징', '피부클리닉', '중년눈성형', '리프팅'],
    procedureName: '이물질제거·부작용 교정',
    promoLabel: '다국어 진료',
    interpreterIncluded: true,
    imageKeywords: ['Stem K Plastic Surgery', 'Sinsa-dong', 'revision surgery', 'foreign body removal', '중년 눈성형'],
    seoTags: ['신사역 성형외과', '이물질 제거 클리닉', '성형 부작용 교정', '중년 눈성형', '다국어 성형외과', '줄기세포 시술'],
  },
  {
    title: '셀러블153강남의원',
    description:
      '강남 논현 언주로의 3개 층(B1·B2·B3) 복합 프리미엄 메디컬센터. B3은 피부·성형·SPA·수영장, B2는 건강검진·암치료·VIP 병실·여성클리닉, B1은 세포치료·안과검진·스포츠퍼포먼스. 외국인 환자 특화 글로벌 헬스케어 기관으로 줄기세포·면역세포 치료와 인모드·쌍꺼풀·코성형·윤곽주사 등 성형외과 시술을 동시 제공.',
    locationLabel: '강남 논현',
    address: '서울특별시 강남구 언주로 720 B1~B3층 (논현동)',
    phone: '홈페이지 문의',
    nearestStation: '학동역·강남구청역·압구정로데오역',
    signatureProcedures: ['줄기세포', '면역세포 치료', '건강검진', '인모드', '쌍꺼풀', '코성형', '윤곽주사', '피부클리닉', 'SPA'],
    procedureName: '줄기세포·면역세포 치료',
    promoLabel: '복합 메디컬센터',
    interpreterIncluded: true,
    imageKeywords: ['Cellable 153 Gangnam', 'multi-floor medical center', 'stem cell therapy', 'VIP medical suite', 'spa pool', '복합 메디컬센터'],
    seoTags: ['논현 성형외과', '강남 메디컬센터', '셀러블153', '줄기세포 치료', '면역세포 치료', '글로벌 헬스케어', '의료관광 종합'],
  },
  {
    title: '세라성형외과',
    description:
      '강남 압구정·청담 인근 눈·코 재수술 특화 클리닉. "자연스러움이 가장 고급스러운 아름다움"을 철학으로 1차 수술 실패 후 교정 전문. 정밀 원인 분석 후 맞춤 재수술 진행, 안면거상·동안성형도 제공.',
    locationLabel: '강남 압구정·청담',
    address: '서울특별시 강남구 세라성형외과 (압구정·청담 인근)',
    phone: '홈페이지 문의',
    nearestStation: '압구정역·압구정로데오역',
    signatureProcedures: ['눈재수술', '코재수술', '고난이도 재수술', '안면거상', '동안성형'],
    procedureName: '눈재수술·코재수술',
    promoLabel: '재수술 특화',
    interpreterIncluded: false,
    imageKeywords: ['Sera Plastic Surgery', 'revision rhinoplasty', 'eye revision', 'natural aesthetics', '재수술 클리닉'],
    seoTags: ['압구정 성형외과', '눈 재수술 전문', '코 재수술 전문', '재수술 클리닉', '자연 성형', '청담 성형외과'],
  },
  {
    title: '나비성형외과',
    description:
      '논현역 8번 출구 1층 도보 0분 거리의 안전 중심 성형외과. 25년 무사고 기록을 자랑하며, 개개인 특성·기능을 고려한 맞춤 치료를 진행. 눈·코·가슴·안면윤곽·동안성형·리프팅·쁘띠 시술을 모두 소화. 평일 10:00~19:00 / 토 10:00~15:00.',
    locationLabel: '서초 논현역',
    address: '서울특별시 서초구 강남대로 559 CK빌딩 9·10층',
    phone: '02-567-5400',
    nearestStation: '논현역 8번 출구 1층',
    signatureProcedures: ['눈성형', '코성형', '가슴성형', '안면윤곽', '동안성형', '리프팅', '쁘띠시술'],
    procedureName: '눈성형·코성형·가슴성형',
    promoLabel: '25년 무사고',
    interpreterIncluded: false,
    imageKeywords: ['Nabi Plastic Surgery', 'Nonhyeon Station', 'CK Building', '25 year safety record', '논현역 성형외과'],
    seoTags: ['논현역 성형외과', '나비성형외과', '안전 성형', '25년 무사고', '맞춤 성형', '서초 성형외과'],
  },
  {
    title: '유니크성형외과',
    description:
      '강남역·신논현역 인근 K타워의 성형외과. 2013년 개원, 소비자 평가 3년 연속 1등급. 성형외과 전문의 1:1 주치의 전담제로 수술 전부터 수술 후까지 담당 원장이 직접 경과 관리. 눈성형·눈재수술·눈매교정·코성형·코재수술·광대·턱끝·사각턱·가슴성형이 주력.',
    locationLabel: '서초 강남역',
    address: '서울특별시 서초구 강남대로 621 K타워 8층',
    phone: '02-561-2255',
    nearestStation: '강남역·신논현역',
    signatureProcedures: ['눈성형', '눈재수술', '눈매교정', '코성형', '코재수술', '광대', '턱끝', '사각턱', '가슴성형'],
    procedureName: '눈성형·코성형·윤곽',
    openingYear: 2013,
    promoLabel: '소비자평가 3년 연속 1등급',
    interpreterIncluded: false,
    imageKeywords: ['Unique Plastic Surgery', 'Gangnam K Tower', '1:1 attending doctor', 'consumer evaluation grade 1', '강남역 성형외과'],
    seoTags: ['강남역 성형외과', '유니크성형외과', '1:1 주치의', '눈매교정', '광대 턱끝', '신논현역 성형외과', '소비자평가 1등급'],
  },
  {
    title: '서울동안의원',
    description:
      '강남 인근 동안·안티에이징 특화 의원. 자연스러운 동안 유지를 위한 비수술·수술 통합 케어를 제공. 동안성형·리프팅·보톡스·필러·피부 시술을 종합적으로 운영.',
    locationLabel: '강남',
    address: '서울특별시 강남구 서울동안의원',
    phone: '홈페이지 문의',
    nearestStation: '강남역 인근',
    signatureProcedures: ['동안성형', '안티에이징', '리프팅', '보톡스', '필러', '피부시술'],
    procedureName: '동안성형·안티에이징',
    promoLabel: '동안 특화',
    interpreterIncluded: false,
    imageKeywords: ['Seoul Dongan Clinic', 'anti-aging', 'V-line lifting', 'youthful look', '동안 의원'],
    seoTags: ['강남 동안의원', '안티에이징 클리닉', '동안성형', '리프팅 시술', '보톡스 필러', '비수술 동안'],
  },
  {
    title: '김지연위쉬성형외과',
    description:
      '1995년 개원, 강남 성형외과 여성 전문의 최초 개원. 37년 무사고 경력. 연세대 세브란스 성형외과 전문의 출신 김지연 원장이 모든 수술을 직접 집도하며 가슴성형에 특화. 확대·축소·처진가슴·출산후가슴·재수술·유두·유륜 성형·함몰유두까지 가슴 전 분야 커버.',
    locationLabel: '강남 압구정 청담',
    address: '서울특별시 강남구 압구정로 432 7층 (청담동)',
    phone: '02-549-8841',
    nearestStation: '압구정로데오역 3번 출구 100m',
    signatureProcedures: ['가슴확대', '가슴축소', '처진가슴 재수술', '출산후 가슴', '유두유륜 성형', '함몰유두 교정'],
    procedureName: '가슴성형 (확대·축소·재수술)',
    openingYear: 1995,
    promoLabel: '여성 전문의 · 37년 무사고',
    interpreterIncluded: false,
    imageKeywords: ['Kim Jiyeon Wish Plastic Surgery', 'female surgeon', 'breast surgery specialist', 'Apgujeong Rodeo', '여성 성형외과 전문의'],
    seoTags: ['압구정 성형외과', '가슴성형 전문', '여성 성형외과 전문의', '김지연성형외과', '가슴 재수술', '청담 성형외과'],
  },
  {
    title: '리앤채움의원',
    description:
      '압구정역 인근 신사동의 성형+피부 통합 클리닉. 접근성이 우수해 외국인 환자 방문이 많고, 눈·코·리프팅·쁘띠·피부관리를 한 곳에서 받을 수 있음. 강남언니 리뷰 75개 이상.',
    locationLabel: '강남 압구정',
    address: '서울특별시 강남구 논현로 837 원방빌딩 4층 (신사동)',
    phone: '홈페이지 문의',
    nearestStation: '압구정역',
    signatureProcedures: ['눈성형', '코성형', '리프팅', '쁘띠시술', '피부관리'],
    procedureName: '성형+피부 통합',
    promoLabel: '성형+피부 통합',
    interpreterIncluded: false,
    imageKeywords: ['Lee & Chaeum Clinic', 'integrated plastic skin', 'Apgujeong Station', 'Wonbang Building', '성형 피부 통합'],
    seoTags: ['압구정역 성형외과', '리앤채움', '성형 피부 통합', '강남 쁘띠시술', '신사동 성형외과', '리프팅 클리닉'],
  },
  {
    title: '글로비성형외과',
    description:
      '2013년 개원, 20년+ 임상 경험 원장진 운영. 국내 최장 기간 줄기세포 연구소(1997년~)와 3D 맞춤형 보형물 "핏미" 국내 최다 사용 기록. 대리수술 없이 부위별 대표원장이 직접 집도. 다국어 외국인 환자 특화, 강남구청 의료관광 협력기관 지정. 강남언니 리뷰 8,361개.',
    locationLabel: '강남 압구정',
    address: '서울특별시 강남구 논현로 843 (신사동)',
    phone: '02-515-3399',
    nearestStation: '압구정역 4번 출구',
    signatureProcedures: ['눈성형', '코성형(3D 맞춤 핏미)', '가슴성형', '줄기세포 지방이식', '바디성형', '항노화'],
    procedureName: '코성형·줄기세포 지방이식',
    openingYear: 2013,
    promoLabel: '강남구청 의료관광 협력',
    interpreterIncluded: true,
    imageKeywords: ['Globe Plastic Surgery', 'Apgujeong Station', '3D custom Fitme implant', 'stem cell fat graft', 'medical tourism partner', '글로비 성형외과'],
    seoTags: ['압구정 성형외과', '글로비성형외과', '3D 코성형', '핏미 보형물', '줄기세포 지방이식', '의료관광 협력기관', '강남언니 리뷰 8000'],
  },
  {
    title: '순플러스성형외과',
    description:
      '신사역 인근 멀버리힐스 메디컬타워의 성형외과. 25년 경력. "인위적이지 않은 자연스러운 아름다움"을 철학으로 성형외과 전문의·의학박사 대표원장이 개개인 얼굴 해부학에 맞는 맞춤 수술 진행. 재방문률이 높음.',
    locationLabel: '서초 신사역',
    address: '서울특별시 서초구 강남대로 589 멀버리힐스 메디컬타워 12·13층',
    phone: '홈페이지 문의',
    nearestStation: '신사역',
    signatureProcedures: ['눈성형', '코성형', '가슴성형', '리프팅', '동안성형'],
    procedureName: '눈성형·코성형·가슴성형',
    promoLabel: '25년 경력 · 의학박사',
    interpreterIncluded: false,
    imageKeywords: ['Soonplus Plastic Surgery', 'Sinsa Station', 'Mulberry Hills medical tower', 'natural aesthetic philosophy', '신사역 성형외과'],
    seoTags: ['신사역 성형외과', '순플러스성형외과', '자연 성형', '의학박사 성형외과', '맞춤 성형', '재방문 높은 성형외과'],
  },
];
