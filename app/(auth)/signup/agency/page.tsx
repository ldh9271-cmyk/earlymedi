import { AgencySignupWizard } from './_components/wizard';

export const metadata = { title: '유치업체 가입' };

export default function AgencySignupPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">유치업체 가입</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          한국 보건복지부 등록 외국인환자 유치업자 인증을 위해 다음 서류가 필요합니다.
        </p>
      </div>
      <AgencySignupWizard />
    </div>
  );
}
