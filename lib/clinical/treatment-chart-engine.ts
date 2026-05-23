import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { auditLogs } from '@/drizzle/schema/audit';
import {
  treatmentCharts,
  treatmentChartItems,
  treatmentChartRevisions,
  treatmentChartApprovals,
} from '@/drizzle/schema/treatment-charts';
import type {
  TreatmentChart,
  TreatmentChartItem,
} from '@/drizzle/schema/treatment-charts';
import {
  applyTransition,
  canFinalize,
  type ActorRole,
  type ApprovalRole,
  type ChartTransition,
} from './chart-approval-flow';
import { classifyVariance } from './quote-vs-chart-diff';

/**
 * Treatment chart engine — the central authority for chart state.
 *
 * All chart mutations go through this module so that:
 *   1. Totals are always recomputed from items (no manual drift).
 *   2. Status transitions are validated against the approval-flow rules.
 *   3. Every mutation writes an `audit_logs` and `treatment_chart_revisions` row.
 *   4. `finalize` is the single trigger point for the downstream settlement
 *      pipeline (Phase 6) — the `chart-to-payout-bridge` reads finalized charts.
 *
 * Caller responsibilities:
 *   - Hold the active RLS context (`withRls(ctx, ...)`) so org-scoped reads/writes work.
 *   - Pass `actorRole`/`actorUserId` so audit + revision logs attribute correctly.
 */

export type ChartTotals = {
  subtotalKrw: number;
  discountTotalKrw: number;
  vatTotalKrw: number;
  grandTotalKrw: number;
  patientBalanceKrw: number;
};

/**
 * Recompute totals from items + deposit + currency snapshot. KRW minor units.
 *
 * Rules:
 *   subtotal       = Σ line_total
 *   discount_total = Σ discount + sum of items with itemKind='discount' (their line_total is negative-ish but we model as positive discount column)
 *   vat_total      = Σ ((1 − vat_treatment exempt) ? lineTotal × vatRateBp/10000 : 0); when vatIncluded, treat lineTotal as gross and back-derive
 *   grand_total    = subtotal − discount_total + vat_total
 *   patient_balance= grand_total − deposit_received
 *
 * VAT is only computed for taxable lines. Exempt (의료법 면세) lines contribute 0.
 */
export function recomputeTotals(
  items: ReadonlyArray<TreatmentChartItem>,
  depositReceivedKrw: number,
): ChartTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let vatTotal = 0;

  for (const it of items) {
    if (it.itemKind === 'discount') {
      discountTotal += it.lineTotalKrw;
      continue;
    }
    subtotal += it.lineTotalKrw;
    discountTotal += it.discountKrw;

    if (it.vatTreatment === 'exempt') continue;
    if (it.vatIncluded) {
      // lineTotal is gross (incl VAT). vat = gross × rate / (10000 + rate)
      vatTotal += Math.round((it.lineTotalKrw * it.vatRateBp) / (10_000 + it.vatRateBp));
    } else {
      // lineTotal is net of VAT. vat = net × rate / 10000
      vatTotal += Math.round((it.lineTotalKrw * it.vatRateBp) / 10_000);
    }
  }

  const grand = Math.max(0, subtotal - discountTotal + vatTotal);
  const balance = Math.max(0, grand - depositReceivedKrw);

  return {
    subtotalKrw: subtotal,
    discountTotalKrw: discountTotal,
    vatTotalKrw: vatTotal,
    grandTotalKrw: grand,
    patientBalanceKrw: balance,
  };
}

/**
 * Persist recomputed totals onto the chart row. Idempotent.
 * Returns the updated chart row.
 */
export async function refreshChartTotals(
  organizationId: string,
  chartId: string,
): Promise<TreatmentChart> {
  const [chart] = await db
    .select()
    .from(treatmentCharts)
    .where(and(eq(treatmentCharts.organizationId, organizationId), eq(treatmentCharts.id, chartId)))
    .limit(1);
  if (!chart) throw new Error('chart_not_found');
  if (chart.finalizedAt) throw new Error('chart_finalized_immutable');

  const items = await db
    .select()
    .from(treatmentChartItems)
    .where(eq(treatmentChartItems.chartId, chartId))
    .orderBy(treatmentChartItems.lineNumber);

  const totals = recomputeTotals(items, chart.depositReceivedKrw);

  let varianceBp: number | null = null;
  let varianceFlag: string | null = null;
  if (chart.quoteTotalKrw && chart.quoteTotalKrw > 0) {
    const v = classifyVariance(chart.quoteTotalKrw, totals.grandTotalKrw);
    varianceBp = v.bp;
    varianceFlag = v.flag;
  }

  const [updated] = await db
    .update(treatmentCharts)
    .set({
      subtotalKrw: totals.subtotalKrw,
      discountTotalKrw: totals.discountTotalKrw,
      vatTotalKrw: totals.vatTotalKrw,
      grandTotalKrw: totals.grandTotalKrw,
      patientBalanceKrw: totals.patientBalanceKrw,
      quoteVarianceBp: varianceBp,
      quoteVarianceFlag: varianceFlag,
      updatedAt: new Date(),
    })
    .where(eq(treatmentCharts.id, chartId))
    .returning();
  if (!updated) throw new Error('chart_update_failed');
  return updated;
}

export type TransitionInput = {
  organizationId: string;
  chartId: string;
  transition: ChartTransition;
  actorRole: ActorRole;
  actorUserId: string | null;
  /** Optional reason — required for `request_changes` and `void`. */
  reason?: string;
};

export type TransitionOutcome = {
  chart: TreatmentChart;
  from: string;
  to: string;
};

/**
 * Apply a chart status transition. Validates the rule, then:
 *   - updates the chart row + the matching timestamp column
 *   - appends a treatment_chart_revisions row
 *   - appends an audit_logs row
 *
 * `finalize` ALSO checks that all 3 required signatures (hospital + agency +
 * patient) are present in treatment_chart_approvals. The actual downstream
 * settlement trigger is fired by `tryFinalize()` once status flips.
 */
export async function transitionChart(input: TransitionInput): Promise<TransitionOutcome> {
  const [chart] = await db
    .select()
    .from(treatmentCharts)
    .where(
      and(
        eq(treatmentCharts.organizationId, input.organizationId),
        eq(treatmentCharts.id, input.chartId),
      ),
    )
    .limit(1);
  if (!chart) throw new Error('chart_not_found');

  const result = applyTransition(chart.status, input.transition, input.actorRole);
  if (!result.ok) {
    throw new Error(`chart_transition_${result.reason}`);
  }

  // For `finalize`, ensure all required approvals are in place.
  if (input.transition === 'finalize') {
    const sigs = await db
      .select({ role: treatmentChartApprovals.role })
      .from(treatmentChartApprovals)
      .where(eq(treatmentChartApprovals.chartId, input.chartId));
    const signedRoles = new Set(sigs.map((s) => s.role as ApprovalRole));
    if (!canFinalize(signedRoles)) {
      throw new Error('chart_finalize_missing_approvals');
    }
  }

  const now = new Date();
  const patch: Partial<TreatmentChart> = {
    status: result.to as TreatmentChart['status'],
    updatedAt: now,
  };
  if (result.to === 'submitted') patch.submittedAt = now;
  if (result.to === 'agency_approved') {
    patch.agencyApprovedAt = now;
    patch.agencyApprovedById = input.actorUserId;
  }
  if (result.to === 'patient_shared') patch.patientSharedAt = now;
  if (result.to === 'finalized') patch.finalizedAt = now;
  if (result.to === 'voided') {
    patch.voidedAt = now;
    patch.voidedReason = input.reason ?? null;
  }

  const [updated] = await db
    .update(treatmentCharts)
    .set(patch)
    .where(eq(treatmentCharts.id, input.chartId))
    .returning();
  if (!updated) throw new Error('chart_update_failed');

  await db.insert(treatmentChartRevisions).values({
    organizationId: input.organizationId,
    chartId: input.chartId,
    fromStatus: result.from,
    toStatus: result.to,
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    summary: input.reason ?? `${result.from} → ${result.to}`,
    diffJson: { status: { before: result.from, after: result.to } },
  });

  await db.insert(auditLogs).values({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action:
      input.transition === 'finalize'
        ? 'finalize'
        : input.transition === 'approve'
          ? 'approve'
          : input.transition === 'request_changes' || input.transition === 'void'
            ? 'reject'
            : 'update',
    entityType: 'treatment_chart',
    entityId: input.chartId,
    diff: { from: result.from, to: result.to },
    metadata: { reason: input.reason ?? undefined, role: input.actorRole },
  });

  return { chart: updated, from: result.from, to: result.to };
}

/**
 * Convenience wrapper: attempt to finalize the chart, returning a structured
 * result instead of throwing on the expected failure modes (missing signatures
 * or invalid state). Downstream callers (the settlement bridge) use this so
 * they can re-queue cleanly.
 */
export type FinalizeResult =
  | { ok: true; chart: TreatmentChart }
  | { ok: false; reason: 'invalid_state' | 'missing_approvals' | 'not_found' };

export async function tryFinalize(
  organizationId: string,
  chartId: string,
  actorUserId: string | null,
): Promise<FinalizeResult> {
  try {
    const out = await transitionChart({
      organizationId,
      chartId,
      transition: 'finalize',
      actorRole: 'system',
      actorUserId,
    });
    // Trigger the Phase 6 settlement bridge: compute referral fee + snapshot.
    // Imported lazily to avoid a Phase-4 ↔ Phase-6 import cycle at module load.
    const { bridgeChartToPayout } = await import('@/lib/pricing/chart-to-payout-bridge');
    await bridgeChartToPayout({ organizationId, chartId, actorUserId });
    return { ok: true, chart: out.chart };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'chart_not_found') return { ok: false, reason: 'not_found' };
    if (msg === 'chart_finalize_missing_approvals') return { ok: false, reason: 'missing_approvals' };
    return { ok: false, reason: 'invalid_state' };
  }
}

/**
 * Create the next version of a finalized chart. The old chart stays immutable.
 * The new chart starts in 'draft' status, references back via `supersedesId`,
 * and copies the line items unchanged so the editor can diff cleanly.
 */
export async function supersedeChart(
  organizationId: string,
  oldChartId: string,
  actorUserId: string | null,
): Promise<TreatmentChart> {
  const [old] = await db
    .select()
    .from(treatmentCharts)
    .where(
      and(
        eq(treatmentCharts.organizationId, organizationId),
        eq(treatmentCharts.id, oldChartId),
      ),
    )
    .limit(1);
  if (!old) throw new Error('chart_not_found');
  if (!old.finalizedAt) throw new Error('supersede_only_finalized');

  const [newChart] = await db
    .insert(treatmentCharts)
    .values({
      organizationId: old.organizationId,
      hospitalId: old.hospitalId,
      hospitalOrgId: old.hospitalOrgId,
      patientId: old.patientId,
      caseId: old.caseId,
      versionNumber: old.versionNumber + 1,
      supersedesId: old.id,
      status: 'draft',
      shareLevel: old.shareLevel,
      treatmentDate: old.treatmentDate,
      doctorName: old.doctorName,
      notes: old.notes,
      currency: old.currency,
      vatTreatment: old.vatTreatment,
      quoteId: old.quoteId,
      quoteTotalKrw: old.quoteTotalKrw,
      createdByUserId: actorUserId,
    })
    .returning();
  if (!newChart) throw new Error('chart_create_failed');

  const oldItems = await db
    .select()
    .from(treatmentChartItems)
    .where(eq(treatmentChartItems.chartId, oldChartId))
    .orderBy(treatmentChartItems.lineNumber);

  if (oldItems.length > 0) {
    await db.insert(treatmentChartItems).values(
      oldItems.map((it) => ({
        organizationId: newChart.organizationId,
        chartId: newChart.id,
        lineNumber: it.lineNumber,
        itemKind: it.itemKind,
        rawText: it.rawText,
        procedureNameNormalized: it.procedureNameNormalized,
        procedureCatalogId: it.procedureCatalogId,
        procedureCode: it.procedureCode,
        bodyPart: it.bodyPart,
        quantity: it.quantity,
        unitPriceKrw: it.unitPriceKrw,
        lineTotalKrw: it.lineTotalKrw,
        vatIncluded: it.vatIncluded,
        vatRateBp: it.vatRateBp,
        vatTreatment: it.vatTreatment,
        isAddon: it.isAddon,
        discountKrw: it.discountKrw,
        confidenceBp: 10_000, // operator-confirmed copy
        aiNotes: null,
        metadata: it.metadata,
      })),
    );
  }

  await refreshChartTotals(newChart.organizationId, newChart.id);

  await db.insert(treatmentChartRevisions).values({
    organizationId: newChart.organizationId,
    chartId: newChart.id,
    fromStatus: null,
    toStatus: 'draft',
    actorRole: 'system',
    actorUserId,
    summary: `version ${newChart.versionNumber} supersedes ${old.id}`,
    diffJson: {
      supersedesId: { before: null, after: old.id },
      versionNumber: { before: old.versionNumber, after: newChart.versionNumber },
    },
  });

  return newChart;
}

/** Fetch latest version chain for a patient (newest first). */
export async function listChartVersions(
  organizationId: string,
  patientId: string,
): Promise<TreatmentChart[]> {
  return await db
    .select()
    .from(treatmentCharts)
    .where(
      and(
        eq(treatmentCharts.organizationId, organizationId),
        eq(treatmentCharts.patientId, patientId),
      ),
    )
    .orderBy(desc(treatmentCharts.versionNumber), desc(treatmentCharts.createdAt));
}
