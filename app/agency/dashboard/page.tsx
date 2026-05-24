import Link from 'next/link';
import { and, eq, gte, sql } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { conversations } from '@/drizzle/schema/conversations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { Inbox, ListChecks, Wallet, BarChart3 } from 'lucide-react';

export const metadata = { title: '에이전시 대시보드' };

export default async function AgencyDashboardPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });

  const stats = await withRls(ctx, async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [newLeads] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(conversations)
      .where(
        and(
          eq(conversations.organizationId, ctx.orgId),
          eq(conversations.stage, 'lead'),
          gte(conversations.createdAt, since),
        ),
      );
    const [open] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(conversations)
      .where(
        and(
          eq(conversations.organizationId, ctx.orgId),
          sql`${conversations.stage} IN ('qualified','case','quoted','booked')`,
        ),
      );
    const [unread] = await db
      .select({ n: sql<number>`coalesce(sum(${conversations.unreadCount}), 0)::int` })
      .from(conversations)
      .where(eq(conversations.organizationId, ctx.orgId));
    return {
      newLeads: newLeads?.n ?? 0,
      open: open?.n ?? 0,
      unread: unread?.n ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">에이전시 대시보드</h1>
          <p className="text-sm text-muted-foreground">
            <Badge variant="brand">유치업체</Badge>{' '}
            <span className="ml-1">{ctx.email} · {ctx.membershipRole}</span>
          </p>
        </div>
        <Link href="/agency/inbox">
          <Button variant="brand">통합 인박스 열기</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Inbox}
          label="신규 리드 (24h)"
          value={String(stats.newLeads)}
          hint="최근 24시간 동안 인박스에 새로 들어온 환자 문의 수. AI가 아직 자격 검증을 안 한 'lead' 단계 대화만 집계."
        />
        <StatCard
          icon={ListChecks}
          label="진행 중 케이스"
          value={String(stats.open)}
          hint="시술 견적 받기 ~ 예약 완료 단계 (qualified · case · quoted · booked). 종결/취소된 케이스는 제외."
        />
        <StatCard
          icon={Wallet}
          label="이번 달 GMV"
          value="₩0"
          hint="이번 달 정산 완료된 시술 총 거래액 (Gross Merchandise Value). Phase 6 결제 엔진 활성화 시 자동 집계."
        />
        <StatCard
          icon={BarChart3}
          label="안 읽음 메시지"
          value={String(stats.unread)}
          hint="모든 채널 누적 미확인 환자 메시지. 24시간 내 미응대 시 SLA 위반 알림."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>다음 단계</CardTitle>
          <CardDescription>Phase 3에서 AI 답변 추천·번역·감정 분석, Phase 4에서 환자 CRM·병원 마켓플레이스·시술 차트가 활성화됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.open + stats.newLeads === 0 ? (
            <EmptyState
              icon={Inbox}
              title="아직 데이터가 없습니다"
              description="협력 병원 등록, 프리랜서 초대, 첫 환자 문의 수신을 시작해 보세요."
            />
          ) : (
            <Link href="/agency/inbox">
              <Button variant="outline">→ 인박스에서 진행 중 대화 보기</Button>
            </Link>
          )}
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}): JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-brand-50 p-2">
            <Icon className="h-5 w-5 text-brand-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="truncate text-xl font-bold">{value}</div>
          </div>
        </div>
        {hint ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
