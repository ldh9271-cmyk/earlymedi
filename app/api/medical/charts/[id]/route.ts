export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import {
  getChart,
  replaceChartItems,
  setDepositReceived,
  setShareLevel,
  recordApproval,
} from '@/lib/db/repositories/treatment-charts';
import { transitionChart } from '@/lib/clinical/treatment-chart-engine';
import type { ActorRole, ChartTransition } from '@/lib/clinical/chart-approval-flow';

const ItemSchema = z.object({
  lineNumber: z.number().int().min(1),
  itemKind: z
    .enum(['procedure', 'addon', 'consumable', 'medication', 'follow_up_visit', 'discount', 'tax', 'other'])
    .default('procedure'),
  rawText: z.string().nullable().optional(),
  procedureNameNormalized: z.string().min(1),
  procedureCatalogId: z.string().uuid().nullable().optional(),
  procedureCode: z.string().nullable().optional(),
  bodyPart: z.string().nullable().optional(),
  quantity: z.number().int().min(1).default(1),
  unitPriceKrw: z.number().int().min(0).default(0),
  lineTotalKrw: z.number().int().min(0).default(0),
  vatIncluded: z.boolean().default(false),
  vatRateBp: z.number().int().min(0).max(10_000).default(1000),
  vatTreatment: z.enum(['exempt', 'taxable', 'mixed']).default('taxable'),
  isAddon: z.boolean().default(false),
  discountKrw: z.number().int().min(0).default(0),
  confidenceBp: z.number().int().min(0).max(10_000).default(10_000),
  aiNotes: z.string().nullable().optional(),
});

const PatchBody = z.union([
  z.object({ op: z.literal('replace_items'), items: z.array(ItemSchema) }),
  z.object({ op: z.literal('set_deposit'), depositReceivedKrw: z.number().int().min(0) }),
  z.object({
    op: z.literal('set_share_level'),
    shareLevel: z.enum(['name_only', 'name_and_amount', 'full']),
  }),
  z.object({
    op: z.literal('transition'),
    transition: z.enum([
      'submit',
      'start_review',
      'request_changes',
      'resubmit',
      'approve',
      'share',
      'finalize',
      'void',
    ]),
    reason: z.string().max(500).optional(),
  }),
  z.object({
    op: z.literal('sign'),
    role: z.enum(['hospital', 'agency', 'patient']),
    signerName: z.string().max(80).optional(),
  }),
]);

export async function GET(_req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['medical', 'agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });
  return await withRls(access.ctx, async () => {
    const data = await getChart(access.ctx.orgId, params.id);
    if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ data });
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['medical', 'agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const parsed = PatchBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  }

  return await withRls(access.ctx, async () => {
    const body = parsed.data;
    try {
      if (body.op === 'replace_items') {
        const chart = await replaceChartItems({
          organizationId: access.ctx.orgId,
          chartId: params.id,
          items: body.items.map((it) => ({
            lineNumber: it.lineNumber,
            itemKind: it.itemKind,
            rawText: it.rawText ?? null,
            procedureNameNormalized: it.procedureNameNormalized,
            procedureCatalogId: it.procedureCatalogId ?? null,
            procedureCode: it.procedureCode ?? null,
            bodyPart: it.bodyPart ?? null,
            quantity: it.quantity,
            unitPriceKrw: it.unitPriceKrw,
            lineTotalKrw: it.lineTotalKrw,
            vatIncluded: it.vatIncluded,
            vatRateBp: it.vatRateBp,
            vatTreatment: it.vatTreatment,
            isAddon: it.isAddon,
            discountKrw: it.discountKrw,
            confidenceBp: it.confidenceBp,
            aiNotes: it.aiNotes ?? null,
            metadata: {},
          })),
        });
        return NextResponse.json({ data: chart });
      }
      if (body.op === 'set_deposit') {
        const chart = await setDepositReceived(access.ctx.orgId, params.id, body.depositReceivedKrw);
        return NextResponse.json({ data: chart });
      }
      if (body.op === 'set_share_level') {
        await setShareLevel(access.ctx.orgId, params.id, body.shareLevel);
        return NextResponse.json({ data: { ok: true } });
      }
      if (body.op === 'sign') {
        await recordApproval({
          organizationId: access.ctx.orgId,
          chartId: params.id,
          role: body.role,
          signerUserId: access.ctx.userId,
          signerName: body.signerName ?? access.ctx.email,
        });
        return NextResponse.json({ data: { ok: true } });
      }
      // transition
      const actorRole: ActorRole = access.ctx.accountType === 'medical' ? 'hospital' : 'agency';
      const out = await transitionChart({
        organizationId: access.ctx.orgId,
        chartId: params.id,
        transition: body.transition as ChartTransition,
        actorRole,
        actorUserId: access.ctx.userId,
        reason: body.reason,
      });
      return NextResponse.json({ data: out });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      const status = msg.startsWith('chart_transition_') || msg === 'chart_finalize_missing_approvals' ? 409 : 500;
      return NextResponse.json({ error: msg }, { status });
    }
  });
}
