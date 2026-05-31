export const metadata = { title: '소개' };

export default function AboutPage(): JSX.Element {
  return (
    <main className="prose mx-auto max-w-3xl px-6 py-16">
      <h1>KoreaGlowUp AI Concierge</h1>
      <p>환자의 첫 문의부터 귀국 후 케어까지, 한 손에서 끝나는 의료관광.</p>
      <p>
        한국 보건복지부 등록 외국인환자 유치업자, 협력 의료기관, 회복호텔·스파·미용실·사진관·식당·교통·관광
        파트너, 그리고 송객·통역·코디·인플루언서 프리랜서를 하나의 플랫폼에서 자동 매칭하고 정산합니다.
      </p>
    </main>
  );
}
