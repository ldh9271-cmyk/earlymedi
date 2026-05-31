import { requireAccess } from '@/lib/auth/route-guards';
import { InsightsBody } from '@/components/agency/insights/insights-body';

export const metadata = { title: 'GlowInsight 분석' };

export default async function AgencyInsightsPage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['agency'] });
  return <InsightsBody />;
}
