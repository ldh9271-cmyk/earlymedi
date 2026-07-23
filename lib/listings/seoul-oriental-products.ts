/**
 * 서울 외국인 FIT 추천 한방병원/한의원 12곳 — founder 2026-07-24 큐레이션.
 *
 * 마스터 콘솔의 "한방병원 12종 일괄 등록" 버튼이 이 배열을 읽어
 * hospitals + category_listings + hospital_locale_content(KR/EN) 에
 * 카테고리='oriental' (공개 /kr/clinics 칩 키와 동일) 로 upsert.
 * partner_listings 인서트는 없음. SEO 브랜드는 GlowUpTour.
 */

export type OrientalSeed = {
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

export const ORIENTAL_PRODUCTS: ReadonlyArray<OrientalSeed> = [
  {
    title: '리봄한방병원 강남점',
    englishTitle: 'Rebom Korean Medicine Hospital Gangnam',
    slug: 'rebom-korean-medicine-hospital-gangnam',
    description:
      '공간척추교정 대표병원. 한의학+의학 협진 의료기관으로 2015~2018년 4년 연속 의료소비자만족도 1등급·최우수평가병원 인증, 강남구 의료관광 공식 협력기관. 목/허리디스크·골반통증·안면비대칭교정·턱관절교정·추나요법과 V라인리프팅·볼륨매선·한방다이어트·도수치료까지 — 척추·관절 치료와 K-뷰티 한방 시술을 병행해 외국인에게 매력적. 강남구청역 160m, 영어·중국어 응대.',
    locationLabel: '강남 논현',
    address: '서울특별시 강남구 학동로50길 7, 2·3·4층 (논현동)',
    phone: '홈페이지 문의',
    nearestStation: '강남구청역 160m (수인분당선)',
    signatureProcedures: ['공간척추교정', '목/허리디스크', '골반통증', '안면비대칭교정', '턱관절교정', '추나요법', 'V라인리프팅', '볼륨매선', '한방다이어트', '도수치료'],
    procedureName: '공간척추교정·안면비대칭',
    promoLabel: '공간척추교정 대표·의료관광 협력',
    languagesSpoken: ['ko', 'en', 'zh'],
    interpreterIncluded: true,
    seoTitle: '리봄한방병원 | 강남 공간척추교정·안면비대칭 한방 | GlowUpTour',
    seoDescription:
      '강남구청역 160m. 공간척추교정 대표병원. 양한방 협진. 안면비대칭·턱관절·V라인 한방리프팅. 의료관광 협력기관. GlowUpTour에서 예약.',
    seoTags: ['강남한방병원', '공간척추교정', '안면비대칭교정', '턱관절치료', '한방리프팅', '추나요법', 'Korean medicine Gangnam', 'chuna therapy Korea', 'spine clinic Seoul', '외국인한방'],
    ogDescription: '강남 한방병원 | 리봄·공간척추교정·양한방 협진·의료관광 협력 — GlowUpTour',
    imageKeywords: ['Rebom Korean Medicine Hospital Gangnam', 'spatial spine correction Korea', 'chuna facial asymmetry', '리봄한방병원 강남'],
  },
  {
    title: '인산한의원',
    englishTitle: 'Insan Korean Medicine Clinic',
    slug: 'insan-korean-medicine-clinic-gangnam',
    description:
      '해외 환자(중국·일본·베트남) 대상 한방 의료관광 특화 한의원. 외국인 환자 유치를 위한 다국어 상담 체계를 구축했으며 전통 한의학 기반 맞춤 진료를 제공. 한방 내과·침구·추나·맞춤 한약 처방·체질 개선 진료. 선릉로 대로변 1층 위치로 접근성 우수, 한티역·도곡역 인근. 영어·중국어·일어·베트남어 응대.',
    locationLabel: '강남 도곡',
    address: '서울특별시 강남구 선릉로 206, 1층 122호 (도곡동)',
    phone: '홈페이지 문의',
    nearestStation: '한티역 · 도곡역 인근 (수인분당선·3호선)',
    signatureProcedures: ['한방 내과', '침구', '추나', '맞춤 한약 처방', '체질 개선', '해외 환자 한방 치료'],
    procedureName: '침구·추나·맞춤 한약',
    promoLabel: '해외환자 특화·다국어 상담',
    languagesSpoken: ['ko', 'en', 'zh', 'ja', 'vi'],
    interpreterIncluded: true,
    seoTitle: '인산한의원 | 강남 도곡 외국인 특화 한방 진료 | GlowUpTour',
    seoDescription:
      '강남 선릉로, 한티역 인근. 중국·일본·베트남 해외 환자 특화 한의원. 침구·추나·맞춤 한약. 다국어 상담 체계. GlowUpTour에서 예약.',
    seoTags: ['강남한의원', '도곡동한의원', '한티역한의원', '외국인한의원', '한방의료관광', '침치료', '맞춤한약', 'Korean medicine clinic', 'acupuncture Seoul', 'TCM Korea'],
    ogDescription: '강남 한의원 | 인산·선릉로 1층·해외환자 특화·다국어 진료 — GlowUpTour',
    imageKeywords: ['Insan Korean Medicine Clinic Gangnam', 'medical tourism acupuncture Korea', 'Hanti station clinic', '인산한의원 도곡'],
  },
  {
    title: '강남자생한방병원',
    englishTitle: 'Gangnam Jaseng Hospital of Korean Medicine',
    slug: 'gangnam-jaseng-korean-medicine-hospital',
    description:
      '보건복지부 지정 한방척추전문병원. 국제진료센터에서 연 1,500명 이상의 외국인 환자를 치료하며 영어·일어·몽골어·아랍어·러시아어 코디네이터 10명 상주. 공항 교통·의료문서·숙박·보험청구까지 지원. 허리디스크·목디스크·척추관협착증 비수술 치료·추나요법·동작침법·한약(청파전), 의사·한의사 한자리 진료 시범운영(강남 유일). 논현역 2번 출구 앞, 24시간 콜센터 운영.',
    locationLabel: '강남 논현',
    address: '서울특별시 강남구 강남대로 536 (논현동)',
    phone: '1577-0007',
    nearestStation: '논현역 2번 출구 앞 (7호선)',
    signatureProcedures: ['허리디스크 비수술 치료', '목디스크', '척추관협착증', '추나요법', '동작침법', '한약(청파전)', '의사+한의사 협진'],
    procedureName: '척추 비수술·추나·동작침법',
    promoLabel: '척추전문·연 1,500명+ 외국인',
    languagesSpoken: ['ko', 'en', 'ja', 'ru', 'mn', 'ar'],
    interpreterIncluded: true,
    seoTitle: '강남자생한방병원 | 논현역 척추 비수술·국제진료 | GlowUpTour',
    seoDescription:
      '논현역 2번 출구. 한방척추전문병원. 연 1,500명+ 외국인 치료. 5개국어 코디네이터. 디스크 비수술 치료. GlowUpTour에서 예약.',
    seoTags: ['강남한방병원', '자생한방병원', '허리디스크한방', '비수술척추치료', '추나요법', '국제진료한방', 'Jaseng hospital', 'non-surgical spine Korea', 'acupuncture Seoul', '외국인한방'],
    ogDescription: '강남 한방병원 | 자생·척추전문·5개국어 국제진료센터 — GlowUpTour',
    imageKeywords: ['Gangnam Jaseng Hospital Korean Medicine', 'non-surgical spine treatment Korea', 'international clinic Nonhyeon', '강남자생한방병원'],
  },
  {
    title: '광동병원',
    englishTitle: 'Kwangdong Hospital',
    slug: 'kwangdong-hospital-samseong',
    description:
      '광동제약 계열 통합의학 병원. 재활의학과·신경과·알레르기내과·한의과 연계 협진으로 한방+양방 통합진료 제공. 통증재활·스포츠재활·치매예방·뇌건강·알레르기 면역치료·프리미엄 건강검진 운영. 대학병원급 전문 의료진, 검진+한방 결합 프로그램 보유. 봉은사역·코엑스 도보권으로 외국인 접근성 우수. 영어·중국어 상담.',
    locationLabel: '강남 삼성동',
    address: '서울특별시 강남구 삼성동 (봉은사역·코엑스 인근)',
    phone: '홈페이지 문의',
    nearestStation: '봉은사역 · 코엑스 인근',
    signatureProcedures: ['한방+양방 통합진료', '통증재활', '스포츠재활', '치매예방·뇌건강', '알레르기 면역치료', '프리미엄 건강검진'],
    procedureName: '한양방 통합·통증재활',
    promoLabel: '통합의학·코엑스 도보권',
    languagesSpoken: ['ko', 'en', 'zh'],
    interpreterIncluded: true,
    seoTitle: '광동병원 | 삼성동 한방·양방 통합진료 | GlowUpTour',
    seoDescription:
      '봉은사역·코엑스 인근. 한방+양방 통합의학. 통증재활·치매예방·알레르기 면역치료. 영어·중국어 상담. GlowUpTour에서 예약.',
    seoTags: ['강남한방병원', '삼성동한방', '통합의학', '통증재활', '치매예방', 'integrative medicine Korea', 'Kwangdong hospital', 'rehabilitation Seoul', '외국인한방'],
    ogDescription: '강남 한방병원 | 광동병원·한양방 통합·코엑스 도보권 — GlowUpTour',
    imageKeywords: ['Kwangdong Hospital Samseong', 'integrative medicine COEX', 'rehabilitation hospital Seoul', '광동병원 삼성동'],
  },
  {
    title: '차움한의원',
    englishTitle: 'Chaum Korean Medicine Clinic',
    slug: 'chaum-korean-medicine-cheongdam',
    description:
      '차병원그룹 프리미엄 라이프센터 차움 내 한의원. 8체질 의학 기반 맞춤 치료와 동안침 등 한방 미용 특화. 한방침구·척추관절·안면마비·보양면역·체질 맞춤치료 운영. 검진·양방과 통합 케어 가능, 호텔급 시설로 VIP 외국인 선호. 청담역·압구정로데오역 인근, 영어·중국어·일어 응대.',
    locationLabel: '강남 청담',
    address: '서울특별시 강남구 도산대로 442 피엔폴루스 빌딩 2·3층 (청담동 4-1)',
    phone: '02-3015-5000',
    nearestStation: '청담역 · 압구정로데오역 인근',
    signatureProcedures: ['한방침구', '8체질 진료', '척추관절', '안면마비', '동안침', '보양면역', '체질 맞춤치료'],
    procedureName: '8체질·동안침·보양면역',
    promoLabel: '차움 프리미엄·VIP 특화',
    languagesSpoken: ['ko', 'en', 'zh', 'ja'],
    interpreterIncluded: true,
    seoTitle: '차움한의원 | 청담 8체질·동안침 프리미엄 한방 | GlowUpTour',
    seoDescription:
      '청담 차움 내 한의원. 8체질 맞춤진료·동안침·보양면역. 검진 연계 통합케어. VIP 특화. 다국어 응대. GlowUpTour에서 예약.',
    seoTags: ['청담한의원', '8체질진료', '동안침', '한방미용', '보양면역', 'facial acupuncture Korea', 'Chaum clinic', 'VIP Korean medicine', '외국인한방'],
    ogDescription: '청담 한의원 | 차움·8체질·동안침·프리미엄 통합케어 — GlowUpTour',
    imageKeywords: ['Chaum Korean Medicine Cheongdam', 'facial acupuncture 8 constitution', 'premium TCM Seoul', '차움한의원 청담'],
  },
  {
    title: '광덕안정 강남한방병원',
    englishTitle: 'Gwangdeok Anjeong Gangnam Korean Medicine Hospital',
    slug: 'gwangdeok-anjeong-gangnam-hospital',
    description:
      '전국 네트워크 광덕안정의 강남점. 교통사고 후유증 입원 치료 특화, 한방+도수치료 결합 진료. 통증재활·한방다이어트·체질개선·추나 운영. 체계적 진료 시스템, 강남역·양재역 접근 편리. 영어 상담 가능.',
    locationLabel: '서초 강남',
    address: '서울특별시 서초구 (강남역·양재역 인근)',
    phone: '홈페이지 문의',
    nearestStation: '강남역 · 양재역 인근',
    signatureProcedures: ['교통사고 입원치료', '통증재활', '도수치료', '한방다이어트', '체질개선', '추나'],
    procedureName: '교통사고 재활·도수치료',
    promoLabel: '교통사고 입원치료 특화',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '광덕안정 강남한방병원 | 강남역 교통사고·통증재활 | GlowUpTour',
    seoDescription:
      '강남역·양재역 인근. 교통사고 입원치료·통증재활·도수치료·한방다이어트. 전국 네트워크. 영어 상담. GlowUpTour에서 예약.',
    seoTags: ['강남한방병원', '교통사고한방', '통증재활', '도수치료', '한방다이어트', 'traffic accident treatment Korea', 'pain rehabilitation Seoul', '외국인한방'],
    ogDescription: '강남 한방병원 | 광덕안정·교통사고 재활·도수치료 결합 — GlowUpTour',
    imageKeywords: ['Gwangdeok Anjeong Gangnam hospital', 'traffic accident Korean medicine', '광덕안정 강남'],
  },
  {
    title: '강남한방병원',
    englishTitle: 'Gangnam Korean Medicine Hospital',
    slug: 'gangnam-korean-medicine-hospital',
    description:
      '평일+주말 야간진료를 운영하는 강남 한방병원 — 관광 일정 중 저녁 시간 치료가 가능해 외국인 여행객에게 실용적. 한의학·의학 협진 시스템으로 신뢰도 높은 진료. 침구·추나·재활·한약 처방 운영. 영어 상담 가능.',
    locationLabel: '강남',
    address: '서울특별시 강남구 (강남 소재)',
    phone: '홈페이지 문의',
    nearestStation: '강남권',
    signatureProcedures: ['한의학+의학 협진', '침구', '추나', '재활', '한약 처방'],
    procedureName: '침구·추나·한양방 협진',
    promoLabel: '주말·야간진료',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '강남한방병원 | 주말·야간진료 한양방 협진 | GlowUpTour',
    seoDescription:
      '강남 소재. 평일·주말 야간진료. 한의학+의학 협진. 관광 일정 중 치료 가능. 영어 상담. GlowUpTour에서 예약.',
    seoTags: ['강남한방병원', '야간진료한방', '주말진료', '한양방협진', '침치료', 'night clinic Korean medicine', 'weekend acupuncture Seoul', '외국인한방'],
    ogDescription: '강남 한방병원 | 주말·야간진료·한양방 협진 — GlowUpTour',
    imageKeywords: ['Gangnam Korean Medicine Hospital', 'night weekend acupuncture Seoul', '강남한방병원 야간'],
  },
  {
    title: '강남동약한의원',
    englishTitle: 'Gangnam Dongyak Korean Medicine Clinic',
    slug: 'gangnam-dongyak-skin-clinic-seocho',
    description:
      '피부질환 한방치료 특화 한의원. 아토피·건선·습진 등 난치성 피부질환을 체질 개선 관점에서 접근. 맞춤 한약 처방 병행. 서초동 소재로 강남역·서초역 접근 용이. 영어 상담 가능.',
    locationLabel: '서초',
    address: '서울특별시 서초구 서초대로46길 109, 3층 (서초동)',
    phone: '02-507-2377',
    nearestStation: '강남역 · 서초역 인근',
    signatureProcedures: ['아토피 한방치료', '건선 치료', '습진 치료', '체질개선', '한약 처방'],
    procedureName: '아토피·건선 한방 피부',
    promoLabel: '난치성 피부 한방 특화',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '강남동약한의원 | 서초 아토피·건선 한방 피부치료 | GlowUpTour',
    seoDescription:
      '서초동, 강남역 인근. 아토피·건선·습진 한방 특화. 체질개선 접근. 영어 상담. GlowUpTour에서 예약.',
    seoTags: ['서초한의원', '아토피한방', '건선치료', '한방피부', '체질개선', 'atopy Korean medicine', 'psoriasis treatment Korea', '외국인한방'],
    ogDescription: '서초 한의원 | 동약·아토피·건선 한방 피부 특화 — GlowUpTour',
    imageKeywords: ['Gangnam Dongyak skin clinic', 'atopy psoriasis Korean medicine', '강남동약한의원 서초'],
  },
  {
    title: '두보한의원',
    englishTitle: 'Dubo Korean Medicine Clinic',
    slug: 'dubo-korean-medicine-daechi',
    description:
      '한방신경정신과 전문의가 상주하는 대치동 클리닉. 뇌파·맥파·종합주의력검사(CAT) 장비 보유, 혈액검사 기반 한약 처방 — 과학적 접근의 한방 정신건강 클리닉. 두통·어지럼증·불면·수면장애·자율신경실조·공황/우울/ADHD 진료. 코로나 후유증(롱코비드)·기립성 현기증 치료, 초음파 가이드 통증 치료, 다이어트 한약 병행. 영어 상담 가능.',
    locationLabel: '강남 대치',
    address: '서울특별시 강남구 대치동',
    phone: '홈페이지 문의',
    nearestStation: '대치역 인근',
    signatureProcedures: ['두통·어지럼증', '불면·수면장애', '자율신경실조', '공황/우울/ADHD 한방신경정신과', '롱코비드 치료', '다이어트 한약'],
    procedureName: '한방신경정신과·불면 치료',
    promoLabel: '신경정신 전문의·과학적 진료',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '두보한의원 | 대치동 두통·불면·한방신경정신과 | GlowUpTour',
    seoDescription:
      '강남 대치동. 한방신경정신과 전문의. 두통·어지럼증·불면·공황 치료. 뇌파·CAT 검사 장비. 영어 상담. GlowUpTour에서 예약.',
    seoTags: ['강남한의원', '한방신경정신과', '두통치료', '불면증한방', '공황장애', 'insomnia Korean medicine', 'mental health TCM Korea', '외국인한방'],
    ogDescription: '강남 한의원 | 두보·신경정신 전문의·과학적 한방 진료 — GlowUpTour',
    imageKeywords: ['Dubo Korean Medicine Daechi', 'TCM neuropsychiatry Korea', 'EEG CAT test clinic', '두보한의원 대치'],
  },
  {
    title: '함소아한의원 압구정점',
    englishTitle: 'Hamsoa Korean Medicine Clinic Apgujeong',
    slug: 'hamsoa-kids-korean-medicine-apgujeong',
    description:
      '전국 최대 소아 한의원 네트워크의 압구정점. 어린이 성장·비염·면역 특화 — 성장클리닉·소아 비염·아토피·허약체질 진료. 아이 친화적 진료 환경으로 외국인 주재원 가족·의료관광 동반 자녀 진료에 적합. 영어 상담 가능.',
    locationLabel: '강남 압구정',
    address: '서울특별시 강남구 압구정 (압구정역 인근)',
    phone: '홈페이지 문의',
    nearestStation: '압구정역 인근',
    signatureProcedures: ['소아 성장클리닉', '소아 비염', '아토피', '허약체질', '면역 강화'],
    procedureName: '소아 성장·비염 한방',
    promoLabel: '전국 최대 소아 한의원',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '함소아한의원 압구정 | 소아 성장·비염 한방 | GlowUpTour',
    seoDescription:
      '압구정. 전국 최대 소아 한의원 네트워크. 성장클리닉·비염·아토피·면역 강화. 외국인 가족 적합. GlowUpTour에서 예약.',
    seoTags: ['압구정한의원', '소아한의원', '성장클리닉', '소아비염', '면역강화', 'kids Korean medicine', 'children growth clinic Korea', '외국인한방'],
    ogDescription: '압구정 한의원 | 함소아·소아 성장·비염 특화 네트워크 — GlowUpTour',
    imageKeywords: ['Hamsoa kids clinic Apgujeong', 'children growth Korean medicine', '함소아한의원 압구정'],
  },
  {
    title: '하늘체한의원 강남점',
    englishTitle: 'Haneulche Korean Medicine Clinic Gangnam',
    slug: 'haneulche-diet-korean-medicine-gangnam',
    description:
      '한방 다이어트 전문 전국 네트워크의 강남점. 체질 분석 기반 맞춤 감량 한약과 부종 관리 프로그램 운영. K-뷰티 다이어트에 관심 있는 외국인 관광객 수요가 높음. 강남역 인근, 영어 상담 가능.',
    locationLabel: '강남',
    address: '서울특별시 강남구 (강남역 인근)',
    phone: '홈페이지 문의',
    nearestStation: '강남역 인근',
    signatureProcedures: ['한방 다이어트', '다이어트 한약', '체질 감량', '부종 관리'],
    procedureName: '한방 다이어트·맞춤 감량',
    promoLabel: '한방 다이어트 전문 네트워크',
    languagesSpoken: ['ko', 'en'],
    interpreterIncluded: true,
    seoTitle: '하늘체한의원 강남 | 한방 다이어트·맞춤 감량 한약 | GlowUpTour',
    seoDescription:
      '강남역 인근. 한방 다이어트 전문 네트워크. 체질 분석 맞춤 감량 한약·부종 관리. 영어 상담. GlowUpTour에서 예약.',
    seoTags: ['강남한의원', '한방다이어트', '다이어트한약', '체질감량', '부종관리', 'herbal diet Korea', 'Korean medicine weight loss', '외국인한방'],
    ogDescription: '강남 한의원 | 하늘체·한방 다이어트·맞춤 감량 — GlowUpTour',
    imageKeywords: ['Haneulche diet clinic Gangnam', 'herbal diet Korean medicine', '하늘체한의원 강남'],
  },
  {
    title: '광동한방병원',
    englishTitle: 'Kwangdong Korean Medicine Hospital',
    slug: 'kwangdong-korean-medicine-hospital-samseong',
    description:
      '광동제약 계열 정통 한방병원. 한방 암케어센터·뇌질환 재활 특화, 입원 치료 가능한 한방병원급 시설. 한방 암케어·면역치료·통증·중풍/뇌질환 한방재활·산후조리·한방검진 운영. 봉은사역·삼성역 인근 코엑스 도보권으로 의료관광 접근성 우수. 영어·중국어 상담.',
    locationLabel: '강남 삼성동',
    address: '서울특별시 강남구 봉은사로 612 (삼성동)',
    phone: '홈페이지 문의',
    nearestStation: '봉은사역 · 삼성역 인근',
    signatureProcedures: ['한방 암케어', '면역치료', '통증 치료', '중풍/뇌질환 한방재활', '산후조리', '한방검진'],
    procedureName: '한방 암케어·중풍 재활',
    promoLabel: '암케어센터·입원 가능',
    languagesSpoken: ['ko', 'en', 'zh'],
    interpreterIncluded: true,
    seoTitle: '광동한방병원 | 삼성동 한방 암케어·재활 전문 | GlowUpTour',
    seoDescription:
      '봉은사역 인근. 광동제약 계열. 한방 암케어·중풍 재활·면역치료. 입원 가능. 영어·중국어 상담. GlowUpTour에서 예약.',
    seoTags: ['강남한방병원', '한방암케어', '중풍재활', '면역치료', '한방입원', 'cancer care Korean medicine', 'stroke rehabilitation Korea', '외국인한방'],
    ogDescription: '강남 한방병원 | 광동·암케어·뇌질환 재활·입원 가능 — GlowUpTour',
    imageKeywords: ['Kwangdong Korean Medicine Hospital', 'cancer care oriental medicine Korea', 'Bongeunsa station hospital', '광동한방병원 삼성동'],
  },
];
