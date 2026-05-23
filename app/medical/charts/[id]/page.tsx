import { notFound } from 'next/navigation';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { getChart } from '@/lib/db/repositories/treatment-charts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { formatLocal } from '@/lib/utils/date';
import { ChartComposer } from '@/components/medical/charts/chart-composer';
import { ChartActions } from '@/components/medical/charts/chart-actions';
import { describeVariance } from '@/lib/clinical/quote-vs-chart-diff';

export const metadata = { title: '시술 차트 상세' };

const STATUS_LABEL: Record<string, string> = {
  draft: '작성 중',
  submitted: '제출됨 — 에이전시 대기',
  agency_review: '에이전시 검토 중',
  changes_requested: '수정 요청 받음',
  agency_approved: '에이전시 승인됨',
  patient_shared: '환자 공유 중',
  finalized: '확정 (수정 불가)',
  voided: '취소됨',
};

const STATUS_VARIANT: Record<string, 'brand' | 'hospitality' | 'care' | 'outline' | 'destructive'> = {
  draft: 'outline',
  submitted: 'brand',
  agency_review: 'brand',
  changes_requested: 'hospitality',
  agency_approved: 'care',
  patient_shared: 'care',
  finalized: 'care',
  voided: 'destructive',
};

export default async function ChartDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical', 'agency'] });
  const data = await withRls(ctx, () => getChart(ctx.orgId, params.id));
  if (!data) notFound();
  const { chart, items, revisions, approvals } = data;

  const variance =
    chart.quoteTotalKrw && chart.quoteTotalKrw > 0 && chart.quoteVarianceBp !== null
      ? describeVariance({
          bp: chart.quoteVarianceBp,
          flag: (chart.quoteVarianceFlag ?? 'manager') as 'auto' | 'manager' | 'patient_reconsent',
          overcharge: chart.quoteVarianceBp > 0,
        })
      : null;

  const signedRoles = new Set(approvals.map((a) => a.role));
  const editable = chart.status === 'draft' || chart.status === 'changes_requested';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">v{chart.versionNumber} · {chart.id.slice(0, 8)}</div>
          <h1 className="text-2xl font-bold tracking-tight">
            시술 차트 — {chart.treatmentDate}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={STATUS_VARIANT[chart.status] ?? 'outline'}>
              {STATUS_LABEL[chart.status] ?? chart.status}
            </Badge>
            {chart.doctorName ? <span>· {chart.doctorName}</span> : null}
            {variance ? (
              <span className="rounded-full bg-hospitality-50 px-2 py-0.5 font-medium text-hospitality-700">
                견적 대비 {variance}
              </span>
            ) : null}
            <span>· 최종 수정 {formatLocal(new Date(chart.updatedAt), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')}</span>
          </div>
        </div>
        <ChartActions
          chartId={chart.id}
          accountType={ctx.accountType}
          status={chart.status}
          signedRoles={Array.from(signedRoles)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">라인 항목</CardTitle>
              <CardDescription>합계는 라인 변경 시 자동 재계산됩니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartComposer
                chartId={chart.id}
                editable={editable && ctx.accountType === 'medical'}
                initialItems={items.map((it) => ({
                  lineNumber: it.lineNumber,
                  itemKind: it.itemKind,
                  procedureNameNormalized: it.procedureNameNormalized,
                  bodyPart: it.bodyPart,
                  quantity: it.quantity,
                  unitPriceKrw: it.unitPriceKrw,
                  lineTotalKrw: it.lineTotalKrw,
                  vatIncluded: it.vatIncluded,
                  vatRateBp: it.vatRateBp,
                  vatTreatment: it.vatTreatment,
                  isAddon: it.isAddon,
                  discountKrw: it.discountKrw,
                  confidenceBp: it.confidenceBp,
                  aiNotes: it.aiNotes,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">합계</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <TotalRow label="소계" value={chart.subtotalKrw} />
              <TotalRow label="할인 합계" value={-chart.discountTotalKrw} />
              <TotalRow label="부가세 합계" value={chart.vatTotalKrw} />
              <div className="my-2 border-t border-dashed" />
              <TotalRow label="총액" value={chart.grandTotalKrw} bold />
              <TotalRow label="예약금 차감" value={-chart.depositReceivedKrw} />
              <TotalRow label="환자 잔금" value={chart.patientBalanceKrw} bold />
              {chart.referralFeeTotalKrw !== null && ctx.accountType === 'agency' ? (
                <>
                  <div className="my-2 border-t border-dashed" />
                  <TotalRow label="병원 송객 수수료 (에이전시 내부)" value={chart.referralFeeTotalKrw ?? 0} />
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">서명</CardTitle>
              <CardDescription>finalize는 3개 서명(병원·에이전시·환자)이 모두 필요합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(['hospital', 'agency', 'patient'] as const).map((role) => {
                const a = approvals.find((x) => x.role === role);
                return (
                  <div key={role} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {role === 'hospital' ? '병원' : role === 'agency' ? '에이전시' : '환자'}
                    </span>
                    {a ? (
                      <span className="text-xs text-care-700">
                        ✓ {a.signerName ?? '서명됨'} · {formatLocal(new Date(a.signedAt), 'Asia/Seoul', 'MM-dd HH:mm')}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">미서명</span>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">변경 이력</CardTitle>
            </CardHeader>
            <CardContent>
              {revisions.length === 0 ? (
                <p className="text-xs text-muted-foreground">아직 변경 이력이 없습니다.</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {revisions.map((r) => (
                    <li key={r.id} className="rounded-md border px-3 py-2">
                      <div className="font-medium">{r.summary ?? `${r.fromStatus ?? '—'} → ${r.toStatus}`}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {r.actorRole} · {formatLocal(new Date(r.createdAt), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TotalRow({ label, value, bold }: { label: string; value: number; bold?: boolean }): JSX.Element {
  return (
    <div className={`flex items-baseline justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span>₩{value.toLocaleString('ko-KR')}</span>
    </div>
  );
}
