import Link from 'next/link';
import { desc, eq, inArray } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { travelSubTypeLabel } from '@/lib/listings/categories';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';

export const metadata = { title: '여행 패키지' };
export const dynamic = 'force-dynamic';

/**
 * 여행 패키지 워크스페이스 — glowuptour.com 에서 판매 중인
 * travel_package 리스팅(K-뷰티 투어 등)을 예약·매출과 함께 본다.
 * 패키지 내용 편집은 글로우업 상품 관리의 기존 에디터를 그대로 쓴다 —
 * 여기는 "무엇이 팔리고 있나"를 보는 화면.
 */

const STATUS_META: Record<string, { label: string; variant: 'brand' | 'care' | 'outline' | 'destructive' }> = {
  approved: { label: '판매 중', variant: 'care' },
  pending: { label: '검수 대기', variant: 'brand' },
  draft: { label: '초안', variant: 'outline' },
  rejected: { label: '반려', variant: 'destructive' },
};

function won(n: number | null | undefined): string {
  return n == null ? '—' : `₩${n.toLocaleString('ko-KR')}`;
}

export default async function AgencyPackagesPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });

  const { packages, orderStats } = await withRls(ctx, async () => {
    const packages = await db
      .select({
        id: partnerListings.id,
        title: partnerListings.title,
        slug: partnerListings.slug,
        status: partnerListings.status,
        priceWon: partnerListings.priceWon,
        priceUnit: partnerListings.priceUnit,
        featured: partnerListings.featured,
        sortOrder: partnerListings.sortOrder,
        details: partnerListings.details,
        updatedAt: partnerListings.updatedAt,
      })
      .from(partnerListings)
      .where(eq(partnerListings.category, 'travel_package'))
      .orderBy(desc(partnerListings.featured), partnerListings.sortOrder);

    const slugs = packages.map((p) => p.slug).filter(Boolean);
    const orders = slugs.length
      ? await db
          .select({
            listingSlug: checkoutOrders.listingSlug,
            status: checkoutOrders.status,
            totalWon: checkoutOrders.totalWon,
          })
          .from(checkoutOrders)
          .where(inArray(checkoutOrders.listingSlug, slugs))
      : [];

    const orderStats = new Map<string, { orders: number; paid: number; paidWon: number; openWon: number }>();
    for (const o of orders) {
      if (!o.listingSlug) continue;
      const s = orderStats.get(o.listingSlug) ?? { orders: 0, paid: 0, paidWon: 0, openWon: 0 };
      if (o.status !== 'cancelled') s.orders += 1;
      if (o.status === 'paid') {
        s.paid += 1;
        s.paidWon += o.totalWon;
      } else if (o.status === 'issued' || o.status === 'reported') {
        s.openWon += o.totalWon;
      }
      orderStats.set(o.listingSlug, s);
    }

    return { packages, orderStats };
  });

  const live = packages.filter((p) => p.status === 'approved').length;
  const totalPaidWon = Array.from(orderStats.values()).reduce((s, v) => s + v.paidWon, 0);
  const totalOrders = Array.from(orderStats.values()).reduce((s, v) => s + v.orders, 0);
  const totalOpenWon = Array.from(orderStats.values()).reduce((s, v) => s + v.openWon, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge variant="brand" className="mb-2">🧳 여행 패키지</Badge>
          <h1 className="text-2xl font-bold tracking-tight">여행 패키지</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            glowuptour.com 에서 판매 중인 뷰티 · 의료 여행 패키지와 예약 · 매출 현황입니다.
            구성(포함 항목 · 가격 · 사진) 편집은 패키지 카드의 [상품 편집]으로.
          </p>
        </div>
        <Button variant="brand" size="sm" asChild>
          <Link href="/agency/listings?category=travel_package">+ 새 패키지 (상품 관리)</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="판매 중 패키지" value={`${live}개`} />
        <StatCard label="누적 예약 (취소 제외)" value={`${totalOrders}건`} />
        <StatCard label="결제 확인 매출" value={won(totalPaidWon)} />
        <StatCard label="결제 대기 금액" value={won(totalOpenWon)} />
      </div>

      {packages.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            아직 여행 패키지가 없습니다 —{' '}
            <Link href="/agency/listings" className="font-medium underline">글로우업 상품 관리</Link>
            에서 travel_package 카테고리로 만들어 주세요.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {packages.map((p) => {
            const meta = STATUS_META[p.status] ?? STATUS_META.draft!;
            const stats = orderStats.get(p.slug);
            const details = (p.details ?? {}) as Record<string, unknown>;
            const subType = travelSubTypeLabel(
              typeof details.subType === 'string' ? details.subType : undefined,
            );
            return (
              <Card key={p.id}>
                <CardContent className="space-y-2.5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
                        {p.featured ? (
                          <Badge variant="hospitality" className="text-[10px]">★ 메인 노출</Badge>
                        ) : null}
                        {subType ? (
                          <span className="text-[10px] text-muted-foreground">{subType}</span>
                        ) : null}
                      </div>
                      <h3 className="mt-1 truncate text-sm font-semibold">{p.title}</h3>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {won(p.priceWon)}
                        {p.priceUnit ? ` / ${p.priceUnit}` : ''}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/agency/listings/${p.id}`}>상품 편집</Link>
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 border-t pt-2.5 text-center">
                    <div>
                      <div className="text-sm font-bold">{stats?.orders ?? 0}</div>
                      <div className="text-[10px] text-muted-foreground">예약</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold">{stats?.paid ?? 0}</div>
                      <div className="text-[10px] text-muted-foreground">결제 확인</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold">{won(stats?.paidWon ?? 0)}</div>
                      <div className="text-[10px] text-muted-foreground">확정 매출</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-lg font-bold leading-tight">{value}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
