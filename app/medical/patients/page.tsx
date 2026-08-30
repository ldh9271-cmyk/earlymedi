import Link from 'next/link';
import { UserCircle } from 'lucide-react';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { listVisibleCases } from '@/lib/medical/console-queries';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { formatLocal } from '@/lib/utils/date';

export const metadata = { title: '환자' };
export const dynamic = 'force-dynamic';

const STAGE_LABEL: Record<string, string> = {
  scoping: '상담 중',
  qualified: '자격 확인',
  case: '케이스 진행',
  quoted: '견적 발행',
  booked: '예약 확정',
  arrived: '입국',
  in_treatment: '시술 중',
  recovery: '회복',
  closed: '종결',
  cancelled: '취소',
};

/**
 * 환자 — 우리 병원에 시술 차트가 걸린 케이스 목록.
 *
 * 환자 개인정보(이름·연락처)는 유치업체 스코프라 RLS 가 차단한다 —
 * 병원은 케이스 단위(제목·일정·차트)로만 본다. 실명·연락처가 필요한
 * 시점(내원)에는 에이전시가 차트·메시지로 공유한다.
 */
export default async function MedicalPatientsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const rows = await withRls(ctx, () => listVisibleCases(ctx.orgId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">환자</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          우리 병원에 시술 차트가 연결된 환자 케이스입니다. 개인정보 최소화 원칙에 따라
          케이스 단위로 표시되며, 실명·연락처는 에이전시가 내원 시점에 공유합니다.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={UserCircle}
              title="아직 연결된 환자 케이스가 없습니다"
              description="에이전시가 우리 병원으로 케이스를 확정하고 시술 차트가 만들어지면 여기에 표시됩니다. 차트는 시술 차트 메뉴에서 직접 작성할 수도 있습니다."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="text-base">
                    {c.title}{' '}
                    <span className="text-xs font-normal text-muted-foreground">{c.caseNumber}</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {c.agencyName ?? '에이전시'} ·{' '}
                    {c.estimatedArrivalDate ? `도착 예정 ${c.estimatedArrivalDate}` : '도착일 미정'}
                    {c.actualArrivalDate ? ` · 입국 ${c.actualArrivalDate}` : ''} · 최근 활동{' '}
                    {formatLocal(new Date(c.lastActivityAt), 'Asia/Seoul', 'yyyy-MM-dd')}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <Badge variant="care">{STAGE_LABEL[c.stage] ?? c.stage}</Badge>
                  <div className="text-sm font-semibold">
                    차트 {c.chartCount}건 · ₩{c.chartTotalKrw.toLocaleString('ko-KR')}
                  </div>
                  <Link href="/medical/charts" className="text-[11px] text-muted-foreground underline underline-offset-2">
                    차트 보기
                  </Link>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
