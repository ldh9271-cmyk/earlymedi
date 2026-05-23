import Link from 'next/link';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { listCharts } from '@/lib/db/repositories/treatment-charts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ClipboardCheck } from 'lucide-react';
import { formatLocal } from '@/lib/utils/date';

export const metadata = { title: '시술 차트' };

const STATUS_LABEL: Record<string, string> = {
  draft: '작성 중',
  submitted: '제출됨',
  agency_review: '에이전시 검토',
  changes_requested: '수정 요청',
  agency_approved: '에이전시 승인',
  patient_shared: '환자 공유',
  finalized: '확정',
  voided: '취소',
};

const STATUS_VARIANT: Record<string, 'brand' | 'hospitality' | 'care' | 'outline'> = {
  draft: 'outline',
  submitted: 'brand',
  agency_review: 'brand',
  changes_requested: 'hospitality',
  agency_approved: 'care',
  patient_shared: 'care',
  finalized: 'care',
  voided: 'outline',
};

export default async function MedicalChartsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const charts = await withRls(ctx, () => listCharts(ctx.orgId, {}, 50));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">시술 차트</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            병원 작성 → 에이전시 검증 → 환자 공유. <span className="font-medium">finalize 후 수정 불가, 새 버전만 생성</span> 됩니다.
          </p>
        </div>
        <Link href="/medical/charts/new">
          <Button variant="care">+ 새 차트</Button>
        </Link>
      </div>

      {charts.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={ClipboardCheck}
              title="아직 차트가 없습니다"
              description="환자가 도착해서 시술이 완료되면 차트를 작성하세요. AI 자동 채움(사진·PDF·텍스트)으로 5분 이내 완성할 수 있습니다."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {charts.map((c) => (
            <Link key={c.id} href={`/medical/charts/${c.id}`} className="block">
              <Card className="transition hover:ring-2 hover:ring-care-300">
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="min-w-0">
                    <CardTitle className="text-base">
                      {c.treatmentDate} · {c.doctorName ?? '의사 미지정'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      v{c.versionNumber} · 최종 수정 {formatLocal(new Date(c.updatedAt), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right">
                    <Badge variant={STATUS_VARIANT[c.status] ?? 'outline'}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                    <div className="text-sm font-semibold">
                      ₩{c.grandTotalKrw.toLocaleString('ko-KR')}
                    </div>
                    {c.quoteVarianceFlag ? (
                      <span className="text-[10px] text-muted-foreground">
                        견적 대비 {c.quoteVarianceFlag === 'auto' ? '자동 승인' : c.quoteVarianceFlag === 'manager' ? '매니저 검토' : '환자 재동의'}
                      </span>
                    ) : null}
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
