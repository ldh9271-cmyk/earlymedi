import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { commissionLedger, referralPartners } from '@/drizzle/schema/referral-program';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent } from '@/components/shared/ui/card';
import { formatLocal } from '@/lib/utils/date';

export const metadata = { title: '커미션 정산' };
export const dynamic = 'force-dynamic';

/**
 * 커미션 정산 — 총판·추천인 프로그램의 수당 원장(commission_ledger)을
 * 본다. 시술 완료/투어 출발이 등록되면 배분표(70:30 등)대로 원장 행이
 * 생기고, holdDays 가 지나면 확정 → 월 정산에서 지급 처리된다.
 * 배분율·총판 관리는 마스터 콘솔에서 (지역 마스터 권한).
 */

const STATUS_META: Record<string, { label: string; variant: 'brand' | 'hospitality' | 'care' | 'destructive' | 'outline' }> = {
  pending: { label: '대기 (hold)', variant: 'outline' },
  confirmed: { label: '확정', variant: 'brand' },
  paid: { label: '지급 완료', variant: 'care' },
  reversed: { label: '환수', variant: 'destructive' },
};

const BENEFICIARY_LABEL: Record<string, string> = {
  platform: '플랫폼',
  patient_points: '고객 포인트',
  referrer_l1: '추천인 (1단계)',
  referrer_l2: '추천인 (2단계)',
  distributor: '총판',
};

const BASIS_LABEL: Record<string, string> = {
  hospital_fee: '병원 유치 수수료',
  travel_margin: '여행 마진',
};

function won(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}

export default async function AgencyCommissionsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });

  const { ledger, partners } = await withRls(ctx, async () => {
    const ledger = await db
      .select({
        id: commissionLedger.id,
        invoiceNo: checkoutOrders.invoiceNo,
        listingTitle: checkoutOrders.listingTitle,
        beneficiary: commissionLedger.beneficiary,
        basis: commissionLedger.basis,
        rateBp: commissionLedger.rateBp,
        baseAmountWon: commissionLedger.baseAmountWon,
        amountWon: commissionLedger.amountWon,
        status: commissionLedger.status,
        confirmAt: commissionLedger.confirmAt,
        settlementPeriod: commissionLedger.settlementPeriod,
        createdAt: commissionLedger.createdAt,
      })
      .from(commissionLedger)
      .innerJoin(checkoutOrders, eq(commissionLedger.orderId, checkoutOrders.id))
      .orderBy(desc(commissionLedger.createdAt))
      .limit(200);

    const partners = await db
      .select({
        id: referralPartners.id,
        role: referralPartners.role,
        name: referralPartners.name,
        code: referralPartners.code,
        countryCode: referralPartners.countryCode,
        clicks: referralPartners.clicks,
        signups: referralPartners.signups,
        isActive: referralPartners.isActive,
      })
      .from(referralPartners)
      .orderBy(desc(referralPartners.createdAt))
      .limit(100);

    return { ledger, partners };
  });

  const sums: Record<string, number> = { pending: 0, confirmed: 0, paid: 0, reversed: 0 };
  for (const l of ledger) sums[l.status] = (sums[l.status] ?? 0) + l.amountWon;

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="brand" className="mb-2">🤝 커미션</Badge>
        <h1 className="text-2xl font-bold tracking-tight">커미션 정산</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          총판 · 추천인 프로그램의 수당 원장입니다. 시술 완료(또는 투어 출발)가 등록되면
          배분표대로 수당이 쌓이고, 보류 기간이 지나면 확정 → 월 정산으로 지급됩니다.
          총판 등록 · 배분율 설정은{' '}
          <a href="/master/partners" className="font-medium underline">마스터 → 총판 관리</a>에서.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="대기 (보류 기간)" value={won(sums.pending ?? 0)} />
        <StatCard label="확정 — 지급 예정" value={won(sums.confirmed ?? 0)} highlight={(sums.confirmed ?? 0) > 0} />
        <StatCard label="지급 완료 누적" value={won(sums.paid ?? 0)} />
        <StatCard label="환수" value={won(sums.reversed ?? 0)} />
      </div>

      {/* 파트너 현황 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-2 text-sm font-bold">파트너 현황 ({partners.length})</h2>
          {partners.length === 0 ? (
            <p className="text-xs text-muted-foreground">등록된 총판·추천인이 없습니다.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {partners.map((p) => (
                <div key={p.id} className={`rounded-md border px-3 py-2 ${p.isActive ? '' : 'opacity-50'}`}>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Badge variant={p.role === 'distributor' ? 'brand' : 'outline'} className="text-[10px]">
                      {p.role === 'distributor' ? '총판' : '추천인'}
                    </Badge>
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground">{p.countryCode}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <code className="rounded bg-muted/40 px-1 font-mono">{p.code}</code>
                    <span>클릭 {p.clicks}</span>
                    <span>가입 {p.signups}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 원장 */}
      {ledger.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm">
            <p className="font-semibold">아직 수당 내역이 없습니다</p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
              수당은 실제 매출에서만 발생합니다 — ① 고객이 총판·추천인 QR로 유입되어 결제하거나
              시술 실적이 등록되면 ② 병원 유치 수수료 · 여행 마진이 배분표(예: 총판 70 : 플랫폼
              30)대로 이 원장에 쌓이고 ③ 보류 기간이 지나 확정되면 월 정산으로 지급합니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[860px] text-xs">
              <thead>
                <tr className="border-b bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">발생일</th>
                  <th className="px-2 py-2.5 text-left font-medium">주문</th>
                  <th className="px-2 py-2.5 text-left font-medium">수령자</th>
                  <th className="px-2 py-2.5 text-left font-medium">기준</th>
                  <th className="px-2 py-2.5 text-right font-medium">요율</th>
                  <th className="px-2 py-2.5 text-right font-medium">기준액</th>
                  <th className="px-2 py-2.5 text-right font-medium">수당</th>
                  <th className="px-2 py-2.5 text-left font-medium">상태</th>
                  <th className="px-4 py-2.5 text-left font-medium">확정/정산</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((l) => {
                  const meta = STATUS_META[l.status] ?? STATUS_META.pending!;
                  return (
                    <tr key={l.id} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatLocal(new Date(l.createdAt), 'Asia/Seoul', 'MM-dd')}
                      </td>
                      <td className="px-2 py-2.5">
                        <Link href={`/agency/payments?q=${l.invoiceNo}`} className="font-mono text-[11px] hover:underline">
                          {l.invoiceNo}
                        </Link>
                        <div className="max-w-[180px] truncate text-[10px] text-muted-foreground">{l.listingTitle}</div>
                      </td>
                      <td className="px-2 py-2.5">{BENEFICIARY_LABEL[l.beneficiary] ?? l.beneficiary}</td>
                      <td className="px-2 py-2.5 text-muted-foreground">{BASIS_LABEL[l.basis] ?? l.basis}</td>
                      <td className="px-2 py-2.5 text-right">{(l.rateBp / 100).toFixed(1)}%</td>
                      <td className="px-2 py-2.5 text-right text-muted-foreground">{won(l.baseAmountWon)}</td>
                      <td className="px-2 py-2.5 text-right font-semibold">{won(l.amountWon)}</td>
                      <td className="px-2 py-2.5">
                        <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-[10px] text-muted-foreground">
                        {formatLocal(new Date(l.confirmAt), 'Asia/Seoul', 'MM-dd')}
                        {l.settlementPeriod ? ` · ${l.settlementPeriod}` : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}): JSX.Element {
  return (
    <Card className={highlight ? 'border-brand-300 bg-brand-50/40' : ''}>
      <CardContent className="p-4">
        <div className="text-lg font-bold leading-tight">{value}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
