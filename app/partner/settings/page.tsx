import { requireAccess } from '@/lib/auth/route-guards';
import { PartnerSettingsBody } from '@/components/partner/settings/partner-settings-body';

export const metadata = { title: '비의료 파트너 설정' };

export default async function PartnerSettingsPage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['non_medical'] });
  return <PartnerSettingsBody />;
}
