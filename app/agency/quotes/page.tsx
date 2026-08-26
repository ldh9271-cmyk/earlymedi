import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { Badge } from '@/components/shared/ui/badge';
import { listQuoteWorkspace } from '@/lib/db/repositories/quotes';
import { QuotesClient } from './_components/quotes-client';

export const metadata = { title: 'RFQ · 견적 관리' };
export const dynamic = 'force-dynamic';

/**
 * RFQ · 견적 워크스페이스. 견적 파이프라인 단계(초기 상담 → RFQ 발송 →
 * 견적 수신 → 수락)의 케이스를 모아, 병원별 견적 슬롯을 비교 테이블로
 * 보여주고 RFQ 발송 기록 / 견적 입력 / 수락·탈락을 처리한다. 모든
 * 변경은 케이스 타임라인(case_events)에도 기록된다.
 */
export default async function AgencyQuotesPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });

  let cases: Awaited<ReturnType<typeof listQuoteWorkspace>>['cases'] = [];
  let hospitalOptions: Awaited<ReturnType<typeof listQuoteWorkspace>>['hospitalOptions'] = [];
  let dbError: string | null = null;
  try {
    const data = await withRls(ctx, () => listQuoteWorkspace(ctx.orgId));
    cases = data.cases;
    hospitalOptions = data.hospitalOptions;
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'unknown DB error';
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="brand" className="mb-2">
          📑 RFQ · 견적
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">RFQ · 견적 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          케이스별로 병원에 견적을 요청(RFQ)하고, 수신한 견적을 나란히 비교해 수락까지
          진행하세요. 수락하면 케이스가 자동으로 다음 단계로 넘어가고 나머지 견적은 탈락
          처리됩니다. 케이스 생성은{' '}
          <a href="/agency/cases" className="font-medium underline">케이스 보드</a>에서.
        </p>
      </div>

      {dbError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          DB 조회 실패: {dbError}
        </div>
      ) : null}

      <QuotesClient initialCases={cases} hospitalOptions={hospitalOptions} />
    </div>
  );
}
