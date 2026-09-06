import { sql } from 'drizzle-orm';
import { doublePrecision, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { partnerListings } from './partner-listings';

/**
 * lodging_registry — 전국 숙박업소 레지스트리 (행정안전부 LOCALDATA 문화_숙박업).
 * partner_listings(hotel) 는 플랫폼 등록 숙소, 이 테이블은 지자체 인허가된 모든 숙박업소
 * (관광호텔·일반호텔·여관·생활숙박·게스트하우스·콘도 …). 미용업 레지스트리와 같은 규칙:
 * contracted_listing_id / claim_status=approved → 컬러, 그 외 흑백 + 직접 등록 CTA.
 */
export type LodgingDetails = {
  intro?: string; photos?: string[]; languages?: string[]; checkIn?: string; checkOut?: string; priceNote?: string; amenities?: string[];
  roomsKo?: number; roomsWe?: number; floors?: number; areaM2?: number;
};

export const lodgingRegistry = pgTable(
  'lodging_registry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mgtNo: text('mgt_no').notNull(),
    name: text('name').notNull(),
    bizType: text('biz_type'), // 업태구분명: 관광호텔 · 일반호텔 · 여관업 · 숙박업(생활) · 숙박업 기타 …
    sanitationType: text('sanitation_type'),
    categoryKeys: text('category_keys').array().notNull().default(sql`'{}'::text[]`), // hotel · motel · guesthouse · pension · medical_hotel · other
    statusCode: text('status_code'),
    statusName: text('status_name'),
    openedDate: text('opened_date'),
    closedDate: text('closed_date'),
    localCode: text('local_code'),
    sidoName: text('sido_name'),
    sgguName: text('sggu_name'),
    addrRoad: text('addr_road'),
    addrLot: text('addr_lot'),
    zip: text('zip'),
    tel: text('tel'),
    roomsKo: integer('rooms_ko').notNull().default(0), // 한실 수
    roomsWe: integer('rooms_we').notNull().default(0), // 양실 수
    floors: integer('floors').notNull().default(0),
    areaM2: doublePrecision('area_m2'),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    contractedListingId: uuid('contracted_listing_id').references(() => partnerListings.id, { onDelete: 'set null' }),
    claimOrgId: uuid('claim_org_id').references(() => organizations.id, { onDelete: 'set null' }),
    claimStatus: text('claim_status').notNull().default('none'),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    details: jsonb('details').$type<LodgingDetails>().notNull().default(sql`'{}'::jsonb`),
    lastModifiedAt: timestamp('last_modified_at', { withTimezone: true }),
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    mgtNoUnique: uniqueIndex('lodging_registry_mgt_no_unique').on(t.mgtNo),
    regionIdx: index('lodging_registry_region_idx').on(t.sidoName, t.sgguName),
    statusIdx: index('lodging_registry_status_idx').on(t.statusCode),
    contractedIdx: index('lodging_registry_contracted_idx').on(t.contractedListingId),
    geoIdx: index('lodging_registry_geo_idx').on(t.lat, t.lng),
  }),
);
export type LodgingRegistryRow = typeof lodgingRegistry.$inferSelect;
