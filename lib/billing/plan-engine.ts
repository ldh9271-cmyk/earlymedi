/**
 * Plan engine — pure utilities around `billing_plans` and `billing_accounts`.
 *
 * Phase 6 v1 covers:
 *   - Whether an account is in trial / active / past_due / restricted / suspended
 *   - Whether a feature is included in the active plan
 *   - Computing the renewal cycle (monthly anchor)
 *
 * Restriction-flow stages (escalating):
 *   active  →  past_due  →  restricted  →  suspended
 *
 * - past_due:    D+1 after failed renewal — reminders fired, full access
 * - restricted:  D+7 after past_due      — read-only, no new cases / charts
 * - suspended:   D+30                    — login locked except for billing portal
 */

export type BillingStatus = 'trialing' | 'active' | 'past_due' | 'restricted' | 'suspended' | 'cancelled';

export type BillingAccountSnapshot = {
  status: BillingStatus;
  trialEndsAt?: Date | null;
  currentPeriodEndsAt?: Date | null;
  pastDueSinceAt?: Date | null;
  prepaidBalanceKrw?: number;
};

export type AccessLevel = 'full' | 'read_only' | 'billing_only' | 'blocked';

export function accessLevelFor(snapshot: BillingAccountSnapshot, now: Date = new Date()): AccessLevel {
  if (snapshot.status === 'suspended' || snapshot.status === 'cancelled') return 'billing_only';
  if (snapshot.status === 'restricted') return 'read_only';
  // Trial expired but status not yet flipped — treat as past_due.
  if (
    snapshot.status === 'trialing' &&
    snapshot.trialEndsAt &&
    snapshot.trialEndsAt.getTime() < now.getTime()
  ) {
    return 'read_only';
  }
  return 'full';
}

/**
 * Decide the next status given the elapsed days since payment failure. Pure
 * function used by the cron/webhook that processes overdue invoices.
 */
export function nextStatusForOverdue(
  currentStatus: BillingStatus,
  daysOverdue: number,
): BillingStatus {
  if (currentStatus === 'cancelled' || currentStatus === 'suspended') return currentStatus;
  if (daysOverdue >= 30) return 'suspended';
  if (daysOverdue >= 7) return 'restricted';
  if (daysOverdue >= 1) return 'past_due';
  return currentStatus;
}

/**
 * Trial window helpers — `trialDays` lives on the plan row. Returns the
 * date at which the trial expires given a created-at timestamp.
 */
export function trialEndsAt(createdAt: Date, trialDays: number): Date {
  const d = new Date(createdAt);
  d.setUTCDate(d.getUTCDate() + Math.max(0, trialDays));
  return d;
}

/**
 * Next renewal anchor: month-end-style (28-day-aligned for predictability so
 * Feb doesn't shift the anchor). For dev clarity we use a simple month-add.
 */
export function nextRenewalAt(periodStart: Date): Date {
  const d = new Date(periodStart);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}
