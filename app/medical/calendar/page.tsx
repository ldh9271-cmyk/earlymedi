import { Calendar } from 'lucide-react';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { listHospitalCharts, listVisibleCases } from '@/lib/medical/console-queries';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent } from '@/components/shared/ui/card';
import { EmptyState } from '@/components/shared/empty-state';

export const metadata = { title: '예약 캘린더' };
export const dynamic = 'force-dynamic';

type Entry = {
  date: string; // YYYY-MM-DD
  kind: 'arrival' | 'departure' | 'treatment';
  label: string;
  sub: string | null;
};

const KIND_META: Record<Entry['kind'], { label: string; variant: 'brand' | 'care' | 'hospitality' }> = {
  arrival: { label: '입국', variant: 'brand' },
  treatment: { label: '시술', variant: 'care' },
  departure: { label: '출국', variant: 'hospitality' },
};

/**
 * 예약 캘린더 — 우리 병원 케이스의 도착·출국 일정과 시술 차트의
 * 시술일을 날짜순으로 모아 본다. 별도 예약 테이블 없이, 케이스와
 * 차트에 이미 기록된 날짜가 곧 일정이다.
 */
export default async function MedicalCalendarPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const { visibleCases, charts } = await withRls(ctx, async () => ({
    visibleCases: await listVisibleCases(ctx.orgId),
    charts: await listHospitalCharts(ctx.orgId),
  }));

  const entries: Entry[] = [];
  for (const c of visibleCases) {
    const date = c.actualArrivalDate ?? c.estimatedArrivalDate;
    if (date) {
      entries.push({
        date,
        kind: 'arrival',
        label: c.title,
        sub: `${c.caseNumber}${c.actualArrivalDate ? '' : ' · 예정'}`,
      });
    }
    if (c.estimatedDepartureDate) {
      entries.push({ date: c.estimatedDepartureDate, kind: 'departure', label: c.title, sub: c.caseNumber });
    }
  }
  for (const ch of charts) {
    if (ch.treatmentDate && ch.status !== 'voided') {
      entries.push({
        date: ch.treatmentDate,
        kind: 'treatment',
        label: ch.doctorName ? `시술 — ${ch.doctorName}` : '시술',
        sub: `₩${ch.grandTotalKrw.toLocaleString('ko-KR')}`,
      });
    }
  }
  entries.sort((a, b) => b.date.localeCompare(a.date));

  // 월별 그룹 (최근 월부터)
  const byMonth = new Map<string, Entry[]>();
  for (const e of entries) {
    const month = e.date.slice(0, 7);
    const bucket = byMonth.get(month) ?? [];
    bucket.push(e);
    byMonth.set(month, bucket);
  }
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">예약 캘린더</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          케이스의 입국·출국 일정과 시술 차트의 시술일을 한 줄로 봅니다. 날짜는 에이전시
          케이스·차트에 기록된 값이 그대로 반영됩니다.
        </p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={Calendar}
              title="예정된 일정이 없습니다"
              description="우리 병원으로 확정된 케이스에 도착일이 잡히거나 시술 차트가 작성되면 일정이 나타납니다."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {[...byMonth.entries()].map(([month, list]) => (
            <div key={month}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{month}</h2>
              <Card>
                <CardContent className="divide-y p-0">
                  {list.map((e, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3">
                      <div
                        className={`w-24 shrink-0 text-sm font-semibold ${e.date === today ? 'text-brand-600' : ''}`}
                      >
                        {e.date.slice(5)}
                        {e.date === today ? ' · 오늘' : ''}
                      </div>
                      <Badge variant={KIND_META[e.kind].variant}>{KIND_META[e.kind].label}</Badge>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{e.label}</div>
                        {e.sub ? <div className="text-[11px] text-muted-foreground">{e.sub}</div> : null}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
