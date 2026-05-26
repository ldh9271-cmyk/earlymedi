import { sql } from 'drizzle-orm';
import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

/**
 * Lifecycle of a partner booking.
 *
 *   pending   — Agency or guest submitted; partner hasn't responded yet
 *   confirmed — Partner accepted; reserved + invoice pending
 *   completed — Service rendered; counts toward settlement
 *   cancelled — Either party cancelled before service date
 *   declined  — Partner explicitly rejected (no capacity, blackout, etc.)
 */
export const bookingStatusEnum = pgEnum('partner_booking_status', [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'declined',
]);

/**
 * partner_bookings
 *
 * One row per reservation a partner organization is processing. Items
 * (rooms, services, etc.) are denormalized into a JSONB array so a
 * single booking can mix facilities and services without a join table.
 *
 * Agency-side bookings populate `sourceAgencyOrgId` so the partner can
 * trace which agency referred the guest; direct guest bookings (via
 * the partner's own KakaoTalk inbox, /partner/inbox) leave it null.
 */
export const partnerBookings = pgTable(
  'partner_bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id') // the PARTNER org
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Optional — agency that referred the booking. Direct guest = null. */
    sourceAgencyOrgId: uuid('source_agency_org_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),

    status: bookingStatusEnum('status').notNull().default('pending'),

    // Guest snapshot — denormalized so the partner sees the basics
    // without needing access to agency CRM rows.
    guestName: text('guest_name').notNull(),
    guestCountryCode: text('guest_country_code'),
    guestContact: text('guest_contact'), // 전화번호 / 이메일 / 카톡 ID
    partySize: integer('party_size').notNull().default(1),

    // Date window — checkInDate ≤ checkOutDate. For one-day services
    // (transfer, tour) both can equal the same date.
    checkInDate: date('check_in_date').notNull(),
    checkOutDate: date('check_out_date').notNull(),

    /** Line items — array of { kind: 'facility' | 'service', refId,
     *  name, quantity, unitPrice, currency, unitLabel }.
     *  Stored as JSONB so adding/removing items doesn't require schema
     *  migrations; queries don't need to join facilities/services tables
     *  to show booking summaries. */
    items: jsonb('items')
      .$type<
        Array<{
          kind: 'facility' | 'service';
          refId: string;
          name: string;
          quantity: number;
          unitPrice: number;
          currency: string;
          unitLabel: string | null;
        }>
      >()
      .notNull()
      .default(sql`'[]'::jsonb`),

    totalAmount: integer('total_amount').notNull().default(0),
    currency: text('currency').notNull().default('KRW'),

    notes: text('notes'), // partner-internal note

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (t) => ({
    orgStatusIdx: index('partner_bookings_org_status_idx').on(
      t.organizationId,
      t.status,
      t.checkInDate,
    ),
    orgDateIdx: index('partner_bookings_org_date_idx').on(
      t.organizationId,
      t.checkInDate,
    ),
  }),
);
