'use server';

import 'server-only';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq, and, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { organizations } from '@/drizzle/schema/organizations';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { hospitals } from '@/drizzle/schema/hospitals';
import { patients } from '@/drizzle/schema/patients';
import { conversations } from '@/drizzle/schema/conversations';
import { channels } from '@/drizzle/schema/channels';
import { auditLogs } from '@/drizzle/schema/audit';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';

/**
 * Master-only org admin actions: delete + merge.
 *
 * Both are destructive and irreversible at the schema level — use ON
 * DELETE CASCADE wherever possible so a single DELETE on `organizations`
 * tears down dependent rows. For MERGE we explicitly UPDATE the major
 * child tables (memberships, hospitals, patients, conversations,
 * channels) and let cascade clean up the rest when source org is removed.
 *
 * Both actions emit `auditLogs` rows with isMaster=true and the source
 * data summary so we can reconstruct what happened post-hoc.
 */

async function requireMaster(): Promise<{ userId: string; email: string } | null> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  if (!isMasterEmail(auth.user.email ?? null)) return null;
  return { userId: auth.user.id, email: auth.user.email ?? '' };
}

/**
 * Counts of dependent rows for a given org. Powers the confirm UI
 * ("정말 삭제할까요? 멤버 3명 · 병원 12개 · 환자 280명") so the master
 * doesn't accidentally nuke a populated org.
 */
export async function getOrgDependencyCounts(orgId: string): Promise<{
  ok: boolean;
  counts?: {
    members: number;
    hospitals: number;
    patients: number;
    conversations: number;
    channels: number;
  };
  error?: string;
}> {
  const master = await requireMaster();
  if (!master) return { ok: false, error: '마스터 권한이 필요합니다' };
  try {
    const [memberRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(orgMemberships)
      .where(and(eq(orgMemberships.organizationId, orgId), eq(orgMemberships.status, 'active')));
    const [hospitalRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(hospitals)
      .where(eq(hospitals.organizationId, orgId));
    const [patientRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(patients)
      .where(eq(patients.organizationId, orgId));
    const [convRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(conversations)
      .where(eq(conversations.organizationId, orgId));
    const [channelRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(channels)
      .where(eq(channels.organizationId, orgId));
    return {
      ok: true,
      counts: {
        members: memberRow?.n ?? 0,
        hospitals: hospitalRow?.n ?? 0,
        patients: patientRow?.n ?? 0,
        conversations: convRow?.n ?? 0,
        channels: channelRow?.n ?? 0,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}

/**
 * Hard-delete an organization. Relies on the schema's ON DELETE CASCADE
 * on every child FK pointing at organizations.id. Audit log row is
 * written FIRST (with the to-be-deleted org's snapshot) so we can
 * reconstruct what was deleted.
 *
 * Caller is expected to have called getOrgDependencyCounts() and shown
 * the counts to the master — this action itself does NOT block on
 * non-empty dependents.
 */
export async function deleteOrgAsMaster(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');
  const orgId = String(formData.get('orgId') ?? '');
  if (!orgId) redirect('/master?error=missing_org');

  const [row] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      accountType: organizations.accountType,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  if (!row) redirect('/master?error=org_not_found');

  // Audit log BEFORE delete so cascade doesn't strip it (auditLogs has
  // organizationId FK with ON DELETE — depending on schema).
  await db.insert(auditLogs).values({
    organizationId: row.id,
    actorUserId: master.userId,
    action: 'delete',
    entityType: 'organization',
    entityId: row.id,
    diff: { name: row.name, accountType: row.accountType },
    metadata: { isMaster: true, source: 'master_console' },
  });

  await db.delete(organizations).where(eq(organizations.id, orgId));

  revalidatePath('/master');
  redirect('/master?deleted=1');
}

/**
 * Merge `sourceOrgId` into `targetOrgId`:
 *  1. Validate both exist and share the same account_type (mixing
 *     types would corrupt the role gates in middleware).
 *  2. UPDATE major child tables to point at the target.
 *  3. DELETE the source org (cascade strips remaining stragglers).
 *  4. Audit log row on the SURVIVING (target) org so the trail
 *     points where someone is likely to look.
 */
export async function mergeOrgAsMaster(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');
  const sourceOrgId = String(formData.get('sourceOrgId') ?? '');
  const targetOrgId = String(formData.get('targetOrgId') ?? '');
  if (!sourceOrgId || !targetOrgId) redirect('/master?error=missing_org');
  if (sourceOrgId === targetOrgId) redirect('/master?error=same_org');

  const orgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      accountType: organizations.accountType,
    })
    .from(organizations)
    .where(sql`${organizations.id} in (${sourceOrgId}, ${targetOrgId})`);
  const source = orgs.find((o) => o.id === sourceOrgId);
  const target = orgs.find((o) => o.id === targetOrgId);
  if (!source || !target) redirect('/master?error=org_not_found');
  if (source!.accountType !== target!.accountType) {
    redirect('/master?error=account_type_mismatch');
  }

  // 1. Move memberships (skip rows that would duplicate an existing
  //    membership in the target — those just get dropped by cascade
  //    when the source org is deleted).
  await db.execute(sql`
    update org_memberships
    set organization_id = ${targetOrgId}
    where organization_id = ${sourceOrgId}
      and user_id not in (
        select user_id from org_memberships
        where organization_id = ${targetOrgId}
      )
  `);

  // 2. Move hospitals (Agency-scoped — but if both orgs are non_medical
  //    this is a no-op; the column simply doesn't apply).
  await db
    .update(hospitals)
    .set({ organizationId: targetOrgId })
    .where(eq(hospitals.organizationId, sourceOrgId));

  // 3. Move patients.
  await db
    .update(patients)
    .set({ organizationId: targetOrgId })
    .where(eq(patients.organizationId, sourceOrgId));

  // 4. Move conversations.
  await db
    .update(conversations)
    .set({ organizationId: targetOrgId })
    .where(eq(conversations.organizationId, sourceOrgId));

  // 5. Move channels. We dedupe on (org, kind, externalAccountId) by
  //    skipping rows that already exist in target — leftovers cascade
  //    when source is deleted.
  await db.execute(sql`
    update channels
    set organization_id = ${targetOrgId}
    where organization_id = ${sourceOrgId}
      and (kind, coalesce(external_account_id, '')) not in (
        select kind, coalesce(external_account_id, '') from channels
        where organization_id = ${targetOrgId}
      )
  `);

  // 6. Audit on the target (surviving) org.
  // auditLogs.action enum doesn't include 'merge' — record as 'update'
  // with merge semantics in diff + metadata.kind.
  await db.insert(auditLogs).values({
    organizationId: targetOrgId,
    actorUserId: master.userId,
    action: 'update',
    entityType: 'organization',
    entityId: targetOrgId,
    diff: {
      mergedFromOrgId: sourceOrgId,
      mergedFromName: source!.name,
      accountType: source!.accountType,
    },
    metadata: { isMaster: true, source: 'master_console', kind: 'org_merge' },
  });

  // 7. Finally delete the source org. Remaining child rows (cases,
  //    treatment_charts, billing, etc.) cascade-drop.
  await db.delete(organizations).where(eq(organizations.id, sourceOrgId));

  revalidatePath('/master');
  redirect(`/master?merged=1`);
}

/**
 * Helper: list candidate target orgs for a merge (same account_type,
 * not the source itself).
 */
export async function listMergeCandidates(
  sourceOrgId: string,
): Promise<Array<{ id: string; name: string }>> {
  const master = await requireMaster();
  if (!master) return [];
  const [source] = await db
    .select({ accountType: organizations.accountType })
    .from(organizations)
    .where(eq(organizations.id, sourceOrgId))
    .limit(1);
  if (!source) return [];
  const rows = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(
      and(
        eq(organizations.accountType, source.accountType),
        ne(organizations.id, sourceOrgId),
      ),
    )
    .orderBy(organizations.name);
  return rows;
}
