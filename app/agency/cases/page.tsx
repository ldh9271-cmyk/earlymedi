import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { listCases } from '@/lib/db/repositories/cases';
import { CaseBoard } from '@/components/agency/cases/case-board';

export const metadata = { title: '케이스' };

export default async function AgencyCasesPage({
  searchParams,
}: {
  searchParams: { view?: 'board' | 'list'; q?: string; closed?: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const includeClosed = searchParams.closed === '1';
  const cases = await withRls(ctx, () =>
    listCases(ctx.orgId, { search: searchParams.q, includeClosed }, 500),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">케이스</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            환자 1명이 거치는 전체 여정 ― <strong className="text-foreground">초기 상담 → RFQ → 견적 → 예약금 → 일정 → 입국 → 시술 → 사후관리 → 정산</strong>의 13단계 라이프사이클을 칸반(드래그로 단계 이동) · 리스트(검색·필터·정렬) 뷰로 추적합니다. 캘린더 · 지도 뷰는 준비 중.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">전체 {cases.length}건</div>
      </div>

      <CaseBoard
        initialCases={cases}
        initialView={searchParams.view ?? 'board'}
        initialQuery={searchParams.q ?? ''}
        initialIncludeClosed={includeClosed}
      />
    </div>
  );
}
