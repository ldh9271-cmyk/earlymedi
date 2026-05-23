export const metadata = { title: '개인정보처리방침' };

export default function PrivacyPage(): JSX.Element {
  return (
    <main className="prose mx-auto max-w-3xl px-6 py-16">
      <h1>개인정보처리방침</h1>
      <p>
        EarlyMedi AI Concierge는 환자 PII(여권·외국인등록번호·보험 등)를 컬럼 단위로 암호화하며,
        의무기록은 10년간 보존합니다. 환자 동의 없이 의료기관에 PII를 전송하지 않습니다.
      </p>
      <p>상세 정책은 정식 출시 전 게시됩니다.</p>
    </main>
  );
}
