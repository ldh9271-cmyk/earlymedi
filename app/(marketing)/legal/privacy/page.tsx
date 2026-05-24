export const metadata = {
  title: '개인정보처리방침 | EarlyMedi',
  description:
    'EarlyMedi AI Concierge가 외국인환자와 의료관광 사업자의 개인정보를 어떻게 수집·이용·보호하는지에 대한 공식 처리방침입니다.',
};

const LAST_UPDATED = '2026년 5월 25일';
const EFFECTIVE_DATE = '2026년 5월 25일';
const COMPANY_NAME = '주식회사 쉐어아트';
const SERVICE_NAME = 'EarlyMedi AI Concierge';
const PRIVACY_OFFICER_NAME = '이동희';
const PRIVACY_OFFICER_EMAIL = 'privacy@earlymedi.com';
const PRIVACY_OFFICER_PHONE = '02-XXXX-XXXX';
const COMPANY_ADDRESS = '대한민국 서울특별시'; // TODO: 정식 사업장 주소 입력

/**
 * Korean PIPA-compliant privacy policy for the EarlyMedi medical-tourism SaaS.
 *
 * Required by:
 *  - 개인정보 보호법 제30조 (개인정보 처리방침의 수립 및 공개)
 *  - 의료법 제27조의2 (외국인환자 유치 관련 의료광고 가이드라인)
 *  - KakaoTalk Channel 사업자 심사 요건
 *  - GDPR Art. 13/14 (해외 환자 대상 다국적 데이터 처리)
 *
 * Update history at the bottom — keep cumulative, never silently overwrite.
 */
export default function PrivacyPage(): JSX.Element {
  return (
    <main className="prose prose-slate mx-auto max-w-4xl px-6 py-12 prose-headings:tracking-tight prose-h2:mt-12 prose-h2:text-xl prose-h3:mt-6 prose-h3:text-base prose-p:text-sm prose-li:text-sm">
      <header className="not-prose mb-10 border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight">개인정보처리방침</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          시행일: {EFFECTIVE_DATE} · 최종 개정: {LAST_UPDATED}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {COMPANY_NAME}(이하 “회사”)은 「개인정보 보호법」 제30조 및 「의료법」 제27조의2에 따라
          정보주체의 개인정보를 보호하고 권익을 신속하게 처리하기 위해 다음과 같이 개인정보 처리방침을
          수립·공개합니다.
        </p>
      </header>

      <section>
        <h2>제1조 (총칙)</h2>
        <p>
          본 처리방침은 회사가 운영하는 {SERVICE_NAME}(이하 “서비스”)와 관련하여 회원, 외국인환자,
          의료기관, 유치업체, 파트너업체, 프리랜서 등 정보주체의 개인정보가 어떠한 용도와 방식으로
          이용되고 있으며, 개인정보 보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.
        </p>
      </section>

      <section>
        <h2>제2조 (수집하는 개인정보 항목)</h2>

        <h3>1. 회원(서비스 운영자) 정보</h3>
        <ul>
          <li>필수: 이메일, 이름(담당자), 연락처(전화번호), 소속 회사명</li>
          <li>선택: 사업자 등록번호, 외국인환자유치업 등록번호, 의료기관 면허번호, 정산 계좌 정보</li>
          <li>자동 수집: IP 주소, 접속 로그, 쿠키, 기기 정보, 브라우저 정보</li>
        </ul>

        <h3>2. 외국인환자(서비스 이용자) 정보</h3>
        <ul>
          <li>
            필수: 성명(여권 표기), 국적, 연락처, 이메일, 여권번호, 시술 희망 정보(시술 종류·일정·예산)
          </li>
          <li>
            의료 정보: 알레르기, 복용 약물, 과거 시술 이력, 임신·수유 여부, 시술 차트, 회복 사진(동의 시)
          </li>
          <li>선택: 보험 정보, 비상 연락처, 비자 정보, 항공권 정보, 숙박 선호도</li>
          <li>자동 수집: 채널(KakaoTalk·LINE·WhatsApp 등) 메시지 내용, 접속 로그, 위치 정보(동의 시)</li>
        </ul>

        <h3>3. 결제 관련 정보</h3>
        <ul>
          <li>결제 카드 정보(PG사 대행), 거래 내역, 환불 정보, 정산 계좌 정보</li>
          <li>세금계산서 발행 정보 (사업자 등록증, 대표자명, 사업장 주소)</li>
        </ul>
      </section>

      <section>
        <h2>제3조 (개인정보 수집 방법)</h2>
        <ul>
          <li>회원가입 폼 직접 입력</li>
          <li>
            10채널 다국어 인박스(KakaoTalk · LINE · WhatsApp · WeChat · Instagram · Facebook
            Messenger · Naver 톡톡 · Telegram · SMS · Email)를 통한 메시지 송수신
          </li>
          <li>의료기관·유치업체에 의한 직접 입력 (환자 동의 후)</li>
          <li>여권 OCR을 통한 자동 수집 (ICAO 9303 MRZ 표준)</li>
          <li>전화·이메일 상담</li>
          <li>관련 법령에 따라 제휴 의료기관으로부터 제공받는 진료 기록</li>
          <li>쿠키 및 자동 수집 도구</li>
        </ul>
      </section>

      <section>
        <h2>제4조 (개인정보의 처리 목적)</h2>
        <p>회사는 다음의 목적을 위해 개인정보를 처리하며, 목적이 변경될 경우 사전 동의를 받습니다.</p>
        <ol>
          <li>회원가입 의사 확인, 회원자격 유지·관리, 본인 인증</li>
          <li>외국인환자와 의료기관·유치업체·파트너업체·프리랜서 간의 매칭 및 견적 제공</li>
          <li>의료관광 서비스(상담·예약·결제·정산·비자·사후관리) 제공</li>
          <li>AI 기반 자동 시술 차트 작성 및 다국어 번역 (Gemini · Claude · OpenAI API 활용)</li>
          <li>환자 PWA를 통한 일정·복약·회복 알림</li>
          <li>4자(병원·유치업체·파트너·프리랜서) 자동 정산 및 세금계산서 발행</li>
          <li>의료법 제27조의2에 따른 KOIHA 외국인환자 등록 및 통계 보고</li>
          <li>고객 문의·불만 처리, 분쟁 해결</li>
          <li>서비스 부정 이용 방지, 보안 사고 대응, 감사 추적</li>
          <li>법령에 따른 의무 이행 및 법적 분쟁 대응</li>
        </ol>
      </section>

      <section>
        <h2>제5조 (개인정보의 보유 및 이용 기간)</h2>
        <p>
          회사는 법령 또는 정보주체로부터 동의받은 개인정보 보유·이용기간 내에서 개인정보를
          처리·보유합니다.
        </p>
        <ul>
          <li>회원 정보: 회원 탈퇴 시 즉시 파기 (단, 부정 가입 방지를 위한 최소 정보는 30일 보관)</li>
          <li>
            의무기록 및 환자 진료 정보: <strong>10년</strong> (「의료법」 제22조, 시행규칙 제15조)
          </li>
          <li>전자상거래 관련 기록: <strong>5년</strong> (「전자상거래법」 제6조)</li>
          <li>표시·광고 기록: <strong>6개월</strong></li>
          <li>계약·청약철회 기록: <strong>5년</strong></li>
          <li>대금결제·재화 공급 기록: <strong>5년</strong></li>
          <li>소비자 불만·분쟁 처리 기록: <strong>3년</strong></li>
          <li>로그인 기록·접속 로그: <strong>3개월</strong> (「통신비밀보호법」)</li>
          <li>외국인환자 유치 실적 보고용 정보: <strong>5년</strong> (의료법 시행규칙)</li>
        </ul>
      </section>

      <section>
        <h2>제6조 (개인정보의 제3자 제공)</h2>
        <p>
          회사는 정보주체의 별도 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에
          해당하는 경우에만 개인정보를 제3자에게 제공합니다.
        </p>
        <ul>
          <li>
            <strong>제휴 의료기관</strong>: 환자 동의 시 시술 견적·예약·진료에 필요한 최소 정보 제공
          </li>
          <li>
            <strong>유치업체·파트너업체·프리랜서</strong>: 의료관광 패키지 운영에 필요한 범위 내
            (환자 동의 + PII 가시성 등급 적용)
          </li>
          <li>
            <strong>결제대행사(PG)</strong>: Stripe Inc., Toss Payments — 결제 처리 목적
          </li>
          <li>
            <strong>비자 관련</strong>: 한국보건산업진흥원(KOIHA), 출입국·외국인관서 — 법령 의무 이행
          </li>
          <li>
            <strong>법령에 의한 제공</strong>: 수사기관의 적법한 절차에 따른 요청 시
          </li>
        </ul>
      </section>

      <section>
        <h2>제7조 (개인정보 처리의 위탁)</h2>
        <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
        <ul>
          <li>
            <strong>Supabase Inc. (미국)</strong>: 인증·데이터베이스·실시간 동기화·파일 저장소
          </li>
          <li>
            <strong>Vercel Inc. (미국)</strong>: 웹 호스팅 및 서버리스 함수 실행
          </li>
          <li>
            <strong>Google LLC (Gemini 2.5 Pro)</strong>: AI 자동 차트 작성, 의도 분류, 다국어 번역
          </li>
          <li>
            <strong>Anthropic PBC (Claude Opus)</strong>: AI 백업 모델 (Gemini 장애 시 대체)
          </li>
          <li>
            <strong>OpenAI L.L.C.</strong>: 음성 인식(STT), 통역 보조
          </li>
          <li>
            <strong>Resend Inc.</strong>: 이메일 발송 (매직링크·알림·세금계산서)
          </li>
          <li>
            <strong>Twilio Inc.</strong>: SMS · WhatsApp Business · 음성 통화
          </li>
          <li>
            <strong>Upstash, Inc.</strong>: 큐 처리, 캐싱
          </li>
          <li>
            <strong>Stripe, Inc. · 토스페이먼츠</strong>: 결제 처리 및 정산
          </li>
        </ul>
        <p>
          회사는 위탁 계약 체결 시 「개인정보 보호법」 제26조에 따라 처리목적 외 처리 금지, 기술적·관리적
          보호조치, 재위탁 제한, 손해배상 등 책임을 명확히 규정하고 있으며, 수탁사를 정기적으로 감독합니다.
        </p>
      </section>

      <section>
        <h2>제8조 (국외 이전)</h2>
        <p>
          서비스 특성상 일부 개인정보가 다음 국가로 이전될 수 있습니다. 정보주체는 이전을 거부할 권리가
          있으나, 거부 시 일부 서비스 이용이 제한됩니다.
        </p>
        <ul>
          <li>
            <strong>이전 대상국</strong>: 미국 (서버 호스팅·AI 처리)
          </li>
          <li>
            <strong>이전 시점</strong>: 서비스 이용 시 실시간 전송
          </li>
          <li>
            <strong>이전 방법</strong>: TLS 1.3 암호화 채널을 통한 네트워크 전송
          </li>
          <li>
            <strong>이전 항목</strong>: 처리 위탁사가 제공하는 서비스에 필요한 최소 항목
          </li>
          <li>
            <strong>보유 기간</strong>: 위탁 계약 종료 시까지 또는 정보주체 요청 시 즉시 파기
          </li>
        </ul>
      </section>

      <section>
        <h2>제9조 (정보주체의 권리 및 행사 방법)</h2>
        <p>정보주체는 회사에 대해 언제든지 다음의 권리를 행사할 수 있습니다.</p>
        <ol>
          <li>개인정보 열람 요구</li>
          <li>오류 등이 있을 경우 정정 요구</li>
          <li>삭제 요구 (단, 의료법 등에 따른 보존 의무 정보 제외)</li>
          <li>처리정지 요구</li>
          <li>처리에 대한 동의 철회</li>
        </ol>
        <p>
          권리 행사는 회사에 대해 서면, 전자우편, 모사전송(FAX) 등을 통해 가능하며, 회사는 지체 없이
          조치하겠습니다. 정보주체가 만 14세 미만 아동의 법정대리인인 경우 해당 아동의 개인정보에 대한
          권리도 행사할 수 있습니다.
        </p>
      </section>

      <section>
        <h2>제10조 (개인정보의 파기)</h2>
        <p>
          회사는 보유 기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 해당 개인정보를 파기합니다.
        </p>
        <ul>
          <li>
            <strong>파기 절차</strong>: 파기 사유 발생 → 개인정보 보호책임자 승인 → 파기 시행 →
            파기 결과 기록 보관
          </li>
          <li>
            <strong>전자적 파일 형태</strong>: 복구 불가능한 방법으로 영구 삭제 (DROP CASCADE +
            물리적 storage zero-fill)
          </li>
          <li>
            <strong>종이 문서</strong>: 분쇄기로 분쇄하거나 소각
          </li>
          <li>
            <strong>암호화된 PII</strong>: pgcrypto 컬럼 단위 암호화 데이터는 키 폐기로도 사실상 파기 처리
          </li>
        </ul>
      </section>

      <section>
        <h2>제11조 (개인정보의 안전성 확보 조치)</h2>
        <p>
          회사는 「개인정보 보호법」 제29조에 따라 다음과 같은 안전성 확보 조치를 시행하고 있습니다.
        </p>
        <h3>1. 관리적 조치</h3>
        <ul>
          <li>내부 관리계획 수립·시행, 정기적 직원 교육</li>
          <li>개인정보 취급자 최소화 및 권한 분리</li>
          <li>접속기록 보관 및 위·변조 방지</li>
        </ul>
        <h3>2. 기술적 조치</h3>
        <ul>
          <li>
            <strong>컬럼 단위 암호화</strong>: 여권번호·전화번호·이메일 등 PII는 PostgreSQL pgcrypto의
            pgp_sym_encrypt로 암호화 저장
          </li>
          <li>
            <strong>Row Level Security (RLS)</strong>: 조직 ID 기반 행 단위 접근 제어
          </li>
          <li>
            <strong>전송 구간 암호화</strong>: 모든 통신 TLS 1.3
          </li>
          <li>
            <strong>접근 통제</strong>: Supabase Auth (PKCE + JWT), Role-based access control
          </li>
          <li>
            <strong>침입 차단</strong>: Cloudflare WAF, rate limiting
          </li>
          <li>
            <strong>감사 로그</strong>: 모든 PII 접근·수정·삭제는 audit_logs 테이블에 영구 기록
          </li>
        </ul>
        <h3>3. 물리적 조치</h3>
        <ul>
          <li>데이터센터 (Supabase AWS ap-southeast-2 · Vercel Edge) 출입 통제</li>
          <li>업무용 PC 자료 유출 방지 솔루션 적용</li>
        </ul>
      </section>

      <section>
        <h2>제12조 (쿠키 운영 및 거부 방법)</h2>
        <p>회사는 이용자에게 개인화된 서비스를 제공하기 위해 쿠키를 사용합니다.</p>
        <ul>
          <li>
            <strong>쿠키 사용 목적</strong>: 로그인 세션 유지, 활성 조직 선택, 보안 인증
          </li>
          <li>
            <strong>거부 방법</strong>: 브라우저 설정 → 개인정보 → 쿠키 차단. 단, 거부 시 로그인 불가
          </li>
        </ul>
      </section>

      <section>
        <h2>제13조 (개인정보 보호책임자)</h2>
        <p>
          회사는 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위해 아래와 같이 개인정보 보호
          책임자를 지정하고 있습니다.
        </p>
        <ul>
          <li>
            <strong>개인정보 보호책임자</strong>
            <ul>
              <li>성명: {PRIVACY_OFFICER_NAME}</li>
              <li>이메일: {PRIVACY_OFFICER_EMAIL}</li>
              <li>전화: {PRIVACY_OFFICER_PHONE}</li>
            </ul>
          </li>
        </ul>
        <p>
          정보주체는 개인정보보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 위 책임자에게
          문의하실 수 있으며, 회사는 정보주체의 문의에 대해 지체 없이 답변 및 처리해드릴 것입니다.
        </p>
      </section>

      <section>
        <h2>제14조 (권익 침해 구제 방법)</h2>
        <p>
          정보주체는 개인정보 침해로 인한 구제를 받기 위해 아래 기관에 분쟁 해결이나 상담을 신청할 수
          있습니다.
        </p>
        <ul>
          <li>개인정보분쟁조정위원회: (국번 없이) 1833-6972 / www.kopico.go.kr</li>
          <li>개인정보침해신고센터: (국번 없이) 118 / privacy.kisa.or.kr</li>
          <li>대검찰청 사이버수사과: (국번 없이) 1301 / www.spo.go.kr</li>
          <li>경찰청 사이버수사국: (국번 없이) 182 / ecrm.cyber.go.kr</li>
        </ul>
      </section>

      <section>
        <h2>제15조 (처리방침의 변경)</h2>
        <p>
          본 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제 및
          정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통해 고지할 것입니다. 다만, 정보주체
          권리의 중대한 변경이 있을 경우 30일 전에 고지합니다.
        </p>
      </section>

      <section className="not-prose mt-12 rounded-lg border bg-muted/30 p-5 text-xs text-muted-foreground">
        <h3 className="text-sm font-semibold text-foreground">개정 이력</h3>
        <ul className="mt-2 space-y-1 list-disc pl-5">
          <li>2026-05-25: 최초 제정 및 시행</li>
        </ul>
      </section>

      <footer className="not-prose mt-12 border-t pt-6 text-xs text-muted-foreground">
        <p>
          <strong>{COMPANY_NAME}</strong> · {COMPANY_ADDRESS}
        </p>
        <p>본 개인정보 처리방침에 관한 문의: {PRIVACY_OFFICER_EMAIL}</p>
      </footer>
    </main>
  );
}
