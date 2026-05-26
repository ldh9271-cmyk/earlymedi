import { requireAccess } from '@/lib/auth/route-guards';
import { Badge } from '@/components/shared/ui/badge';
import { Building2, Car, Users, Utensils, Box } from 'lucide-react';
import { listFacilitiesAction } from '@/lib/partner/facilities-actions';
import { FacilitiesClient } from './_components/facilities-client';

export const metadata = { title: '시설 등록' };
export const dynamic = 'force-dynamic';

const KIND_LABELS = {
  room: { label: '객실', icon: Building2 },
  seat: { label: '좌석·룸', icon: Utensils },
  vehicle: { label: '차량', icon: Car },
  guide: { label: '인력', icon: Users },
  other: { label: '기타', icon: Box },
} as const;

/**
 * Partner facilities list. The agency package builder needs to know
 * which SKUs each partner sells (e.g. "Hotel Lael has 20 Deluxe rooms
 * + a 9-seat van + a Korean-Russian guide") so it can auto-match
 * inquiry requirements to inventory. This page is the source of truth.
 */
export default async function PartnerFacilitiesPage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['non_medical'] });

  let facilities: Awaited<ReturnType<typeof listFacilitiesAction>> = [];
  let dbError: string | null = null;
  try {
    facilities = await listFacilitiesAction();
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'unknown DB error';
  }

  // Group by kind so the UI surfaces "객실 3개 / 차량 1개" patterns clearly.
  const byKind = Object.fromEntries(
    Object.keys(KIND_LABELS).map((k) => [
      k,
      facilities.filter((f) => f.kind === (k as keyof typeof KIND_LABELS)),
    ]),
  ) as Record<keyof typeof KIND_LABELS, typeof facilities>;

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="slate" className="mb-2">
          🏨 시설 등록
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">파트너 시설 인벤토리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          판매할 객실·좌석·차량·인력 등 시설을 등록하세요. Agency 패키지 빌더가 자동으로 매칭에
          사용합니다. 일일 가용 수량 변경은{' '}
          <a href="/partner/availability" className="font-medium underline">
            가용성 캘린더
          </a>
          에서 조정합니다.
        </p>
      </div>

      {dbError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          DB 조회 실패: {dbError} — 마이그레이션{' '}
          <code className="font-mono">0004_partner_facilities.sql</code> 실행 여부를 확인하세요.
        </div>
      ) : null}

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-5">
        {(Object.keys(KIND_LABELS) as Array<keyof typeof KIND_LABELS>).map((k) => {
          const Icon = KIND_LABELS[k].icon;
          const count = byKind[k].length;
          return (
            <div key={k} className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{KIND_LABELS[k].label}</span>
              </div>
              <div className="mt-1 text-lg font-bold">{count}</div>
            </div>
          );
        })}
      </div>

      <FacilitiesClient initialFacilities={facilities} />
    </div>
  );
}
