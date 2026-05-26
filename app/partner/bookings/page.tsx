import { requireAccess } from '@/lib/auth/route-guards';
import { Badge } from '@/components/shared/ui/badge';
import { listBookingsAction } from '@/lib/partner/bookings-actions';
import { listFacilitiesAction } from '@/lib/partner/facilities-actions';
import { listServicesAction } from '@/lib/partner/services-actions';
import { BookingsClient } from './_components/bookings-client';

export const metadata = { title: '부킹 관리' };
export const dynamic = 'force-dynamic';

/**
 * Partner-side booking management. Shows reservations the partner is
 * processing — from Agency referrals (via package builder) AND direct
 * guest bookings (via /partner/inbox channels).
 *
 * v1 capabilities:
 *   - List bookings filtered by status (active / pending / confirmed / etc.)
 *   - Status transitions: pending → confirmed / declined, confirmed → completed / cancelled
 *   - Manual booking creation (for testing or walk-in entries)
 *   - Each booking carries denormalized line items (facilities + services)
 *
 * v2 ideas (not in this commit):
 *   - Receive bookings automatically from Agency package finalization
 *   - Conflict warning when accepting if availability calendar shows 0
 *   - Auto-deduct availability when status → confirmed
 */
export default async function PartnerBookingsPage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['non_medical'] });

  let bookings: Awaited<ReturnType<typeof listBookingsAction>> = [];
  let facilities: Awaited<ReturnType<typeof listFacilitiesAction>> = [];
  let services: Awaited<ReturnType<typeof listServicesAction>> = [];
  let dbError: string | null = null;
  try {
    [bookings, facilities, services] = await Promise.all([
      listBookingsAction({ statusFilter: 'all' }),
      listFacilitiesAction(),
      listServicesAction(),
    ]);
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'unknown DB error';
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="slate" className="mb-2">
          🎫 부킹 관리
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">파트너 부킹</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Agency 추천 또는 직접 문의로 들어온 부킹을 관리합니다. 대기 중인 부킹은 수락 또는 거절해
          주세요. 시설·서비스 카탈로그는{' '}
          <a href="/partner/facilities" className="font-medium underline">시설 등록</a>
          {' '}·{' '}
          <a href="/partner/menu" className="font-medium underline">메뉴·가격표</a>에서 관리합니다.
        </p>
      </div>

      {dbError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          DB 조회 실패: {dbError} — 마이그레이션{' '}
          <code className="font-mono">0006_partner_bookings.sql</code> 실행 여부를 확인하세요.
        </div>
      ) : null}

      <BookingsClient
        initialBookings={bookings}
        facilities={facilities.map((f) => ({
          id: f.id,
          name: f.name,
          defaultPriceAmount: f.defaultPriceAmount,
          defaultPriceCurrency: f.defaultPriceCurrency,
          defaultPriceUnit: f.defaultPriceUnit,
        }))}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          priceAmount: s.priceAmount,
          priceCurrency: s.priceCurrency,
          priceUnit: s.priceUnit,
        }))}
      />
    </div>
  );
}
