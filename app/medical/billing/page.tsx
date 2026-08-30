import { and, asc, eq, sql } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { billingAccounts, billingPlans } from '@/drizzle/schema/billing';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { formatLocal } from '@/lib/utils/date';
import { BillingContactForm } from '@/app/agency/billing/_components/billing-contact-form';

export const metadata = { title: '잔액 · 사용량' };
export const dynamic = 'force-dynamic';

const STATUS_META: Record<string, { label: string; variant: 'brand' | 'hospitality' | 'care' | 'destructive' | 'outline' }> = {
  trial: { label: '무료 체험 중', variant: 'brand' },
  active: { label: '이용 중', variant: 'care' },
  past_due: { label: '결제 지연', variant: 'destructive' },
  restricted: { label: '기능 제한', variant: 'destructive' },
  suspended: { label: '일시 정지', variant: 'destructive' },
  cancelled: { label: '해지됨', variant: 'outline' },
};

function won(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}

/**
 * 잔액 · 사용량 — 의료기관 요금제(선충전 PAYG / 정기 구독) 현황.
 * 에이전시 billing 화면과 같은 골격이지만, 의료기관은 선충전 잔액이
 * 핵심이라 prepaid_balance 를 앞에 세운다. 청구 연락처 폼은 에이전시
 * 화면의 것을 그대로 공유한다 (조직 공통 설정).
 */
export default async function MedicalBillingPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });

  const { account, plans, seatCount } = await withRls(ctx, async () => {
    const [account] = await db
      .select({
        status: billingAccounts.status,
        prepaidBalanceKrw: billingAccounts.prepaidBalanceKrw,
        autoTopupEnabled: billingAccounts.autoTopupEnabled,
        currentPeriodStartsAt: billingAccounts.currentPeriodStartsAt,
        currentPeriodEndsAt: billingAccounts.currentPeriodEndsAt,
        billingName: billingAccounts.billingName,
        billingEmail: billingAccounts.billingEmail,
        taxInvoiceEmail: billingAccounts.taxInvoiceEmail,
        planName: billingPlans.name,
        monthlyFeeKrw: billingPlans.monthlyFeeKrw,
        prepaidChargeMinKrw: billingPlans.prepaidChargeMinKrw,
        settlementFeeBp: billingPlans.settlementFeeBp,
        seatLimit: billingPlans.seatLimit,
      })
      .from(billingAccounts)
      .innerJoin(billingPlans, eq(billingAccounts.planId, billingPlans.id))
      .where(eq(billingAccounts.organizationId, ctx.orgId))
      .limit(1);

    const plans = await db
      .select({
        code: billingPlans.code,
        name: billingPlans.name,
        description: billingPlans.description,
        monthlyFeeKrw: billingPlans.monthlyFeeKrw,
        prepaidChargeMinKrw: billingPlans.prepaidChargeMinKrw,
        settlementFeeBp: billingPlans.settlementFeeBp,
        trialDays: billingPlans.trialDays,
      })
      .from(billingPlans)
      .where(and(eq(billingPlans.accountType, 'medical'), eq(billingPlans.isActive, true)))
      .orderBy(asc(billingPlans.monthlyFeeKrw));

    const [seats] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(orgMemberships)
      .where(and(eq(orgMemberships.organizationId, ctx.orgId), eq(orgMemberships.status, 'active')));

    return { account: account ?? null, plans, seatCount: seats?.n ?? 0 };
  });

  if (!account) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">잔액 · 사용량</h1>
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            빌링 계정이 아직 만들어지지 않았습니다 — 관리자에게 문의해 주세요.
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusMeta = STATUS_META[account.status] ?? { label: account.status, variant: 'outline' as const };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">잔액 · 사용량</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          플랜 상태와 선충전 잔액, 팀 시트 사용량을 확인합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">
              현재 플랜 — {account.planName}
              <Badge variant={statusMeta.variant} className="ml-2 align-middle text-[10px]">
                {statusMeta.label}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              {account.currentPeriodStartsAt && account.currentPeriodEndsAt
                ? `현재 기간 ${formatLocal(new Date(account.currentPeriodStartsAt), 'Asia/Seoul', 'yyyy-MM-dd')} ~ ${formatLocal(new Date(account.currentPeriodEndsAt), 'Asia/Seoul', 'yyyy-MM-dd')}`
                : '기간 미설정'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">선충전 잔액</div>
            <div className="text-xl font-bold">{won(account.prepaidBalanceKrw)}</div>
            <div className="text-[11px] text-muted-foreground">
              자동 충전 {account.autoTopupEnabled ? '켜짐' : '꺼짐'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">월 요금</div>
            <div className="text-xl font-bold">
              {account.monthlyFeeKrw > 0 ? won(account.monthlyFeeKrw) : '없음 (PAYG)'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">정산 수수료</div>
            <div className="text-xl font-bold">{(account.settlementFeeBp / 100).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">팀 시트</div>
            <div className="text-xl font-bold">
              {seatCount} / {account.seatLimit ?? '무제한'}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">의료기관 플랜</CardTitle>
          <CardDescription className="text-xs">
            플랜 변경·충전은 담당 매니저 또는 청구 이메일로 요청해 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {plans.map((p) => (
            <div key={p.code} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{p.name}</div>
                {p.trialDays > 0 ? <Badge variant="brand">{p.trialDays}일 무료</Badge> : null}
              </div>
              {p.description ? (
                <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
              ) : null}
              <div className="mt-3 space-y-1 text-xs">
                <div>월 구독 {p.monthlyFeeKrw > 0 ? `${won(p.monthlyFeeKrw)} / 월` : '없음'}</div>
                {p.prepaidChargeMinKrw > 0 ? <div>최소 충전 {won(p.prepaidChargeMinKrw)}</div> : null}
                <div>정산 수수료 {(p.settlementFeeBp / 100).toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">청구 연락처</CardTitle>
          <CardDescription className="text-xs">
            청구서·세금계산서를 받을 담당자 정보입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BillingContactForm
            initial={{
              billingName: account.billingName ?? '',
              billingEmail: account.billingEmail ?? '',
              taxInvoiceEmail: account.taxInvoiceEmail ?? '',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
