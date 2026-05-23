import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  treatmentCharts,
  treatmentChartItems,
} from '@/drizzle/schema/treatment-charts';
import { hospitals, hospitalReferralRates, hospitalDepositPolicies } from '@/drizzle/schema/hospitals';
import { auditLogs } from '@/drizzle/schema/audit';
import {
  computeHospitalFee,
  STANDARD_CATEGORY_RATES_BP,
  type HospitalFeePolicy,
  type ChartLine,
} from './hospital-fee-engine';

/**
 * Bridge: when a chart finalizes, compute the hospital's referral fee against
 * the *snapshotted* policy and persist the result back onto the chart row.
 *
 * This is the single seam between Phase 4 (clinical) and Phase 6 (billing):
 *   - `treatment-chart-engine.tryFinalize()` calls this after status flips
 *   - the function reads the chart + items, resolves the active hospital
 *     policy, and writes `referralFeeTotalKrw` + `referralPolicySnapshotJson`
 *   - downstream Phase 6 jobs (invoice generator, payout scheduler) read those
 *
 * RLS: caller must already be inside `withRls(ctx)` since we touch agency-scoped
 * tables. The function does NOT mutate chart status — that's the engine's job.
 */
export async function bridgeChartToPayout(input: {
  organizationId: string;
  chartId: string;
  actorUserId: string | null;
}): Promise<{
  referralFeeKrw: number;
  policySnapshot: Record<string, unknown>;
} | null> {
  const [chart] = await db
    .select()
    .from(treatmentCharts)
    .where(
      and(eq(treatmentCharts.organizationId, input.organizationId), eq(treatmentCharts.id, input.chartId)),
    )
    .limit(1);
  if (!chart) return null;

  const items = await db
    .select()
    .from(treatmentChartItems)
    .where(eq(treatmentChartItems.chartId, input.chartId))
    .orderBy(treatmentChartItems.lineNumber);

  // Resolve the hospital's fee policy. For Phase 6 v1 we read the
  // hospital-default + per-category overrides from hospital_referral_rates;
  // per-procedure overrides flow in via a future phase.
  const [hospital] = await db
    .select()
    .from(hospitals)
    .where(eq(hospitals.id, chart.hospitalId))
    .limit(1);

  const rates = await db
    .select()
    .from(hospitalReferralRates)
    .where(
      and(
        eq(hospitalReferralRates.organizationId, input.organizationId),
        eq(hospitalReferralRates.hospitalId, chart.hospitalId),
      ),
    );

  // Resolve into 3 buckets — procedure code, category, hospital default.
  // Schema: rows with both category=null AND procedureCode=null are the
  // hospital default; category-only rows override category; procedureCode
  // rows are most specific.
  const perCategoryBp: Record<string, number> = { ...STANDARD_CATEGORY_RATES_BP };
  const perProcedureBp: Record<string, number> = {};
  let defaultRateBp = 1_000;
  for (const r of rates) {
    if (r.procedureCode) {
      perProcedureBp[r.procedureCode] = r.rateBp;
    } else if (r.category) {
      perCategoryBp[r.category] = r.rateBp;
    } else {
      defaultRateBp = r.rateBp;
    }
  }

  const policy: HospitalFeePolicy = {
    defaultRateBp,
    perCategoryBp,
    perProcedureBp,
    feeBase: 'net_excl_vat',
    includeDepositInBase: false,
    includePatientDirectPay: false,
    packageRule: 'sum_per_item',
  };

  const chartLines: ChartLine[] = items.map((it) => ({
    procedureCode: it.procedureCode,
    procedureCategory: null,
    lineTotalKrw: it.lineTotalKrw,
    vatTreatment: it.vatTreatment,
    vatIncluded: it.vatIncluded,
    vatRateBp: it.vatRateBp,
  }));

  // Also pull the deposit policy to know whether deposit should be in base.
  const [deposit] = await db
    .select()
    .from(hospitalDepositPolicies)
    .where(
      and(
        eq(hospitalDepositPolicies.organizationId, input.organizationId),
        eq(hospitalDepositPolicies.hospitalId, chart.hospitalId),
      ),
    )
    .limit(1);
  if (deposit) {
    policy.includeDepositInBase = deposit.includeInReferralBase;
  }

  const fee = computeHospitalFee(chartLines, policy, {
    depositKrw: chart.depositReceivedKrw,
  });

  const snapshot = {
    resolvedAt: new Date().toISOString(),
    hospitalId: chart.hospitalId,
    hospitalName: hospital?.name ?? null,
    defaultRateBp: policy.defaultRateBp,
    perCategoryBp: policy.perCategoryBp,
    feeBase: policy.feeBase,
    includeDepositInBase: policy.includeDepositInBase,
    breakdown: fee,
  };

  await db
    .update(treatmentCharts)
    .set({
      referralFeeTotalKrw: fee.totalFeeKrw,
      referralPolicySnapshotJson: snapshot,
      updatedAt: new Date(),
    })
    .where(eq(treatmentCharts.id, input.chartId));

  await db.insert(auditLogs).values({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: 'finalize',
    entityType: 'chart_payout_bridge',
    entityId: input.chartId,
    diff: { referralFeeKrw: fee.totalFeeKrw, defaultRateBp: policy.defaultRateBp },
    metadata: { hospitalId: chart.hospitalId, source: 'chart-to-payout-bridge' },
  });

  return { referralFeeKrw: fee.totalFeeKrw, policySnapshot: snapshot };
}
