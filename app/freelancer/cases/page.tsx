import Link from 'next/link';
import { eq, and } from 'drizzle-orm';
import { ArrowRight, ListChecks, Sparkles } from 'lucide-react';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { freelancerAffiliations } from '@/drizzle/schema/affiliations';
import { organizations } from '@/drizzle/schema/organizations';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';

export const metadata = { title: '내 케이스' };
export const dynamic = 'force-dynamic';

/**
 * Freelancer pipeline view. Shows the cases that originated from this
 * freelancer's referral codes, bucketed by Agency-side stage.
 *
 * Today this is a structural placeholder — the agency-side flow that
 * attributes a conversation/case to a freelancer's referral_code is
 * still being wired. As soon as conversations carry a referral_code_id
 * (Phase 5+ work), this page populates automatically.
 *
 * What's already real:
 *   - freelancer_affiliations (which agencies this freelancer works
 *     with) — fetched and shown so the operator can see who handles
 *     their referrals downstream.
 */
const STAGES: Array<{ key: string; label: string }> = [
  { key: 'lead', label: 'Lead' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'case', label: 'Case' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'booked', label: 'Booked' },
];

export default async function FreelancerCasesPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['freelancer'] });

  // Show which agencies this freelancer is affiliated with (already
  // wired via freelancer_affiliations table). Useful context even
  // before the case attribution flow goes live.
  let affiliations: Array<{
    id: string;
    agencyName: string;
    referralCode: string;
    isActive: boolean;
  }> = [];
  try {
    affiliations = await withRls(ctx, async () => {
      const rows = await db
        .select({
          id: freelancerAffiliations.id,
          agencyName: organizations.name,
          referralCode: freelancerAffiliations.referralCode,
          isActive: freelancerAffiliations.isActive,
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
    // DB unreachable or schema missing — leave empty.
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="hospitality" className="mb-2">
          🧭 내 케이스
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">송객 파이프라인</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          내가{' '}
          <Link href="/freelancer/referral-codes" className="font-medium underline">
            추천 코드
          </Link>
          로 데려온 환자가 Agency 측 단계에 따라 어디에 와 있는지 한눈에 확인합니다. 단계가 진행될
          때마다{' '}
          <Link href="/freelancer/commissions" className="font-medium underline">
            커미션
          </Link>
          이 누적됩니다.
        </p>
      </div>

      {/* Affiliations — which agencies handle this freelancer's referrals */}
      {affiliations.length > 0 ? (
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              소속 Agency ({affiliations.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {affiliations.map((a) => (
                <div
                  key={a.id}
                  className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-xs"
                >
                  <Sparkles className="h-3 w-3 text-hospitality-500" />
                  <span className="font-semibold">{a.agencyName}</span>
                  <code className="font-mono text-[10px] text-muted-foreground">
                    {a.referralCode}
                  </code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            <div className="font-semibold">소속 Agency가 아직 없습니다</div>
            <p className="text-xs text-muted-foreground">
              Agency 측 담당자에게 본인 프리랜서 계정을 등록해 달라고 요청하면 협업이 시작됩니다.
              등록 후 발급되는 Agency 측 referral_code와는 별도로, 내 채널 추적용 코드는
              <Link href="/freelancer/referral-codes" className="font-medium underline">
                {' 추천 코드 '}
              </Link>
              에서 자유롭게 발급할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pipeline columns — empty placeholders for now */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {STAGES.map((s) => (
          <Card key={s.key} className="min-h-[200px]">
            <CardContent className="space-y-2 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider">
                  {s.label}
                </div>
                <Badge variant="outline" className="text-[10px]">0</Badge>
              </div>
              <div className="rounded-md border border-dashed bg-muted/10 px-2 py-6 text-center text-[11px] text-muted-foreground">
                해당 단계 케이스 없음
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-hospitality-500" />
            <h3 className="text-sm font-semibold">아직 케이스가 없습니다 — 어떻게 시작?</h3>
          </div>
          <ol className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">①</span>
              <Link href="/freelancer/referral-codes" className="underline">추천 코드</Link>
              에서 채널별 코드 + QR 발급
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">②</span>
              QR을 명함·SNS·인쇄물에 게시하거나 추적 URL을 직접 공유
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">③</span>
              잠재 환자가 코드를 통해 문의 → 자동으로 이 페이지의 Lead 단계에 표시
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">④</span>
              Agency가 케이스를 진행하면 단계가 자동 업데이트되고{' '}
              <Link href="/freelancer/commissions" className="underline">커미션</Link>이 누적
            </li>
          </ol>
          <Link href="/freelancer/referral-codes">
            <Button variant="brand" size="sm">
              추천 코드 보러 가기
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
