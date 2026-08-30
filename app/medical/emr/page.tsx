import { eq } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { billingAccounts } from '@/drizzle/schema/billing';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { formatLocal } from '@/lib/utils/date';
import { requestEmrAction, type EmrRequest } from './_actions/emr';

export const metadata = { title: 'EMR 연동' };
export const dynamic = 'force-dynamic';

/**
 * EMR 연동 — 병원에서 쓰는 EMR 벤더 정보를 접수하면 담당 매니저가
 * 벤더와 연동 일정을 조율한다. 연동 전에도 시술 차트의 AI 자동 채움
 * (사진·PDF·텍스트 업로드)은 바로 사용할 수 있다.
 */
export default async function MedicalEmrPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const [account] = await withRls(ctx, () =>
    db
      .select({ metadata: billingAccounts.metadata })
      .from(billingAccounts)
      .where(eq(billingAccounts.organizationId, ctx.orgId))
      .limit(1),
  );
  const emr = (account?.metadata as { emr?: EmrRequest } | null)?.emr ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">EMR 연동</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          사용 중인 EMR 정보를 접수하면 담당 매니저가 벤더와 연동 방식·일정을 조율해
          안내드립니다. 연동 전에도 시술 차트 AI 자동 채움(사진·PDF·텍스트)은 바로 사용할 수 있습니다.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">연동 신청 현황</CardTitle>
            <CardDescription className="text-xs">
              {emr
                ? `${formatLocal(new Date(emr.requestedAt), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')} 접수`
                : '아직 접수된 신청이 없습니다.'}
            </CardDescription>
          </div>
          <Badge variant={emr ? 'brand' : 'outline'}>{emr ? '접수됨 · 조율 중' : '미신청'}</Badge>
        </CardHeader>
        {emr ? (
          <CardContent className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">EMR 벤더</div>
              <div className="font-medium">{emr.vendor}</div>
            </div>
            {emr.contactName ? (
              <div>
                <div className="text-xs text-muted-foreground">담당자</div>
                <div className="font-medium">{emr.contactName}</div>
              </div>
            ) : null}
            {emr.contactPhone ? (
              <div>
                <div className="text-xs text-muted-foreground">연락처</div>
                <div className="font-medium">{emr.contactPhone}</div>
              </div>
            ) : null}
            {emr.memo ? <div className="w-full text-xs text-muted-foreground">{emr.memo}</div> : null}
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{emr ? '신청 내용 수정' : 'EMR 연동 신청'}</CardTitle>
          <CardDescription className="text-xs">
            벤더명과 병원 측 담당자 정보를 남겨주시면 됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={requestEmrAction} className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs">
              <span className="mb-1 block font-medium">EMR 벤더명 *</span>
              <input
                name="vendor"
                required
                maxLength={120}
                defaultValue={emr?.vendor}
                placeholder="예) ○○차트, △△EMR"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-medium">병원 담당자</span>
              <input
                name="contactName"
                maxLength={120}
                defaultValue={emr?.contactName}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-medium">담당자 연락처</span>
              <input
                name="contactPhone"
                maxLength={60}
                defaultValue={emr?.contactPhone}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs sm:col-span-2">
              <span className="mb-1 block font-medium">메모 (버전·요청 사항)</span>
              <textarea
                name="memo"
                rows={3}
                maxLength={1000}
                defaultValue={emr?.memo}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" variant="brand" size="sm">
                {emr ? '수정 저장' : '연동 신청'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
