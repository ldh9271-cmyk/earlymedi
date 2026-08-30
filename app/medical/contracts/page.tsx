import { TicketCheck } from 'lucide-react';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { listContracts } from '@/lib/medical/console-queries';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { formatLocal } from '@/lib/utils/date';
import { signContractAction } from './_actions/contracts';

export const metadata = { title: '계약' };
export const dynamic = 'force-dynamic';

function fmt(d: Date | null): string {
  return d ? formatLocal(new Date(d), 'Asia/Seoul', 'yyyy-MM-dd') : '—';
}

/**
 * 계약 — 유치업체와 우리 병원 사이의 파트너 계약 현황.
 * 활성 계약이 있어야 마켓플레이스 노출·케이스 매칭이 이뤄진다.
 * 우리 측 서명이 비어 있으면 여기서 바로 서명할 수 있다.
 */
export default async function MedicalContractsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const rows = await withRls(ctx, () => listContracts(ctx.orgId));

  const active = rows.filter((r) => r.isActive && !r.terminatedAt).length;
  const waitingMySign = rows.filter((r) => !r.partnerSignedAt && !r.terminatedAt).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">계약</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          유치업체와의 파트너 계약입니다. 양측 서명이 완료되면 활성화되고, 활성 계약이
          있어야 마켓플레이스 노출과 케이스 매칭이 진행됩니다.
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
                    <span className="text-xs text-muted-foreground">해외 성사 수수료율 </span>
                    <span className="font-medium">
                      {(() => {
                        const pct = (r.referralRatePolicyJson as { commissionPct?: number } | null)
                          ?.commissionPct;
                        return typeof pct === 'number' ? `${pct}%` : '협의 중 (10~30%)';
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">에이전시 서명 </span>
                    <span className="font-medium">{r.agencySignedAt ? fmt(r.agencySignedAt) : '대기'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">병원 서명 </span>
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
