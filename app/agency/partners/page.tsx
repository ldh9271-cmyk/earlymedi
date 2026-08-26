import { requireAccess } from '@/lib/auth/route-guards';
import { Badge } from '@/components/shared/ui/badge';
import { listPartnersAction } from '@/lib/agency/partner-invites-actions';
import { PartnersClient } from './_components/partners-client';

export const metadata = { title: '파트너업체 (호텔·스파·살롱)' };
export const dynamic = 'force-dynamic';

/**
 * Agency-side partner-business roster. Two sections:
 *   - 파트너업체 디렉토리 (all non_medical orgs + per-org offer/booking stats)
 *   - 발송 대기 중 초대 (invites with intendedAccountType='non_medical')
 *
 * "파트너 초대" opens a modal that persists an invite row and surfaces
 * the shareable URL; accepting it creates the partner's own non_medical
 * org (see lib/agency/accept-partner-invite.ts).
 */
export default async function AgencyPartnersPage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['agency'] });

  let partners: Awaited<ReturnType<typeof listPartnersAction>>['partners'] = [];
  let pendingInvites: Awaited<ReturnType<typeof listPartnersAction>>['pendingInvites'] = [];
  let dbError: string | null = null;
  try {
    const data = await listPartnersAction();
    partners = data.partners;
    pendingInvites = data.pendingInvites;
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'unknown DB error';
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="brand" className="mb-2">
          🏨 파트너 협력
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">파트너업체 (호텔·스파·살롱·스튜디오)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          숙박·스파·뷰티샵·스튜디오·식당·교통 등 비의료 협력 업체를 초대해 온보딩하세요. 초대받은
          업체는 자신의 파트너 조직을 만들고, 등록한 시설·서비스가 글로우업 패키지와 예약에
          연결됩니다. 병원(의료기관)은{' '}
          <a href="/agency/hospitals" className="font-medium underline">병원 마켓플레이스</a>
          에서 관리하세요.
        </p>
      </div>

      {dbError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          DB 조회 실패: {dbError}
        </div>
      ) : null}

      <PartnersClient initialPartners={partners} initialPending={pendingInvites} />
    </div>
  );
}
