import { Inbox } from 'lucide-react';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { getLinkedHospitals, listRfqs } from '@/lib/medical/console-queries';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { formatLocal } from '@/lib/utils/date';
import { replyRfqAction } from './_actions/rfq';

export const metadata = { title: 'RFQ 인박스' };
export const dynamic = 'force-dynamic';

const STATUS_META: Record<string, { label: string; variant: 'brand' | 'hospitality' | 'care' | 'outline' | 'destructive' }> = {
  requested: { label: '응답 대기', variant: 'hospitality' },
  received: { label: '견적 회신됨', variant: 'brand' },
  selected: { label: '선택됨 🎉', variant: 'care' },
  rejected: { label: '미채택', variant: 'outline' },
  expired: { label: '기한 만료', variant: 'outline' },
};

function won(n: number | null): string {
  return n == null ? '—' : `₩${n.toLocaleString('ko-KR')}`;
}

/**
 * RFQ 인박스 — 유치업체가 우리 병원 리스팅으로 보낸 견적 요청
 * (case_quotes 슬롯)을 확인하고 금액·조건을 회신한다. 회신하면
 * status=received 로 바뀌어 에이전시 견적 비교 화면에 올라간다.
 * 선택/탈락 결정은 에이전시·환자 몫이라 여기서는 읽기만 한다.
 */
export default async function MedicalRfqsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const { linked, rfqs } = await withRls(ctx, async () => ({
    linked: await getLinkedHospitals(ctx.orgId),
    rfqs: await listRfqs(ctx.orgId),
  }));

  const waiting = rfqs.filter((r) => r.status === 'requested').length;
  const selected = rfqs.filter((r) => r.status === 'selected').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">RFQ 인박스</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          해외 환자 케이스의 견적 요청입니다 — 수신·회신은 무료이며, 시술이 성사되어 최종
          결제가 확정될 때 계약 요율(10~30%)의 수수료만 정산됩니다. 회신한 견적은 에이전시
          비교 화면에 올라가고, 선택 결과가 이 목록에 표시됩니다.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ['응답 대기', waiting],
          ['전체 요청', rfqs.length],
          ['선택된 견적', selected],
        ].map(([label, n]) => (
          <Card key={label}>
            <CardContent className="py-4">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-2xl font-bold">{n}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {linked.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={Inbox}
              title="연결된 병원 리스팅이 없습니다"
              description="RFQ는 마켓플레이스의 병원 리스팅으로 도착합니다. 협력 에이전시 또는 글로우업투어 담당 매니저에게 리스팅 연결을 요청해 주세요."
            />
          </CardContent>
        </Card>
      ) : rfqs.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={Inbox}
              title="아직 도착한 견적 요청이 없습니다"
              description={`연결된 리스팅 ${linked.length}곳(${linked.map((h) => h.name).join(', ')})으로 RFQ가 오면 여기에 표시됩니다.`}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rfqs.map((r) => {
            const meta = STATUS_META[r.status] ?? { label: r.status, variant: 'outline' as const };
            const editable = r.status === 'requested' || r.status === 'received';
            return (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">
                      {r.caseTitle ?? '케이스 상세 비공개'}{' '}
                      {r.caseNumber ? (
                        <span className="text-xs font-normal text-muted-foreground">{r.caseNumber}</span>
                      ) : null}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {r.agencyName ?? '에이전시'} → {r.hospitalName} · 요청{' '}
                      {formatLocal(new Date(r.requestedAt), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')}
                      {r.receivedAt
                        ? ` · 회신 ${formatLocal(new Date(r.receivedAt), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')}`
                        : ''}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <div className="text-sm font-semibold">{won(r.totalKrw)}</div>
                    {r.depositKrw != null ? (
                      <div className="text-[11px] text-muted-foreground">예약금 {won(r.depositKrw)}</div>
                    ) : null}
                  </div>
                </CardHeader>
                {editable ? (
                  <CardContent className="pt-0">
                    <details className="group rounded-lg border bg-muted/30">
                      <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium text-foreground">
                        {r.status === 'requested' ? '견적 회신하기' : '회신 내용 수정'}
                      </summary>
                      <form action={replyRfqAction} className="grid gap-3 px-4 pb-4 pt-1 sm:grid-cols-2">
                        <input type="hidden" name="quoteId" value={r.id} />
                        <label className="text-xs">
                          <span className="mb-1 block font-medium">총 견적액 (원) *</span>
                          <input
                            name="totalKrw"
                            type="number"
                            min={0}
                            step={10000}
                            required
                            defaultValue={r.totalKrw ?? undefined}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          />
                        </label>
                        <label className="text-xs">
                          <span className="mb-1 block font-medium">예약금 (원)</span>
                          <input
                            name="depositKrw"
                            type="number"
                            min={0}
                            step={10000}
                            defaultValue={r.depositKrw ?? undefined}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          />
                        </label>
                        <label className="text-xs">
                          <span className="mb-1 block font-medium">견적 유효기한</span>
                          <input
                            name="validUntil"
                            type="date"
                            defaultValue={r.validUntil ?? undefined}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          />
                        </label>
                        <label className="text-xs sm:col-span-2">
                          <span className="mb-1 block font-medium">조건 · 메모 (마취·입원·보증 등)</span>
                          <textarea
                            name="hospitalNotes"
                            rows={3}
                            maxLength={2000}
                            defaultValue={r.hospitalNotes ?? undefined}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </label>
                        <div className="sm:col-span-2">
                          <Button type="submit" variant="brand" size="sm">
                            {r.status === 'requested' ? '견적 회신' : '회신 업데이트'}
                          </Button>
                        </div>
                      </form>
                    </details>
                  </CardContent>
                ) : r.hospitalNotes ? (
                  <CardContent className="pt-0 text-xs text-muted-foreground">
                    회신 메모: {r.hospitalNotes}
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
