import { requireAccess } from '@/lib/auth/route-guards';
import { Badge } from '@/components/shared/ui/badge';
import { listFreelancerAffiliationsAction } from '@/lib/agency/freelancer-invites-actions';
import { FreelancersClient } from './_components/freelancers-client';

export const metadata = { title: '프리랜서 (송객·통역·코디)' };
export const dynamic = 'force-dynamic';

/**
 * Agency-side freelancer roster. Two sections:
 *   - 활성 협력 프리랜서 (freelancer_affiliations rows)
 *   - 발송 대기 중 초대 (invites with intendedAccountType='freelancer'
 *     awaiting acceptance)
 *
 * "프리랜서 초대" button opens a modal that generates a unique
 * referral_code, persists an invite row, and surfaces the shareable
 * URL the operator emails to the freelancer.
 */
export default async function AgencyFreelancersPage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['agency'] });

  let active: Awaited<ReturnType<typeof listFreelancerAffiliationsAction>>['active'] = [];
  let pendingInvites: Awaited<
    ReturnType<typeof listFreelancerAffiliationsAction>
  >['pendingInvites'] = [];
  let dbError: string | null = null;
  try {
    const data = await listFreelancerAffiliationsAction();
    active = data.active;
    pendingInvites = data.pendingInvites;
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'unknown DB error';
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="brand" className="mb-2">
          🤝 프리랜서 협력
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">프리랜서 (송객·통역·코디)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          외부 프리랜서(송객·통역·코디·인플루언서)를 초대해 협력 관계를 만드세요. 초대받은
          프리랜서는 자신의 조직을 별도로 만들고, 발급된 referral code로 들어온 환자가 자동으로
          정산 추적됩니다. 같은 회사 직원 초대는{' '}
          <a href="/agency/team" className="font-medium underline">팀원 관리</a>
          를 이용하세요.
        </p>
      </div>

      {dbError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          DB 조회 실패: {dbError}
        </div>
      ) : null}

      <FreelancersClient
        initialActive={active}
        initialPending={pendingInvites}
      />
    </div>
  );
}
