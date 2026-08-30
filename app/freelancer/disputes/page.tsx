import Link from 'next/link';
import { desc, eq, and } from 'drizzle-orm';
import { Gavel } from 'lucide-react';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { freelancerAffiliations } from '@/drizzle/schema/affiliations';
import { freelancerDisputes } from '@/drizzle/schema/freelancer-disputes';
import { organizations } from '@/drizzle/schema/organizations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { formatLocal } from '@/lib/utils/date';
import { createDisputeAction } from './_actions';

export const metadata = { title: '이의 제기' };
export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<string, string> = {
  rate_error: '요율 · 금액 오류',
  missing_case: '케이스 누락',
  payment_delay: '지급 지연',
  other: '기타',
};

const STATUS_META: Record<string, { label: string; variant: 'hospitality' | 'brand' | 'care' | 'destructive' | 'outline' }> = {
  open: { label: '검토 대기', variant: 'hospitality' },
  reviewing: { label: '검토 중', variant: 'brand' },
  resolved: { label: '해결됨', variant: 'care' },
  rejected: { label: '기각', variant: 'outline' },
};

/**
 * 정산 이의 제기 — 커미션 정산 결과에 오류가 의심되면 소속 Agency
 * 앞으로 티켓을 제출하고, 처리 상태를 이 화면에서 추적한다.
 * Agency 쪽은 프리랜서 관리 화면에서 같은 티켓을 보고 검토·회신한다.
 */
export default async function FreelancerDisputesPage({
  searchParams,
}: {
  searchParams: { error?: string; submitted?: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['freelancer'] });

  const { affiliations, disputes } = await withRls(ctx, async () => ({
    affiliations: await db
      .select({
        id: freelancerAffiliations.id,
        agencyName: organizations.name,
      })
      .from(freelancerAffiliations)
      .innerJoin(organizations, eq(organizations.id, freelancerAffiliations.agencyOrgId))
      .where(
        and(
          eq(freelancerAffiliations.freelancerOrgId, ctx.orgId),
          eq(freelancerAffiliations.isActive, true),
        ),
      ),
    disputes: await db
      .select({
        id: freelancerDisputes.id,
        category: freelancerDisputes.category,
        subjectRef: freelancerDisputes.subjectRef,
        description: freelancerDisputes.description,
        status: freelancerDisputes.status,
        resolutionNote: freelancerDisputes.resolutionNote,
        createdAt: freelancerDisputes.createdAt,
        resolvedAt: freelancerDisputes.resolvedAt,
        agencyName: organizations.name,
      })
      .from(freelancerDisputes)
      .leftJoin(organizations, eq(organizations.id, freelancerDisputes.agencyOrgId))
      .where(eq(freelancerDisputes.freelancerOrgId, ctx.orgId))
      .orderBy(desc(freelancerDisputes.createdAt))
      .limit(100),
  }));

  const openCount = disputes.filter((d) => d.status === 'open' || d.status === 'reviewing').length;

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="hospitality" className="mb-2">
          ⚖️ 이의 제기
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">정산 이의 제기</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          커미션 정산 내역에 오류가 의심되거나 정책 적용이 잘못됐다고 판단되면 소속 Agency에
          이의를 제기할 수 있습니다. 제출된 티켓은 Agency의 프리랜서 관리 화면에 표시되고,
          처리 결과가 여기로 돌아옵니다.
        </p>
      </div>

      {searchParams.submitted ? (
        <p className="rounded-lg border border-care-500/30 bg-care-50 px-4 py-2.5 text-sm text-care-700">
          이의 제기가 접수되었습니다 — 아래 이력에서 처리 상태를 확인하세요.
        </p>
      ) : null}
      {searchParams.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          제출에 실패했습니다: {searchParams.error}
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        {[
          ['전체 제출', disputes.length],
          ['처리 중', openCount],
          ['해결됨', disputes.filter((d) => d.status === 'resolved').length],
        ].map(([label, n]) => (
          <Card key={label}>
            <CardContent className="py-4">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-2xl font-bold">{n}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">새 이의 제기</CardTitle>
          <CardDescription className="text-xs">
            문제 거래의 참조(인보이스·케이스 번호)는{' '}
            <Link href="/freelancer/commissions" className="underline">커미션 정산 현황</Link>
            에서 확인할 수 있습니다. 증빙(영수증·계약·메신저 캡처)은 사유에 함께 정리해 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {affiliations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 소속된 Agency가 없습니다 — Agency가 프리랜서 등록(affiliation)을 완료하면
              이의 제기를 제출할 수 있습니다.
            </p>
          ) : (
            <form action={createDisputeAction} className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs">
                <span className="mb-1 block font-medium">대상 Agency *</span>
                <select
                  name="affiliationId"
                  required
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">선택…</option>
                  {affiliations.map((a) => (
                    <option key={a.id} value={a.id}>{a.agencyName}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-medium">유형 *</span>
                <select
                  name="category"
                  required
                  defaultValue="rate_error"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs sm:col-span-2">
                <span className="mb-1 block font-medium">문제 거래 참조 (인보이스·케이스 번호)</span>
                <input
                  name="subjectRef"
                  maxLength={120}
                  placeholder="예: INV-2026-0831-001"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
              <label className="text-xs sm:col-span-2">
                <span className="mb-1 block font-medium">사유 · 상세 내용 * (10자 이상)</span>
                <textarea
                  name="description"
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={4}
                  placeholder="어떤 거래의 어떤 부분이 잘못됐는지, 기대한 금액과 실제 금액을 함께 적어 주세요."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <div className="sm:col-span-2">
                <Button type="submit" variant="brand" size="sm">이의 제기 제출</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-bold">제출 이력</h2>
        {disputes.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
            <Gavel className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
            <p>이의 제기 이력이 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {disputes.map((d) => {
              const meta = STATUS_META[d.status] ?? { label: d.status, variant: 'outline' as const };
              return (
                <Card key={d.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      <span className="text-sm font-semibold">{CATEGORY_LABEL[d.category] ?? d.category}</span>
                      {d.subjectRef ? (
                        <code className="font-mono text-[11px] text-muted-foreground">{d.subjectRef}</code>
                      ) : null}
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {d.agencyName ?? 'Agency'} · {formatLocal(new Date(d.createdAt), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">{d.description}</p>
                    {d.resolutionNote ? (
                      <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
                        <span className="font-semibold">Agency 회신</span>
                        {d.resolvedAt
                          ? ` (${formatLocal(new Date(d.resolvedAt), 'Asia/Seoul', 'yyyy-MM-dd')})`
                          : ''}
                        : {d.resolutionNote}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
