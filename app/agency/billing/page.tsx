import Link from 'next/link';
import { and, asc, eq, sql } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { billingAccounts, billingPlans } from '@/drizzle/schema/billing';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { formatLocal } from '@/lib/utils/date';
import { BillingContactForm } from './_components/billing-contact-form';

export const metadata = { title: '요금제 · 청구서' };
export const dynamic = 'force-dynamic';

/**
 * 요금제 · 청구서 — 우리 조직의 KoreaGlowUp 구독 상태를 본다:
 * 현재 플랜 · 무료 체험 잔량 · 팀 시트 사용량 · 청구 연락처(편집 가능)
 * · 에이전시 플랜 비교. 결제 수단 등록·청구서 발행은 유료 전환 시
 * 활성화된다 (전환은 /upgrade).
 */

const STATUS_META: Record<string, { label: string; variant: 'brand' | 'hospitality' | 'care' | 'destructive' | 'outline' }> = {
  trial: { label: '무료 체험 중', variant: 'brand' },
  active: { label: '구독 중', variant: 'care' },
  past_due: { label: '결제 지연', variant: 'destructive' },
  restricted: { label: '기능 제한', variant: 'destructive' },
  suspended: { label: '일시 정지', variant: 'destructive' },
  cancelled: { label: '해지됨', variant: 'outline' },
};

function won(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}

export default async function AgencyBillingPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });

  const { account, plans, seatCount } = await withRls(ctx, async () => {
    const [account] = await db
      .select({
        status: billingAccounts.status,
        trialEndsAt: billingAccounts.trialEndsAt,
        currentPeriodStartsAt: billingAccounts.currentPeriodStartsAt,
        currentPeriodEndsAt: billingAccounts.currentPeriodEndsAt,
        trialUsesCount: billingAccounts.trialUsesCount,
        trialUsesLimit: billingAccounts.trialUsesLimit,
        billingName: billingAccounts.billingName,
        billingEmail: billingAccounts.billingEmail,
        taxInvoiceEmail: billingAccounts.taxInvoiceEmail,
        planCode: billingPlans.code,
        planName: billingPlans.name,
        monthlyFeeKrw: billingPlans.monthlyFeeKrw,
        settlementFeeBp: billingPlans.settlementFeeBp,
        seatLimit: billingPlans.seatLimit,
        trialDays: billingPlans.trialDays,
      })
      .from(billingAccounts)
      .innerJoin(billingPlans, eq(billingAccounts.planId, billingPlans.id))
      .where(eq(billingAccounts.organizationId, ctx.orgId))
      .limit(1);

    const plans = await db
      .select({
        code: billingPlans.code,
        name: billingPlans.name,
        monthlyFeeKrw: billingPlans.monthlyFeeKrw,
        settlementFeeBp: billingPlans.settlementFeeBp,
        seatLimit: billingPlans.seatLimit,
        trialDays: billingPlans.trialDays,
      })
      .from(billingPlans)
      .where(and(eq(billingPlans.accountType, 'agency'), eq(billingPlans.isActive, true)))
      .orderBy(asc(billingPlans.monthlyFeeKrw));

    const [seats] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(orgMemberships)
      .where(
        and(eq(orgMemberships.organizationId, ctx.orgId), eq(orgMemberships.status, 'active')),
      );

    return { account: account ?? null, plans, seatCount: seats?.n ?? 0 };
  });

  if (!account) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">요금제 · 청구서</h1>
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            빌링 계정이 아직 만들어지지 않았습니다 — 관리자에게 문의해 주세요.
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusMeta = STATUS_META[account.status] ?? STATUS_META.trial!;
  const trialPct = Math.min(
    100,
    Math.round((account.trialUsesCount / Math.max(account.trialUsesLimit, 1)) * 100),
  );

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="brand" className="mb-2">🧾 요금제</Badge>
        <h1 className="text-2xl font-bold tracking-tight">요금제 · 청구서</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          KoreaGlowUp 구독 상태와 청구 정보를 관리합니다. 유료 전환·플랜 변경은{' '}
          <Link href="/upgrade" className="font-medium underline">유료 전환</Link>에서.
        </p>
      </div>

      {/* 현재 플랜 */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">
                현재 플랜 — {account.planName}
                <Badge variant={statusMeta.variant} className="ml-2 align-middle text-[10px]">
                  {statusMeta.label}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                {account.currentPeriodStartsAt && account.currentPeriodEndsAt
                  ? `현재 기간: ${formatLocal(new Date(account.currentPeriodStartsAt), 'Asia/Seoul', 'yyyy-MM-dd')} ~ ${formatLocal(new Date(account.currentPeriodEndsAt), 'Asia/Seoul', 'yyyy-MM-dd')}`
                  : '기간 미설정'}
                {account.trialEndsAt
                  ? ` · 체험 종료 ${formatLocal(new Date(account.trialEndsAt), 'Asia/Seoul', 'yyyy-MM-dd')}`
                  : ''}
              </CardDescription>
            </div>
            <Button variant="brand" size="sm" asChild>
              <Link href="/upgrade">유료 전환 · 플랜 변경</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Metric label="월 요금 (유료 전환 시)" value={won(account.monthlyFeeKrw)} />
          <Metric label="GMV 정산 수수료" value={`${(account.settlementFeeBp / 100).toFixed(1)}%`} />
          <Metric
            label="팀 시트"
            value={`${seatCount} / ${account.seatLimit ?? '무제한'}`}
            warn={account.seatLimit != null && seatCount >= account.seatLimit}
          />
          <Metric label="체험 기간" value={`${account.trialDays}일`} />
        </CardContent>
      </Card>

      {/* 무료 체험 사용량 */}
      {account.status === 'trial' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">무료 체험 사용량</CardTitle>
            <CardDescription className="text-xs">
              고객(환자) 등록 {account.trialUsesLimit}명까지 무료 — 한도 도달 시 신규 등록에 유료
              전환이 필요합니다. 사용량은 등록 시점에 차감되며 삭제해도 되돌아가지 않습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted/40">
                <div
                  className={`h-full rounded-full ${trialPct >= 80 ? 'bg-amber-500' : 'bg-brand-500'}`}
                  style={{ width: `${Math.max(trialPct, 2)}%` }}
                />
              </div>
              <div className="text-sm font-semibold">
                {account.trialUsesCount} / {account.trialUsesLimit}명
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              남은 무료 등록: {Math.max(0, account.trialUsesLimit - account.trialUsesCount)}명
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* 청구 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">청구 정보</CardTitle>
          <CardDescription className="text-xs">
            청구서 · 세금계산서를 받을 연락처입니다.
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

      {/* 플랜 비교 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">에이전시 플랜 비교</CardTitle>
          <CardDescription className="text-xs">
            규모에 맞는 플랜을 고르세요 — 상위 플랜일수록 GMV 정산 수수료가 낮아집니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {plans.map((p) => {
              const current = p.code === account.planCode;
              return (
                <div
                  key={p.code}
                  className={`rounded-lg border p-4 ${current ? 'border-brand-400 bg-brand-50/40' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">{p.name}</h3>
                    {current ? (
                      <Badge variant="brand" className="text-[10px]">현재 플랜</Badge>
                    ) : null}
                  </div>
                  <div className="mt-2 text-xl font-bold">
                    {won(p.monthlyFeeKrw)}
                    <span className="text-xs font-normal text-muted-foreground"> /월</span>
                  </div>
                  <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                    <li>· GMV 정산 수수료 {(p.settlementFeeBp / 100).toFixed(1)}%</li>
                    <li>· 팀 시트 {p.seatLimit ?? '무제한'}{p.seatLimit != null ? '명' : ''}</li>
                    <li>· 무료 체험 {p.trialDays}일</li>
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            결제 수단 등록 · 월 청구서(PDF) · 세금계산서 발행은 유료 전환 시 활성화됩니다. 전환
            문의: <Link href="/upgrade" className="underline">유료 전환</Link> 또는 파트너 센터{' '}
            <a href="mailto:biz@glowuptour.com" className="underline">biz@glowuptour.com</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}): JSX.Element {
  return (
    <div>
      <div className={`text-lg font-bold leading-tight ${warn ? 'text-amber-600' : ''}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
