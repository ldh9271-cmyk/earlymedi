import Link from 'next/link';

export const metadata = {
  title: '소개',
  description: '글로우업투어(GlowUpTour)는 주식회사 쉐어아트가 운영하는 한국 의료·뷰티 관광 컨시어지 플랫폼입니다.',
};

/**
 * /about — 환자 포털 푸터 "소개" 가 여는 회사·서비스 소개.
 * 운영사(주식회사 쉐어아트)와 브랜드(글로우업투어)를 분명히 적는다 —
 * 전자상거래법 표기 의무이자, 결제·메시징 심사에서 사업자↔브랜드 연결 근거.
 */
export default function AboutPage(): JSX.Element {
  return (
    <main className="prose mx-auto max-w-3xl px-6 py-16">
      <h1>글로우업투어 (GlowUpTour)</h1>
      <p>
        한국에서 놀면서, 예뻐지자. 글로우업투어는 외국인 고객이 한국의 병원·뷰티샵·호텔·맛집·여행을
        한 곳에서 비교하고 예약할 수 있게 돕는 의료·뷰티 관광 컨시어지 플랫폼입니다.
      </p>
      <h2>무엇을 하나요</h2>
      <ul>
        <li>병원·시술 안내 — 전국 의료기관 정보와 글로우 인증 병원의 상세 소개, 진료 시간·의료진·시술 항목</li>
        <li>K-뷰티 — 헤어·메이크업·네일·퍼스널 컬러·프로필 화보 등 뷰티 샵 예약</li>
        <li>여행 — 숙박·맛집·관광지 정보와 AI 여행 일정 추천</li>
        <li>AI 상담 — 한국어·영어·중국어·일본어·러시아어·베트남어 6개 언어로 24시간 안내</li>
        <li>결제·예약 — 인보이스 발행, 카드·간편결제, QR 바우처로 현장 확인</li>
      </ul>
      <h2>파트너와 함께합니다</h2>
      <p>
        병원·뷰티샵·호텔·여행사와 파트너 계약을 맺고 외국인 고객의 모객·예약·통역·정산을 대신합니다.
        파트너 등록과 제휴 문의는 <Link href="/biz">파트너 센터</Link>에서 안내합니다.
      </p>
      <h2>운영 회사</h2>
      <ul>
        <li>상호: 주식회사 쉐어아트 (Shareart Co., Ltd.)</li>
        <li>대표: 문석호</li>
        <li>사업자등록번호: 507-81-16147</li>
        <li>주소: 서울특별시 서초구 서초대로 398 4층 426호</li>
        <li>문의: <a href="mailto:ldh9271@gmail.com">ldh9271@gmail.com</a></li>
      </ul>
      <p>
        <Link href="/kr">글로우업투어 홈으로</Link> · <Link href="/kr/terms">이용약관</Link> ·{' '}
        <Link href="/kr/privacy">개인정보처리방침</Link>
      </p>
    </main>
  );
}
