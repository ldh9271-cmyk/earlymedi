import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { db } from '@/lib/db/client';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { organizations } from '@/drizzle/schema/organizations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { ACCOUNT_TYPE_LABEL_KO } from '@/lib/auth/account-types';
import { getTrialStatus } from '@/lib/billing/trial-quota';

export const metadata = { title: '유료 플랜으로 전환' };
export const dynamic = 'force-dynamic';

/**
 * Paywall page shown when a free-trial org tries to register patient #11.
 *
 * The actor-specific plan menu is shown below (single-tier "convert now"
 * recommendation per actor). The full Stripe checkout lives in Phase 6 —
 * for the unlock-paywall demo, we surface a primary CTA that the user
 * clicks to start the subscription. Until Stripe is wired up production
 * side, we just mark the billing account 'active' on a placeholder route.
 */
export default async function UpgradePage(): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?next=/upgrade');

  // Find the user's active org (if any). If they have none, kick them to
  // /select-org to pick one (or sign up).
  let activeOrg: { id: string; name: string; accountType: 'agency' | 'medical' | 'freelancer' | 'non_medical' } | null = null;
  try {
    const [m] = await db
      .select({
        orgId: organizations.id,
        orgName: organizations.name,
        accountType: organizations.accountType,
      })
      .from(orgMemberships)
      .innerJoin(organizations, eq(orgMemberships.organizationId, organizations.id))
      .where(eq(orgMemberships.userId, auth.user.id))
      .limit(1);
    if (m) activeOrg = { id: m.orgId, name: m.orgName, accountType: m.accountType };
  } catch {
    // DB unreachable — show generic upgrade pitch with no quota data.
  }

  const status = activeOrg ? await getTrialStatus(activeOrg.id).catch(() => null) : null;

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="hospitality" className="mb-2">유료 플랜으로 전환</Badge>
        <h1 className="text-2xl font-bold tracking-tight">1개월 무료 체험이 끝났습니다</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeOrg ? (
            <>
              <strong>{activeOrg.name}</strong> ({ACCOUNT_TYPE_LABEL_KO[activeOrg.accountType]}) 의 1개월
              무료 체험 기간이 종료되었습니다. 계속 이용하시려면 유료 플랜으로 전환해 주세요.
            </>
          ) : (
            '1개월 무료 체험 기간이 종료되었습니다. 유료 플랜으로 전환해 주세요.'
          )}
        </p>
      </div>

      {status && status.endsAt ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">체험 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-3xl font-bold tracking-tight">
                  {status.blocked ? (
                    '종료됨'
                  ) : (
                    <>
                      {status.daysRemaining}
                      <span className="text-base font-normal text-muted-foreground"> 일 남음</span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  체험 종료일 {status.endsAt.toISOString().slice(0, 10)}
                  {status.blocked ? ' · 신규 환자 등록이 차단되었습니다.' : ''}
                </p>
              </div>
              <p className="text-right text-xs text-muted-foreground">
                체험 기간 중 등록
                <br />
                <span className="text-sm font-semibold text-foreground">{status.used}명</span>
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">전체 기능 무제한 사용</CardTitle>
          <CardDescription>유료 전환 시 기간 제한 없이 환자 등록 · 모든 AI 기능 · 사후관리 알림 · 전체 정산 기능</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-care-600">✓</span>
              <span>환자 등록 <strong>무제한</strong> (체험 기간 제한 해제)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-care-600">✓</span>
              <span>10채널 다국어 인박스 · AI 번역 · 견적 자동 생성</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-care-600">✓</span>
              <span>AI 시술 차트 자동 채움 (Gemini 2.5 Pro + Claude Opus 4.7)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-care-600">✓</span>
              <span>케이스 · 결제 · 정산 · 비자 · 사후관리 D+1/3/7/30/90/180/365</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-care-600">✓</span>
              <span>의료법 제27조의2 컴플라이언스 자동 감사 로그</span>
            </li>
          </ul>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Link href="/pricing" className="flex-1">
              <Button variant="outline" className="w-full">요금제 자세히 보기</Button>
            </Link>
            <Link href="mailto:sales@koreaglowup.com?subject=KoreaGlowUp%20%EC%9C%A0%EB%A3%8C%20%EC%A0%84%ED%99%98%20%EB%AC%B8%EC%9D%98" className="flex-1">
              <Button variant="brand" className="w-full">영업팀에 문의 →</Button>
            </Link>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            결제 모듈 (Stripe / Toss) 연동은 곧 활성화 예정입니다. 그 사이엔 영업팀이 직접 안내해 드립니다.
          </p>
        </CardContent>
      </Card>

      <div className="text-center">
        <Link href="/select-org" className="text-xs text-muted-foreground underline">
          ← 대시보드로 돌아가기
        </Link>
      </div>
    </div>
  );
}
