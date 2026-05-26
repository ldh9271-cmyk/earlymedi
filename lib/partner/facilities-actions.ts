'use server';

import 'server-only';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { withRls } from '@/lib/auth/rls-context';
import { requireAccess } from '@/lib/auth/route-guards';
import {
  partnerFacilities,
  partnerAvailability,
} from '@/drizzle/schema/partner-facilities';
import { auditLogs } from '@/drizzle/schema/audit';

/**
 * Server actions backing the partner facilities + availability calendar.
 * Every action does its own auth gate (requireAccess('non_medical') →
 * redirects on failure) and runs DB writes inside withRls so the
 * `app.current_org_id` setting scopes RLS policies.
 */

const FacilityInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  kind: z.enum(['room', 'seat', 'vehicle', 'guide', 'other']),
  capacityTotal: z.coerce.number().int().min(0).max(10_000),
  description: z.string().max(2000).optional().nullable(),
  defaultPriceAmount: z.coerce.number().int().min(0).optional().nullable(),
  defaultPriceCurrency: z.string().default('KRW'),
  defaultPriceUnit: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type FacilityInput = z.infer<typeof FacilityInputSchema>;

export type FacilityRow = {
  id: string;
  name: string;
  kind: 'room' | 'seat' | 'vehicle' | 'guide' | 'other';
  capacityTotal: number;
  description: string | null;
  defaultPriceAmount: number | null;
  defaultPriceCurrency: string;
  defaultPriceUnit: string | null;
  isActive: boolean;
  createdAt: Date;
};

export async function listFacilitiesAction(): Promise<FacilityRow[]> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  return await withRls(ctx, async () => {
    const rows = await db
      .select({
        id: partnerFacilities.id,
        name: partnerFacilities.name,
        kind: partnerFacilities.kind,
        capacityTotal: partnerFacilities.capacityTotal,
        description: partnerFacilities.description,
        defaultPriceAmount: partnerFacilities.defaultPriceAmount,
        defaultPriceCurrency: partnerFacilities.defaultPriceCurrency,
        defaultPriceUnit: partnerFacilities.defaultPriceUnit,
        isActive: partnerFacilities.isActive,
        createdAt: partnerFacilities.createdAt,
      })
      .from(partnerFacilities)
      .where(eq(partnerFacilities.organizationId, ctx.orgId))
      .orderBy(asc(partnerFacilities.kind), asc(partnerFacilities.name));
    return rows;
  });
}

export async function upsertFacilityAction(raw: FacilityInput): Promise<{ id: string }> {
  const input = FacilityInputSchema.parse(raw);
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });

  const result = await withRls(ctx, async () => {
    if (input.id) {
      // UPDATE existing — verify ownership via WHERE
      const [row] = await db
        .update(partnerFacilities)
        .set({
          name: input.name,
          kind: input.kind,
          capacityTotal: input.capacityTotal,
          description: input.description ?? null,
          defaultPriceAmount: input.defaultPriceAmount ?? null,
          defaultPriceCurrency: input.defaultPriceCurrency,
          defaultPriceUnit: input.defaultPriceUnit ?? null,
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(partnerFacilities.id, input.id),
            eq(partnerFacilities.organizationId, ctx.orgId),
          ),
        )
        .returning({ id: partnerFacilities.id });
      if (!row) throw new Error('facility_not_found');
      await db.insert(auditLogs).values({
        organizationId: ctx.orgId,
        actorUserId: ctx.userId,
        action: 'update',
        entityType: 'partner_facility',
        entityId: row.id,
        diff: { name: input.name, kind: input.kind, capacityTotal: input.capacityTotal },
      });
      return { id: row.id };
    }

    const [row] = await db
      .insert(partnerFacilities)
      .values({
        organizationId: ctx.orgId,
        name: input.name,
        kind: input.kind,
        capacityTotal: input.capacityTotal,
        description: input.description ?? null,
        defaultPriceAmount: input.defaultPriceAmount ?? null,
        defaultPriceCurrency: input.defaultPriceCurrency,
        defaultPriceUnit: input.defaultPriceUnit ?? null,
        isActive: input.isActive,
      })
      .returning({ id: partnerFacilities.id });
    if (!row) throw new Error('facility_create_failed');
    await db.insert(auditLogs).values({
      organizationId: ctx.orgId,
      actorUserId: ctx.userId,
      action: 'create',
      entityType: 'partner_facility',
      entityId: row.id,
      diff: { name: input.name, kind: input.kind, capacityTotal: input.capacityTotal },
    });
    return { id: row.id };
  });

  revalidatePath('/partner/facilities');
  revalidatePath('/partner/availability');
  return result;
}

export async function deleteFacilityAction(facilityId: string): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  await withRls(ctx, async () => {
    await db
      .delete(partnerFacilities)
      .where(
        and(
          eq(partnerFacilities.id, facilityId),
          eq(partnerFacilities.organizationId, ctx.orgId),
        ),
      );
    await db.insert(auditLogs).values({
      organizationId: ctx.orgId,
      actorUserId: ctx.userId,
      action: 'delete',
      entityType: 'partner_facility',
      entityId: facilityId,
    });
  });
  revalidatePath('/partner/facilities');
  revalidatePath('/partner/availability');
}

// ─── Availability ───────────────────────────────────────────────

export type AvailabilityRow = {
  facilityId: string;
  date: string; // YYYY-MM-DD
  availableCount: number;
  notes: string | null;
};

const AvailabilityInputSchema = z.object({
  facilityId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  availableCount: z.coerce.number().int().min(0).max(10_000),
  notes: z.string().max(500).optional().nullable(),
});

/**
 * Returns the rows in [startDate, endDate] inclusive for ALL facilities
 * owned by the partner. Sparse — only dates with an override are present.
 */
export async function listAvailabilityAction(
  startDate: string,
  endDate: string,
): Promise<AvailabilityRow[]> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  return await withRls(ctx, async () => {
    const rows = await db
      .select({
        facilityId: partnerAvailability.facilityId,
        date: partnerAvailability.date,
        availableCount: partnerAvailability.availableCount,
        notes: partnerAvailability.notes,
      })
      .from(partnerAvailability)
      .where(
        and(
          eq(partnerAvailability.organizationId, ctx.orgId),
          gte(partnerAvailability.date, startDate),
          lte(partnerAvailability.date, endDate),
        ),
      );
    return rows.map((r) => ({ ...r, date: String(r.date) }));
  });
}

/** Upsert one (facility, date) availability override. */
export async function setAvailabilityAction(
  raw: z.infer<typeof AvailabilityInputSchema>,
): Promise<void> {
  const input = AvailabilityInputSchema.parse(raw);
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });

  await withRls(ctx, async () => {
    // Verify the facility belongs to this org first to defend against
    // tampering of the form input.
    const [facility] = await db
      .select({ id: partnerFacilities.id })
      .from(partnerFacilities)
      .where(
        and(
          eq(partnerFacilities.id, input.facilityId),
          eq(partnerFacilities.organizationId, ctx.orgId),
        ),
      )
      .limit(1);
    if (!facility) throw new Error('facility_not_found');

    await db
      .insert(partnerAvailability)
      .values({
        organizationId: ctx.orgId,
        facilityId: input.facilityId,
        date: input.date,
        availableCount: input.availableCount,
        notes: input.notes ?? null,
      })
      .onConflictDoUpdate({
        target: [partnerAvailability.facilityId, partnerAvailability.date],
        set: {
          availableCount: input.availableCount,
          notes: input.notes ?? null,
          updatedAt: new Date(),
        },
      });
  });

  revalidatePath('/partner/availability');
}

/** Remove an override (the date reverts to the facility's capacity_total default). */
export async function clearAvailabilityAction(
  facilityId: string,
  date: string,
): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  await withRls(ctx, async () => {
    await db
      .delete(partnerAvailability)
      .where(
        and(
          eq(partnerAvailability.organizationId, ctx.orgId),
          eq(partnerAvailability.facilityId, facilityId),
          eq(partnerAvailability.date, date),
        ),
      );
  });
  revalidatePath('/partner/availability');
}
