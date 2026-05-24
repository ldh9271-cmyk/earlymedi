import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { billingAccounts } from '@/drizzle/schema/billing';

/**
 * Sentinel thrown when an organization on a trial plan has used up its free
 * quota and tries to register one more billable record. The route/server
 * action that catches this should redirect to /upgrade (or return HTTP 402).
 */
export class PaywallError extends Error {
  readonly code = 'paywall';
  constructor(
    public readonly organizationId: string,
    public readonly used: number,
    public readonly limit: number,
  ) {
    super(`trial quota exhausted (${used}/${limit})`);
    this.name = 'PaywallError';
  }
}

export type TrialStatus = {
  isPaid: boolean;
  used: number;
  limit: number;
  remaining: number;
  blocked: boolean; // true ⇔ on trial AND used >= limit
};

/**
 * Read the current trial quota state for an org. Cheap one-row lookup —
 * safe to call on every dashboard render or middleware pass.
 */
export async function getTrialStatus(organizationId: string): Promise<TrialStatus | null> {
  const [row] = await db
    .select({
      status: billingAccounts.status,
      trialUsesCount: billingAccounts.trialUsesCount,
      trialUsesLimit: billingAccounts.trialUsesLimit,
    })
    .from(billingAccounts)
    .where(eq(billingAccounts.organizationId, organizationId))
    .limit(1);

  if (!row) return null;

  const isPaid = row.status === 'active' || row.status === 'past_due'; // paid lanes
  const used = row.trialUsesCount;
  const limit = row.trialUsesLimit;
  const remaining = Math.max(0, limit - used);
  const blocked = !isPaid && used >= limit;
  return { isPaid, used, limit, remaining, blocked };
}

/**
 * Enforce the paywall before a billable action proceeds. Throws PaywallError
 * if the org is on a trial plan and has already used its quota. No-op for
 * paid orgs.
 */
export async function assertTrialQuotaAvailable(organizationId: string): Promise<void> {
  const status = await getTrialStatus(organizationId);
  if (!status) return; // No billing account yet — treat as unmetered (shouldn't happen post-signup).
  if (status.isPaid) return;
  if (status.used >= status.limit) {
    throw new PaywallError(organizationId, status.used, status.limit);
  }
}

/**
 * Increment the trial counter by 1 atomically. Called *after* a billable
 * insert succeeds (e.g. a new patient row landed in the table). We use a
 * single SQL UPDATE so concurrent inserts can't race past the limit by more
 * than one row — acceptable for a free trial; the next attempt will hit the
 * paywall.
 *
 * No-op for paid accounts (counter stays put after conversion).
 */
export async function incrementTrialUsage(organizationId: string): Promise<void> {
  await db
    .update(billingAccounts)
    .set({
      trialUsesCount: sql`${billingAccounts.trialUsesCount} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(billingAccounts.organizationId, organizationId),
        eq(billingAccounts.status, 'trial'),
      ),
    );
}
