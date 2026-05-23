import { requireAccess } from '@/lib/auth/route-guards';
import { NewPatientFlow } from '@/components/agency/patients/new-patient-flow';

export const metadata = { title: '환자 등록 · 여권 OCR' };

export default async function NewPatientPage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['agency'] });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">환자 등록</h1>
        <p className="text-sm text-muted-foreground">
          여권을 업로드해 자동 입력 → 검토 후 저장. 모든 PII는 저장 시 자동 암호화됩니다.
        </p>
      </div>
      <NewPatientFlow />
    </div>
  );
}
