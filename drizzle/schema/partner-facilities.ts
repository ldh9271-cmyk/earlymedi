import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

/**
 * What kind of capacity-bound resource the partner owns. Drives the
 * default unit label in the UI ("객실 수" vs "좌석 수" vs "차량 수")
 * but doesn't restrict the schema — a hotel with a shuttle van can
 * have both `room` and `vehicle` rows side by side.
 */
export const facilityKindEnum = pgEnum('facility_kind', [
  'room', // 객실 (호텔/리조트/회복호텔)
  'seat', // 좌석 (식당/스파 룸)
  'vehicle', // 차량 (의전·셔틀)
  'guide', // 인력 (가이드·통역)
  'other',
]);

/**
 * partner_facilities
 *
 * Capacity-bound resource a non-medical partner sells: hotel rooms,
 * spa suites, restaurant tables, vehicles, guide slots. Each row is
 * one SKU that has a fixed total inventory (e.g. 20 deluxe rooms);
 * day-by-day availability overrides live in partner_availability.
 *
 * Lives only in `non_medical` partner orgs — not on agency/medical
 * sides. Agencies discover facilities indirectly via the package
 * builder which queries by date + capacity needed.
 */
export const partnerFacilities = pgTable(
  'partner_facilities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    name: text('name').notNull(), // "디럭스 더블", "VIP 스파 스위트", "9인승 의전차"
    kind: facilityKindEnum('kind').notNull().default('room'),

    /** Total inventory of this SKU. A hotel with 20 deluxe rooms sets
     *  this to 20. partner_availability rows can override this number
     *  for specific dates (e.g. 5 rooms blocked for maintenance). */
    capacityTotal: integer('capacity_total').notNull().default(1),

    description: text('description'),

    /** Optional default price ranges so the package builder has
     *  something to estimate with before a formal quote is pulled
     *  from partner_services. Currency is KRW unless stated. */
    defaultPriceAmount: integer('default_price_amount'),
    defaultPriceCurrency: text('default_price_currency').notNull().default('KRW'),
    defaultPriceUnit: text('default_price_unit'), // "night" / "person" / "hour" / "flat"

    /** Free-form structured attributes (bed type, square meters, etc.). */
    attributes: jsonb('attributes')
      .$type<Record<string, string | number | boolean>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index('partner_facilities_org_idx').on(t.organizationId, t.isActive),
  }),
);

/**
 * partner_availability
 *
 * Per-day override of a facility's bookable count. ABSENCE of a row
 * for (facility, date) means "use facilityTotal as the available count";
 * presence means "exactly N bookable on this date" (could be 0 to fully
 * block).
 *
 * This sparse approach lets a 365-day calendar live in just the rows
 * where the partner actually altered defaults — a 50-room hotel with
 * 10 blocked dates per year stores 10 rows, not 50×365.
 */
export const partnerAvailability = pgTable(
  'partner_availability',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => partnerFacilities.id, { onDelete: 'cascade' }),

    /** The calendar date this row overrides. */
    date: date('date').notNull(),

    /** How many units of the facility are bookable on this date. 0 = blocked. */
    availableCount: integer('available_count').notNull(),

    /** Optional reason ("maintenance", "private event", "high season +20% rate"). */
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // One override per (facility, date) — UPSERT target.
    facilityDateUq: uniqueIndex('partner_availability_facility_date_uq').on(
      t.facilityId,
      t.date,
    ),
    // Range lookups for the calendar view.
    orgDateIdx: index('partner_availability_org_date_idx').on(t.organizationId, t.date),
  }),
);
