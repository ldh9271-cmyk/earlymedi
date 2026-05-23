export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { listHospitals } from '@/lib/db/repositories/hospitals';
import { auditLogs } from '@/drizzle/schema/audit';

const Query = z.object({ q: z.string().optional(), category: z.string().optional() });
const Body = z.object({
  name: z.string().min(2).max(120),
  legalName: z.string().optional(),
  licenseNumber: z.string().optional(),
  foreignPatientLicenseNumber: z.string().optional(),
  countryCode: z.string().length(2).default('KR'),
  city: z.string().optional(),
  addressLine1: z.string().optional(),
  primaryCategories: z.array(z.string()).default([]),
  languagesSpoken: z.array(z.string()).default(['ko']),
  linkedOrgId: z.string().uuid().optional(),
  websiteUrl: z.string().url().optional(),
});

export async function GET(request: Request): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });
  const url = new URL(request.url);
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_query' }, { status: 400 });
  const data = await withRls(access.ctx, () =>
    listHospitals(access.ctx.orgId, { search: parsed.data.q, category: parsed.data.category }),
  );
  return NextResponse.json({ data });
}

export async function POST(request: Request): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

  return await withRls(access.ctx, async () => {
    const slug = `${parsed.data.name.toLowerCase().replace(/[^a-z0-9가-힣]+/gi, '-').slice(0, 28)}-${nanoid(5)}`;
    const [created] = await db
      .insert(hospitals)
      .values({
        organizationId: access.ctx.orgId,
        name: parsed.data.name,
        slug,
        legalName: parsed.data.legalName ?? null,
        licenseNumber: parsed.data.licenseNumber ?? null,
        foreignPatientLicenseNumber: parsed.data.foreignPatientLicenseNumber ?? null,
        countryCode: parsed.data.countryCode,
        addressJson: parsed.data.addressLine1 ? { line1: parsed.data.addressLine1, city: parsed.data.city } : {},
        primaryCategories: parsed.data.primaryCategories,
        languagesSpoken: parsed.data.languagesSpoken,
        linkedOrgId: parsed.data.linkedOrgId ?? null,
        websiteUrl: parsed.data.websiteUrl ?? null,
        onboardingChecklist: { basics: true },
        isActiveForMatching: false,
      })
      .returning();
    if (!created) return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
    await db.insert(auditLogs).values({
      organizationId: access.ctx.orgId,
      actorUserId: access.ctx.userId,
      action: 'create',
      entityType: 'hospital',
      entityId: created.id,
      diff: { name: parsed.data.name },
    });
    return NextResponse.json({ data: { id: created.id, slug: created.slug } });
  });
}

const ChecklistPatch = z.object({
  basics: z.boolean().optional(),
  licenses: z.boolean().optional(),
  referralPolicy: z.boolean().optional(),
  depositPolicy: z.boolean().optional(),
  chartWorkflow: z.boolean().optional(),
  settlementCycle: z.boolean().optional(),
  contractSigned: z.boolean().optional(),
});

export async function PATCH(request: Request): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });
  const Body2 = z.object({ hospitalId: z.string().uuid(), checklist: ChecklistPatch });
  const parsed = Body2.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  return await withRls(access.ctx, async () => {
    const [h] = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.id, parsed.data.hospitalId))
      .limit(1);
    if (!h) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const merged = { ...h.onboardingChecklist, ...parsed.data.checklist };
    const required = [
      'basics',
      'licenses',
      'referralPolicy',
      'depositPolicy',
      'chartWorkflow',
      'settlementCycle',
      'contractSigned',
    ] as const;
    const allDone = required.every((k) => merged[k] === true);
    await db
      .update(hospitals)
      .set({
        onboardingChecklist: merged,
        isActiveForMatching: allDone,
        updatedAt: new Date(),
      })
      .where(eq(hospitals.id, parsed.data.hospitalId));
    return NextResponse.json({ data: { id: parsed.data.hospitalId, isActiveForMatching: allDone } });
  });
}
