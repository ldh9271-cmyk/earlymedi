import { requireAccess } from '@/lib/auth/route-guards';
import { redirect } from 'next/navigation';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { hospitalRegistry } from '@/drizzle/schema/hospital-registry';
import { hospitals } from '@/drizzle/schema/hospitals';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { ClipboardCheck, Inbox, Stethoscope, Wallet } from 'lucide-react';

export const metadata = { title: '의료기관 대시보드' };

export default async function MedicalDashboardPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  // 병원 정보 등록(검수 승인)이 끝나기 전에는 '병원 공개 정보' 를 첫 화면으로 — 가입 직후 등록 방식 선택부터
  const [reg] = await db
    .select({ status: sql<string | null>`${hospitalRegistry.details}->'submission'->>'status'` })
    .from(hospitalRegistry).where(eq(hospitalRegistry.claimOrgId, ctx.orgId)).limit(1);
  if (reg && reg.status !== 'approved') redirect('/medical/registry');
  if (!reg) {
    const [h] = await db.select({ id: hospitals.id }).from(hospitals).where(eq(hospitals.organizationId, ctx.orgId)).limit(1);
    if (!h) redirect('/medical/registry');
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">병원 대시보드</h1>
        <p className="text-sm text-muted-foreground">
          <Badge variant="care">의료기관</Badge>{' '}
          <span className="ml-1">{ctx.email}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Inbox} label="대기 중 RFQ" value="0" />
        <StatCard icon={Stethoscope} label="오늘 예약" value="0" />
        <StatCard icon={ClipboardCheck} label="미작성 시술 차트" value="0" />
        <StatCard icon={Wallet} label="정산 예정" value="₩0" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>시술 차트 운영 안내</CardTitle>
          <CardDescription>
            병원 작성 → 에이전시 검증 → 환자 공유 3단 워크플로우. AI 자동 채움(사진·PDF·텍스트·음성)
            을 통해 5분 이내 finalize 가능합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={ClipboardCheck}
            title="아직 차트가 없습니다"
            description="Phase 4에서 차트 모듈 + AI 자동 채움이 활성화되면 첫 차트를 작성할 수 있습니다."
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
        <div className="rounded-lg bg-care-50 p-2">
          <Icon className="h-5 w-5 text-care-600" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
