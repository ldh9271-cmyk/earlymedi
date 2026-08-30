import { desc, eq } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { freelancerDisputes } from '@/drizzle/schema/freelancer-disputes';
import { organizations } from '@/drizzle/schema/organizations';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import { formatLocal } from '@/lib/utils/date';
import { listFreelancerAffiliationsAction } from '@/lib/agency/freelancer-invites-actions';
import { FreelancersClient } from './_components/freelancers-client';
import { resolveDisputeAction } from './_dispute-actions';

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
export default async function AgencyFreelancersPage({
  searchParams,
}: {
  searchParams: { error?: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });

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

  // 프리랜서가 제출한 정산 이의 제기 — 처리 전(open·reviewing) 티켓 우선
  let disputes: Array<{
    id: string;
    category: string;
    subjectRef: string | null;
    description: string;
    status: string;
    resolutionNote: string | null;
    createdAt: Date;
    freelancerName: string | null;
  }> = [];
  try {
    disputes = await withRls(ctx, () =>
      db
        .select({
          id: freelancerDisputes.id,
          category: freelancerDisputes.category,
          subjectRef: freelancerDisputes.subjectRef,
          description: freelancerDisputes.description,
          status: freelancerDisputes.status,
          resolutionNote: freelancerDisputes.resolutionNote,
          createdAt: freelancerDisputes.createdAt,
          freelancerName: organizations.name,
        })
        .from(freelancerDisputes)
        .leftJoin(organizations, eq(organizations.id, freelancerDisputes.freelancerOrgId))
        .where(eq(freelancerDisputes.agencyOrgId, ctx.orgId))
        .orderBy(desc(freelancerDisputes.createdAt))
        .limit(50),
    );
  } catch {
    /* 이의 제기 조회 실패는 명단 표시를 막지 않는다 */
  }
  const openDisputes = disputes.filter((d) => d.status === 'open' || d.status === 'reviewing');

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

      {searchParams.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          이의 제기 처리 실패: {searchParams.error}
        </div>
      ) : null}

      <FreelancersClient
        initialActive={active}
        initialPending={pendingInvites}
      />

      {disputes.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-bold">
            정산 이의 제기{' '}
            {openDisputes.length > 0 ? (
              <Badge variant="hospitality" className="ml-1 align-middle">처리 대기 {openDisputes.length}</Badge>
            ) : null}
          </h2>
          <div className="grid gap-3">
            {disputes.map((d) => {
              const statusMeta: Record<string, { label: string; variant: 'hospitality' | 'brand' | 'care' | 'outline' }> = {
                open: { label: '검토 대기', variant: 'hospitality' },
                reviewing: { label: '검토 중', variant: 'brand' },
                resolved: { label: '해결됨', variant: 'care' },
                rejected: { label: '기각', variant: 'outline' },
              };
              const meta = statusMeta[d.status] ?? { label: d.status, variant: 'outline' as const };
              const categoryLabel: Record<string, string> = {
                rate_error: '요율 · 금액 오류',
                missing_case: '케이스 누락',
                payment_delay: '지급 지연',
                other: '기타',
              };
              const actionable = d.status === 'open' || d.status === 'reviewing';
              return (
                <Card key={d.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      <span className="text-sm font-semibold">{d.freelancerName ?? '프리랜서'}</span>
                      <span className="text-xs text-muted-foreground">{categoryLabel[d.category] ?? d.category}</span>
                      {d.subjectRef ? (
                        <code className="font-mono text-[11px] text-muted-foreground">{d.subjectRef}</code>
                      ) : null}
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {formatLocal(new Date(d.createdAt), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">{d.description}</p>
                    {d.resolutionNote ? (
                      <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
                        회신: {d.resolutionNote}
                      </div>
                    ) : null}
                    {actionable ? (
                      <form action={resolveDisputeAction} className="flex flex-wrap items-center gap-2 pt-1">
                        <input type="hidden" name="id" value={d.id} />
                        <input
                          name="note"
                          maxLength={2000}
                          placeholder="회신 메모 (해결·기각 시 프리랜서에게 표시)"
                          className="h-8 w-72 max-w-full rounded-md border border-input bg-background px-2 text-xs"
                        />
                        {d.status === 'open' ? (
                          <Button type="submit" name="next" value="reviewing" variant="outline" size="sm">
                            검토 시작
                          </Button>
                        ) : null}
                        <Button type="submit" name="next" value="resolved" variant="brand" size="sm">
                          해결 처리
                        </Button>
                        <Button type="submit" name="next" value="rejected" variant="outline" size="sm">
                          기각
                        </Button>
                      </form>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
