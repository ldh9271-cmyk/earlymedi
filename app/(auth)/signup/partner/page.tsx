import { PartnerSignupWizard } from './_components/wizard';

export const metadata = { title: '비의료 파트너 가입' };

export default function PartnerSignupPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">비의료 파트너 가입</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          호텔 · 스파 · 살롱 · 식당 · 교통 · 관광 등 환자 동선상의 모든 서비스 파트너
        </p>
      </div>
      <PartnerSignupWizard />
    </div>
  );
}
