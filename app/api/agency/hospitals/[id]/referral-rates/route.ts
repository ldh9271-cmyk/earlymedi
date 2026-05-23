export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { hospitalReferralRates } from '@/drizzle/schema/hospitals';
import { auditLogs } from '@/drizzle/schema/audit';

const Body = z.object({
  rules: z
    .array(
      z.object({
        category: z
          .enum([
            'plastic_surgery',
            'dermatology',
            'hair',
            'dental',
            'ophthalmology',
            'obstetrics',
            'oriental',
            'checkup',
            'orthopedic',
            'cardiology',
            'oncology',
            'gastroenterology',
            'neurology',
            'urology',
            'ent',
            'fertility',
            'cosmetic_dental',
            'general',
          ])
          .nullable()
          .optional(),
        procedureCode: z.string().nullable().optional(),
        rateBp: z.number().int().min(0).max(10_000),
        feeBase: z.enum(['gross_amount', 'net_excl_vat', 'patient_paid']).default('net_excl_vat'),
        packageRule: z
          .enum(['sum_per_item', 'single_package_rate', 'minimum_per_item'])
          .default('sum_per_item'),
        vatTreatment: z.enum(['exempt', 'taxable', 'mixed']).default('mixed'),
        vipRateBp: z.number().int().min(0).max(10_000).nullable().optional(),
        repeatRateBp: z.number().int().min(0).max(10_000).nullable().optional(),
        minimumGuaranteeKrw: z.number().int().min(0).nullable().optional(),
        payoutTrigger: z
          .enum(['on_payment', 'on_treatment_done', 'on_discharge', 'on_recovery_d7', 'on_recovery_d30'])
          .default('on_treatment_done'),
        payoutHoldDays: z.number().int().min(0).max(180).default(7),
      }),
    )
    .min(1)
    .max(40),
});

export async function PUT(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

  return await withRls(access.ctx, async () => {
    // Idempotent: wipe existing rules for this hospital and re-insert.
    await db
      .delete(hospitalReferralRates)
      .where(
        and(
          eq(hospitalReferralRates.hospitalId, params.id),
          eq(hospitalReferralRates.organizationId, access.ctx.orgId),
        ),
      );
    for (const r of parsed.data.rules) {
      await db.insert(hospitalReferralRates).values({
        organizationId: access.ctx.orgId,
        hospitalId: params.id,
        category: r.category ?? null,
        procedureCode: r.procedureCode ?? null,
        rateBp: r.rateBp,
        feeBase: r.feeBase,
        packageRule: r.packageRule,
        vatTreatment: r.vatTreatment,
        vipRateBp: r.vipRateBp ?? null,
        repeatRateBp: r.repeatRateBp ?? null,
        minimumGuaranteeKrw: r.minimumGuaranteeKrw ?? null,
        payoutTrigger: r.payoutTrigger,
        payoutHoldDays: r.payoutHoldDays,
      });
    }
    await db.insert(auditLogs).values({
      organizationId: access.ctx.orgId,
      actorUserId: access.ctx.userId,
      action: 'update',
      entityType: 'hospital_referral_rates',
      entityId: params.id,
      diff: { count: parsed.data.rules.length },
    });
    return NextResponse.json({ data: { hospitalId: params.id, count: parsed.data.rules.length } });
  });
}
