import { requireAccess } from '@/lib/auth/route-guards';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Calendar, TicketCheck, Utensils, Wallet } from 'lucide-react';

export const metadata = { title: '파트너 대시보드' };

export default async function PartnerDashboardPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">파트너 대시보드</h1>
        <p className="text-sm text-muted-foreground">
          <Badge variant="slate">비의료 파트너</Badge>{' '}
          <span className="ml-1">{ctx.email}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TicketCheck} label="대기 부킹" value="0" />
        <StatCard icon={Calendar} label="이번 주 일정" value="0" />
        <StatCard icon={Utensils} label="메뉴 등록" value="0" />
        <StatCard icon={Wallet} label="정산 예정" value="₩0" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>가용성 캘린더 설정</CardTitle>
          <CardDescription>
            객실 · 좌석 · 차량 · 가이드 일정을 캘린더에 등록하면 Agency 패키지 빌더에서 자동
            매칭됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Calendar}
            title="아직 등록된 가용성이 없습니다"
            description="Phase 5에서 가용성 캘린더와 시술 후 제약(D+N) 모듈이 활성화됩니다."
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}): JSX.Element {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className="rounded-lg bg-slate-100 p-2">
          <Icon className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
