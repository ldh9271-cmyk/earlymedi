import { TicketCheck } from 'lucide-react';
import { desc, eq } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { partnerContracts } from '@/drizzle/schema/contracts';
import { organizations } from '@/drizzle/schema/organizations';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { formatLocal } from '@/lib/utils/date';
import { signContractAction } from './_actions';

export const metadata = { title: '계약' };
export const dynamic = 'force-dynamic';

function fmt(d: Date | null): string {
  return d ? formatLocal(new Date(d), 'Asia/Seoul', 'yyyy-MM-dd') : '—';
}

/**
 * 계약 — 유치업체(에이전시)와 우리 업체 사이의 송객·수수료 계약 현황.
 * 의료기관 콘솔의 계약 화면과 같은 골격 (partner_contracts 를 공유,
 * RLS contracts_visible + org_counterparty_read 로 상대명까지 보인다).
 * 활성 계약이 있어야 에이전시 패키지 빌더 노출·송객이 이뤄진다.
 */
export default async function PartnerContractsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  const rows = await withRls(ctx, () =>
    db
      .select({
        id: partnerContracts.id,
        agencyName: organizations.name,
        referralRatePolicyJson: partnerContracts.referralRatePolicyJson,
        isActive: partnerContracts.isActive,
        agencySignedAt: partnerContracts.agencySignedAt,
        partnerSignedAt: partnerContracts.partnerSignedAt,
        effectiveFrom: partnerContracts.effectiveFrom,
        effectiveUntil: partnerContracts.effectiveUntil,
        terminatedAt: partnerContracts.terminatedAt,
        contractPdfUrl: partnerContracts.contractPdfUrl,
        notes: partnerContracts.notes,
        createdAt: partnerContracts.createdAt,
      })
      .from(partnerContracts)
      .leftJoin(organizations, eq(organizations.id, partnerContracts.agencyOrgId))
      .where(eq(partnerContracts.partnerOrgId, ctx.orgId))
      .orderBy(desc(partnerContracts.createdAt))
      .limit(100),
  );

  const active = rows.filter((r) => r.isActive && !r.terminatedAt).length;
  const waitingMySign = rows.filter((r) => !r.partnerSignedAt && !r.terminatedAt).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">계약</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          유치업체와의 송객·수수료 계약입니다. 양측 서명이 완료되면 활성화되고, 활성 계약이
          있어야 에이전시 패키지 구성에 우리 시설·서비스가 들어갑니다.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ['전체 계약', rows.length],
          ['활성 계약', active],
          ['내 서명 대기', waitingMySign],
        ].map(([label, n]) => (
          <Card key={label}>
            <CardContent className="py-4">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-2xl font-bold">{n}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={TicketCheck}
              title="아직 체결된 계약이 없습니다"
              description="협력할 유치업체가 계약을 개설하면 여기에 표시됩니다. 글로우업투어 담당 매니저를 통해 계약 개설을 요청할 수 있습니다."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => {
            const status = r.terminatedAt
              ? { label: '해지됨', variant: 'outline' as const }
              : r.isActive
                ? { label: '활성', variant: 'care' as const }
                : { label: '서명 대기', variant: 'hospitality' as const };
            const pct = (r.referralRatePolicyJson as { commissionPct?: number } | null)?.commissionPct;
            return (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{r.agencyName ?? '에이전시'}</CardTitle>
                    <CardDescription className="text-xs">
                      개설 {fmt(r.createdAt)} · 발효 {fmt(r.effectiveFrom)}
                      {r.effectiveUntil ? ` ~ ${fmt(r.effectiveUntil)}` : ''}
                    </CardDescription>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-0 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">송객 수수료율 </span>
                    <span className="font-medium">
                      {typeof pct === 'number' ? `${pct}%` : '협의 중'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">에이전시 서명 </span>
                    <span className="font-medium">{r.agencySignedAt ? fmt(r.agencySignedAt) : '대기'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">우리 서명 </span>
                    <span className="font-medium">{r.partnerSignedAt ? fmt(r.partnerSignedAt) : '대기'}</span>
                  </div>
                  {r.contractPdfUrl ? (
                    <a
                      href={r.contractPdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline underline-offset-2"
                    >
                      계약서 PDF
                    </a>
                  ) : null}
                  {r.notes ? <div className="w-full text-xs text-muted-foreground">{r.notes}</div> : null}
                  {!r.partnerSignedAt && !r.terminatedAt ? (
                    <form action={signContractAction} className="ml-auto">
                      <input type="hidden" name="contractId" value={r.id} />
                      <Button type="submit" variant="brand" size="sm">
                        계약 서명
                      </Button>
                    </form>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
