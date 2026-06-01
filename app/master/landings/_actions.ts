'use server';

import 'server-only';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { categoryListings } from '@/drizzle/schema/category-listings';
import { auditLogs } from '@/drizzle/schema/audit';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { hospitals } from '@/drizzle/schema/hospitals';

async function requireMaster(): Promise<{ userId: string } | null> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  if (!isMasterEmail(auth.user.email ?? null)) return null;
  return { userId: auth.user.id };
}

/**
 * Master action: assign a hospital to a category (and optionally a
 * specific procedure under it).
 *
 *   - categoryKey:   plastic_surgery / dermatology / ... (required)
 *   - procedureSlug: rhinoplasty / botox / ...  (optional → null means
 *                    "category-level feature")
 *   - hospitalId:    target hospital
 *   - sortOrder:     numeric position, lower = earlier
 *
 * Same hospital can be listed at category-level + multiple procedure
 * slugs concurrently. The (category, procedure, hospital) tuple is
 * unique, so re-adding the same combo is a no-op (onConflictDoNothing).
 */
export async function addListing(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');

  const categoryKey = String(formData.get('categoryKey') ?? '');
  // '' is the sentinel for category-level (no specific procedure).
  const procedureSlug = String(formData.get('procedureSlug') ?? '').trim();
  const hospitalId = String(formData.get('hospitalId') ?? '');
  const sortOrderStr = String(formData.get('sortOrder') ?? '100');
  const sortOrder = Number.isFinite(Number(sortOrderStr)) ? Number(sortOrderStr) : 100;
  const promoLabel = String(formData.get('promoLabel') ?? '').trim() || null;

  if (!categoryKey || !hospitalId) {
    redirect('/master/landings?error=missing_fields');
  }

  // Verify hospital exists (RLS bypassed via postgres role on /master)
  const [h] = await db
    .select({ id: hospitals.id })
    .from(hospitals)
    .where(eq(hospitals.id, hospitalId))
    .limit(1);
  if (!h) redirect('/master/landings?error=hospital_not_found');

  await db
    .insert(categoryListings)
    .values({
      categoryKey,
      procedureSlug,
      hospitalId,
      sortOrder,
      promoLabel,
    })
    .onConflictDoUpdate({
      // Composite unique (categoryKey, coalesce(procedureSlug,''), hospitalId).
      // Drizzle's onConflictDoUpdate accepts a target spec — we update
      // sortOrder + promoLabel so editing an existing listing works
      // through the same form.
      target: [
        categoryListings.categoryKey,
        categoryListings.procedureSlug,
        categoryListings.hospitalId,
      ],
      set: {
        sortOrder,
        promoLabel,
        updatedAt: new Date(),
      },
    });

  await db.insert(auditLogs).values({
    organizationId: null as unknown as string, // category_listings is platform-scoped, no org
    actorUserId: master.userId,
    action: 'update',
    entityType: 'category_listing',
    entityId: hospitalId,
    diff: { categoryKey, procedureSlug, sortOrder, promoLabel },
    metadata: { isMaster: true, source: 'master_console', kind: 'listing_upsert' },
  }).catch(() => {
    // audit_logs.organization_id may be NOT NULL — non-fatal if it fails.
  });

  revalidatePath('/master/landings');
  revalidatePath(`/master/landings/${categoryKey}`);
  redirect(`/master/landings/${categoryKey}`);
}

/**
 * Remove a single listing row by id. Hard delete — the hospital row
 * itself is untouched, only the catalog mapping disappears.
 */
export async function removeListing(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');
  const id = String(formData.get('id') ?? '');
  const categoryKey = String(formData.get('categoryKey') ?? '');
  if (!id) redirect('/master/landings');
  await db.delete(categoryListings).where(eq(categoryListings.id, id));
  revalidatePath('/master/landings');
  if (categoryKey) revalidatePath(`/master/landings/${categoryKey}`);
  redirect(`/master/landings/${categoryKey || ''}`);
}

/**
 * Helpers for the page components (server-side reads).
 */
export async function listForCategory(
  categoryKey: string,
  procedureSlug?: string,
): Promise<
  Array<{
    id: string;
    categoryKey: string;
    procedureSlug: string;
    hospitalId: string;
    hospitalName: string;
    sortOrder: number;
    promoLabel: string | null;
  }>
> {
  const rows = await db
    .select({
      id: categoryListings.id,
      categoryKey: categoryListings.categoryKey,
      procedureSlug: categoryListings.procedureSlug,
      hospitalId: categoryListings.hospitalId,
      hospitalName: hospitals.name,
      sortOrder: categoryListings.sortOrder,
      promoLabel: categoryListings.promoLabel,
    })
    .from(categoryListings)
    .innerJoin(hospitals, eq(categoryListings.hospitalId, hospitals.id))
    .where(
      procedureSlug === undefined
        ? eq(categoryListings.categoryKey, categoryKey)
        : and(
            eq(categoryListings.categoryKey, categoryKey),
            eq(categoryListings.procedureSlug, procedureSlug),
          ),
    )
    .orderBy(categoryListings.sortOrder);
  return rows;
}

export async function countByCategory(): Promise<{
  counts: Map<string, number>;
  tableMissing: boolean;
}> {
  try {
    const rows = await db
      .select({
        categoryKey: categoryListings.categoryKey,
        n: sql<number>`count(*)::int`,
      })
      .from(categoryListings)
      .groupBy(categoryListings.categoryKey);
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.categoryKey, r.n);
    return { counts: m, tableMissing: false };
  } catch (e) {
    // Most likely "relation public.category_listings does not exist" —
    // the SQL migration in drizzle/sql/category-listings.sql hasn't run
    // yet. Return empty + flag so the page renders a migration prompt.
    const msg = e instanceof Error ? e.message : String(e);
    const missing = msg.includes('does not exist') || msg.includes('relation');
    return { counts: new Map(), tableMissing: missing };
  }
}

/**
 * Safer wrapper for page components — returns `{ rows, tableMissing }`
 * so the page can render a friendly migration prompt instead of crashing.
 */
export async function listForCategorySafe(
  categoryKey: string,
): Promise<{
  rows: Awaited<ReturnType<typeof listForCategory>>;
  tableMissing: boolean;
}> {
  try {
    const rows = await listForCategory(categoryKey);
    return { rows, tableMissing: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const missing = msg.includes('does not exist') || msg.includes('relation');
    return { rows: [], tableMissing: missing };
  }
}
