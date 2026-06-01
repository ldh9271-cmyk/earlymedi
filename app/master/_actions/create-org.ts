'use server';

import 'server-only';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/client';
import { organizations } from '@/drizzle/schema/organizations';
import { auditLogs } from '@/drizzle/schema/audit';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { users } from '@/drizzle/schema/users';

/**
 * Master-only: create a brand-new organization without going through
 * the public /signup wizard.
 *
 * Difference vs `quickSignupAction`:
 *   - No Supabase auth.signUp — the org has no owner user yet. A
 *     placeholder "orphan" state, matched later when someone signs up
 *     with an email that matches `metadata.inviteEmail`, OR when the
 *     master operator explicitly invites an owner.
 *   - Uses the master's own user as a temporary owner membership so
 *     the org isn't unreachable in /master.
 *   - Skips billing-account creation; the receiving owner picks a plan
 *     on first real login.
 *
 * Why this exists:
 *   - Founder-side bulk import of hospitals/agencies/partners during
 *     pre-launch ops without forcing each one to self-signup first.
 *   - Avoids the chicken-and-egg problem where the master needs an
 *     Agency org to add hospitals, but the Agency owner hasn't joined
 *     the platform yet.
 */

const Input = z.object({
  accountType: z.enum(['agency', 'medical', 'non_medical', 'freelancer']),
  partnerSubtype: z
    .enum([
      'hotel',
      'spa',
      'salon',
      'studio',
      'restaurant',
      'transport',
      'tour',
      'shopping',
      'wellness',
      'other',
    ])
    .nullable()
    .optional(),
  name: z.string().min(2, '이름은 2자 이상').max(120),
  legalName: z.string().max(120).optional(),
  representativeName: z.string().max(80).optional(),
  countryCode: z.string().length(2).default('KR'),
  timezone: z.string().default('Asia/Seoul'),
  defaultLocale: z.string().default('ko'),
  defaultCurrency: z.string().default('KRW'),
  businessRegistrationNumber: z.string().max(40).optional(),
  foreignPatientLicenseNumber: z.string().max(40).optional(),
  medicalLicenseNumber: z.string().max(40).optional(),
  ownerInviteEmail: z.string().email().optional(),
});

export type MasterCreateOrgInput = z.infer<typeof Input>;

export type MasterCreateOrgResult =
  | { ok: true; orgId: string }
  | { ok: false; error: string };

export async function createOrgAsMaster(
  raw: MasterCreateOrgInput,
): Promise<MasterCreateOrgResult> {
  // ─── Auth gate ───────────────────────────────────────────────────
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: '인증되지 않은 요청' };
  if (!isMasterEmail(auth.user.email ?? null)) {
    return { ok: false, error: '마스터 권한이 필요합니다' };
  }

  const input = Input.safeParse(raw);
  if (!input.success) {
    return {
      ok: false,
      error: input.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
    };
  }
  const v = input.data;

  try {
    // Slug — autogenerate from name (lowercase, dashes). Append nano-suffix
    // on collision so we don't fail the master's flow on duplicates.
    const baseSlug = v.name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
      || 'org';
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

    const [created] = await db
      .insert(organizations)
      .values({
        accountType: v.accountType,
        partnerSubtype: v.partnerSubtype ?? null,
        name: v.name,
        legalName: v.legalName ?? null,
        slug,
        countryCode: v.countryCode,
        timezone: v.timezone,
        defaultLocale: v.defaultLocale,
        defaultCurrency: v.defaultCurrency,
        businessRegistrationNumber: v.businessRegistrationNumber ?? null,
        foreignPatientLicenseNumber: v.foreignPatientLicenseNumber ?? null,
        medicalLicenseNumber: v.medicalLicenseNumber ?? null,
        representativeName: v.representativeName ?? null,
        verificationStatus: 'unverified',
      })
      .returning({ id: organizations.id });
    if (!created) return { ok: false, error: '조직 생성 실패' };

    // Add the master as a temporary owner so the org is reachable from
    // /master and so audit logs have a meaningful actor_user_id.
    // Look up the master's users.id row first (created on first sign-in).
    const [masterUserRow] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, auth.user.id))
      .limit(1);
    if (masterUserRow) {
      await db
        .insert(orgMemberships)
        .values({
          organizationId: created.id,
          userId: masterUserRow.id,
          role: 'owner',
          status: 'active',
        })
        .onConflictDoNothing();
    }

    await db.insert(auditLogs).values({
      organizationId: created.id,
      actorUserId: auth.user.id,
      action: 'create',
      entityType: 'organization',
      entityId: created.id,
      diff: {
        source: 'master_console',
        accountType: v.accountType,
        partnerSubtype: v.partnerSubtype ?? null,
        ownerInviteEmail: v.ownerInviteEmail ?? null,
      },
      metadata: { isMaster: true },
    });

    return { ok: true, orgId: created.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown_error' };
  }
}

/**
 * Convenience wrapper for use as a `<form action>` from the new-org page.
 * Throws a `redirect()` on success so the master lands on /master.
 */
export async function createOrgAsMasterFormAction(formData: FormData): Promise<void> {
  const accountType = String(formData.get('accountType') ?? '');
  const partnerSubtype = formData.get('partnerSubtype');
  const result = await createOrgAsMaster({
    accountType: accountType as MasterCreateOrgInput['accountType'],
    partnerSubtype:
      partnerSubtype && partnerSubtype !== ''
        ? (String(partnerSubtype) as MasterCreateOrgInput['partnerSubtype'])
        : null,
    name: String(formData.get('name') ?? ''),
    legalName: formData.get('legalName') ? String(formData.get('legalName')) : undefined,
    representativeName: formData.get('representativeName')
      ? String(formData.get('representativeName'))
      : undefined,
    countryCode: String(formData.get('countryCode') ?? 'KR'),
    timezone: 'Asia/Seoul',
    defaultLocale: 'ko',
    defaultCurrency: 'KRW',
    businessRegistrationNumber: formData.get('businessRegistrationNumber')
      ? String(formData.get('businessRegistrationNumber'))
      : undefined,
    foreignPatientLicenseNumber: formData.get('foreignPatientLicenseNumber')
      ? String(formData.get('foreignPatientLicenseNumber'))
      : undefined,
    medicalLicenseNumber: formData.get('medicalLicenseNumber')
      ? String(formData.get('medicalLicenseNumber'))
      : undefined,
    ownerInviteEmail: formData.get('ownerInviteEmail')
      ? String(formData.get('ownerInviteEmail'))
      : undefined,
  });
  if (!result.ok) {
    // Form re-rendering will pick up the error via searchParams.
    redirect(`/master/orgs/new?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/master?created=${result.orgId}`);
}
