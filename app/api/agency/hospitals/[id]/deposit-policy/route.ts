export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { hospitalDepositPolicies } from '@/drizzle/schema/hospitals';
import { auditLogs } from '@/drizzle/schema/audit';

const Body = z.object({
  isEnabled: z.boolean().default(true),
  fixedAmountKrw: z.number().int().min(0).nullable().optional(),
  percentageBp: z.number().int().min(0).max(10_000).nullable().optional(),
  collector: z.enum(['agency_collects', 'hospital_direct', 'escrow']).default('agency_collects'),
  timing: z.enum(['on_quote_accepted', 'days_before_visit', 'on_arrival']).default('on_quote_accepted'),
  daysBeforeVisit: z.number().int().min(0).max(180).default(7),
  refundTiers: z
    .array(z.object({ daysBeforeVisitMin: z.number().int().min(0), refundBp: z.number().int().min(0).max(10_000) }))
    .default([]),
  medicalCauseFullRefund: z.boolean().default(true),
  forceMajeureFullRefund: z.boolean().default(true),
  includeInReferralBase: z.boolean().default(true),
  cancellationSplit: z
    .object({
      hospitalBp: z.number().int().min(0).max(10_000),
      agencyBp: z.number().int().min(0).max(10_000),
      patientRefundBp: z.number().int().min(0).max(10_000),
    })
    .optional(),
  autoCancelOnUnpaidHours: z.number().int().min(0).max(720).nullable().optional(),
});

export async function PUT(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  if (parsed.data.fixedAmountKrw && parsed.data.percentageBp) {
    return NextResponse.json({ error: 'specify_either_fixed_or_percent_not_both' }, { status: 400 });
  }

  return await withRls(access.ctx, async () => {
    const split = parsed.data.cancellationSplit;
    if (split && split.hospitalBp + split.agencyBp + split.patientRefundBp !== 10_000) {
      return NextResponse.json({ error: 'cancellation_split_must_sum_10000bp' }, { status: 400 });
    }

    // Upsert one row per hospital
    const [existing] = await db
      .select({ id: hospitalDepositPolicies.id })
      .from(hospitalDepositPolicies)
      .where(
        and(
          eq(hospitalDepositPolicies.organizationId, access.ctx.orgId),
          eq(hospitalDepositPolicies.hospitalId, params.id),
        ),
      )
      .limit(1);

    const values = {
      organizationId: access.ctx.orgId,
      hospitalId: params.id,
      isEnabled: parsed.data.isEnabled,
      fixedAmountKrw: parsed.data.fixedAmountKrw ?? null,
      percentageBp: parsed.data.percentageBp ?? null,
      collector: parsed.data.collector,
      timing: parsed.data.timing,
      daysBeforeVisit: parsed.data.daysBeforeVisit,
      refundTiersJson: parsed.data.refundTiers,
      medicalCauseFullRefund: parsed.data.medicalCauseFullRefund,
      forceMajeureFullRefund: parsed.data.forceMajeureFullRefund,
      includeInReferralBase: parsed.data.includeInReferralBase,
      cancellationSplitJson: split ?? { hospitalBp: 0, agencyBp: 0, patientRefundBp: 0 },
      autoCancelOnUnpaidHours: parsed.data.autoCancelOnUnpaidHours ?? null,
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(hospitalDepositPolicies)
        .set(values)
        .where(eq(hospitalDepositPolicies.id, existing.id));
    } else {
      await db.insert(hospitalDepositPolicies).values({ ...values, createdAt: new Date() });
    }

    await db.insert(auditLogs).values({
      organizationId: access.ctx.orgId,
      actorUserId: access.ctx.userId,
      action: 'update',
      entityType: 'hospital_deposit_policy',
      entityId: params.id,
      diff: { isEnabled: parsed.data.isEnabled, percentageBp: parsed.data.percentageBp ?? null },
    });

    void sql; // type-only marker
    return NextResponse.json({ data: { hospitalId: params.id } });
  });
}
