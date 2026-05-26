import { requireAccess } from '@/lib/auth/route-guards';
import { Badge } from '@/components/shared/ui/badge';
import { listCodesAction } from '@/lib/freelancer/referral-codes-actions';
import { CodesClient } from './_components/codes-client';

export const metadata = { title: '추천 코드 · QR' };
export const dynamic = 'force-dynamic';

/**
 * Freelancer's trackable referral codes + QR images. Each code is the
 * entry point for everything else (cases, commissions). The freelancer
 * can create multiple codes — one per channel (Instagram, KakaoTalk
 * QR card, business card, influencer post) — so they can see which
 * source converts best.
 *
 * Public landing /r/{code} is a future feature; for now the freelancer
 * can hand out the URL and the QR, and Agency-side flows will attribute
 * inquiries to it.
 */
export default async function FreelancerReferralCodesPage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['freelancer'] });

  let codes: Awaited<ReturnType<typeof listCodesAction>> = [];
  let dbError: string | null = null;
  try {
    codes = await listCodesAction();
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'unknown DB error';
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="hospitality" className="mb-2">
          🔗 추천 코드 · QR
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">추천 코드 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          각 채널별로 코드를 발급해 어느 경로로 환자가 유입되는지 추적하세요. QR을 명함·인쇄물·SNS
          링크에 넣으면 자동으로 클릭·가입 카운트가 쌓입니다. 코드로 유입된 케이스는{' '}
          <a href="/freelancer/cases" className="font-medium underline">내 케이스</a>에서, 정산은{' '}
          <a href="/freelancer/commissions" className="font-medium underline">커미션</a>에서
          확인합니다.
        </p>
      </div>

      {dbError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          DB 조회 실패: {dbError} — 마이그레이션{' '}
          <code className="font-mono">0007_freelancer_referral_codes.sql</code> 실행 여부를 확인하세요.
        </div>
      ) : null}

      <CodesClient initialCodes={codes} />
    </div>
  );
}
