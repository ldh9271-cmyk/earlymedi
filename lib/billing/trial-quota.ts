import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { billingAccounts } from '@/drizzle/schema/billing';

/**
 * 무료 체험 게이트 — 기간(1개월) 기준.
 *
 * 예전에는 "환자 10명까지 무료"(trial_uses_count >= trial_uses_limit)로
 * 막았다. 지금은 가입 후 30일이 지나면 막는다. 환자 등록 수는 계속
 * 세지만(빌링 화면 표시용) 더 이상 차단 기준이 아니다.
 *
 * trial_ends_at 이 NULL 이면 만료가 없다 — 프리랜서·파트너 등록처럼
 * 애초에 무료인 플랜이 여기 해당한다. 절대 차단하지 않는다.
 */

/**
 * Sentinel thrown when an organization's free trial period has ended and it
 * tries to register one more billable record. The route/server action that
 * catches this should redirect to /upgrade (or return HTTP 402).
 */
export class PaywallError extends Error {
  readonly code = 'paywall';
  constructor(
    public readonly organizationId: string,
    /** 체험이 끝난 시각 */
    public readonly endedAt: Date,
  ) {
    super(`trial period ended (${endedAt.toISOString()})`);
    this.name = 'PaywallError';
  }
}

export type TrialStatus = {
  isPaid: boolean;
  /** 체험 종료 시각. null = 만료 없음(무료 플랜). */
  endsAt: Date | null;
  /** 남은 일수(올림). endsAt 이 null 이면 null. 만료됐으면 0. */
  daysRemaining: number | null;
  /** 참고용 등록 수 — 차단 기준이 아니다. */
  used: number;
  blocked: boolean; // true ⇔ 체험 중이고 종료일이 지났다
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Read the current trial state for an org. Cheap one-row lookup —
 * safe to call on every dashboard render or middleware pass.
 */
export async function getTrialStatus(organizationId: string): Promise<TrialStatus | null> {
  const [row] = await db
    .select({
      status: billingAccounts.status,
      trialEndsAt: billingAccounts.trialEndsAt,
      trialUsesCount: billingAccounts.trialUsesCount,
    })
    .from(billingAccounts)
    .where(eq(billingAccounts.organizationId, organizationId))
    .limit(1);

  if (!row) return null;

  const isPaid = row.status === 'active' || row.status === 'past_due'; // paid lanes
  const endsAt = row.trialEndsAt ?? null;
  const now = Date.now();
  const daysRemaining =
    endsAt === null ? null : Math.max(0, Math.ceil((endsAt.getTime() - now) / DAY_MS));
  const blocked = !isPaid && endsAt !== null && endsAt.getTime() <= now;

  return { isPaid, endsAt, daysRemaining, used: row.trialUsesCount, blocked };
}

/**
 * Enforce the paywall before a billable action proceeds. Throws PaywallError
 * once the free month is over. No-op for paid orgs and for accounts with no
 * expiry (free plans).
 */
export async function assertTrialQuotaAvailable(organizationId: string): Promise<void> {
  const status = await getTrialStatus(organizationId);
  if (!status) return; // No billing account yet — treat as unmetered (shouldn't happen post-signup).
  if (!status.blocked) return;
  // blocked ⇒ endsAt is non-null by construction.
  throw new PaywallError(organizationId, status.endsAt as Date);
}

/**
 * Increment the usage counter by 1 atomically. Called *after* a billable
 * insert succeeds (e.g. a new patient row landed in the table).
 *
 * 차단에는 쓰이지 않는다 — 빌링 화면에 "체험 기간 중 등록한 환자 수"를
 * 보여주기 위한 카운터다. 유료 전환 후에는 멈춘다.
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
