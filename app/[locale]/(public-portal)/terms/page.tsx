import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';

export const metadata = { title: '이용약관 · KoreaGlowUp' };
export const dynamic = 'force-dynamic';

/**
 * Terms of Service — patient-facing portal at /[locale]/terms.
 *
 * Korean primary copy (matches the platform's home market and the
 * KOIHA / 외국인환자 유치 광고 가이드라인). Other locales reuse the
 * same content for now with a "한국어 원문 기준" notice; certified
 * translations land in a follow-up when legal review is finalized.
 */
export default function TermsPage({
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
        이용약관
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

      <Section title="제1조 (목적)">
        본 약관은 KoreaGlowUp(이하 “회사”)이 운영하는 글로우업 의료관광 플랫폼(이하
        “서비스”)의 이용과 관련하여 회사와 게스트 회원(이하 “이용자”) 간의 권리,
        의무, 책임사항 및 서비스 이용 절차를 규정함을 목적으로 합니다.
      </Section>

      <Section title="제2조 (정의)">
        <ol style={listStyle}>
          <li><strong>서비스</strong>란 회사가 제공하는 의료기관 · 미용 · 호텔 · 음식점 · K-팝 투어 등 관광 콘텐츠 예약 중개와 1:1 통역 컨시어지를 통칭합니다.</li>
          <li><strong>이용자</strong>란 본 약관에 동의하고 회사가 제공하는 서비스를 이용하는 자를 말합니다.</li>
          <li><strong>의료기관 · 파트너업체</strong>란 회사와 별도 계약을 체결하고 서비스를 통해 자신의 상품 또는 시술을 제공하는 제3자를 말합니다.</li>
          <li><strong>유치업체</strong>란 「의료 해외진출 및 외국인환자 유치 지원에 관한 법률」에 따라 외국인환자 유치업으로 등록된 사업자를 말합니다.</li>
        </ol>
      </Section>

      <Section title="제3조 (약관의 효력 및 변경)">
        <ol style={listStyle}>
          <li>본 약관은 이용자가 회원가입 시 동의함으로써 효력이 발생합니다.</li>
          <li>회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경 시 사전에 서비스 내 공지 또는 가입 시 등록한 이메일로 통지합니다.</li>
          <li>이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 회원 탈퇴를 요청할 수 있습니다.</li>
        </ol>
      </Section>

      <Section title="제4조 (서비스의 내용)">
        <ol style={listStyle}>
          <li>회사는 의료기관·유치업체·파트너업체가 등록한 상품(시술·코스·호텔·식당·뷰티 프로그램 등)을 검색, 비교, 예약 문의할 수 있는 플랫폼을 제공합니다.</li>
          <li>회사는 직접 의료행위를 수행하지 않으며, 실제 진료 · 시술은 해당 의료기관이 자신의 책임으로 이행합니다.</li>
          <li>회사는 24시간 다국어(한국어 · 영어 · 중국어 · 일본어 · 러시아어 · 베트남어) AI 통역과 컨시어지를 제공합니다.</li>
        </ol>
      </Section>

      <Section title="제5조 (계정 및 보안)">
        <ol style={listStyle}>
          <li>이용자는 본인의 정확한 정보로 가입해야 하며, 타인의 정보를 도용하거나 허위로 기재해서는 안 됩니다.</li>
          <li>이용자는 본인의 계정 정보(아이디 · 비밀번호 · 메신저 ID)를 안전하게 관리할 책임을 집니다.</li>
          <li>계정 도용이 의심되는 경우 즉시 회사에 통지하고 비밀번호를 변경해야 합니다.</li>
        </ol>
      </Section>

      <Section title="제6조 (예약 · 결제 · 취소)">
        <ol style={listStyle}>
          <li>예약은 이용자의 문의 접수 후 회사 또는 해당 의료기관 · 파트너의 확정 통지로 성립합니다.</li>
          <li>결제 수단, 통화, 환율, 부가가치세, 예약금 정책은 상품별로 상이할 수 있으며 예약 확정 단계에서 명시됩니다.</li>
          <li>예약 취소 · 환불 정책은 의료기관 또는 파트너의 정책에 따르며, 시술 직전 취소 · 노쇼에 대해서는 위약금이 부과될 수 있습니다.</li>
          <li>의료적 사유 · 천재지변 등 불가항력으로 인한 취소는 별도 환불 정책이 적용됩니다.</li>
        </ol>
      </Section>

      <Section title="제7조 (이용자의 의무)">
        이용자는 다음 행위를 해서는 안 됩니다.
        <ol style={listStyle}>
          <li>허위 정보 등록, 타인 명의 도용, 결제 정보 위변조</li>
          <li>의료기관 · 파트너 · 다른 이용자에 대한 위협, 모욕, 명예훼손</li>
          <li>서비스 운영을 방해하거나 자동화 도구로 데이터를 무단 수집하는 행위</li>
          <li>지적재산권을 침해하거나 회사 또는 제3자의 권리를 침해하는 행위</li>
        </ol>
      </Section>

      <Section title="제8조 (책임의 제한)">
        <ol style={listStyle}>
          <li>회사는 의료기관 · 파트너의 실제 의료행위 · 서비스 품질에 대해 직접적 의료적 책임을 부담하지 않습니다. 다만 플랫폼 운영자로서 등록 정보의 정확성, 분쟁 조정 협조, 검수 절차 운영에 책임을 집니다.</li>
          <li>회사는 천재지변, 정전, 네트워크 장애 등 회사의 합리적 통제 범위를 벗어난 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
          <li>이용자의 부주의로 인한 계정 도용 · 비밀번호 유출에 대해 회사는 책임을 부담하지 않습니다.</li>
        </ol>
      </Section>

      <Section title="제9조 (지적재산권)">
        서비스 내 콘텐츠 · 디자인 · 상표 · 코드는 회사 또는 정당한 권리자에게 귀속됩니다.
        이용자는 회사의 사전 동의 없이 이를 복제, 배포, 2차 가공할 수 없습니다.
      </Section>

      <Section title="제10조 (분쟁 해결 및 준거법)">
        <ol style={listStyle}>
          <li>본 약관은 대한민국 법률에 따라 해석됩니다.</li>
          <li>회사와 이용자 간 분쟁은 우선 협의로 해결하며, 협의가 이루어지지 않을 경우 서울중앙지방법원을 제1심 관할 법원으로 합니다.</li>
        </ol>
      </Section>

      <Section title="제11조 (문의)">
        본 약관에 관한 문의는 다음 연락처로 접수해 주시기 바랍니다.
        <ul style={listStyle}>
          <li>이메일: support@koreaglowup.ai</li>
          <li>운영 시간: 평일 09:00 – 18:00 (KST)</li>
        </ul>
      </Section>

      <p style={{ fontSize: 12, color: '#9c9c9c', marginTop: 40 }}>
        부칙: 본 약관은 2026년 1월 1일부터 시행합니다.
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
