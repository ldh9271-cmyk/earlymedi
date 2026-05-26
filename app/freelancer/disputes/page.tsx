import Link from 'next/link';
import { Gavel, MessageSquare } from 'lucide-react';
import { requireAccess } from '@/lib/auth/route-guards';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';

export const metadata = { title: '이의 제기' };
export const dynamic = 'force-dynamic';

/**
 * Dispute submission for commission decisions. Phase 6 결제 엔진이
 * 발행한 정산 결과에 이의가 있을 때 freelancer가 사유를 적어 Agency
 * 측에 제출하는 채널. v1은 안내 + 기본 가이드만 — 실제 제출 폼/스레드
 * 시스템은 Phase 6 정산 엔진 활성화와 함께.
 */
export default async function FreelancerDisputesPage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['freelancer'] });

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="hospitality" className="mb-2">
          ⚖️ 이의 제기
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">정산 이의 제기</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          커미션 정산 내역에 오류가 의심되거나 정책 적용이 잘못됐다고 판단되면 Agency 담당자에게
          이의를 제기할 수 있습니다.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-hospitality-500" />
            <h3 className="text-sm font-semibold">이의 제기 절차</h3>
          </div>
          <ol className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">①</span>
              <Link href="/freelancer/commissions" className="underline">커미션 정산 현황</Link>
              에서 문제 거래의 ID 확인
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">②</span>
              사유와 증빙을 정리 (영수증·계약·메신저 캡처 등)
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">③</span>
              아래 양식으로 제출 → Agency 담당자에게 자동 알림
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">④</span>
              5영업일 내 1차 검토 결과 통지 (이메일 + 본 페이지에서 확인)
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Dispute submission form — disabled placeholder for v1 */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <h3 className="text-sm font-semibold">새 이의 제기</h3>
          <div className="rounded-md border border-dashed bg-muted/10 p-4 text-center">
            <MessageSquare className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
            <p className="text-sm font-semibold">제출 양식 곧 활성화</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Phase 6 결제 엔진 활성화 후 이 자리에 직접 제출 양식이 표시됩니다. 그 전엔 협력
              Agency 담당자에게 직접 연락해 주세요.
            </p>
          </div>
          <div className="flex justify-end">
            <Link href="/freelancer/settings">
              <Button variant="outline" size="sm">
                담당자 연락처 보기 →
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Empty dispute history */}
      <div>
        <h2 className="mb-2 text-sm font-bold">제출 이력</h2>
        <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
          <Gavel className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
          <p>이의 제기 이력이 없습니다.</p>
        </div>
      </div>
    </div>
  );
}
