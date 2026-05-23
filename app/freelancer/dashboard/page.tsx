import { requireAccess } from '@/lib/auth/route-guards';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Sparkles, Wallet, ListChecks, QrCode } from 'lucide-react';

export const metadata = { title: '프리랜서 대시보드' };

export default async function FreelancerDashboardPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['freelancer'] });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">프리랜서 대시보드</h1>
        <p className="text-sm text-muted-foreground">
          <Badge variant="hospitality">프리랜서</Badge>{' '}
          <span className="ml-1">{ctx.email}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ListChecks} label="진행 중 케이스" value="0" />
        <StatCard icon={Sparkles} label="이번 달 송객" value="0" />
        <StatCard icon={Wallet} label="예상 커미션" value="₩0" />
        <StatCard icon={Wallet} label="미수금" value="₩0" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>추천 코드로 송객 시작</CardTitle>
          <CardDescription>
            소속 Agency가 발급한 추천 코드로 다국어 랜딩과 QR을 생성하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={QrCode}
            title="아직 활성 추천 코드가 없습니다"
            description="Phase 6 정산 엔진 활성화 후, 코드를 통한 송객 추적과 자동 정산이 가능해집니다."
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
        <div className="rounded-lg bg-hospitality-50 p-2">
          <Icon className="h-5 w-5 text-hospitality-600" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
