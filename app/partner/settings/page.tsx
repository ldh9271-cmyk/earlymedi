import { requireAccess } from '@/lib/auth/route-guards';
import { PartnerSettingsBody } from '@/components/partner/settings/partner-settings-body';

export const metadata = { title: '파트너업체 설정' };

export default async function PartnerSettingsPage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['non_medical'] });
  return <PartnerSettingsBody />;
}
