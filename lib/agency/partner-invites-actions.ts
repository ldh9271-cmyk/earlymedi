'use server';

import 'server-only';
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { withRls } from '@/lib/auth/rls-context';
import { requireAccess } from '@/lib/auth/route-guards';
import { invites } from '@/drizzle/schema/invites';
import { organizations } from '@/drizzle/schema/organizations';
import { partnerFacilities } from '@/drizzle/schema/partner-facilities';
import { partnerServices } from '@/drizzle/schema/partner-services';
import { partnerBookings } from '@/drizzle/schema/partner-bookings';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { auditLogs } from '@/drizzle/schema/audit';
import { signInviteToken } from '@/lib/auth/invite-tokens';
import { PARTNER_SUBTYPES, type PartnerSubtype } from '@/lib/agency/partner-subtypes';

/**
 * Server actions for the agency → partner-business invitation flow and
 * the /agency/partners directory. Pattern mirrors
 * freelancer-invites-actions.ts, with two differences:
 *
 *   - No referral code — partner revenue flows through bookings
 *     (partner_bookings.source_agency_org_id), not referral tracking.
 *   - The directory lists ALL non_medical orgs, not an affiliation
 *     table: partners are platform-wide resources the package builder
 *     can pull from, so every agency sees the same roster.
 */

const InviteInputSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해 주세요').max(255),
  partnerName: z
    .string()
    .min(2, '업체 이름은 2자 이상')
    .max(120, '120자 이하'),
  subtype: z.enum(PARTNER_SUBTYPES),
  notes: z.string().max(500).optional().nullable(),
});

export type PartnerInviteInput = z.infer<typeof InviteInputSchema>;
export type PartnerInviteResult = {
  inviteUrl: string;
  expiresAt: Date;
};

export async function sendPartnerInviteAction(
  raw: PartnerInviteInput,
): Promise<PartnerInviteResult> {
  const input = InviteInputSchema.parse(raw);
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });

  const result = await withRls(ctx, async () => {
    // 1. Insert invite row first (need its id to bake into the token)
    const [inviteRow] = await db
      .insert(invites)
      .values({
        organizationId: ctx.orgId,
        invitedByUserId: ctx.userId,
        email: input.email.toLowerCase(),
        role: 'owner', // partner becomes owner of their NEW org
        intendedAccountType: 'non_medical',
        tokenHash: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadata: {
          kind: 'partner_org',
          partnerName: input.partnerName,
          subtype: input.subtype,
          notes: input.notes ?? null,
          invitingOrgId: ctx.orgId,
        },
      })
      .returning({ id: invites.id, expiresAt: invites.expiresAt });
    if (!inviteRow) throw new Error('invite_create_failed');

    // 2. Mint JWT with invite id baked in + persist its hash on the row
    const { tokenHash, token } = await signInviteToken({
      organizationId: ctx.orgId,
      invitedEmail: input.email.toLowerCase(),
      role: 'owner',
      intendedAccountType: 'non_medical',
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
        kind: 'partner_org',
        email: input.email,
        partnerName: input.partnerName,
        subtype: input.subtype,
      },
    });

    // 4. Build shareable URL
    const host =
      headers().get('host') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'www.glowuptour.com';
    const proto = host.includes('localhost') ? 'http' : 'https';
    const inviteUrl = `${proto}://${host}/invite/${token}`;

    return { inviteUrl, expiresAt: inviteRow.expiresAt };
  });

  revalidatePath('/agency/partners');
  return result;
}

export async function revokePartnerInviteAction(inviteId: string): Promise<void> {
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
      metadata: { reason: 'revoked', kind: 'partner_org' },
    });
  });
  revalidatePath('/agency/partners');
}

export type PartnerRow = {
  orgId: string;
  name: string;
  subtype: PartnerSubtype | null;
  createdAt: Date;
  facilityCount: number;
  serviceCount: number;
  approvedListingCount: number;
  totalBookingCount: number;
  /** Bookings this agency referred (source_agency_org_id = my org). */
  myBookingCount: number;
};

export type PartnerPendingInviteRow = {
  inviteId: string;
  email: string;
  partnerName: string;
  subtype: PartnerSubtype | null;
  invitedAt: Date;
  expiresAt: Date;
};

export async function listPartnersAction(): Promise<{
  partners: PartnerRow[];
  pendingInvites: PartnerPendingInviteRow[];
}> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });

  return await withRls(ctx, async () => {
    const orgs = await db
      .select({
        orgId: organizations.id,
        name: organizations.name,
        subtype: organizations.partnerSubtype,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .where(eq(organizations.accountType, 'non_medical'))
      .orderBy(desc(organizations.createdAt));

    // Per-org aggregates — grouped counts merged in JS. Four small
    // GROUP BY scans beat N+1 per-org queries and keep drizzle simple.
    const [facilities, services, listings, bookingsAll, bookingsMine] = await Promise.all([
      db
        .select({ orgId: partnerFacilities.organizationId, n: count() })
        .from(partnerFacilities)
        .where(eq(partnerFacilities.isActive, true))
        .groupBy(partnerFacilities.organizationId),
      db
        .select({ orgId: partnerServices.organizationId, n: count() })
        .from(partnerServices)
        .where(eq(partnerServices.isActive, true))
        .groupBy(partnerServices.organizationId),
      db
        .select({ orgId: partnerListings.ownerOrgId, n: count() })
        .from(partnerListings)
        .where(eq(partnerListings.status, 'approved'))
        .groupBy(partnerListings.ownerOrgId),
      db
        .select({ orgId: partnerBookings.organizationId, n: count() })
        .from(partnerBookings)
        .groupBy(partnerBookings.organizationId),
      db
        .select({ orgId: partnerBookings.organizationId, n: count() })
        .from(partnerBookings)
        .where(eq(partnerBookings.sourceAgencyOrgId, ctx.orgId))
        .groupBy(partnerBookings.organizationId),
    ]);
    const toMap = (rows: Array<{ orgId: string; n: number }>): Map<string, number> =>
      new Map(rows.map((r) => [r.orgId, r.n]));
    const facMap = toMap(facilities);
    const svcMap = toMap(services);
    const lstMap = toMap(listings);
    const bkAllMap = toMap(bookingsAll);
    const bkMineMap = toMap(bookingsMine);

    const partners: PartnerRow[] = orgs.map((o) => ({
      orgId: o.orgId,
      name: o.name,
      subtype: (o.subtype as PartnerSubtype | null) ?? null,
      createdAt: o.createdAt,
      facilityCount: facMap.get(o.orgId) ?? 0,
      serviceCount: svcMap.get(o.orgId) ?? 0,
      approvedListingCount: lstMap.get(o.orgId) ?? 0,
      totalBookingCount: bkAllMap.get(o.orgId) ?? 0,
      myBookingCount: bkMineMap.get(o.orgId) ?? 0,
    }));

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
          eq(invites.intendedAccountType, 'non_medical'),
          isNull(invites.acceptedAt),
          isNull(invites.revokedAt),
        ),
      )
      .orderBy(asc(invites.createdAt));

    const pendingInvites: PartnerPendingInviteRow[] = pendingRows
      .filter((r) => r.expiresAt > new Date())
      .map((r) => {
        const meta = (r.metadata ?? {}) as { partnerName?: string; subtype?: string };
        return {
          inviteId: r.inviteId,
          email: r.email,
          partnerName: meta.partnerName ?? '(업체명 미정)',
          subtype: (meta.subtype as PartnerSubtype | undefined) ?? null,
          invitedAt: r.invitedAt,
          expiresAt: r.expiresAt,
        };
      });

    return { partners, pendingInvites };
  });
}
