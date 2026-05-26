import { FileBadge, Calendar } from 'lucide-react';
import { requireAccess } from '@/lib/auth/route-guards';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';

export const metadata = { title: '세금 서류' };
export const dynamic = 'force-dynamic';

/**
 * Tax documents available to the freelancer (원천징수영수증 3.3%, 분기별
 * 정산서, 연간 합계). Phase 6 결제 엔진이 분기 단위로 자동 생성해 본
 * 페이지에 PDF가 누적됨. v1은 흐름 안내용.
 */
const KOREAN_TAX_QUARTERS = [
  { period: '2026 Q1 (1-3월)', issueDate: '2026-04-30' },
  { period: '2026 Q2 (4-6월)', issueDate: '2026-07-31' },
  { period: '2026 Q3 (7-9월)', issueDate: '2026-10-31' },
  { period: '2026 Q4 (10-12월)', issueDate: '2027-01-31' },
];

export default async function FreelancerTaxDocsPage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['freelancer'] });

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="hospitality" className="mb-2">
          📄 세금 서류
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">세금 서류 다운로드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          분기별 정산서·원천징수영수증(3.3%)·연간 합계 서류가 자동으로 발급되어 이 페이지에
          누적됩니다. PDF 형식으로 다운로드 가능합니다.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h3 className="text-sm font-semibold">발급 일정 (한국 사업소득자 기준)</h3>
          <div className="space-y-1.5">
            {KOREAN_TAX_QUARTERS.map((q) => (
              <div
                key={q.period}
                className="flex items-center justify-between rounded-md border bg-muted/10 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{q.period}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>발급 예정: {q.issueDate}</span>
                  <Badge variant="outline" className="text-[10px]">대기</Badge>
                </div>
              </div>
            ))}
          </div>
          <p className="pt-1 text-[10px] text-muted-foreground">
            * 첫 정산이 발생한 분기부터 자동 생성됩니다. 정산 0원 분기는 서류가 발급되지 않습니다.
          </p>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-bold">발급 완료 서류</h2>
        <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
          <FileBadge className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
          <p>아직 발급된 서류가 없습니다.</p>
          <p className="mt-1 text-[11px]">
            첫 분기 정산이 마감되면 PDF가 이 자리에 표시됩니다.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-2 p-5 text-xs text-muted-foreground">
          <h3 className="text-sm font-semibold text-foreground">참고 사항</h3>
          <ul className="list-disc space-y-1 pl-4">
            <li>한국 거주 사업소득자: 원천징수 3.3% 자동 차감 후 지급</li>
            <li>해외 거주자: 양국 조세조약에 따라 별도 처리 — 설정에서 거주지 변경 가능</li>
            <li>법인 사업자: 세금계산서 발행 분기 단위로 별도 처리</li>
            <li>모든 서류는 발급 후 5년간 보관 (전자세금계산서 보존 의무)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
