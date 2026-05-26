'use server';

import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { withRls } from '@/lib/auth/rls-context';
import { requireAccess } from '@/lib/auth/route-guards';
import { freelancerReferralCodes } from '@/drizzle/schema/freelancer-referral-codes';
import { auditLogs } from '@/drizzle/schema/audit';

const CodeInputSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1).max(120),
  targetLocale: z.string().max(8).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CodeInput = z.infer<typeof CodeInputSchema>;

export type CodeRow = {
  id: string;
  code: string;
  label: string;
  targetLocale: string | null;
  notes: string | null;
  clicks: number;
  signups: number;
  isActive: boolean;
  createdAt: Date;
};

/**
 * Generate an 8-char uppercase alphanumeric code. Excludes characters
 * that look alike (O/0, I/1, B/8) so the freelancer can dictate the
 * code over the phone without confusion. Crockford-style alphabet.
 */
function generateCode(length = 8): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export async function listCodesAction(): Promise<CodeRow[]> {
  const ctx = await requireAccess({ allowedAccountTypes: ['freelancer'] });
  return await withRls(ctx, async () => {
    return await db
      .select({
        id: freelancerReferralCodes.id,
        code: freelancerReferralCodes.code,
        label: freelancerReferralCodes.label,
        targetLocale: freelancerReferralCodes.targetLocale,
        notes: freelancerReferralCodes.notes,
        clicks: freelancerReferralCodes.clicks,
        signups: freelancerReferralCodes.signups,
        isActive: freelancerReferralCodes.isActive,
        createdAt: freelancerReferralCodes.createdAt,
      })
      .from(freelancerReferralCodes)
      .where(eq(freelancerReferralCodes.organizationId, ctx.orgId))
      .orderBy(desc(freelancerReferralCodes.createdAt));
  });
}

export async function createCodeAction(raw: CodeInput): Promise<{ id: string; code: string }> {
  const input = CodeInputSchema.parse(raw);
  const ctx = await requireAccess({ allowedAccountTypes: ['freelancer'] });

  // Generate a globally unique code. Retry on the (extremely unlikely)
  // collision — 32^8 = 1.1 trillion possible 8-char codes so this is
  // effectively a safety net, not a real concern at our scale.
  let attempts = 0;
  let code = generateCode();
  const result = await withRls(ctx, async () => {
    while (attempts < 5) {
      try {
        const [row] = await db
          .insert(freelancerReferralCodes)
          .values({
            organizationId: ctx.orgId,
            code,
            label: input.label,
            targetLocale: input.targetLocale ?? null,
            notes: input.notes ?? null,
            isActive: input.isActive,
          })
          .returning({ id: freelancerReferralCodes.id, code: freelancerReferralCodes.code });
        if (!row) throw new Error('code_create_failed');
        await db.insert(auditLogs).values({
          organizationId: ctx.orgId,
          actorUserId: ctx.userId,
          action: 'create',
          entityType: 'referral_code',
          entityId: row.id,
          diff: { code: row.code, label: input.label },
        });
        return row;
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('freelancer_referral_codes_code_uq')) {
          // Rare collision — retry with a fresh code.
          attempts++;
          code = generateCode();
          continue;
        }
        throw err;
      }
    }
    throw new Error('code_generation_failed_too_many_collisions');
  });

  revalidatePath('/freelancer/referral-codes');
  return result;
}

export async function updateCodeAction(raw: CodeInput): Promise<void> {
  const input = CodeInputSchema.parse(raw);
  const id = input.id;
  if (!id) throw new Error('missing_id');
  const ctx = await requireAccess({ allowedAccountTypes: ['freelancer'] });

  await withRls(ctx, async () => {
    const [row] = await db
      .update(freelancerReferralCodes)
      .set({
        label: input.label,
        targetLocale: input.targetLocale ?? null,
        notes: input.notes ?? null,
        isActive: input.isActive,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(freelancerReferralCodes.id, id),
          eq(freelancerReferralCodes.organizationId, ctx.orgId),
        ),
      )
      .returning({ id: freelancerReferralCodes.id });
    if (!row) throw new Error('code_not_found');
    await db.insert(auditLogs).values({
      organizationId: ctx.orgId,
      actorUserId: ctx.userId,
      action: 'update',
      entityType: 'referral_code',
      entityId: row.id,
      diff: { label: input.label, isActive: input.isActive },
    });
  });
  revalidatePath('/freelancer/referral-codes');
}

export async function deleteCodeAction(codeId: string): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['freelancer'] });
  await withRls(ctx, async () => {
    await db
      .delete(freelancerReferralCodes)
      .where(
        and(
          eq(freelancerReferralCodes.id, codeId),
          eq(freelancerReferralCodes.organizationId, ctx.orgId),
        ),
      );
    await db.insert(auditLogs).values({
      organizationId: ctx.orgId,
      actorUserId: ctx.userId,
      action: 'delete',
      entityType: 'referral_code',
      entityId: codeId,
    });
  });
  revalidatePath('/freelancer/referral-codes');
}
