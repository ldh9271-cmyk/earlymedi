import { ReceiptText } from 'lucide-react';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { eq } from 'drizzle-orm';
import { billingAccounts } from '@/drizzle/schema/billing';
import { listContracts, listHospitalCharts } from '@/lib/medical/console-queries';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { EmptyState } from '@/components/shared/empty-state';

export const metadata = { title: '정산 · 세금계산서' };
export const dynamic = 'force-dynamic';

function won(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}

/**
 * 정산 · 세금계산서 — 해외 환자 트랙의 정산 화면.
 *
 * 과금 모델 (founder 2026-08-31):
 *   국내 문의  → 리드 마켓 건당 구매 (이 화면과 무관)
 *   해외 문의  → 무료 수신. 시술 성사(차트 finalize = 최종 결제 확정)
 *               시점에 최종 금액의 10~30% 를 계약 요율대로 수수료 정산
 *
 * 요율은 partner_contracts.referral_rate_policy_json.commissionPct —
 * 케이스를 보낸 에이전시별 계약 요율을 차트에 매칭해 계산한다.
 * 요율 미설정 계약의 차트는 "요율 협의 필요"로 따로 보여준다.
 */
export default async function MedicalSettlementsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const { charts, account, contracts } = await withRls(ctx, async () => {
    const charts = await listHospitalCharts(ctx.orgId);
    const contracts = await listContracts(ctx.orgId);
    const [account] = await db
      .select({ taxInvoiceEmail: billingAccounts.taxInvoiceEmail, billingEmail: billingAccounts.billingEmail })
      .from(billingAccounts)
      .where(eq(billingAccounts.organizationId, ctx.orgId))
      .limit(1);
    return { charts, account: account ?? null, contracts };
  });

  // 에이전시별 계약 수수료율 (활성 계약 우선)
  const rateByAgency = new Map<string, number>();
  for (const c of contracts) {
    const pct = (c.referralRatePolicyJson as { commissionPct?: number } | null)?.commissionPct;
    if (typeof pct === 'number' && pct > 0 && (c.isActive || !rateByAgency.has(c.agencyOrgId))) {
      rateByAgency.set(c.agencyOrgId, pct);
    }
  }
  const commissionOf = (agencyOrgId: string | null, totalKrw: number): number | null => {
    if (!agencyOrgId) return null;
    const pct = rateByAgency.get(agencyOrgId);
    return typeof pct === 'number' ? Math.round((totalKrw * pct) / 100) : null;
  };

  const finalized = charts.filter((c) => c.status === 'finalized');
  const pending = charts.filter((c) => !['finalized', 'voided'].includes(c.status));

  // 월별 집계 (최근 월부터) — 수수료는 계약 요율이 있는 차트만 합산
  const byMonth = new Map<
    string,
    { count: number; totalKrw: number; commissionKrw: number; unratedKrw: number }
  >();
  for (const c of finalized) {
    const m = c.treatmentDate.slice(0, 7);
    const agg = byMonth.get(m) ?? { count: 0, totalKrw: 0, commissionKrw: 0, unratedKrw: 0 };
    agg.count += 1;
    agg.totalKrw += c.grandTotalKrw;
    const fee = commissionOf(c.agencyOrgId, c.grandTotalKrw);
    if (fee == null) agg.unratedKrw += c.grandTotalKrw;
    else agg.commissionKrw += fee;
    byMonth.set(m, agg);
  }
  const months = [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const grandTotal = finalized.reduce((s, c) => s + c.grandTotalKrw, 0);
  const grandCommission = finalized.reduce(
    (s, c) => s + (commissionOf(c.agencyOrgId, c.grandTotalKrw) ?? 0),
    0,
  );
  const hasAnyRate = rateByAgency.size > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">정산 · 세금계산서</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          해외 환자는 문의 수신이 무료입니다 — 시술이 성사되어 차트가 확정되면 최종 금액의{' '}
          <strong className="text-foreground">수수료 10~30%(계약 요율)</strong> 만 정산됩니다. 국내
          환자 문의는 리드 마켓에서 건당 구매하며 이 정산과 무관합니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['확정 차트', `${finalized.length}건`],
          ['확정 금액 누계', won(grandTotal)],
          ['수수료 누계 (요율 적용분)', hasAnyRate ? won(grandCommission) : '요율 미설정'],
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
                <div key={m} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                  <div className="w-24 shrink-0 text-sm font-semibold">{m}</div>
                  <div className="flex-1 text-sm text-muted-foreground">확정 {agg.count}건</div>
                  <div className="w-44 text-right text-sm">
                    수수료 {agg.commissionKrw > 0 ? won(agg.commissionKrw) : '—'}
                  </div>
                  <div className="w-40 text-right text-sm font-semibold">{won(agg.totalKrw)}</div>
                  {agg.unratedKrw > 0 ? (
                    <div className="w-full text-right text-[11px] text-amber-600">
                      요율 미협의 확정액 {won(agg.unratedKrw)} — 계약 요율 확정 후 수수료가 계산됩니다
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">적용 수수료율</CardTitle>
          <CardDescription className="text-xs">
            에이전시별 계약(referral rate)에 설정된 요율입니다. 미설정 계약은 계약 화면에서
            협의 후 반영됩니다 (범위 10~30%).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground">체결된 계약이 없습니다 — 계약 화면을 확인해 주세요.</p>
          ) : (
            contracts.map((c) => {
              const pct = (c.referralRatePolicyJson as { commissionPct?: number } | null)?.commissionPct;
              return (
                <span key={c.id} className="rounded-full border px-3 py-1 text-[11px]">
                  {c.agencyName ?? '에이전시'}{' '}
                  <strong>{typeof pct === 'number' ? `${pct}%` : '요율 미설정'}</strong>
                  {!c.isActive ? ' · 계약 대기' : ''}
                </span>
              );
            })
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
