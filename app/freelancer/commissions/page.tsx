import Link from 'next/link';
import { eq, and } from 'drizzle-orm';
import { ArrowRight, Wallet, Clock, CheckCircle2, Receipt } from 'lucide-react';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { freelancerAffiliations } from '@/drizzle/schema/affiliations';
import { organizations } from '@/drizzle/schema/organizations';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';

export const metadata = { title: '커미션' };
export const dynamic = 'force-dynamic';

/**
 * Commission overview for the freelancer. Phase 6 결제 엔진 (per the
 * project roadmap) is the source of truth for actual payouts — that
 * stack runs on the agency side and produces transactions linked to
 * this freelancer. Until those transactions exist, this view is a
 * structural placeholder that explains the flow and surfaces the
 * commission policy from the affiliation table.
 *
 * What's already real:
 *   - freelancer_affiliations.commission_policy_json — shows the rate
 *     each agency has agreed to pay.
 */
function summarizePolicy(
  policy: {
    calc_type?: string;
    rate_bp?: number;
    fixed_amount_minor?: number;
    base?: string;
    payout_trigger?: string;
  } | null,
): string {
  if (!policy) return '정책 미설정';
  if (policy.calc_type === 'percent_of_revenue' && policy.rate_bp) {
    return `매출의 ${(policy.rate_bp / 100).toFixed(1)}%`;
  }
  if (policy.calc_type === 'percent_of_margin' && policy.rate_bp) {
    return `마진의 ${(policy.rate_bp / 100).toFixed(1)}%`;
  }
  if (policy.calc_type === 'fixed_amount' && policy.fixed_amount_minor) {
    return `건당 ${(policy.fixed_amount_minor / 100).toLocaleString()} 원 정액`;
  }
  if (policy.calc_type === 'tiered') return '구간별 차등 (Tiered)';
  return policy.calc_type ?? '정책 미설정';
}

const PAYOUT_TRIGGER_KO: Record<string, string> = {
  on_payment: '환자 결제 시',
  on_treatment_done: '시술 완료 시',
  on_discharge: '퇴원 시',
  on_recovery_d7: '회복 D+7',
  on_recovery_d30: '회복 D+30',
};

export default async function FreelancerCommissionsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['freelancer'] });

  let affiliations: Array<{
    id: string;
    agencyName: string;
    referralCode: string;
    policy: {
      calc_type?: string;
      rate_bp?: number;
      fixed_amount_minor?: number;
      base?: string;
      payout_trigger?: string;
    } | null;
  }> = [];
  try {
    affiliations = await withRls(ctx, async () => {
      const rows = await db
        .select({
          id: freelancerAffiliations.id,
          agencyName: organizations.name,
          referralCode: freelancerAffiliations.referralCode,
          policy: freelancerAffiliations.commissionPolicyJson,
        })
        .from(freelancerAffiliations)
        .innerJoin(
          organizations,
          eq(freelancerAffiliations.agencyOrgId, organizations.id),
        )
        .where(
          and(
            eq(freelancerAffiliations.freelancerOrgId, ctx.orgId),
            eq(freelancerAffiliations.isActive, true),
          ),
        );
      return rows;
    });
  } catch {
    // DB unreachable — leave empty.
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="hospitality" className="mb-2">
          💰 커미션
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">커미션 정산 현황</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          내{' '}
          <Link href="/freelancer/referral-codes" className="font-medium underline">
            추천 코드
          </Link>
          로 유입된 케이스가 부킹·결제까지 완료되면 자동으로 커미션이 발생합니다. Agency별 정책
          (요율·지급 트리거)은 아래에 표시됩니다.
        </p>
      </div>

      {/* Stat cards — all zero for v1 until Phase 6 결제 엔진 wiring */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Clock}
          label="이번 달 발생 (예정)"
          value="₩0"
          hint="아직 정산 트리거 조건 충족 안 됨"
        />
        <StatCard
          icon={CheckCircle2}
          label="누적 지급 완료"
          value="₩0"
          hint="실제 송금 완료된 누계"
          variant="care"
        />
        <StatCard
          icon={Wallet}
          label="미수금"
          value="₩0"
          hint="발생했지만 아직 미지급"
          variant="hospitality"
        />
      </div>

      {/* Affiliation-level commission policies */}
      <div>
        <h2 className="mb-2 text-sm font-bold">Agency별 정산 정책</h2>
        {affiliations.length === 0 ? (
          <Card>
            <CardContent className="space-y-2 p-4 text-sm">
              <div className="font-semibold">아직 소속된 Agency가 없습니다</div>
              <p className="text-xs text-muted-foreground">
                Agency가 본 프리랜서를 등록(affiliation 생성)해야 커미션 정책이 적용됩니다. 등록
                절차는 협력 Agency 담당자에게 문의해 주세요.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {affiliations.map((a) => (
              <Card key={a.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{a.agencyName}</h3>
                    <code className="font-mono text-[10px] text-muted-foreground">
                      {a.referralCode}
                    </code>
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/20 px-2 py-2 text-[11px]">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                        요율
                      </div>
                      <div className="font-bold">{summarizePolicy(a.policy)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                        지급 시점
                      </div>
                      <div className="font-bold">
                        {a.policy?.payout_trigger
                          ? PAYOUT_TRIGGER_KO[a.policy.payout_trigger] ??
                            a.policy.payout_trigger
                          : '미설정'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Empty payout history */}
      <div>
        <h2 className="mb-2 text-sm font-bold">정산 내역</h2>
        <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
          <Receipt className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
          <p>아직 정산 내역이 없습니다.</p>
          <p className="mt-1 text-[11px]">
            첫 케이스가 지급 트리거 조건을 충족하면 이 자리에 거래가 누적됩니다.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-2 p-5">
          <h3 className="text-sm font-semibold">정산 흐름 요약</h3>
          <ol className="space-y-1.5 text-xs text-muted-foreground">
            <li>① 내 추천 코드로 환자 유입 → Lead 등록</li>
            <li>② Agency가 케이스 진행 → Quoted → Booked</li>
            <li>③ 환자가 시술료 결제 / 시술 완료 (정책 트리거 충족)</li>
            <li>④ 시스템이 affiliation 정책으로 커미션 자동 계산</li>
            <li>⑤ Agency가 지급 처리 → 정산 내역에 거래 누적</li>
          </ol>
          <div className="flex gap-2 pt-2">
            <Link href="/freelancer/referral-codes">
              <Button variant="brand" size="sm">
                추천 코드 보기
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href="/freelancer/disputes">
              <Button variant="outline" size="sm">
                정산 이의 제기 →
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  variant = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  variant?: 'default' | 'care' | 'hospitality';
}): JSX.Element {
  const tint = {
    default: 'bg-muted text-muted-foreground',
    care: 'bg-care-50 text-care-700',
    hospitality: 'bg-hospitality-50 text-hospitality-700',
  }[variant];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${tint}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-xl font-bold">{value}</div>
          </div>
        </div>
        {hint ? <p className="mt-2 text-[10px] text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
