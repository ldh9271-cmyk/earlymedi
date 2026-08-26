'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import {
  acceptQuote,
  recordQuote,
  rejectQuote,
  sendRfq,
} from '@/lib/db/repositories/quotes';

function revalidate(caseId?: string): void {
  revalidatePath('/agency/quotes');
  revalidatePath('/agency/cases');
  if (caseId) revalidatePath(`/agency/cases/${caseId}`);
}

const SendRfqSchema = z.object({
  caseId: z.string().uuid(),
  hospitalIds: z.array(z.string().uuid()).min(1, '병원을 1개 이상 선택하세요').max(20),
});

export async function sendRfqAction(
  input: z.infer<typeof SendRfqSchema>,
): Promise<{ created: number }> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const parsed = SendRfqSchema.parse(input);
  const result = await withRls(ctx, () =>
    sendRfq(ctx.orgId, ctx.userId, parsed.caseId, parsed.hospitalIds),
  );
  revalidate(parsed.caseId);
  return result;
}

const RecordQuoteSchema = z.object({
  caseId: z.string().uuid(), // revalidate 용
  quoteId: z.string().uuid(),
  totalKrw: z.coerce.number().int().positive().max(2_000_000_000),
  depositKrw: z.coerce.number().int().nonnegative().max(2_000_000_000).optional().nullable(),
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  lineItems: z
    .array(z.object({ name: z.string().min(1).max(120), amountKrw: z.coerce.number().int() }))
    .max(30)
    .optional(),
  hospitalNotes: z.string().max(2000).optional().nullable(),
  internalMemo: z.string().max(2000).optional().nullable(),
});

export async function recordQuoteAction(
  input: z.infer<typeof RecordQuoteSchema>,
): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const parsed = RecordQuoteSchema.parse(input);
  await withRls(ctx, () =>
    recordQuote(ctx.orgId, ctx.userId, {
      quoteId: parsed.quoteId,
      totalKrw: parsed.totalKrw,
      depositKrw: parsed.depositKrw ?? null,
      validUntil: parsed.validUntil ?? null,
      lineItems: parsed.lineItems,
      hospitalNotes: parsed.hospitalNotes ?? null,
      internalMemo: parsed.internalMemo ?? null,
    }),
  );
  revalidate(parsed.caseId);
}

const QuoteRefSchema = z.object({
  caseId: z.string().uuid(),
  quoteId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export async function acceptQuoteAction(input: z.infer<typeof QuoteRefSchema>): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const parsed = QuoteRefSchema.parse(input);
  await withRls(ctx, () => acceptQuote(ctx.orgId, ctx.userId, parsed.quoteId));
  revalidate(parsed.caseId);
}

export async function rejectQuoteAction(input: z.infer<typeof QuoteRefSchema>): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const parsed = QuoteRefSchema.parse(input);
  await withRls(ctx, () => rejectQuote(ctx.orgId, ctx.userId, parsed.quoteId, parsed.reason));
  revalidate(parsed.caseId);
}
