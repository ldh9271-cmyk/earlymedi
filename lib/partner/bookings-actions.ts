'use server';

import 'server-only';
import { and, desc, eq, gte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { withRls } from '@/lib/auth/rls-context';
import { requireAccess } from '@/lib/auth/route-guards';
import { partnerBookings } from '@/drizzle/schema/partner-bookings';
import { auditLogs } from '@/drizzle/schema/audit';

const BookingItemSchema = z.object({
  kind: z.enum(['facility', 'service']),
  refId: z.string().uuid(),
  name: z.string().min(1).max(200),
  quantity: z.coerce.number().int().min(1).default(1),
  unitPrice: z.coerce.number().int().min(0),
  currency: z.string().default('KRW'),
  unitLabel: z.string().nullable().default(null),
});

const BookingInputSchema = z.object({
  id: z.string().uuid().optional(),
  guestName: z.string().min(1).max(200),
  guestCountryCode: z.string().max(8).optional().nullable(),
  guestContact: z.string().max(200).optional().nullable(),
  partySize: z.coerce.number().int().min(1).max(50).default(1),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(BookingItemSchema).default([]),
  currency: z.string().default('KRW'),
  notes: z.string().max(2000).optional().nullable(),
});

export type BookingInput = z.infer<typeof BookingInputSchema>;
export type BookingItem = z.infer<typeof BookingItemSchema>;

export type BookingRow = {
  id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'declined';
  guestName: string;
  guestCountryCode: string | null;
  guestContact: string | null;
  partySize: number;
  checkInDate: string;
  checkOutDate: string;
  items: BookingItem[];
  totalAmount: number;
  currency: string;
  notes: string | null;
  createdAt: Date;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
};

function computeTotal(items: BookingItem[]): number {
  return items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
}

export async function listBookingsAction(opts?: {
  statusFilter?: 'all' | 'active' | BookingRow['status'];
}): Promise<BookingRow[]> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  return await withRls(ctx, async () => {
    const baseWhere = eq(partnerBookings.organizationId, ctx.orgId);
    // "active" = upcoming or confirmed (default view); explicit statuses
    // bypass that filter and let the user see history too.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString().slice(0, 10);

    const where =
      !opts?.statusFilter || opts.statusFilter === 'all'
        ? baseWhere
        : opts.statusFilter === 'active'
          ? and(baseWhere, gte(partnerBookings.checkInDate, todayIso))
          : and(baseWhere, eq(partnerBookings.status, opts.statusFilter));

    const rows = await db
      .select({
        id: partnerBookings.id,
        status: partnerBookings.status,
        guestName: partnerBookings.guestName,
        guestCountryCode: partnerBookings.guestCountryCode,
        guestContact: partnerBookings.guestContact,
        partySize: partnerBookings.partySize,
        checkInDate: partnerBookings.checkInDate,
        checkOutDate: partnerBookings.checkOutDate,
        items: partnerBookings.items,
        totalAmount: partnerBookings.totalAmount,
        currency: partnerBookings.currency,
        notes: partnerBookings.notes,
        createdAt: partnerBookings.createdAt,
        confirmedAt: partnerBookings.confirmedAt,
        cancelledAt: partnerBookings.cancelledAt,
      })
      .from(partnerBookings)
      .where(where)
      .orderBy(desc(partnerBookings.checkInDate))
      .limit(200);

    return rows.map((r) => ({
      ...r,
      checkInDate: String(r.checkInDate),
      checkOutDate: String(r.checkOutDate),
      items: (r.items ?? []) as BookingItem[],
    }));
  });
}

export async function upsertBookingAction(raw: BookingInput): Promise<{ id: string }> {
  const input = BookingInputSchema.parse(raw);
  if (input.checkOutDate < input.checkInDate) {
    throw new Error('check_out_before_check_in');
  }

  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  const total = computeTotal(input.items);

  const result = await withRls(ctx, async () => {
    if (input.id) {
      const [row] = await db
        .update(partnerBookings)
        .set({
          guestName: input.guestName,
          guestCountryCode: input.guestCountryCode ?? null,
          guestContact: input.guestContact ?? null,
          partySize: input.partySize,
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          items: input.items,
          totalAmount: total,
          currency: input.currency,
          notes: input.notes ?? null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(partnerBookings.id, input.id),
            eq(partnerBookings.organizationId, ctx.orgId),
          ),
        )
        .returning({ id: partnerBookings.id });
      if (!row) throw new Error('booking_not_found');
      await db.insert(auditLogs).values({
        organizationId: ctx.orgId,
        actorUserId: ctx.userId,
        action: 'update',
        entityType: 'partner_booking',
        entityId: row.id,
        diff: { guestName: input.guestName, totalAmount: total },
      });
      return { id: row.id };
    }

    const [row] = await db
      .insert(partnerBookings)
      .values({
        organizationId: ctx.orgId,
        status: 'pending',
        guestName: input.guestName,
        guestCountryCode: input.guestCountryCode ?? null,
        guestContact: input.guestContact ?? null,
        partySize: input.partySize,
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        items: input.items,
        totalAmount: total,
        currency: input.currency,
        notes: input.notes ?? null,
      })
      .returning({ id: partnerBookings.id });
    if (!row) throw new Error('booking_create_failed');
    await db.insert(auditLogs).values({
      organizationId: ctx.orgId,
      actorUserId: ctx.userId,
      action: 'create',
      entityType: 'partner_booking',
      entityId: row.id,
      diff: { guestName: input.guestName, totalAmount: total },
    });
    return { id: row.id };
  });

  revalidatePath('/partner/bookings');
  return result;
}

export async function setBookingStatusAction(
  bookingId: string,
  status: BookingRow['status'],
): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });

  await withRls(ctx, async () => {
    const now = new Date();
    const patch: Record<string, unknown> = {
      status,
      updatedAt: now,
    };
    if (status === 'confirmed') patch.confirmedAt = now;
    if (status === 'cancelled' || status === 'declined') patch.cancelledAt = now;

    const [row] = await db
      .update(partnerBookings)
      .set(patch)
      .where(
        and(
          eq(partnerBookings.id, bookingId),
          eq(partnerBookings.organizationId, ctx.orgId),
        ),
      )
      .returning({ id: partnerBookings.id });
    if (!row) throw new Error('booking_not_found');

    await db.insert(auditLogs).values({
      organizationId: ctx.orgId,
      actorUserId: ctx.userId,
      action: 'update',
      entityType: 'partner_booking',
      entityId: bookingId,
      diff: { status },
    });
  });

  revalidatePath('/partner/bookings');
}

export async function deleteBookingAction(bookingId: string): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  await withRls(ctx, async () => {
    await db
      .delete(partnerBookings)
      .where(
        and(
          eq(partnerBookings.id, bookingId),
          eq(partnerBookings.organizationId, ctx.orgId),
        ),
      );
    await db.insert(auditLogs).values({
      organizationId: ctx.orgId,
      actorUserId: ctx.userId,
      action: 'delete',
      entityType: 'partner_booking',
      entityId: bookingId,
    });
  });
  revalidatePath('/partner/bookings');
}
