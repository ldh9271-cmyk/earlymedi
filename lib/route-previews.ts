/**
 * Per-route "what this screen will do" copy used by the `<ComingSoon>`
 * placeholder. Keep entries short and concrete — these double as roadmap
 * marketing for users browsing during the 10-patient trial.
 */
export type RoutePreview = {
  title: string;
  description: string;
  bullets: string[];
  workingLinks?: Array<{ href: string; label: string }>;
  accent?: 'brand' | 'care' | 'hospitality' | 'slate';
};

const AGENCY_WORKING: RoutePreview['workingLinks'] = [
  { href: '/agency/dashboard', label: '대시보드' },
  { href: '/agency/inbox', label: '통합 인박스' },
  { href: '/agency/patients', label: '환자 CRM' },
  { href: '/agency/cases', label: '케이스' },
  { href: '/agency/hospitals', label: '병원 마켓플레이스' },
  { href: '/agency/recovery', label: 'EarlyCare 사후관리' },
  { href: '/agency/insights', label: 'EarlyInsight 분석' },
];

const MEDICAL_WORKING: RoutePreview['workingLinks'] = [
  { href: '/medical/dashboard', label: '대시보드' },
  { href: '/medical/charts', label: '시술 차트' },
];

const FREELANCER_WORKING: RoutePreview['workingLinks'] = [
  { href: '/freelancer/dashboard', label: '대시보드' },
];

const PARTNER_WORKING: RoutePreview['workingLinks'] = [
  { href: '/partner/dashboard', label: '대시보드' },
];

export const ROUTE_PREVIEWS: Record<string, RoutePreview> = {
  // ─────────────────────────────────────────────────────────
  // Agency
  // ─────────────────────────────────────────────────────────
  '/agency/leads': {
    title: '리드 파이프라인',
    description: '인박스 대화에서 발생한 잠재 환자를 Lead → Qualified → Quoted → Booked 단계로 추적합니다.',
    bullets: [
      '인박스의 대화 컨텍스트가 자동으로 리드로 캡처됩니다.',
      'AI가 추출한 의도 (시술·국적·일정·예산)로 리드를 자동 분류',
      '담당자별 / 채널별 / 출신국별 전환율 대시보드',
      '리드 → 케이스 원클릭 전환 + 자동 견적 시드 채움',
      '7일 무응답 리드 자동 폴로업 시퀀스 (KakaoTalk/LINE/WhatsApp)',
    ],
    workingLinks: AGENCY_WORKING,
    accent: 'brand',
  },
  '/agency/partners': {
    title: '파트너업체 관리',
    description: '호텔 · 스파 · 식당 · 교통 · 관광 등 비의료 파트너 계약과 시술 후 제약 매핑을 관리합니다.',
    bullets: [
      '파트너별 계약 · 수수료율 · 정산 규칙 관리',
      '시술 후 제약 사항 자동 매칭 (예: 보톡스 시술 → 24시간 사우나 금지)',
      '파트너 가용성 · 예약금 · 취소 정책 동기화',
      '파트너 초대 링크 발송 + e-서명 워크플로',
    ],
    workingLinks: AGENCY_WORKING,
    accent: 'slate',
  },
  '/agency/freelancers': {
    title: '프리랜서 관리',
    description: '송객 · 통역 · 코디 · 인플루언서 파트너의 추천 코드, 커미션, 세금 서류를 관리합니다.',
    bullets: [
      '프리랜서 초대 + QR 추천 코드 자동 발급',
      'PII 가시성 단계 설정 (none · masked · full)',
      '월별 커미션 정산 자동 계산 + 세금계산서 발행',
      '다중 에이전시 겸업 허용 + 분배 로직',
      '실적 리더보드 + 자동 등급 배지',
    ],
    workingLinks: AGENCY_WORKING,
    accent: 'hospitality',
  },
  '/agency/quotes': {
    title: 'RFQ · 견적 관리',
    description: '병원에 일괄 견적 요청 후 응답을 비교 · 평가 · 환자에게 전달합니다.',
    bullets: [
      '환자 케이스 → 다중 병원 RFQ 동시 발송',
      '병원 응답 비교 매트릭스 (가격 · 일정 · 옵션 · 리뷰)',
      'AI 추천 견적 + 자동 PDF 생성 (다국어)',
      '견적 → 예약 전환 추적 + 만료 리마인더',
      '시술 카탈로그 + 가격 정책 동기화',
    ],
    workingLinks: AGENCY_WORKING,
    accent: 'brand',
  },
  '/agency/packages': {
    title: '의료관광 패키지',
    description: '시술 + 회복 호텔 + 픽업 + 관광을 묶은 패키지 상품을 큐레이션 · 판매합니다.',
    bullets: [
      '병원 · 호텔 · 교통 · 관광 콤보 패키지 빌더',
      '시즌별 가격 · 환율 자동 조정',
      '커미션 분배 자동 시뮬레이션 (병원 · 호텔 · 프리랜서 4자)',
      '다국어 마케팅 페이지 자동 생성 + SEO',
      'A/B 가격 테스트 + 전환율 추적',
    ],
    workingLinks: AGENCY_WORKING,
    accent: 'care',
  },
  '/agency/calendar': {
    title: '마스터 캘린더',
    description: '모든 케이스의 도착 · 시술 · 회복 · 출국 일정을 한 화면에서 관리합니다.',
    bullets: [
      '환자 · 병원 · 호텔 · 픽업 · 통역 일정 통합 뷰',
      'AI 일정 충돌 감지 + 자동 재배치 제안',
      '담당자별 / 채널별 / 도시별 필터',
      'Google Calendar · iCal 양방향 동기화',
      '환자 PWA로 일정 자동 푸시 + 리마인더',
    ],
    workingLinks: AGENCY_WORKING,
    accent: 'brand',
  },
  '/agency/visa': {
    title: '비자 · 여행 서류',
    description: '의료비자 (M-1·M-2·G-1) 초청장 발급, 여권 검증, 항공권 확인을 한 곳에서 처리합니다.',
    bullets: [
      'AI OCR 여권 자동 인식 + 유효성 검증',
      'M-1 초청장 자동 생성 (병원 직인 e-서명)',
      'KOIHA 등록 환자 자동 매핑',
      '항공권 · 호텔 바우처 패키징',
      '국가별 비자 요구사항 자동 가이드 (10개국)',
    ],
    workingLinks: AGENCY_WORKING,
    accent: 'slate',
  },
  '/agency/payments': {
    title: '결제 · 예약금',
    description: '환자 예약금, 시술비, 패키지 결제를 Stripe · Toss로 받고 환불 · 분쟁을 관리합니다.',
    bullets: [
      '다통화 결제 (USD · CNY · JPY · KRW · RUB 등)',
      'Stripe · Toss · WeChat Pay · Alipay 통합',
      '부분 환불 · 취소 정책 자동 적용',
      '결제 분쟁 (chargeback) 대시보드',
      '환자 PWA로 결제 링크 자동 발송',
    ],
    workingLinks: AGENCY_WORKING,
    accent: 'care',
  },
  '/agency/commissions': {
    title: '커미션 분배',
    description: '병원 · 호텔 · 프리랜서 · 유치업체 4자 자동 정산. 분쟁 시 감사 추적 가능.',
    bullets: [
      '시술 단가에서 자동 분배 (병원 80% · 유치 12% · 송객 5% · 파트너 3% 등 설정 가능)',
      '월별 정산서 자동 생성 + 세금계산서 발행',
      '분쟁 발생 시 감사 로그 + 증빙 PDF',
      '실적 기반 동적 커미션율 조정',
      '환율 변동 자동 헤지 (KRW 기준 락인 옵션)',
    ],
    workingLinks: AGENCY_WORKING,
    accent: 'hospitality',
  },
  '/agency/billing': {
    title: '요금제 · 청구서',
    description: 'EarlyMedi 자체의 구독 요금제 · 사용량 · 청구서를 확인하고 결제 수단을 관리합니다.',
    bullets: [
      '현재 플랜 + 무료 체험 잔량 (10명 중 X명)',
      '사용량 메트릭 (환자 · AI 호출 · 메시지 · 비자 처리)',
      '월별 청구서 PDF 다운로드',
      '결제 수단 (카드 · 계좌이체 · 세금계산서) 관리',
      '플랜 업그레이드 · 다운그레이드 · 일시 정지',
    ],
    workingLinks: [
      { href: '/upgrade', label: '유료 플랜으로 전환' },
      { href: '/pricing', label: '요금제 상세' },
      ...(AGENCY_WORKING ?? []),
    ],
    accent: 'brand',
  },

  // ─────────────────────────────────────────────────────────
  // Medical
  // ─────────────────────────────────────────────────────────
  '/medical/rfqs': {
    title: 'RFQ 인박스',
    description: '유치업체에서 도착한 견적 요청을 응답 · 거절 · 가격 협상합니다.',
    bullets: [
      '도착 RFQ 자동 분류 (시술 카테고리 · 우선순위)',
      'AI 견적 자동 채움 (이력 기반 가격 추천)',
      '응답 시간 SLA + 자동 폴로업',
      '경쟁사 가격 비교 + 차별화 포인트 강조',
    ],
    workingLinks: MEDICAL_WORKING,
    accent: 'care',
  },
  '/medical/patients': {
    title: '환자 차트',
    description: '병원이 직접 보는 환자 마스터. 시술 이력 · 부작용 · 알레르기 · 진료 메모.',
    bullets: [
      '시술 이력 + AI 자동 채움 차트 검토',
      '재방문 환자 자동 인식 + 이전 차트 링크',
      '알레르기 · 약물 상호작용 경고',
      '환자 PWA 권한 동의 추적',
    ],
    workingLinks: MEDICAL_WORKING,
    accent: 'care',
  },
  '/medical/calendar': {
    title: '예약 캘린더',
    description: '의사별 · 룸별 · 시술별 예약 슬롯을 관리하고 충돌을 자동 방지합니다.',
    bullets: [
      '의사 · 룸 · 장비 리소스 통합 캘린더',
      'AI 충돌 감지 + 자동 재배치 제안',
      '환자 PWA로 예약 확인 / 변경 자동화',
      'EMR 일정 양방향 동기화',
    ],
    workingLinks: MEDICAL_WORKING,
    accent: 'care',
  },
  '/medical/deposits': {
    title: '예약금 정책',
    description: '시술별 · 국적별 예약금 비율과 환불 정책을 설정하고 자동 청구합니다.',
    bullets: [
      '시술별 예약금 % 설정 (예: 보톡스 20% · 안과 50%)',
      '국적별 환불 정책 차등 적용',
      '예약금 입금 자동 추적 + 미입금 알림',
      '취소 시 환불 자동 계산 + 정산',
    ],
    workingLinks: MEDICAL_WORKING,
    accent: 'care',
  },
  '/medical/resources': {
    title: '리소스 관리 (의사 · 룸)',
    description: '병원 내 의사 · 진료실 · 시술 장비를 등록하고 캘린더에서 자동 활용합니다.',
    bullets: [
      '의사별 전문 시술 카테고리 + 가용 시간',
      '진료실 · 수술실 자원 캘린더 통합',
      '장비 점유 / 정비 일정 추적',
      '리소스별 가동률 + 매출 기여도 분석',
    ],
    workingLinks: MEDICAL_WORKING,
    accent: 'care',
  },
  '/medical/emr': {
    title: 'EMR 연동',
    description: '병원 내부 EMR (전자의무기록)과 시술 차트 · 일정을 양방향 동기화합니다.',
    bullets: [
      'HL7 FHIR · DICOM 표준 지원',
      '주요 국내 EMR 사전 연동 (메디블록 · 이지스 · 닥터팔레트)',
      '시술 차트 자동 EMR 입력 + 검증',
      'EMR 일정 변경 시 환자 PWA 자동 푸시',
    ],
    workingLinks: MEDICAL_WORKING,
    accent: 'care',
  },
  '/medical/settlements': {
    title: '정산 · 세금계산서',
    description: '유치업체와의 정산서 · 세금계산서 · 원천징수를 자동 생성하고 발행합니다.',
    bullets: [
      '월별 / 케이스별 정산서 자동 생성',
      '세금계산서 자동 발행 (홈택스 연동)',
      '원천징수 자동 계산 + 신고용 PDF',
      '정산 분쟁 시 감사 로그 추적',
    ],
    workingLinks: MEDICAL_WORKING,
    accent: 'care',
  },
  '/medical/contracts': {
    title: '계약 관리',
    description: '유치업체와의 송객 계약 · 수수료율 · 광고 가이드라인을 e-서명으로 관리합니다.',
    bullets: [
      '유치업체별 계약서 e-서명 보관',
      '수수료율 · 환자 단가 변경 이력',
      '의료법 27조의2 광고 가이드라인 자동 검증',
      '계약 만료 자동 알림 + 갱신 워크플로',
    ],
    workingLinks: MEDICAL_WORKING,
    accent: 'care',
  },
  '/medical/billing': {
    title: '잔액 · 사용량',
    description: 'EarlyMedi PAYG 잔액과 시술 차트 자동 채움 · AI Vision · STT 사용량을 확인합니다.',
    bullets: [
      '현재 선불 잔액 + 자동 충전 설정',
      '사용량 메트릭 (차트 자동 채움 · AI Vision · STT · 통역)',
      '월별 청구서 PDF 다운로드',
      '플랜 업그레이드 · 다운그레이드',
    ],
    workingLinks: [
      { href: '/upgrade', label: '유료 플랜으로 전환' },
      { href: '/pricing', label: '요금제 상세' },
      ...(MEDICAL_WORKING ?? []),
    ],
    accent: 'care',
  },

  // ─────────────────────────────────────────────────────────
  // Freelancer
  // ─────────────────────────────────────────────────────────
  '/freelancer/cases': {
    title: '내 케이스',
    description: '본인이 송객한 케이스의 진행 상태와 예상 커미션을 실시간으로 확인합니다.',
    bullets: [
      '송객한 케이스의 단계별 진행 상태',
      '예상 커미션 vs 확정 커미션',
      '환자 정보 가시성 (PII 권한에 따라)',
      '에이전시 담당자 직접 채팅',
    ],
    workingLinks: FREELANCER_WORKING,
    accent: 'hospitality',
  },
  '/freelancer/commissions': {
    title: '커미션 정산',
    description: '월별 정산 내역, 세금 서류, 미정산 금액을 한 화면에서 추적합니다.',
    bullets: [
      '월별 정산서 + 세금계산서',
      '에이전시별 커미션 분리',
      '미정산 / 분쟁 케이스 추적',
      '입금 계좌 · 세금 정보 관리',
    ],
    workingLinks: FREELANCER_WORKING,
    accent: 'hospitality',
  },
  '/freelancer/referral-codes': {
    title: '추천 코드 · QR',
    description: 'SNS · 명함 · 오프라인 이벤트에 활용할 QR 추천 코드를 생성하고 성과를 추적합니다.',
    bullets: [
      'QR 코드 자동 생성 + 다운로드 (PNG · SVG · PDF)',
      '채널별 QR 분리 (Instagram · WeChat · 명함 등)',
      '클릭 · 전환 · 매출 실시간 추적',
      'UTM 파라미터 자동 부여',
    ],
    workingLinks: FREELANCER_WORKING,
    accent: 'hospitality',
  },
  '/freelancer/tax-docs': {
    title: '세금 서류',
    description: '원천징수 영수증 · 세금계산서 · 사업소득 신고 자료를 자동으로 정리합니다.',
    bullets: [
      '월별 / 연도별 원천징수 영수증 PDF',
      '사업소득 / 기타소득 자동 구분',
      '국세청 신고용 데이터 export',
      '해외 거주자 조세조약 자동 적용',
    ],
    workingLinks: FREELANCER_WORKING,
    accent: 'hospitality',
  },
  '/freelancer/disputes': {
    title: '이의 제기',
    description: '커미션 누락 · 케이스 귀속 분쟁이 발생했을 때 증빙과 함께 이의를 제기합니다.',
    bullets: [
      '대화 로그 · 추천 코드 클릭 시점 자동 첨부',
      '에이전시 응답 SLA 추적',
      '제3자 중재 요청 (EarlyMedi 운영팀)',
      '판정 결과 + 정산 자동 반영',
    ],
    workingLinks: FREELANCER_WORKING,
    accent: 'hospitality',
  },

  // ─────────────────────────────────────────────────────────
  // Partner (non_medical)
  // ─────────────────────────────────────────────────────────
  '/partner/bookings': {
    title: '부킹 관리',
    description: '유치업체에서 들어온 호텔 · 스파 · 식당 · 차량 예약을 확인 · 확정 · 변경합니다.',
    bullets: [
      '도착 부킹 자동 알림 + 확정 워크플로',
      '시술 후 제약 자동 검증 (예: 시술 24시간 내 사우나 차단)',
      '체크인 · 체크아웃 자동 알림',
      '예약 변경 · 취소 정책 적용',
    ],
    workingLinks: PARTNER_WORKING,
    accent: 'slate',
  },
  '/partner/availability': {
    title: '가용성 캘린더',
    description: '룸 · 좌석 · 차량 가용성을 실시간으로 등록하고 유치업체에 노출합니다.',
    bullets: [
      '룸 / 좌석 / 차량별 캘린더',
      '시즌 / 요일 / 시간대별 가격 조정',
      '오버부킹 자동 방지',
      'OTA (Booking · Expedia) 양방향 동기화',
    ],
    workingLinks: PARTNER_WORKING,
    accent: 'slate',
  },
  '/partner/menu': {
    title: '메뉴 · 가격표',
    description: '제공 서비스 · 가격 · 옵션을 다국어로 등록하고 유치업체 패키지에 자동 노출합니다.',
    bullets: [
      '서비스 카탈로그 다국어 등록 (한·영·중·일·러)',
      '시즌별 가격 자동 조정',
      '옵션 · 추가 요금 룰 빌더',
      '사진 · 동영상 갤러리 관리',
    ],
    workingLinks: PARTNER_WORKING,
    accent: 'slate',
  },
  '/partner/constraints': {
    title: '시술 후 제약 관리',
    description: '환자 시술별로 제공 불가한 서비스를 등록하면 부킹 시 자동으로 차단됩니다.',
    bullets: [
      '시술-제약 매트릭스 (예: 보톡스 → 24시간 사우나 금지)',
      'EarlyMedi 의료 자문단 검증 데이터 활용',
      '환자 PWA로 자동 안내 메시지',
      '제약 위반 시 자동 감지 + 알림',
    ],
    workingLinks: PARTNER_WORKING,
    accent: 'slate',
  },
  '/partner/contracts': {
    title: '계약 관리',
    description: '유치업체와의 송객 · 수수료 · 정산 계약을 e-서명으로 관리합니다.',
    bullets: [
      '유치업체별 계약서 e-서명',
      '수수료율 · 환자 단가 · 최소 보장 룸 협의 기록',
      '계약 만료 자동 알림',
      '분쟁 시 감사 로그',
    ],
    workingLinks: PARTNER_WORKING,
    accent: 'slate',
  },
  '/partner/settlements': {
    title: '정산',
    description: '유치업체로부터 받을 정산 내역, 세금계산서, 입금 일정을 추적합니다.',
    bullets: [
      '월별 / 부킹별 정산서',
      '세금계산서 발행 (홈택스 연동)',
      '미정산 금액 추적',
      '환율 변동 헤지 옵션',
    ],
    workingLinks: PARTNER_WORKING,
    accent: 'slate',
  },
  '/partner/billing': {
    title: '청구서',
    description: 'EarlyMedi 구독 요금제와 사용량 · 청구서를 확인합니다.',
    bullets: [
      '현재 플랜 + 무료 체험 잔량',
      '사용량 메트릭',
      '월별 청구서 PDF',
      '결제 수단 관리',
    ],
    workingLinks: [
      { href: '/upgrade', label: '유료 플랜으로 전환' },
      { href: '/pricing', label: '요금제 상세' },
      ...(PARTNER_WORKING ?? []),
    ],
    accent: 'slate',
  },
};
