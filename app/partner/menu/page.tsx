import { requireAccess } from '@/lib/auth/route-guards';
import { Badge } from '@/components/shared/ui/badge';
import { listServicesAction } from '@/lib/partner/services-actions';
import { MenuClient } from './_components/menu-client';

export const metadata = { title: '메뉴 · 가격표' };
export const dynamic = 'force-dynamic';

/**
 * Partner menu / pricelist. Lists priced services with no daily
 * capacity — massage, transfer, guide packages, F&B options, tours.
 * Agencies pull from this catalog when assembling package quotes.
 *
 * Distinct from /partner/facilities (which is capacity-bound rooms /
 * seats / vehicles managed via the availability calendar).
 */
export default async function PartnerMenuPage(): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['non_medical'] });

  let services: Awaited<ReturnType<typeof listServicesAction>> = [];
  let dbError: string | null = null;
  try {
    services = await listServicesAction();
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'unknown DB error';
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="slate" className="mb-2">
          🍽️ 메뉴 · 가격표
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">서비스 카탈로그</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          가격이 정해진 서비스(마사지, 의전, 가이드 패키지, 식음, 투어 등)를 등록하세요. Agency가
          RFQ 견적에 이 카탈로그를 참고합니다. 일일 가용 수량이 있는 시설(객실·차량)은{' '}
          <a href="/partner/facilities" className="font-medium underline">
            시설 등록
          </a>
          에서 따로 관리합니다.
        </p>
      </div>

      {dbError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          DB 조회 실패: {dbError} — 마이그레이션{' '}
          <code className="font-mono">0005_partner_services.sql</code> 실행 여부를 확인하세요.
        </div>
      ) : null}

      <MenuClient initialServices={services} />
    </div>
  );
}
