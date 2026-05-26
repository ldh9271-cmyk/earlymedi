'use server';

import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { withRls } from '@/lib/auth/rls-context';
import { requireAccess } from '@/lib/auth/route-guards';
import { partnerServices } from '@/drizzle/schema/partner-services';
import { auditLogs } from '@/drizzle/schema/audit';

const ServiceInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  category: z.enum(['massage', 'transfer', 'guide', 'food', 'tour', 'other']),
  description: z.string().max(2000).optional().nullable(),
  priceAmount: z.coerce.number().int().min(0),
  priceCurrency: z.string().default('KRW'),
  priceUnit: z.string().default('flat'),
  durationMinutes: z.coerce.number().int().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
});

export type ServiceInput = z.infer<typeof ServiceInputSchema>;

export type ServiceRow = {
  id: string;
  name: string;
  category: 'massage' | 'transfer' | 'guide' | 'food' | 'tour' | 'other';
  description: string | null;
  priceAmount: number;
  priceCurrency: string;
  priceUnit: string;
  durationMinutes: number | null;
  isActive: boolean;
  createdAt: Date;
};

export async function listServicesAction(): Promise<ServiceRow[]> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  return await withRls(ctx, async () => {
    return await db
      .select({
        id: partnerServices.id,
        name: partnerServices.name,
        category: partnerServices.category,
        description: partnerServices.description,
        priceAmount: partnerServices.priceAmount,
        priceCurrency: partnerServices.priceCurrency,
        priceUnit: partnerServices.priceUnit,
        durationMinutes: partnerServices.durationMinutes,
        isActive: partnerServices.isActive,
        createdAt: partnerServices.createdAt,
      })
      .from(partnerServices)
      .where(eq(partnerServices.organizationId, ctx.orgId))
      .orderBy(asc(partnerServices.category), asc(partnerServices.name));
  });
}

export async function upsertServiceAction(raw: ServiceInput): Promise<{ id: string }> {
  const input = ServiceInputSchema.parse(raw);
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });

  const result = await withRls(ctx, async () => {
    if (input.id) {
      const [row] = await db
        .update(partnerServices)
        .set({
          name: input.name,
          category: input.category,
          description: input.description ?? null,
          priceAmount: input.priceAmount,
          priceCurrency: input.priceCurrency,
          priceUnit: input.priceUnit,
          durationMinutes: input.durationMinutes ?? null,
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(partnerServices.id, input.id),
            eq(partnerServices.organizationId, ctx.orgId),
          ),
        )
        .returning({ id: partnerServices.id });
      if (!row) throw new Error('service_not_found');
      await db.insert(auditLogs).values({
        organizationId: ctx.orgId,
        actorUserId: ctx.userId,
        action: 'update',
        entityType: 'partner_service',
        entityId: row.id,
        diff: { name: input.name, category: input.category, priceAmount: input.priceAmount },
      });
      return { id: row.id };
    }

    const [row] = await db
      .insert(partnerServices)
      .values({
        organizationId: ctx.orgId,
        name: input.name,
        category: input.category,
        description: input.description ?? null,
        priceAmount: input.priceAmount,
        priceCurrency: input.priceCurrency,
        priceUnit: input.priceUnit,
        durationMinutes: input.durationMinutes ?? null,
        isActive: input.isActive,
      })
      .returning({ id: partnerServices.id });
    if (!row) throw new Error('service_create_failed');
    await db.insert(auditLogs).values({
      organizationId: ctx.orgId,
      actorUserId: ctx.userId,
      action: 'create',
      entityType: 'partner_service',
      entityId: row.id,
      diff: { name: input.name, category: input.category, priceAmount: input.priceAmount },
    });
    return { id: row.id };
  });

  revalidatePath('/partner/menu');
  return result;
}

export async function deleteServiceAction(serviceId: string): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  await withRls(ctx, async () => {
    await db
      .delete(partnerServices)
      .where(
        and(
          eq(partnerServices.id, serviceId),
          eq(partnerServices.organizationId, ctx.orgId),
        ),
      );
    await db.insert(auditLogs).values({
      organizationId: ctx.orgId,
      actorUserId: ctx.userId,
      action: 'delete',
      entityType: 'partner_service',
      entityId: serviceId,
    });
  });
  revalidatePath('/partner/menu');
}
