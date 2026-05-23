'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { computeFunnel, STANDARD_FUNNEL_STAGES } from '@/lib/analytics/funnel';
import { computeCac, computeLtv, ratio, paybackMonths } from '@/lib/analytics/cac-ltv';
import { computeBilling, type AccountSnapshot } from '@/lib/analytics/billing-metrics';

/**
 * Mock fixture — replaced by RLS-scoped repository reads in Phase 9.5.
 * Numbers chosen to read like a 6-month-old agency with healthy unit economics.
 */
const MOCK_STAGE_COUNTS: Record<string, number> = {
  lead: 4_280,
  qualified: 1_140,
  rfq_sent: 760,
  quoted: 612,
  accepted: 388,
  deposit_paid: 322,
  scheduled: 298,
  in_treatment: 254,
  aftercare: 248,
  closed_won: 232,
};

const MOCK_MONTHLY_GMV = [
  { month: '2025-12', gmv: 184_000_000, cases: 21 },
  { month: '2026-01', gmv: 212_000_000, cases: 26 },
  { month: '2026-02', gmv: 248_000_000, cases: 30 },
  { month: '2026-03', gmv: 295_000_000, cases: 36 },
  { month: '2026-04', gmv: 364_000_000, cases: 44 },
  { month: '2026-05', gmv: 412_000_000, cases: 49 },
];

const MOCK_COUNTRY = [
  { country: '중국', leads: 1_840, share: 43 },
  { country: '일본', leads: 720, share: 17 },
  { country: '러시아·CIS', leads: 552, share: 13 },
  { country: '베트남·태국', leads: 488, share: 11 },
  { country: '중동 (AE/SA)', leads: 304, share: 7 },
  { country: '미주·기타', leads: 376, share: 9 },
];

const MOCK_TOP_HOSPITALS = [
  { name: '얼리메디 데모 성형외과', gmv: 184_000_000, fee: 51_200_000, cases: 21 },
  { name: 'Seoul Aesthetic Clinic', gmv: 142_000_000, fee: 38_800_000, cases: 17 },
  { name: 'K-Hair Restoration', gmv: 86_000_000, fee: 21_500_000, cases: 12 },
  { name: 'Gangnam Skin Lab', gmv: 64_000_000, fee: 12_800_000, cases: 18 },
];

const MOCK_TOP_FREELANCERS = [
  { name: '박송객', country: 'KR', gmv: 124_000_000, commission: 3_720_000, cases: 14 },
  { name: 'Olga K.', country: 'RU', gmv: 96_000_000, commission: 2_880_000, cases: 9 },
  { name: 'Wang J.', country: 'CN', gmv: 84_000_000, commission: 2_520_000, cases: 11 },
  { name: 'Aisha M.', country: 'AE', gmv: 38_000_000, commission: 1_140_000, cases: 4 },
];

const MOCK_BILLING_ACCOUNTS: AccountSnapshot[] = [
  // demo enterprise mix; numbers anchor MRR ~ ₩28M
  ...Array.from({ length: 18 }, (_, i) => ({
    organizationId: `agency-${i}`,
    accountType: 'agency' as const,
    planCode: 'agency_growth',
    status: 'active' as const,
    monthlyRevenueKrw: 299_000,
    monthlyRevenueKrw30dAgo: i < 14 ? 299_000 : 99_000,
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    organizationId: `agency-pro-${i}`,
    accountType: 'agency' as const,
    planCode: 'agency_pro',
    status: 'active' as const,
    monthlyRevenueKrw: 699_000,
    monthlyRevenueKrw30dAgo: 699_000,
  })),
  ...Array.from({ length: 9 }, (_, i) => ({
    organizationId: `medical-${i}`,
    accountType: 'medical' as const,
    planCode: 'medical_committed',
    status: 'active' as const,
    monthlyRevenueKrw: 500_000,
    prepaidBalanceKrw: 5_100_000 - i * 200_000,
  })),
  ...Array.from({ length: 24 }, (_, i) => ({
    organizationId: `partner-${i}`,
    accountType: 'non_medical' as const,
    planCode: 'partner_active',
    status: i === 0 ? ('past_due' as const) : ('active' as const),
    monthlyRevenueKrw: 49_000,
  })),
  {
    organizationId: 'partner-churn-1',
    accountType: 'non_medical' as const,
    planCode: 'partner_active',
    status: 'cancelled' as const,
    monthlyRevenueKrw: 0,
  },
];

export function InsightsBody(): JSX.Element {
  const funnel = useMemo(
    () =>
      computeFunnel(
        STANDARD_FUNNEL_STAGES.map((s) => ({ ...s, count: MOCK_STAGE_COUNTS[s.key] ?? 0 })),
      ),
    [],
  );

  const cac = useMemo(
    () =>
      computeCac({
        paidSpendKrw: 38_000_000,
        freelancerSpendKrw: 18_400_000,
        otherSpendKrw: 6_200_000,
        acquiredPatients: 49,
      }),
    [],
  );

  const ltv = useMemo(
    () => computeLtv({ avgCaseGmvKrw: 8_400_000, marginBp: 1_200, avgCasesPerPatient: 1.8 }),
    [],
  );

  const r = useMemo(() => ratio(ltv.ltvKrw, cac.blendedCacKrw), [ltv, cac]);
  const payback = useMemo(
    () => paybackMonths(cac.blendedCacKrw, ltv.marginPerCaseKrw, 1.8),
    [cac, ltv],
  );

  const billing = useMemo(() => computeBilling(MOCK_BILLING_ACCOUNTS), []);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          유치업체 운영 · 2026-05 (지난 30일 기준)
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-[40px] md:leading-[1.1]">EarlyInsight 분석</h1>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
          채널·국가별 CAC/LTV, Lead → 정산 완료 전환 퍼널, 병원·프리랜서 리더보드, 그리고 MRR/ARR 운영 지표를 한 화면에서 추적합니다.
        </p>
      </header>

      {/* Top KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="GMV (30d)" value="₩412M" delta="+13.2%" accent="brand" />
        <KpiCard label="Closed Won (30d)" value="49" delta="+11건" accent="care" />
        <KpiCard label="블렌디드 CAC" value={`₩${(cac.blendedCacKrw / 10_000).toFixed(0)}만`} delta="-6.8%" accent="hospitality" positive />
        <KpiCard label="LTV : CAC" value={r.value.toFixed(2)} delta={r.verdict} accent={r.verdict === 'healthy' ? 'care' : 'hospitality'} positive={r.verdict === 'healthy'} />
      </div>

      {/* GMV trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">GMV · 케이스 (6개월 추이)</CardTitle>
          <CardDescription>월간 GMV 와 정산 완료 케이스 수. 막대는 케이스, 영역은 GMV(₩).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_MONTHLY_GMV}>
                <defs>
                  <linearGradient id="gmvGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--brand-600))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--brand-600))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `₩${(v / 1_000_000).toFixed(0)}M`} />
                <Tooltip
                  formatter={(v: number) => `₩${v.toLocaleString('ko-KR')}`}
                  labelStyle={{ fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="gmv"
                  stroke="hsl(var(--brand-600))"
                  fill="url(#gmvGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Two-column: Funnel + Country mix */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">전환 퍼널</CardTitle>
            <CardDescription>Lead → 정산 완료. step / cumulative 전환율을 함께 표시.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {funnel.map((s, i) => {
                const widthPct = Math.max(2, s.cumulativeBp / 100);
                return (
                  <div key={s.key} className="space-y-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-medium">{s.label}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {s.count.toLocaleString('ko-KR')}{' '}
                        {i > 0 ? <span>· step {(s.stepConversionBp / 100).toFixed(1)}%</span> : null}
                      </span>
                    </div>
                    <div className="relative h-6 overflow-hidden rounded-md bg-muted">
                      <div
                        className="h-full rounded-md bg-brand-500/80"
                        style={{ width: `${widthPct}%` }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-foreground">
                        {(s.cumulativeBp / 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">국가별 리드</CardTitle>
            <CardDescription>지난 30일 신규 리드 origin. 상위 6개 표시.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_COUNTRY} layout="vertical" margin={{ left: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" fontSize={11} />
                  <YAxis dataKey="country" type="category" fontSize={11} width={80} />
                  <Tooltip />
                  <Bar dataKey="leads" radius={[0, 6, 6, 0]}>
                    {MOCK_COUNTRY.map((_, i) => (
                      <Cell key={i} fill={['#4f46e5', '#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unit economics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">단위 경제 (Unit Economics)</CardTitle>
          <CardDescription>30일 코호트 기준 CAC · LTV · 회수기간.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
            <MetricCell label="유료 채널 CAC" value={`₩${cac.paidCacKrw.toLocaleString('ko-KR')}`} hint="UTM 태그된 광고만" />
            <MetricCell label="블렌디드 CAC" value={`₩${cac.blendedCacKrw.toLocaleString('ko-KR')}`} hint="유료 + 프리랜서 + 기타" />
            <MetricCell label="평균 케이스 마진" value={`₩${ltv.marginPerCaseKrw.toLocaleString('ko-KR')}`} hint="12% 마진율 가정" />
            <MetricCell label="LTV (24개월 horizon)" value={`₩${ltv.ltvKrw.toLocaleString('ko-KR')}`} hint="평균 1.8 케이스/환자" />
            <MetricCell label="LTV : CAC" value={r.value.toFixed(2)} hint={r.verdict === 'healthy' ? '> 3.0 — 건강' : r.verdict === 'marginal' ? '1–3 — 경계' : '< 1.0 — 적자'} variant={r.verdict === 'healthy' ? 'care' : r.verdict === 'marginal' ? 'hospitality' : 'destructive'} />
            <MetricCell label="회수기간" value={`${payback}개월`} hint="평균 케이스 마진 환산" />
            <MetricCell label="신규 환자 (30d)" value="49" hint="고유 환자 수" />
            <MetricCell label="채널 평균 응답 시간" value="14분" hint="신규 리드 첫 응답" variant="care" />
          </div>
        </CardContent>
      </Card>

      {/* Two-column: Hospitals + Freelancers leaderboards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">병원 리더보드 (GMV / 송객 수수료)</CardTitle>
            <CardDescription>지난 30일 — 상위 4개 병원.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {MOCK_TOP_HOSPITALS.map((h, i) => (
                <li key={h.name} className="flex items-center gap-3">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-care-50 text-xs font-semibold text-care-700">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">{h.name}</span>
                      <span className="shrink-0 text-xs font-semibold">₩{(h.gmv / 1_000_000).toFixed(0)}M</span>
                    </div>
                    <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
                      <span>{h.cases} 케이스</span>
                      <span>수수료 ₩{(h.fee / 1_000_000).toFixed(1)}M</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">프리랜서 리더보드 (커미션)</CardTitle>
            <CardDescription>지난 30일 — 상위 4명. 원천세 3.3% 차감 전 금액.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {MOCK_TOP_FREELANCERS.map((f, i) => (
                <li key={f.name} className="flex items-center gap-3">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-hospitality-50 text-xs font-semibold text-hospitality-700">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">{f.name}</span>
                      <Badge variant="secondary" className="rounded-full">{f.country}</Badge>
                    </div>
                    <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
                      <span>{f.cases} 케이스 · ₩{(f.gmv / 1_000_000).toFixed(0)}M GMV</span>
                      <span className="font-semibold text-foreground">₩{f.commission.toLocaleString('ko-KR')}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Platform billing health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">플랫폼 과금 헬스 (모든 의료관광 합산)</CardTitle>
          <CardDescription>MRR / ARR · 확장 · 축소 · 미수금 · 충전 잔액.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
            <MetricCell label="MRR" value={`₩${(billing.mrrKrw / 1_000_000).toFixed(1)}M`} hint="월 반복 매출" />
            <MetricCell label="ARR" value={`₩${(billing.arrKrw / 1_000_000).toFixed(1)}M`} hint="연환산" />
            <MetricCell label="확장 (Expansion)" value={`+₩${(billing.expansionKrw / 1_000_000).toFixed(2)}M`} hint="플랜 업그레이드" variant="care" />
            <MetricCell label="축소 (Contraction)" value={`-₩${(billing.contractionKrw / 1_000_000).toFixed(2)}M`} hint="다운그레이드" variant="hospitality" />
            <MetricCell label="활성 계정" value={billing.totalActive.toString()} hint="trialing 포함" />
            <MetricCell label="past_due / restricted" value={`${billing.pastDueCount} / ${billing.restrictedCount}`} hint="결제 실패 후 단계" variant={billing.pastDueCount + billing.restrictedCount > 0 ? 'hospitality' : 'care'} />
            <MetricCell label="이탈 (Churned)" value={billing.churnedCount.toString()} hint="지난 30일" variant={billing.churnedCount > 0 ? 'destructive' : 'care'} />
            <MetricCell label="총 충전 잔액" value={`₩${(billing.prepaidBalanceTotalKrw / 1_000_000).toFixed(1)}M`} hint="Medical Committed 합산" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">UTM · 추천 코드 트래킹</CardTitle>
            <CardDescription>지난 30일 — Lead origin.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <UtmRow source="organic_instagram" leads={892} cases={11} />
              <UtmRow source="referral_code_DEMO-PARK" leads={642} cases={14} />
              <UtmRow source="paid_meta_lookalike_cn" leads={488} cases={6} />
              <UtmRow source="paid_naver_brand_kr" leads={312} cases={9} />
              <UtmRow source="paid_google_search_jp" leads={224} cases={5} />
              <UtmRow source="direct" leads={194} cases={4} />
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">시술 카테고리별 마진</CardTitle>
            <CardDescription>송객 수수료율 × GMV. 성형 30% / 피부 20% / 모발 25%.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { category: '성형', gmv: 184, fee: 55 },
                    { category: '모발', gmv: 86, fee: 21.5 },
                    { category: '피부', gmv: 64, fee: 12.8 },
                    { category: '치과', gmv: 38, fee: 5.7 },
                    { category: '안과', gmv: 24, fee: 3.6 },
                    { category: '검진', gmv: 16, fee: 1.6 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="category" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${v}M`} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="gmv" name="GMV (₩M)" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="fee" name="송객 수수료 (₩M)" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-2 text-[11px] text-muted-foreground">
        모든 수치는 데모 데이터입니다. 실제 RLS 스코프된 쿼리는 Phase 9.5에서 활성화됩니다.
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  accent,
  positive,
}: {
  label: string;
  value: string;
  delta: string;
  accent: 'brand' | 'care' | 'hospitality';
  positive?: boolean;
}): JSX.Element {
  const ringClass =
    accent === 'brand'
      ? 'ring-brand-200'
      : accent === 'care'
        ? 'ring-care-200'
        : 'ring-hospitality-200';
  const isUp = positive === undefined ? !delta.startsWith('-') : positive;
  return (
    <Card>
      <CardContent className={`flex items-end justify-between p-5 ring-1 ${ringClass}`}>
        <div className="min-w-0 space-y-0.5">
          <div className="text-[11px] text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
        <div className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${isUp ? 'text-care-700' : 'text-hospitality-700'}`}>
          {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCell({
  label,
  value,
  hint,
  variant,
}: {
  label: string;
  value: string;
  hint: string;
  variant?: 'brand' | 'care' | 'hospitality' | 'destructive';
}): JSX.Element {
  const valueColor =
    variant === 'care'
      ? 'text-care-700'
      : variant === 'hospitality'
        ? 'text-hospitality-700'
        : variant === 'destructive'
          ? 'text-destructive'
          : '';
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function UtmRow({ source, leads, cases }: { source: string; leads: number; cases: number }): JSX.Element {
  const conv = cases / leads;
  return (
    <li className="flex items-center justify-between gap-2 border-t border-dashed border-border/60 py-1.5 first:border-t-0 first:pt-0">
      <span className="truncate font-mono text-[11px]">{source}</span>
      <span className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>{leads} 리드</span>
        <span>·</span>
        <span>{cases} 케이스</span>
        <Badge variant={conv > 0.02 ? 'care' : 'secondary'}>{(conv * 100).toFixed(2)}%</Badge>
      </span>
    </li>
  );
}
