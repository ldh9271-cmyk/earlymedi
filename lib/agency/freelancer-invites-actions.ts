'use server';

import 'server-only';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { withRls } from '@/lib/auth/rls-context';
import { requireAccess } from '@/lib/auth/route-guards';
import { invites } from '@/drizzle/schema/invites';
import { freelancerAffiliations } from '@/drizzle/schema/affiliations';
import { organizations } from '@/drizzle/schema/organizations';
import { auditLogs } from '@/drizzle/schema/audit';
import { signInviteToken } from '@/lib/auth/invite-tokens';

/**
 * Server actions for the agency → freelancer invitation flow. This is
 * DIFFERENT from sendTeamInviteAction:
 *
 *   - Team invite: invitee joins the SAME organization as a colleague.
 *   - Freelancer invite: invitee creates their OWN freelancer organization
 *     and the agency + freelancer pair gets recorded in
 *     freelancer_affiliations (with a unique referral_code).
 *
 * The referral_code is generated up-front (so it lives on the invite
 * metadata and on the resulting affiliation row). The agency operator
 * can override the auto-generated code with a custom one in the modal.
 */

const InviteInputSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해 주세요').max(255),
  freelancerName: z
    .string()
    .min(2, '프리랜서/조직 이름은 2자 이상')
    .max(120, '120자 이하'),
  /** Optional override — must be 4-20 chars, alphanumeric+dash. */
  referralCode: z
    .string()
    .regex(/^[A-Z0-9-]{4,20}$/, '코드는 영문 대문자/숫자/- 4-20자')
    .optional()
    .or(z.literal('')),
  notes: z.string().max(500).optional().nullable(),
});

export type FreelancerInviteInput = z.infer<typeof InviteInputSchema>;
export type FreelancerInviteResult = {
  inviteUrl: string;
  referralCode: string;
  expiresAt: Date;
};

/**
 * Generate an 8-char Crockford-style referral code with an "F-" prefix
 * so they're visually distinct from other code types and easy to dictate
 * over the phone. Excludes O/0/I/1/B/8.
 */
function generateReferralCode(): string {
  const alphabet = 'ACDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'F-';
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export async function sendFreelancerInviteAction(
  raw: FreelancerInviteInput,
): Promise<FreelancerInviteResult> {
  const input = InviteInputSchema.parse(raw);
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });

  // Pick a code: caller-provided (validated above) or auto-generated.
  // Retry on uniqueness collisions (extremely rare at our scale).
  let referralCode = input.referralCode?.trim() || generateReferralCode();

  const result = await withRls(ctx, async () => {
    let attempts = 0;
    while (attempts < 5) {
      try {
        // 1. Insert invite row first (need its id to bake into the token)
        const [inviteRow] = await db
          .insert(invites)
          .values({
            organizationId: ctx.orgId,
            invitedByUserId: ctx.userId,
            email: input.email.toLowerCase(),
            role: 'owner', // freelancer becomes owner of their NEW org
            intendedAccountType: 'freelancer',
            tokenHash: 'pending',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            metadata: {
              kind: 'freelancer_affiliation',
              freelancerName: input.freelancerName,
              referralCode,
              notes: input.notes ?? null,
              invitingOrgId: ctx.orgId,
            },
          })
          .returning({ id: invites.id, expiresAt: invites.expiresAt });
        if (!inviteRow) throw new Error('invite_create_failed');

        // 2. Mint JWT with invite id baked in + persist its hash on the row
        const { token, tokenHash } = await signInviteToken({
          organizationId: ctx.orgId,
          invitedEmail: input.email.toLowerCase(),
          role: 'owner',
          intendedAccountType: 'freelancer',
          inviteId: inviteRow.id,
        });
        await db.update(invites).set({ tokenHash }).where(eq(invites.id, inviteRow.id));

        // 3. Audit
        await db.insert(auditLogs).values({
          organizationId: ctx.orgId,
          actorUserId: ctx.userId,
          action: 'create',
          entityType: 'invite',
          entityId: inviteRow.id,
          diff: {
            kind: 'freelancer_affiliation',
            email: input.email,
            referralCode,
          },
        });

        // 4. Build shareable URL
        const host =
          headers().get('host') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'earlymedi.vercel.app';
        const proto = host.includes('localhost') ? 'http' : 'https';
        const inviteUrl = `${proto}://${host}/invite/${token}`;

        return { inviteUrl, referralCode, expiresAt: inviteRow.expiresAt };
      } catch (err) {
        // Unique-code collision is the only retryable error. Everything
        // else (e.g. email validation, RLS) re-throws immediately.
        const msg = err instanceof Error ? err.message : '';
        if (
          msg.includes('freelancer_affiliations_referral_code_unique') ||
          msg.includes('referral_code')
        ) {
          attempts++;
          referralCode = generateReferralCode();
          continue;
        }
        throw err;
      }
    }
    throw new Error('referral_code_generation_too_many_collisions');
  });

  revalidatePath('/agency/freelancers');
  return result;
}

export async function revokeFreelancerInviteAction(inviteId: string): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  await withRls(ctx, async () => {
    await db
      .update(invites)
      .set({ revokedAt: new Date() })
      .where(and(eq(invites.id, inviteId), eq(invites.organizationId, ctx.orgId)));
    await db.insert(auditLogs).values({
      organizationId: ctx.orgId,
      actorUserId: ctx.userId,
      action: 'delete',
      entityType: 'invite',
      entityId: inviteId,
      metadata: { reason: 'revoked' },
    });
  });
  revalidatePath('/agency/freelancers');
}

export type AffiliationRow = {
  id: string;
  freelancerOrgId: string;
  freelancerOrgName: string;
  referralCode: string;
  isActive: boolean;
  createdAt: Date;
  contractSignedAt: Date | null;
};

export type PendingInviteRow = {
  inviteId: string;
  email: string;
  freelancerName: string;
  referralCode: string;
  invitedAt: Date;
  expiresAt: Date;
  inviteUrl: string;
};

export async function listFreelancerAffiliationsAction(): Promise<{
  active: AffiliationRow[];
  pendingInvites: PendingInviteRow[];
}> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });

  const result = await withRls(ctx, async () => {
    const activeRows = await db
      .select({
        id: freelancerAffiliations.id,
        freelancerOrgId: freelancerAffiliations.freelancerOrgId,
        freelancerOrgName: organizations.name,
        referralCode: freelancerAffiliations.referralCode,
        isActive: freelancerAffiliations.isActive,
        createdAt: freelancerAffiliations.createdAt,
        contractSignedAt: freelancerAffiliations.contractSignedAt,
      })
      .from(freelancerAffiliations)
      .innerJoin(
        organizations,
        eq(freelancerAffiliations.freelancerOrgId, organizations.id),
      )
      .where(eq(freelancerAffiliations.agencyOrgId, ctx.orgId))
      .orderBy(desc(freelancerAffiliations.createdAt));

    const pendingRows = await db
      .select({
        inviteId: invites.id,
        email: invites.email,
        invitedAt: invites.createdAt,
        expiresAt: invites.expiresAt,
        metadata: invites.metadata,
      })
      .from(invites)
      .where(
        and(
          eq(invites.organizationId, ctx.orgId),
          eq(invites.intendedAccountType, 'freelancer'),
          isNull(invites.acceptedAt),
          isNull(invites.revokedAt),
        ),
      )
      .orderBy(asc(invites.createdAt));

    return { activeRows, pendingRows };
  });

  // Build invite URLs (need request host). We DON'T have the original
  // token — only its hash — so the URL would require re-signing. For
  // now show a placeholder and let the operator re-send. Future
  // improvement: store the URL alongside the hash in metadata.
  const host =
    headers().get('host') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'earlymedi.vercel.app';
  const proto = host.includes('localhost') ? 'http' : 'https';

  return {
    active: result.activeRows,
    pendingInvites: result.pendingRows
      .filter((r) => r.expiresAt > new Date())
      .map((r) => {
        const meta = (r.metadata ?? {}) as {
          freelancerName?: string;
          referralCode?: string;
        };
        return {
          inviteId: r.inviteId,
          email: r.email,
          freelancerName: meta.freelancerName ?? '(이름 미정)',
          referralCode: meta.referralCode ?? '',
          invitedAt: r.invitedAt,
          expiresAt: r.expiresAt,
          // We don't store the raw token. The operator copies email
          // from this row and re-sends or uses the link from the
          // sendFreelancerInviteAction success toast.
          inviteUrl: `${proto}://${host}/invite/?email=${encodeURIComponent(r.email)}`,
        };
      }),
  };
}
