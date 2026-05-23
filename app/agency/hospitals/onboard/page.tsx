import { requireAccess } from '@/lib/auth/route-guards';
import { HospitalOnboardingWizard } from '@/components/agency/hospitals/onboarding-wizard';

export const metadata = { title: '병원 등록 위저드' };

export default async function HospitalOnboardingPage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['agency'] });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">신규 협력 병원 등록</h1>
        <p className="text-sm text-muted-foreground">
          기본 정보 → 등록증 → 송객 수수료 정책 → 예약금 정책 → 시술 차트 운영 방식 → 정산 주기 →
          계약 전자서명 → 활성화. 7단계 모두 완료 전까지는 매칭에서 제외됩니다.
        </p>
      </div>
      <HospitalOnboardingWizard />
    </div>
  );
}
