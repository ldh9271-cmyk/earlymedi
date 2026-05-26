import Link from 'next/link';
import { requireAccess } from '@/lib/auth/route-guards';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import {
  listAvailabilityAction,
  listFacilitiesAction,
} from '@/lib/partner/facilities-actions';
import { AvailabilityCalendar } from './_components/availability-calendar';

export const metadata = { title: '가용성 캘린더' };
export const dynamic = 'force-dynamic';

/**
 * Per-facility daily availability matrix for the next 60 days.
 * Each cell shows the bookable count (overrides shown bold; default
 * from facility.capacity_total shown muted). Clicking a cell opens
 * an inline editor.
 *
 * Sparse storage: only dates with overrides have rows in
 * partner_availability — the page fills in the defaults client-side.
 */
export default async function PartnerAvailabilityPage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['non_medical'] });

  // Default 60-day window starting today.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = isoDate(today);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 59);
  const end = isoDate(endDate);

  let facilities: Awaited<ReturnType<typeof listFacilitiesAction>> = [];
  let overrides: Awaited<ReturnType<typeof listAvailabilityAction>> = [];
  let dbError: string | null = null;
  try {
    facilities = await listFacilitiesAction();
    overrides = await listAvailabilityAction(start, end);
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'unknown DB error';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="slate" className="mb-2">
            📅 가용성 캘린더
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight">일별 가용 수량</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            시설별 기본 수량은{' '}
            <Link href="/partner/facilities" className="font-medium underline">
              시설 등록
            </Link>
            에서 설정. 여기서는 특정 날짜의 가용 수량을 변경하거나 차단(0)할 수 있습니다.
          </p>
        </div>
        <Link href="/partner/facilities">
          <Button variant="outline" size="sm">
            시설 등록 →
          </Button>
        </Link>
      </div>

      {dbError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          DB 조회 실패: {dbError} — 마이그레이션{' '}
          <code className="font-mono">0004_partner_facilities.sql</code> 실행 여부를 확인하세요.
        </div>
      ) : null}

      {facilities.length === 0 && !dbError ? (
        <div className="space-y-3 rounded-lg border-2 border-dashed bg-muted/20 p-10 text-center">
          <p className="text-sm font-semibold">먼저 시설을 등록해야 합니다</p>
          <p className="text-xs text-muted-foreground">
            객실 / 차량 / 인력 등 한 개라도 등록하면 여기에서 일별 가용 수량을 관리할 수 있습니다.
          </p>
          <Link href="/partner/facilities">
            <Button variant="brand" size="sm">
              시설 등록하러 가기 →
            </Button>
          </Link>
        </div>
      ) : (
        <AvailabilityCalendar
          facilities={facilities.map((f) => ({
            id: f.id,
            name: f.name,
            kind: f.kind,
            capacityTotal: f.capacityTotal,
          }))}
          overrides={overrides}
          startDate={start}
          dayCount={60}
        />
      )}
    </div>
  );
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
