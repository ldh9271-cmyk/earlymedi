import { requireAccess } from '@/lib/auth/route-guards';
import { FreelancerSettingsBody } from '@/components/freelancer/settings/freelancer-settings-body';

export const metadata = { title: '프리랜서 설정' };

export default async function FreelancerSettingsPage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['freelancer'] });
  return <FreelancerSettingsBody />;
}
