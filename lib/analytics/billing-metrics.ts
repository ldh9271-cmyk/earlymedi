/**
 * MRR / ARR / billing health metrics — pure utility functions.
 *
 * Inputs: per-account snapshots (plan code, status, current period revenue).
 * Outputs: MRR, ARR, expansion/contraction breakdown, churn count.
 */

export type AccountSnapshot = {
  organizationId: string;
  accountType: 'agency' | 'medical' | 'non_medical' | 'freelancer';
  planCode: string;
  status: 'trialing' | 'active' | 'past_due' | 'restricted' | 'suspended' | 'cancelled';
  monthlyRevenueKrw: number;
  prepaidBalanceKrw?: number;
  /** Monthly revenue at this account 30 days ago (if available). */
  monthlyRevenueKrw30dAgo?: number;
};

export type BillingMetrics = {
  mrrKrw: number;
  arrKrw: number;
  expansionKrw: number;
  contractionKrw: number;
  churnedCount: number;
  pastDueCount: number;
  restrictedCount: number;
  totalActive: number;
  byAccountType: Record<string, { count: number; mrrKrw: number }>;
  prepaidBalanceTotalKrw: number;
};

export function computeBilling(accounts: ReadonlyArray<AccountSnapshot>): BillingMetrics {
  let mrr = 0;
  let expansion = 0;
  let contraction = 0;
  let churned = 0;
  let pastDue = 0;
  let restricted = 0;
  let totalActive = 0;
  let prepaidTotal = 0;
  const byAccountType: Record<string, { count: number; mrrKrw: number }> = {};

  for (const a of accounts) {
    if (!byAccountType[a.accountType]) byAccountType[a.accountType] = { count: 0, mrrKrw: 0 };
    const bucket = byAccountType[a.accountType]!;
    bucket.count += 1;

    if (a.status === 'cancelled') {
      churned += 1;
      continue;
    }
    if (a.status === 'past_due') pastDue += 1;
    if (a.status === 'restricted') restricted += 1;
    if (a.status === 'active' || a.status === 'trialing' || a.status === 'past_due' || a.status === 'restricted') {
      totalActive += 1;
      mrr += a.monthlyRevenueKrw;
      bucket.mrrKrw += a.monthlyRevenueKrw;
      if (typeof a.monthlyRevenueKrw30dAgo === 'number') {
        const delta = a.monthlyRevenueKrw - a.monthlyRevenueKrw30dAgo;
        if (delta > 0) expansion += delta;
        else contraction += -delta;
      }
    }
    if (typeof a.prepaidBalanceKrw === 'number') prepaidTotal += a.prepaidBalanceKrw;
  }

  return {
    mrrKrw: mrr,
    arrKrw: mrr * 12,
    expansionKrw: expansion,
    contractionKrw: contraction,
    churnedCount: churned,
    pastDueCount: pastDue,
    restrictedCount: restricted,
    totalActive,
    byAccountType,
    prepaidBalanceTotalKrw: prepaidTotal,
  };
}

/** Net Revenue Retention basis points: (start + expansion - contraction - churn) / start × 10000. */
export function netRevenueRetentionBp(
  startMrrKrw: number,
  expansionKrw: number,
  contractionKrw: number,
  churnKrw: number,
): number {
  if (startMrrKrw <= 0) return 0;
  return Math.round(((startMrrKrw + expansionKrw - contractionKrw - churnKrw) / startMrrKrw) * 10_000);
}
