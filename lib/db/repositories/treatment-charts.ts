import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  treatmentCharts,
  treatmentChartItems,
  treatmentChartRevisions,
  treatmentChartApprovals,
} from '@/drizzle/schema/treatment-charts';
import type {
  NewTreatmentChart,
  NewTreatmentChartItem,
  TreatmentChart,
  TreatmentChartItem,
  TreatmentChartRevision,
} from '@/drizzle/schema/treatment-charts';
import { refreshChartTotals } from '@/lib/clinical/treatment-chart-engine';

export type ChartListRow = {
  id: string;
  versionNumber: number;
  status: TreatmentChart['status'];
  treatmentDate: string;
  doctorName: string | null;
  patientName: string | null;
  hospitalName: string | null;
  grandTotalKrw: number;
  quoteVarianceFlag: string | null;
  finalizedAt: Date | null;
  updatedAt: Date;
};

/**
 * List charts visible to the current org. For medical orgs, RLS filters down
 * to the hospital's own charts; for agency orgs, all charts owned by the
 * agency are returned. The caller is responsible for the active RLS context.
 */
export async function listCharts(
  organizationId: string,
  filter: { status?: TreatmentChart['status']; patientId?: string } = {},
  limit = 100,
): Promise<TreatmentChart[]> {
  const where = [eq(treatmentCharts.organizationId, organizationId)];
  if (filter.status) where.push(eq(treatmentCharts.status, filter.status));
  if (filter.patientId) where.push(eq(treatmentCharts.patientId, filter.patientId));
  return await db
    .select()
    .from(treatmentCharts)
    .where(and(...where))
    .orderBy(desc(treatmentCharts.updatedAt))
    .limit(limit);
}

export async function getChart(
  organizationId: string,
  chartId: string,
): Promise<{
  chart: TreatmentChart;
  items: TreatmentChartItem[];
  revisions: TreatmentChartRevision[];
  approvals: Array<{ role: string; signerName: string | null; signedAt: Date }>;
} | null> {
  const [chart] = await db
    .select()
    .from(treatmentCharts)
    .where(and(eq(treatmentCharts.organizationId, organizationId), eq(treatmentCharts.id, chartId)))
    .limit(1);
  if (!chart) return null;

  const [items, revisions, approvals] = await Promise.all([
    db
      .select()
      .from(treatmentChartItems)
      .where(eq(treatmentChartItems.chartId, chartId))
      .orderBy(treatmentChartItems.lineNumber),
    db
      .select()
      .from(treatmentChartRevisions)
      .where(eq(treatmentChartRevisions.chartId, chartId))
      .orderBy(desc(treatmentChartRevisions.createdAt))
      .limit(50),
    db
      .select({
        role: treatmentChartApprovals.role,
        signerName: treatmentChartApprovals.signerName,
        signedAt: treatmentChartApprovals.signedAt,
      })
      .from(treatmentChartApprovals)
      .where(eq(treatmentChartApprovals.chartId, chartId))
      .orderBy(treatmentChartApprovals.signedAt),
  ]);

  return { chart, items, revisions, approvals };
}

export type CreateChartInput = {
  organizationId: string;
  hospitalId: string;
  hospitalOrgId?: string | null;
  patientId: string;
  caseId?: string | null;
  treatmentDate: string;
  doctorName?: string | null;
  notes?: string | null;
  quoteId?: string | null;
  quoteTotalKrw?: number | null;
  createdByUserId: string | null;
};

export async function createChart(input: CreateChartInput): Promise<TreatmentChart> {
  const values: NewTreatmentChart = {
    organizationId: input.organizationId,
    hospitalId: input.hospitalId,
    hospitalOrgId: input.hospitalOrgId ?? null,
    patientId: input.patientId,
    caseId: input.caseId ?? null,
    treatmentDate: input.treatmentDate,
    doctorName: input.doctorName ?? null,
    notes: input.notes ?? null,
    quoteId: input.quoteId ?? null,
    quoteTotalKrw: input.quoteTotalKrw ?? null,
    status: 'draft',
    createdByUserId: input.createdByUserId,
  };
  const [chart] = await db.insert(treatmentCharts).values(values).returning();
  if (!chart) throw new Error('chart_create_failed');
  return chart;
}

export type UpsertChartItemsInput = {
  organizationId: string;
  chartId: string;
  items: Array<Omit<NewTreatmentChartItem, 'organizationId' | 'chartId' | 'id'>>;
};

/**
 * Replace all line items for a chart. Caller passes the full desired set;
 * the existing items are deleted and re-inserted in a transaction so the
 * chart line numbers stay dense. Totals are recomputed at the end.
 */
export async function replaceChartItems(input: UpsertChartItemsInput): Promise<TreatmentChart> {
  await db.transaction(async (tx) => {
    await tx.delete(treatmentChartItems).where(eq(treatmentChartItems.chartId, input.chartId));
    if (input.items.length > 0) {
      await tx.insert(treatmentChartItems).values(
        input.items.map((it, idx) => ({
          ...it,
          organizationId: input.organizationId,
          chartId: input.chartId,
          lineNumber: it.lineNumber ?? idx + 1,
        })),
      );
    }
  });
  return await refreshChartTotals(input.organizationId, input.chartId);
}

export async function setDepositReceived(
  organizationId: string,
  chartId: string,
  depositReceivedKrw: number,
): Promise<TreatmentChart> {
  await db
    .update(treatmentCharts)
    .set({ depositReceivedKrw, updatedAt: new Date() })
    .where(
      and(eq(treatmentCharts.organizationId, organizationId), eq(treatmentCharts.id, chartId)),
    );
  return await refreshChartTotals(organizationId, chartId);
}

export async function setShareLevel(
  organizationId: string,
  chartId: string,
  shareLevel: TreatmentChart['shareLevel'],
): Promise<void> {
  await db
    .update(treatmentCharts)
    .set({ shareLevel, updatedAt: new Date() })
    .where(
      and(eq(treatmentCharts.organizationId, organizationId), eq(treatmentCharts.id, chartId)),
    );
}

export async function recordApproval(input: {
  organizationId: string;
  chartId: string;
  role: 'hospital' | 'agency' | 'patient';
  signerUserId: string | null;
  signerName: string | null;
}): Promise<void> {
  await db
    .insert(treatmentChartApprovals)
    .values({
      organizationId: input.organizationId,
      chartId: input.chartId,
      role: input.role,
      signerUserId: input.signerUserId,
      signerName: input.signerName,
    })
    .onConflictDoNothing();
}
