export const metadata = {
  title: '이용약관 | EarlyMedi',
  description:
    'EarlyMedi AI Concierge 서비스의 이용약관 — 회원의 권리와 의무, 회사의 책임 범위, 분쟁 해결 절차를 규정합니다.',
};

const EFFECTIVE_DATE = '2026년 5월 25일';
const LAST_UPDATED = '2026년 5월 25일';
const COMPANY_NAME = '주식회사 쉐어아트';
const SERVICE_NAME = 'EarlyMedi AI Concierge';
const SUPPORT_EMAIL = 'support@earlymedi.com';

/**
 * Service Terms of Use for the EarlyMedi medical-tourism SaaS.
 * Required by 「전자상거래법」 제3조 + 「약관규제법」 + KakaoTalk channel
 * business review. Cross-referenced with the privacy policy at /legal/privacy.
 */
export default function TermsPage(): JSX.Element {
  return (
    <main className="prose prose-slate mx-auto max-w-4xl px-6 py-12 prose-headings:tracking-tight prose-h2:mt-12 prose-h2:text-xl prose-h3:mt-6 prose-h3:text-base prose-p:text-sm prose-li:text-sm">
      <header className="not-prose mb-10 border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight">이용약관</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          시행일: {EFFECTIVE_DATE} · 최종 개정: {LAST_UPDATED}
        </p>
      </header>

      <section>
        <h2>제1조 (목적)</h2>
        <p>
          본 약관은 {COMPANY_NAME}(이하 “회사”)이 제공하는 {SERVICE_NAME}(이하 “서비스”)의 이용과
          관련하여 회사와 회원의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
        </p>
      </section>

      <section>
        <h2>제2조 (정의)</h2>
        <ol>
          <li>“서비스”란 회사가 제공하는 외국인환자 유치·매칭·정산 통합 SaaS를 의미합니다.</li>
          <li>“회원”이란 본 약관에 동의하고 회사와 이용계약을 체결한 자를 말합니다.</li>
          <li>
            “회원 카테고리”란 의료기관, 유치업체, 파트너업체(호텔·스파·식당·교통·관광), 프리랜서의 4개
            카테고리를 의미합니다.
          </li>
          <li>“환자”란 서비스를 통해 의료기관과 연결되는 외국인 의료관광 방문자를 의미합니다.</li>
          <li>
            “콘텐츠”란 회원·환자가 서비스에 입력·업로드한 모든 정보(메시지, 사진, 의료기록 등)를 말합니다.
          </li>
        </ol>
      </section>

      <section>
        <h2>제3조 (약관의 게시 및 변경)</h2>
        <ol>
          <li>회사는 본 약관을 회원이 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.</li>
          <li>
            회사는 「약관의 규제에 관한 법률」, 「전자상거래법」 등을 위배하지 않는 범위에서 본 약관을
            개정할 수 있습니다.
          </li>
          <li>
            약관 개정 시 시행일자 7일 전부터(불리한 변경은 30일 전부터) 공지하며, 회원이 명시적으로 거부
            의사를 표시하지 않을 경우 변경된 약관에 동의한 것으로 봅니다.
          </li>
        </ol>
      </section>

      <section>
        <h2>제4조 (이용계약의 체결)</h2>
        <ol>
          <li>
            이용계약은 회원이 본 약관에 동의하고 회사가 정한 절차에 따라 회원가입을 신청한 후, 회사가
            이를 승낙함으로써 성립합니다.
          </li>
          <li>회사는 다음 각 호에 해당하는 경우 가입 신청을 거부할 수 있습니다.</li>
          <ul>
            <li>실명이 아니거나 타인의 명의를 도용한 경우</li>
            <li>허위 정보를 기재하거나 회사가 요구하는 정보를 누락한 경우</li>
            <li>
              「외국인환자 유치 광고 가이드라인」(의료법 제27조의2) 위반 우려가 있다고 회사가 판단한 경우
            </li>
            <li>기타 회원으로 등록함이 사회의 안녕질서 및 미풍양속에 반한다고 판단되는 경우</li>
          </ul>
        </ol>
      </section>

      <section>
        <h2>제5조 (요금 및 결제)</h2>
        <ol>
          <li>
            <strong>무료 체험</strong>: 신규 가입 회원은 환자 등록 10명까지 무료로 서비스를 이용할 수
            있습니다.
          </li>
          <li>
            <strong>유료 전환</strong>: 무료 한도 초과 시 회원 카테고리별로 적용되는 유료 플랜에 가입해야
            합니다. 플랜별 요금은 /pricing 페이지에 명시되어 있습니다.
          </li>
          <li>
            <strong>결제 수단</strong>: 신용카드, 체크카드, 계좌이체, 세금계산서 발행 (Stripe · Toss
            Payments 활용).
          </li>
          <li>
            <strong>해지·환불</strong>: 「전자상거래법」 제17조에 따라 결제일로부터 7일 내 청약철회 가능.
            단, 이미 제공된 서비스 분량은 제외.
          </li>
        </ol>
      </section>

      <section>
        <h2>제6조 (회원의 의무)</h2>
        <ol>
          <li>회원은 본 약관 및 관계 법령에서 정한 사항을 준수해야 합니다.</li>
          <li>회원은 다음 행위를 해서는 안 됩니다.</li>
          <ul>
            <li>타인의 정보를 도용하는 행위</li>
            <li>의료법 제27조의2 및 외국인환자 유치 광고 가이드라인 위반</li>
            <li>환자의 동의 없는 의료 정보 제3자 제공</li>
            <li>회사의 서비스를 무단 복제·역공학·재판매하는 행위</li>
            <li>서비스 운영을 방해하는 행위 (대량 자동화 요청, 보안 우회 등)</li>
            <li>음란·폭력·기타 사회 통념에 반하는 콘텐츠 업로드</li>
          </ul>
        </ol>
      </section>

      <section>
        <h2>제7조 (회사의 의무)</h2>
        <ol>
          <li>회사는 관련 법령과 본 약관이 금지·공익에 반하는 행위를 하지 않습니다.</li>
          <li>회사는 회원의 개인정보 보호를 위해 보안시스템을 구축·운영하며, 별도의 개인정보처리방침을
            게시합니다.
          </li>
          <li>회사는 서비스 이용과 관련하여 회원으로부터 제기된 의견이나 불만이 정당하다고 인정하는 경우,
            지체 없이 처리해야 합니다.</li>
        </ol>
      </section>

      <section>
        <h2>제8조 (서비스 제공 및 변경)</h2>
        <ol>
          <li>회사는 연중무휴, 1일 24시간 서비스를 제공함을 원칙으로 합니다.</li>
          <li>
            회사는 시스템 점검, 천재지변, 비상 사태 등 부득이한 경우 서비스 제공을 일시적으로 중단할 수
            있습니다. 이 경우 사전에 공지합니다.
          </li>
          <li>
            회사는 운영상 필요한 경우 서비스의 일부 또는 전부를 변경할 수 있으며, 변경 시 사전에 공지합니다.
          </li>
        </ol>
      </section>

      <section>
        <h2>제9조 (서비스 이용 제한 및 해지)</h2>
        <ol>
          <li>
            회원이 본 약관을 위반하거나 회사의 서비스 운영을 방해하는 경우, 회사는 사전 통지 후 서비스
            이용을 제한하거나 계약을 해지할 수 있습니다.
          </li>
          <li>회원은 언제든지 회원 탈퇴를 통해 이용계약을 해지할 수 있습니다.</li>
          <li>
            계약 해지 시에도 의료법 제22조에 따라 보존이 의무화된 의무기록 등은 법정 기간 동안 보관됩니다.
          </li>
        </ol>
      </section>

      <section>
        <h2>제10조 (저작권 및 콘텐츠의 귀속)</h2>
        <ol>
          <li>서비스 내 회사가 작성한 저작물의 저작권은 회사에 귀속됩니다.</li>
          <li>회원이 입력한 콘텐츠의 저작권은 해당 회원에게 있습니다.</li>
          <li>
            회원은 자신이 게시한 콘텐츠를 회사가 서비스 운영·홍보·개선 목적으로 활용하는 것에 동의합니다
            (단, PII는 제외).
          </li>
        </ol>
      </section>

      <section>
        <h2>제11조 (책임 제한)</h2>
        <ol>
          <li>
            회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 회사의 귀책사유 없이 발생한 손해에
            대해서는 책임을 지지 않습니다.
          </li>
          <li>
            회사는 의료기관·환자·유치업체·파트너업체·프리랜서 간 발생한 분쟁에 대해 중개 역할만 수행하며,
            직접적인 책임을 지지 않습니다.
          </li>
          <li>
            회사는 AI 기반 자동 차트 작성·번역·의도 분류 결과의 정확성에 대해 100% 보장하지 않으며,
            의료기관의 최종 검토 책임이 있음을 명시합니다.
          </li>
          <li>
            회사의 책임이 인정되는 경우에도 손해배상액은 해당 회원이 회사에 지급한 최근 1개월간의 이용
            요금을 초과하지 않습니다.
          </li>
        </ol>
      </section>

      <section>
        <h2>제12조 (분쟁 해결)</h2>
        <ol>
          <li>
            본 약관과 관련된 분쟁은 대한민국 법령에 따라 해결하며, 관할 법원은 「민사소송법」에 따른 법원으로
            합니다.
          </li>
          <li>
            회사와 회원은 서비스 이용 중 발생한 분쟁에 대하여 원만하게 해결하도록 노력하며, 해결되지 않을
            경우 한국소비자원·전자거래분쟁조정위원회 등 분쟁조정기관에 조정을 신청할 수 있습니다.
          </li>
        </ol>
      </section>

      <section>
        <h2>제13조 (기타)</h2>
        <ol>
          <li>본 약관에 명시되지 않은 사항은 관계 법령 및 일반 상관례에 따릅니다.</li>
          <li>본 약관과 관련된 문의는 {SUPPORT_EMAIL}로 연락주십시오.</li>
        </ol>
      </section>

      <section className="not-prose mt-12 rounded-lg border bg-muted/30 p-5 text-xs text-muted-foreground">
        <h3 className="text-sm font-semibold text-foreground">개정 이력</h3>
        <ul className="mt-2 space-y-1 list-disc pl-5">
          <li>2026-05-25: 최초 제정 및 시행</li>
        </ul>
      </section>
    </main>
  );
}
