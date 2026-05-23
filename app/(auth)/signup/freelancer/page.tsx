import { FreelancerSignupWizard } from './_components/wizard';

export const metadata = { title: '프리랜서 가입' };

export default function FreelancerSignupPage({
  searchParams,
}: {
  searchParams: { invite?: string; agency?: string };
}): JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">프리랜서 가입</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          송객 · 통역 · 코디 · 인플루언서 활동을 시작하세요.
        </p>
      </div>
      <FreelancerSignupWizard inviteToken={searchParams.invite} agencyHint={searchParams.agency} />
    </div>
  );
}
