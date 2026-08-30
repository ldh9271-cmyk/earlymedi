import { ReceiptText } from 'lucide-react';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { eq } from 'drizzle-orm';
import { billingAccounts } from '@/drizzle/schema/billing';
import { listHospitalCharts } from '@/lib/medical/console-queries';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { EmptyState } from '@/components/shared/empty-state';

export const metadata = { title: '정산 · 세금계산서' };
export const dynamic = 'force-dynamic';

function won(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}

/**
 * 정산 · 세금계산서 — 확정(finalized)된 시술 차트를 월별로 집계한다.
 * 차트 확정액이 정산의 기준 금액이고, 유치 수수료·세금계산서 발행은
 * 에이전시 정산 사이클에서 진행된다. 세금계산서 수신 주소는 빌링
 * 계정의 tax_invoice_email 을 그대로 보여준다.
 */
export default async function MedicalSettlementsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const { charts, account } = await withRls(ctx, async () => {
    const charts = await listHospitalCharts(ctx.orgId);
    const [account] = await db
      .select({ taxInvoiceEmail: billingAccounts.taxInvoiceEmail, billingEmail: billingAccounts.billingEmail })
      .from(billingAccounts)
      .where(eq(billingAccounts.organizationId, ctx.orgId))
      .limit(1);
    return { charts, account: account ?? null };
  });

  const finalized = charts.filter((c) => c.status === 'finalized');
  const pending = charts.filter((c) => !['finalized', 'voided'].includes(c.status));

  // 월별 집계 (최근 월부터)
  const byMonth = new Map<string, { count: number; totalKrw: number; depositKrw: number }>();
  for (const c of finalized) {
    const m = c.treatmentDate.slice(0, 7);
    const agg = byMonth.get(m) ?? { count: 0, totalKrw: 0, depositKrw: 0 };
    agg.count += 1;
    agg.totalKrw += c.grandTotalKrw;
    agg.depositKrw += c.depositReceivedKrw;
    byMonth.set(m, agg);
  }
  const months = [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const grandTotal = finalized.reduce((s, c) => s + c.grandTotalKrw, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">정산 · 세금계산서</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          확정된 시술 차트가 정산의 기준입니다. 월별 확정 금액을 집계하고, 세금계산서는
          아래 수신 주소로 정산 사이클에 맞춰 발행됩니다.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ['확정 차트', `${finalized.length}건`],
          ['확정 금액 누계', won(grandTotal)],
          ['진행 중 차트', `${pending.length}건`],
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
          <CardTitle className="text-base">월별 확정 집계</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {months.length === 0 ? (
            <div className="px-6 pb-8 pt-2">
              <EmptyState
                icon={ReceiptText}
                title="확정된 차트가 아직 없습니다"
                description="시술 차트가 finalize 되면 해당 월 정산 집계에 잡힙니다."
              />
            </div>
          ) : (
            <div className="divide-y">
              {months.map(([m, agg]) => (
                <div key={m} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-24 shrink-0 text-sm font-semibold">{m}</div>
                  <div className="flex-1 text-sm text-muted-foreground">확정 {agg.count}건</div>
                  <div className="w-40 text-right text-sm">
                    예약금 {won(agg.depositKrw)}
                  </div>
                  <div className="w-40 text-right text-sm font-semibold">{won(agg.totalKrw)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">세금계산서 수신 정보</CardTitle>
          <CardDescription className="text-xs">
            수신 주소 변경은 잔액 · 사용량 화면의 청구 연락처에서 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">세금계산서 이메일</div>
            <div className="font-medium">{account?.taxInvoiceEmail ?? '미설정'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">청구 이메일</div>
            <div className="font-medium">{account?.billingEmail ?? '미설정'}</div>
          </div>
          <Badge variant="outline" className="self-center">발행은 정산 사이클에 따라 진행</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
