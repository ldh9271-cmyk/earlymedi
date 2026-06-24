import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';

export const metadata = { title: '개인정보처리방침 · KoreaGlowUp' };
export const dynamic = 'force-dynamic';

/**
 * Privacy Policy — patient-facing portal at /[locale]/privacy.
 *
 * Korean primary copy; certified multi-lingual versions land in a
 * follow-up. The structure follows the KISA personal-data-handling
 * notice template (수집 항목 / 목적 / 보유 기간 / 제3자 제공 / 위탁
 * / 이용자 권리 / 보호 책임자 등).
 */
export default function PrivacyPage({
  params,
}: {
  params: { locale: PublicLocale };
}): JSX.Element {
  const isKr = params.locale === 'kr';
  return (
    <article
      style={{
        maxWidth: 760, margin: '0 auto',
        padding: '40px 24px 80px',
        color: '#222',
        fontFamily: "'Inter', 'Pretendard Variable', system-ui, sans-serif",
        lineHeight: 1.65,
      }}
    >
      <Link
        href={`/${params.locale}/signup`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          color: '#6a6a6a', fontSize: 13, textDecoration: 'none',
          marginBottom: 16,
        }}
      >
        ← 가입으로 돌아가기
      </Link>

      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', margin: '8px 0 4px' }}>
        개인정보처리방침
      </h1>
      <p style={{ fontSize: 13, color: '#6a6a6a', margin: 0 }}>
        시행일: 2026년 1월 1일 · 최근 개정: 2026년 6월 24일
      </p>

      {!isKr ? (
        <div
          style={{
            margin: '20px 0',
            border: '1px solid #fef3c7', background: '#fffbeb',
            borderRadius: 10, padding: '10px 14px',
            fontSize: 13, color: '#92400e',
          }}
        >
          본 페이지는 한국어 원문이 우선합니다. 번역본 준비 전까지는 한국어 원문 기준으로 해석됩니다.
        </div>
      ) : null}

      <Section title="1. 총칙">
        KoreaGlowUp(이하 “회사”)은 「개인정보 보호법」 및 「의료 해외진출 및 외국인환자 유치 지원에 관한 법률」
        등 관련 법령을 준수하며, 이용자의 개인정보를 안전하게 처리하기 위해 본 방침을 수립 · 공개합니다.
      </Section>

      <Section title="2. 수집하는 개인정보 항목">
        <ul style={listStyle}>
          <li><strong>가입 시 (필수):</strong> 이메일, 비밀번호(암호화 저장), 이름, 국가, 전화번호</li>
          <li><strong>가입 시 (선택):</strong> 메신저 종류 및 ID(KakaoTalk / WhatsApp / LINE / WeChat 등)</li>
          <li><strong>문의 · 예약 시:</strong> 관심 시술 카테고리, 희망 일정, 자유 입력 메모, 첨부 이미지(선택)</li>
          <li><strong>자동 수집:</strong> 접속 IP, 브라우저 정보, 쿠키, 서비스 이용 기록, 페이지 진입 시각</li>
          <li><strong>결제 시 (해당 시):</strong> 결제 수단(카드 마스킹), 결제 금액, 결제 통화 — 카드 원번호는 PG사가 직접 처리하며 회사는 저장하지 않습니다.</li>
        </ul>
      </Section>

      <Section title="3. 개인정보의 수집 · 이용 목적">
        <ol style={listStyle}>
          <li>회원 가입 및 본인 확인</li>
          <li>서비스 제공(상품 추천, 예약 중개, 통역 컨시어지, 결제 처리)</li>
          <li>의료기관 · 파트너업체와의 예약 · 진료 · 후속 케어 매개</li>
          <li>고객 문의 응대, 분쟁 조정, 검수 및 부정 이용 방지</li>
          <li>법령상 의무 이행(KOIHA 외국인환자 유치 통계 보고 등)</li>
        </ol>
      </Section>

      <Section title="4. 개인정보의 보유 · 이용 기간">
        <ul style={listStyle}>
          <li>회원 정보: 회원 탈퇴 시까지 (탈퇴 후 30일 내 파기)</li>
          <li>결제 기록: 「전자상거래법」에 따라 5년 보관</li>
          <li>접속 로그 · IP: 「통신비밀보호법」에 따라 3개월 보관</li>
          <li>외국인환자 유치 관련 자료: 「의료해외진출법」에 따라 5년 보관</li>
          <li>분쟁 처리 기록: 「전자상거래법」에 따라 3년 보관</li>
        </ul>
      </Section>

      <Section title="5. 개인정보의 제3자 제공">
        <ol style={listStyle}>
          <li>회사는 원칙적으로 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다.</li>
          <li>예외적으로 다음의 경우 필요한 최소한의 정보를 제공합니다.
            <ul style={{ ...listStyle, marginTop: 6 }}>
              <li>예약을 신청한 의료기관 · 파트너업체: 이름, 국가, 연락 수단, 시술/상품 정보, 희망 일정</li>
              <li>법령에 따른 수사기관 · 보건복지부 등의 정당한 요청</li>
            </ul>
          </li>
        </ol>
      </Section>

      <Section title="6. 개인정보 처리의 위탁">
        회사는 서비스 운영을 위해 다음 업무를 외부에 위탁할 수 있으며, 위탁 시 「개인정보 보호법」에
        따라 안전한 관리를 위한 계약을 체결합니다.
        <ul style={listStyle}>
          <li>클라우드 인프라: Vercel Inc., Supabase Inc.</li>
          <li>AI 번역 · 분석: Google Cloud(Gemini), OpenAI</li>
          <li>메신저 채널 연동: Kakao, LINE, Meta, Naver, WeChat</li>
          <li>결제 처리: 국내외 PG사(예약 확정 단계에서 명시)</li>
        </ul>
      </Section>

      <Section title="7. 이용자의 권리와 행사 방법">
        <ol style={listStyle}>
          <li>이용자는 언제든지 본인의 개인정보를 조회 · 수정 · 삭제 · 처리정지를 요청할 수 있습니다.</li>
          <li>회원 탈퇴는 계정 설정 페이지에서 직접 진행하거나 아래 보호 책임자 연락처로 요청하실 수 있습니다.</li>
          <li>법정대리인을 통한 14세 미만 아동의 정보 처리는 별도 동의를 받습니다(현재 만 14세 이상만 가입 가능).</li>
        </ol>
      </Section>

      <Section title="8. 쿠키의 사용">
        회사는 서비스 이용 편의성 향상을 위해 쿠키를 사용합니다. 이용자는 브라우저 설정에서
        쿠키 저장을 거부할 수 있으나, 일부 기능(자동 로그인, 언어 설정 등)이 제한될 수 있습니다.
      </Section>

      <Section title="9. 개인정보의 안전성 확보 조치">
        <ul style={listStyle}>
          <li>비밀번호 단방향 암호화 저장</li>
          <li>저장 데이터 및 전송 구간 암호화(TLS 1.2 이상)</li>
          <li>접근 권한 최소화 및 접근 로그 모니터링</li>
          <li>주기적 보안 점검 및 침해 대응 절차 운영</li>
        </ul>
      </Section>

      <Section title="10. 개인정보 보호 책임자">
        <ul style={listStyle}>
          <li>이름: KoreaGlowUp 개인정보 보호 책임자</li>
          <li>이메일: privacy@koreaglowup.ai</li>
          <li>운영 시간: 평일 09:00 – 18:00 (KST)</li>
        </ul>
      </Section>

      <Section title="11. 개정 이력">
        본 방침은 법령 또는 서비스 정책 변경에 따라 개정될 수 있으며, 변경 시 시행일 7일 전 서비스 내
        공지 또는 가입 이메일로 통지합니다.
      </Section>

      <p style={{ fontSize: 12, color: '#9c9c9c', marginTop: 40 }}>
        부칙: 본 방침은 2026년 1월 1일부터 시행합니다.
      </p>
    </article>
  );
}

const listStyle: React.CSSProperties = {
  paddingLeft: 18,
  margin: '8px 0 0',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>{title}</h2>
      <div style={{ fontSize: 14, color: '#3f3f3f' }}>{children}</div>
    </section>
  );
}
