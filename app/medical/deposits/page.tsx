import { CreditCard } from 'lucide-react';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { listHospitalCharts, listSelectedQuotes } from '@/lib/medical/console-queries';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { EmptyState } from '@/components/shared/empty-state';

export const metadata = { title: '예약금' };
export const dynamic = 'force-dynamic';

function won(n: number | null | undefined): string {
  return n == null ? '—' : `₩${n.toLocaleString('ko-KR')}`;
}

/**
 * 예약금 — 두 축으로 본다.
 *  1) 선택된 견적의 예약금 조건 (우리가 회신했고 에이전시가 채택한 금액)
 *  2) 시술 차트에 기록된 예약금 수령액 (차트 확정 플로우에서 기록)
 */
export default async function MedicalDepositsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const { selected, charts } = await withRls(ctx, async () => ({
    selected: await listSelectedQuotes(ctx.orgId),
    charts: await listHospitalCharts(ctx.orgId),
  }));

  const chartsWithDeposit = charts.filter((c) => c.status !== 'voided');
  const expectedTotal = selected.reduce((s, q) => s + (q.depositKrw ?? 0), 0);
  const receivedTotal = chartsWithDeposit.reduce((s, c) => s + c.depositReceivedKrw, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">예약금</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          선택된 견적의 예약금 조건과, 시술 차트에 기록된 실제 수령액을 비교합니다.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ['선택된 견적', `${selected.length}건`],
          ['예약금 조건 합계', won(expectedTotal)],
          ['차트 기록 수령액', won(receivedTotal)],
        ].map(([label, v]) => (
          <Card key={label}>
            <CardContent className="py-4">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-xl font-bold">{v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">선택된 견적의 예약금 조건</CardTitle>
          <CardDescription className="text-xs">
            에이전시·환자가 우리 견적을 선택한 케이스입니다. 예약금 입금 확인은 에이전시
            정산 플로우에서 이뤄지고, 시술 후 차트에 수령액이 기록됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {selected.length === 0 ? (
            <div className="px-6 pb-8 pt-2">
              <EmptyState
                icon={CreditCard}
                title="선택된 견적이 아직 없습니다"
                description="RFQ 인박스에서 견적을 회신하면, 채택된 케이스가 여기에 예약금 조건과 함께 표시됩니다."
              />
            </div>
          ) : (
            <div className="divide-y">
              {selected.map((q) => (
                <div key={q.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{q.caseTitle ?? '케이스 상세 비공개'}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {q.agencyName ?? '에이전시'} · {q.hospitalName}
                      {q.arrivalDate ? ` · 도착 예정 ${q.arrivalDate}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{won(q.depositKrw)}</div>
                    <div className="text-[11px] text-muted-foreground">총액 {won(q.totalKrw)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">차트별 예약금 수령 기록</CardTitle>
          <CardDescription className="text-xs">시술 차트에 기록된 예약금 수령액입니다.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {chartsWithDeposit.length === 0 ? (
            <div className="px-6 pb-6 pt-2 text-sm text-muted-foreground">아직 작성된 차트가 없습니다.</div>
          ) : (
            <div className="divide-y">
              {chartsWithDeposit.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-24 shrink-0 text-sm font-medium">{c.treatmentDate}</div>
                  <div className="min-w-0 flex-1 text-sm">{c.doctorName ?? '의사 미지정'}</div>
                  <Badge variant={c.depositReceivedKrw > 0 ? 'care' : 'outline'}>
                    {c.depositReceivedKrw > 0 ? '수령' : '미기록'}
                  </Badge>
                  <div className="w-32 text-right">
                    <div className="text-sm font-semibold">{won(c.depositReceivedKrw)}</div>
                    <div className="text-[11px] text-muted-foreground">총액 {won(c.grandTotalKrw)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
