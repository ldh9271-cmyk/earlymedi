import { eq, sql } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { conversations } from '@/drizzle/schema/conversations';
import { channels } from '@/drizzle/schema/channels';
import { cases } from '@/drizzle/schema/cases';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { LISTING_CATEGORIES } from '@/lib/listings/categories';
import { InsightsBody, type InsightsData } from '@/components/agency/insights/insights-body';

export const metadata = { title: 'GlowInsight 분석' };
export const dynamic = 'force-dynamic';

/**
 * GlowInsight — 실데이터 분석. 문의(모든 채널) → 케이스 → 결제로
 * 이어지는 전환과 매출 · 채널 · 국가 · 카테고리(뷰티+의료) 믹스를
 * 운영 DB 에서 직접 집계한다.
 */
export default async function AgencyInsightsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });

  const data = await withRls(ctx, async (): Promise<InsightsData> => {
    const [convByStage, convByChannel, convByCountry, caseByStage, orders, listingByCategory] =
      await Promise.all([
        db
          .select({ stage: conversations.stage, n: sql<number>`count(*)::int` })
          .from(conversations)
          .where(eq(conversations.organizationId, ctx.orgId))
          .groupBy(conversations.stage),
        db
          .select({ kind: channels.kind, n: sql<number>`count(*)::int` })
          .from(conversations)
          .innerJoin(channels, eq(conversations.channelId, channels.id))
          .where(eq(conversations.organizationId, ctx.orgId))
          .groupBy(channels.kind),
        db
          .select({ country: conversations.contactCountryCode, n: sql<number>`count(*)::int` })
          .from(conversations)
          .where(eq(conversations.organizationId, ctx.orgId))
          .groupBy(conversations.contactCountryCode),
        db
          .select({ stage: cases.stage, n: sql<number>`count(*)::int` })
          .from(cases)
          .where(eq(cases.organizationId, ctx.orgId))
          .groupBy(cases.stage),
        db
          .select({
            status: checkoutOrders.status,
            totalWon: checkoutOrders.totalWon,
            createdAt: checkoutOrders.createdAt,
            paidAt: checkoutOrders.paidAt,
            locale: checkoutOrders.locale,
          })
          .from(checkoutOrders),
        db
          .select({ category: partnerListings.category, n: sql<number>`count(*)::int` })
          .from(partnerListings)
          .where(eq(partnerListings.status, 'approved'))
          .groupBy(partnerListings.category),
      ]);

    const stageCount = (stages: string[], rows: Array<{ stage: string; n: number }>): number =>
      rows.filter((r) => stages.includes(r.stage)).reduce((s, r) => s + r.n, 0);

    const convTotal = stageCount(['lead', 'qualified', 'case', 'quoted', 'booked'], convByStage);
    const convQualifiedPlus = stageCount(['qualified', 'case', 'quoted', 'booked'], convByStage);
    const caseTotal = caseByStage.reduce((s, r) => s + r.n, 0);
    const caseAcceptedPlus = stageCount(
      ['accepted', 'deposit_paid', 'scheduled', 'arrived', 'in_treatment', 'post_treatment', 'aftercare', 'closed_won'],
      caseByStage,
    );
    const paidOrders = orders.filter((o) => o.status === 'paid');

    // 최근 6개월 결제 확인 매출 (KST 기준 월)
    const months: string[] = [];
    const now = new Date(Date.now() + 9 * 3600 * 1000);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push(d.toISOString().slice(0, 7));
    }
    const monthly = months.map((month) => {
      const inMonth = paidOrders.filter(
        (o) => o.paidAt && new Date(o.paidAt.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 7) === month,
      );
      return {
        month,
        gmvWon: inMonth.reduce((s, o) => s + o.totalWon, 0),
        orders: inMonth.length,
      };
    });

    const categoryLabel = new Map<string, string>(
      LISTING_CATEGORIES.map((c) => [c.key, c.label]),
    );

    return {
      funnel: [
        { key: 'lead', label: '문의 리드', count: convTotal },
        { key: 'qualified', label: 'Qualified', count: convQualifiedPlus },
        { key: 'case', label: '케이스 생성', count: caseTotal },
        { key: 'accepted', label: '견적 수락+', count: caseAcceptedPlus },
        { key: 'paid', label: '결제 확인', count: paidOrders.length },
      ],
      monthly,
      channels: convByChannel
        .map((r) => ({ name: r.kind, n: r.n }))
        .sort((a, b) => b.n - a.n),
      countries: convByCountry
        .map((r) => ({ name: r.country ?? '미상', n: r.n }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 8),
      categories: listingByCategory
        .map((r) => ({
          key: r.category,
          label: categoryLabel.get(r.category) ?? r.category,
          n: r.n,
          isMedical: r.category === 'hospital',
        }))
        .sort((a, b) => b.n - a.n),
      totals: {
        paidWon: paidOrders.reduce((s, o) => s + o.totalWon, 0),
        paidCount: paidOrders.length,
        openCount: orders.filter((o) => o.status === 'issued' || o.status === 'reported').length,
        leadCount: convTotal,
      },
    };
  });

  return <InsightsBody data={data} />;
}
