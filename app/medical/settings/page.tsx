import { requireAccess } from '@/lib/auth/route-guards';
import { MedicalSettingsBody } from '@/components/medical/settings/medical-settings-body';

export const metadata = { title: '의료기관 설정' };

export default async function MedicalSettingsPage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['medical'] });
  return <MedicalSettingsBody />;
}
