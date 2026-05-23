import { requireAccess } from '@/lib/auth/route-guards';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { NewChartForm } from '@/components/medical/charts/new-chart-form';

export const metadata = { title: '새 시술 차트' };

export default async function NewChartPage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['medical'] });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">새 시술 차트</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          시술 후 24시간 내 작성을 권장합니다. AI 자동 채움(사진·PDF·텍스트)으로 라인 항목을 한 번에 가져올 수 있습니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">차트 헤더 정보</CardTitle>
          <CardDescription>환자·병원·시술일 기준 1건을 생성합니다. 라인 항목은 다음 단계에서 편집합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewChartForm />
        </CardContent>
      </Card>
    </div>
  );
}
