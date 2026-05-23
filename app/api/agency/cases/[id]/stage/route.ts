export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { transitionStage } from '@/lib/db/repositories/cases';

const STAGE = z.enum([
  'scoping',
  'rfq_sent',
  'quoted',
  'accepted',
  'deposit_paid',
  'scheduled',
  'arrived',
  'in_treatment',
  'post_treatment',
  'aftercare',
  'closed_won',
  'closed_lost',
  'closed_cancelled',
]);

const Body = z.object({
  stage: STAGE,
  reason: z.string().max(500).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  }

  return await withRls(access.ctx, async () => {
    try {
      await transitionStage(
        access.ctx.orgId,
        access.ctx.userId,
        params.id,
        parsed.data.stage,
        parsed.data.reason,
      );
      return NextResponse.json({ data: { id: params.id, stage: parsed.data.stage } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      return NextResponse.json({ error: msg }, { status: msg === 'case_not_found' ? 404 : 500 });
    }
  });
}
