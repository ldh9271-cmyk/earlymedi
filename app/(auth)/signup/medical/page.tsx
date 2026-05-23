import { MedicalSignupWizard } from './_components/wizard';

export const metadata = { title: '의료기관 가입' };

export default function MedicalSignupPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">의료기관 가입</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          외국인환자 유치 의료기관 등록 + 충전식 사용량 결제 활성화
        </p>
      </div>
      <MedicalSignupWizard />
    </div>
  );
}
