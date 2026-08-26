// B2B 진입점 — glowuptour.com/biz
//
// 병원·유치업체·파트너·프리랜서용 SaaS 소개(루트 app/page.tsx)를 그대로
// 서빙한다. 원래 earlymedi.vercel.app 루트로만 보이던 페이지를 브랜드
// 도메인 아래(/biz)로 편입한 것 — earlymedi.vercel.app 루트는 이제 이리로
// 리다이렉트된다 (lib/auth/middleware.ts).
export { default } from '../page';

export const metadata = {
  title: 'B2B 파트너 콘솔 — 글로우업투어 · KoreaGlowUp',
  description:
    '병원·유치업체·파트너업체·프리랜서를 위한 의료관광 올인원 플랫폼. 10채널 다국어 상담, AI 차트, 매칭·정산까지.',
};
