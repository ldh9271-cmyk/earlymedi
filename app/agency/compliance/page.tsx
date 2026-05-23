import { requireAccess } from '@/lib/auth/route-guards';
import { ComplianceBody } from '@/components/agency/compliance/compliance-body';

export const metadata = { title: 'KOIHA · 광고 규제' };

export default async function AgencyCompliancePage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['agency'] });
  return <ComplianceBody />;
}
