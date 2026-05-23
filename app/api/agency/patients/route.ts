export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { createPatient, listPatients } from '@/lib/db/repositories/patients';

const Query = z.object({
  q: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  nationality: z.string().optional(),
  tag: z.string().optional(),
});

const Body = z.object({
  fullName: z.string().min(2).max(120),
  surname: z.string().optional(),
  givenNames: z.string().optional(),
  aliasName: z.string().optional(),
  nationality: z.string().length(3).optional(),
  countryCode: z.string().length(2).optional(),
  locale: z.string().optional(),
  sex: z.enum(['male', 'female', 'other', 'unknown']).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  passportNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  sourceConversationId: z.string().uuid().optional(),
  sourceChannel: z.string().optional(),
  tags: z.array(z.string()).optional(),
  extractionJobId: z.string().uuid().optional(),
});

export async function GET(request: Request): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });
  const url = new URL(request.url);
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_query' }, { status: 400 });
  const data = await withRls(access.ctx, () =>
    listPatients(access.ctx.orgId, {
      search: parsed.data.q,
      status: parsed.data.status,
      nationality: parsed.data.nationality,
      tag: parsed.data.tag,
    }),
  );
  return NextResponse.json({ data });
}

export async function POST(request: Request): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  const created = await withRls(access.ctx, () =>
    createPatient(access.ctx.orgId, access.ctx.userId, parsed.data),
  );
  return NextResponse.json({ data: created });
}
