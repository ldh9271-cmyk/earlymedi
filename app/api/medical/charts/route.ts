export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { listCharts, createChart } from '@/lib/db/repositories/treatment-charts';

const CreateBody = z.object({
  hospitalId: z.string().uuid(),
  hospitalOrgId: z.string().uuid().nullable().optional(),
  patientId: z.string().uuid(),
  caseId: z.string().uuid().nullable().optional(),
  treatmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  doctorName: z.string().max(80).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  quoteId: z.string().uuid().nullable().optional(),
  quoteTotalKrw: z.number().int().min(0).nullable().optional(),
});

export async function GET(): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['medical', 'agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });
  return await withRls(access.ctx, async () => {
    const rows = await listCharts(access.ctx.orgId, {}, 100);
    return NextResponse.json({ data: rows });
  });
}

export async function POST(request: Request): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['medical', 'agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const parsed = CreateBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  }

  return await withRls(access.ctx, async () => {
    const chart = await createChart({
      organizationId: access.ctx.orgId,
      hospitalId: parsed.data.hospitalId,
      hospitalOrgId: parsed.data.hospitalOrgId ?? null,
      patientId: parsed.data.patientId,
      caseId: parsed.data.caseId ?? null,
      treatmentDate: parsed.data.treatmentDate,
      doctorName: parsed.data.doctorName ?? null,
      notes: parsed.data.notes ?? null,
      quoteId: parsed.data.quoteId ?? null,
      quoteTotalKrw: parsed.data.quoteTotalKrw ?? null,
      createdByUserId: access.ctx.userId,
    });
    return NextResponse.json({ data: chart }, { status: 201 });
  });
}
