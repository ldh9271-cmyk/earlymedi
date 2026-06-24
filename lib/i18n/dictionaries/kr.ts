/**
 * Korean dictionary for the patient-facing portal.
 *
 * Treat this as the source of truth — other locales should mirror this
 * shape exactly. New keys: add here first, then translate into en/zh/ja
 * files. Missing keys in non-KR locales fall back to Korean automatically
 * via the get-dictionary loader.
 *
 * Style guide:
 *   - keep keys nested by section (nav, hero, categories, …) so the JSX
 *     doesn't have to read flat dot-paths
 *   - prefer short marketing copy — long paragraphs belong in CMS
 *   - use {placeholders} for runtime interpolation, NOT string concat
 */
const kr = {
  nav: {
    home: '홈',
    clinics: '병원 찾기',
    procedures: '시술 카탈로그',
    packages: '패키지',
    aiConsult: 'AI 상담',
    reviews: '실제 후기',
    inquiry: '1:1 문의',
    login: '로그인',
  },
  hero: {
    badge: 'AI 기반 한국 의료관광 컨시어지',
    title: '한국 최고의 시술,\nAI가 당신에게 맞춰드립니다.',
    subtitle:
      '병원·의사·가격을 한 화면에서 비교하고, AI 상담사가 24시간 한국어·영어·중국어·일본어로 안내합니다.',
    ctaPrimary: '무료 AI 상담 시작',
    ctaSecondary: '병원 둘러보기',
    stats: {
      hospitals: '협력 병원',
      procedures: '시술 카테고리',
      patients: '연간 환자',
      languages: '지원 언어',
    },
  },
  categories: {
    title: '관심 분야를 선택하세요',
    subtitle: '카테고리별로 검증된 병원과 후기, 예상 비용을 한 번에 확인할 수 있습니다.',
    items: {
      plastic_surgery: { label: '성형외과', desc: '눈·코·윤곽·바디' },
      dermatology: { label: '피부과', desc: '레이저·필러·보톡스·여드름' },
      dental: { label: '치과', desc: '임플란트·교정·미백' },
      hair: { label: '모발', desc: '모발 이식·탈모 치료' },
      health_checkup: { label: '건강검진', desc: '종합검진·인간독' },
      beauty_tour: { label: '뷰티 투어', desc: '시술 + 호텔 + 관광 패키지' },
      makeup: { label: '헤어·메이크업', desc: '시술 전후 스타일링' },
      photo_studio: { label: '사진 스튜디오', desc: '시술 후 인생 사진' },
    },
    viewAll: '전체 보기',
  },
  featured: {
    title: '오늘의 추천 병원',
    subtitle: 'KOIHA 등록 외국인환자 유치 의료기관 중 후기·전문성·언어 지원이 우수한 곳',
    cta: '병원 전체 보기',
  },
  ai: {
    title: 'AI Glow-Up — 사진 한 장으로 시작',
    subtitle:
      '얼굴 사진을 업로드하면 AI가 추천 시술과 예상 비용, 회복 기간을 분석해 드려요. 익명·무료.',
    bullets: [
      '얼굴 분석 → 맞춤 시술 추천',
      '시술 전후 시뮬레이션',
      '예상 비용·회복 기간',
      '병원별 견적 비교',
    ],
    cta: 'AI 분석 시작 (무료)',
    note: '업로드한 사진은 분석 직후 삭제되며, 동의 없이 저장·공유되지 않습니다.',
  },
  trust: {
    title: '왜 KoreaGlowUp인가요?',
    items: {
      koiha: {
        title: 'KOIHA 등록 의료기관만',
        desc: '한국 보건복지부 등록 외국인환자 유치 의료기관과 직접 협력합니다.',
      },
      ai: {
        title: '24시간 AI 컨시어지',
        desc: '한국어·영어·중국어·일본어·러시아어 자동 번역으로 시차 없이 상담.',
      },
      transparent: {
        title: '투명한 비용',
        desc: '병원이 사전 공개한 가격 범위 + 마지막 견적은 시술 전 확정.',
      },
      aftercare: {
        title: '귀국 후 케어',
        desc: 'GlowCare 사후관리 — 회복 사진 분석, 영상 진료, 응급 연결.',
      },
    },
  },
  inquiryCta: {
    title: '아직 결정하기 어려우신가요?',
    subtitle: '의료 컨시어지에게 1:1로 물어보세요. 평균 응답 15분 이내, 무료.',
    nameLabel: '이름',
    countryLabel: '국가',
    contactLabel: '연락처 (이메일 또는 카카오톡 ID)',
    interestLabel: '관심 분야',
    memoLabel: '문의 내용',
    submit: '문의 보내기',
    privacy: '문의 시 개인정보처리방침에 동의합니다.',
  },
  footer: {
    tagline: '한국 의료관광의 새로운 표준 — AI + 사람의 컨시어지.',
    company: '회사',
    about: '소개',
    careers: '채용',
    press: '보도자료',
    contact: '연락처',
    legal: '약관',
    terms: '이용약관',
    privacy: '개인정보처리방침',
    medicalAd: '의료법 광고 가이드',
    business: '비즈니스',
    forHospitals: '병원·의원용',
    forPartners: '호텔·파트너용',
    forFreelancers: '프리랜서·코디용',
    copy: '© 2026 KoreaGlowUp · 한국 보건복지부 외국인환자 유치 광고 가이드라인 준수',
  },
  signup: {
    badge: '게스트 가입',
    title: '계정 만들기',
    subtitle: '진료 일정·결제·회복 알림을 한 곳에서 받아보세요.',
    googleCta: 'Google로 가입',
    or: '또는 이메일로 가입',
    usernameLabel: '아이디',
    usernameHint: '4-20자, 영문·숫자·_',
    usernamePlaceholder: 'mary_chen',
    passwordLabel: '비밀번호',
    passwordHint: '8자 이상',
    passwordConfirmLabel: '비밀번호 확인',
    fullNameLabel: '이름',
    fullNameHint: '여권 표기와 동일하게',
    countryLabel: '국가',
    phoneLabel: '전화번호',
    phoneHint: '국가 코드 포함 (예: +82 10-1234-5678)',
    emailLabel: '이메일',
    emailHint: '본인 확인 메일이 발송됩니다',
    messengerLabel: '주 사용 메신저',
    messengerIdLabel: '메신저 ID',
    messengerIdHint: '문의 주시면 빠르게 연락 드리겠습니다.',
    submitCta: '가입하기',
    submitting: '가입 중…',
    sentTitle: '본인 확인 메일을 보냈습니다',
    sentBody: '이메일에서 링크를 클릭하시면 가입이 완료됩니다.',
    sentRetry: '다른 이메일로 다시',
    haveAccount: '이미 계정이 있으신가요?',
    goLogin: '로그인 →',
    privacy: '가입 시 이용약관 · 개인정보처리방침에 동의합니다.',
  },
  login: {
    badge: '게스트 전용',
    title: '게스트 로그인',
    subtitle: 'Google 또는 비밀번호로 접속하세요.',
    googleCta: 'Google로 계속하기',
    or: '또는 이메일로',
    passwordTab: '비밀번호',
    magicTab: '매직링크',
    emailLabel: '이메일',
    emailPlaceholder: 'you@example.com',
    passwordLabel: '비밀번호',
    passwordPlaceholder: '8자 이상',
    signInCta: '로그인',
    signingIn: '로그인 중…',
    forgotPassword: '비밀번호 찾기',
    cta: '매직링크 받기',
    sending: '전송 중…',
    invalidCreds: '이메일 또는 비밀번호가 올바르지 않습니다.',
    emailNotConfirmed: '이메일 인증이 완료되지 않았습니다. 받은 인증 메일을 확인해 주세요.',
    resetSent: '비밀번호 재설정 메일을 보냈습니다.',
    sentTitle: '메일을 보냈습니다',
    sentBody: '이메일에서 링크를 클릭해 접속하세요. (스팸함도 확인)',
    sentRetry: '다른 이메일로 다시 시도',
    noAccount: '아직 계정이 없으신가요?',
    goInquiry: '1:1 문의로 시작 →',
    business: '의료관광 사업자이신가요? (병원·에이전시·파트너·프리랜서)',
    businessLogin: '사업자 로그인 →',
    privacy: '접속 시 개인정보처리방침에 동의합니다.',
  },
  common: {
    loading: '불러오는 중…',
    error: '오류가 발생했습니다',
    retry: '다시 시도',
    learnMore: '자세히 보기',
    bookConsult: '상담 예약',
    seeMore: '더 보기',
    backToHome: '홈으로 돌아가기',
    noClinicsTitle: '아직 등록된 병원이 없어요',
    noClinicsBody: '협력 병원을 준비 중입니다. 1:1 문의로 직접 안내받으실 수 있어요.',
    noClinicsInCategory: '이 카테고리에 등록된 병원이 아직 없습니다.',
  },
};

export default kr;
// Dictionary captures the structural shape of `kr` (objects, keys,
// nested arrays) but widens leaf strings so other locale files can
// supply their own translations against the same key tree. Without
// this widening, an `as const` literal would lock each property to
// the exact Korean string and reject any en/zh/ja override.
export type Dictionary = typeof kr;
