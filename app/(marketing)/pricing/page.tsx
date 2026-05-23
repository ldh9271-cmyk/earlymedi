import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { BILLING_PLAN_SEEDS } from '@/drizzle/seeds/billing-plans';
import { ACCOUNT_TYPE_LABEL_KO } from '@/lib/auth/account-types';
import type { AccountType } from '@/lib/auth/account-types';

export const metadata = { title: '요금제' };

const ACCOUNT_ORDER: AccountType[] = ['agency', 'medical', 'non_medical', 'freelancer'];

export default function PricingPage(): JSX.Element {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">EarlyMedi 요금제</h1>
        <p className="mt-2 text-muted-foreground">카테고리별로 적합한 플랜을 선택하세요.</p>
      </div>

      <div className="space-y-12">
        {ACCOUNT_ORDER.map((accountType) => {
          const plans = BILLING_PLAN_SEEDS.filter((p) => p.accountType === accountType);
          if (plans.length === 0) return null;
          return (
            <section key={accountType}>
              <h2 className="mb-4 text-xl font-semibold">{ACCOUNT_TYPE_LABEL_KO[accountType]}</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {plans.map((p) => (
                  <Card key={p.code}>
                    <CardHeader>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <CardDescription>{p.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <Row label="등록비" value={fmt(p.registrationFeeKrw ?? 0)} />
                      {(p.monthlyFeeKrw ?? 0) > 0 ? <Row label="월 구독" value={`${fmt(p.monthlyFeeKrw ?? 0)} / 월`} /> : null}
                      {(p.annualFeeKrw ?? 0) > 0 ? <Row label="연 구독" value={`${fmt(p.annualFeeKrw ?? 0)} / 년`} /> : null}
                      {(p.prepaidChargeMinKrw ?? 0) > 0 ? <Row label="최소 충전" value={fmt(p.prepaidChargeMinKrw ?? 0)} /> : null}
                      <Row label="정산 수수료" value={`${((p.settlementFeeBp ?? 0) / 100).toFixed(2)}%`} />
                      {(p.trialDays ?? 0) > 0 ? <Badge variant="brand">{p.trialDays}일 무료 체험</Badge> : null}
                      {p.seatLimit ? <div className="text-xs text-muted-foreground">좌석 {p.seatLimit}</div> : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-baseline justify-between border-b border-dashed border-border/50 pb-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function fmt(krw: number): string {
  if (krw === 0) return '면제';
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(krw);
}
