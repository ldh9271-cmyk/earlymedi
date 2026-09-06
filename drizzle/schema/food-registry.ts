import { sql } from 'drizzle-orm';
import { doublePrecision, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { partnerListings } from './partner-listings';

/**
 * food_registry — 전국 일반음식점 레지스트리 (행정안전부 LOCALDATA 식품_일반음식점).
 * partner_listings(food) 는 플랫폼이 큐레이션한 '찐맛집', 이 테이블은 지자체 인허가된
 * 모든 일반음식점(한식·중식·일식·양식·카페·치킨·분식 …). 미용업/숙박업 레지스트리와
 * 같은 규칙: contracted_listing_id / claim_status=approved → 컬러, 그 외 흑백 + 직접 등록 CTA.
 */
export type FoodDetails = {
  intro?: string; photos?: string[]; languages?: string[]; hours?: string; priceNote?: string; menu?: string[]; cuisine?: string;
};

export const foodRegistry = pgTable(
  'food_registry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mgtNo: text('mgt_no').notNull(),
    name: text('name').notNull(),
    bizType: text('biz_type'), // 업태구분명: 한식 · 중국식 · 일식 · 경양식 · 통닭(치킨) · 분식 · 카페 …
    sanitationType: text('sanitation_type'),
    categoryKeys: text('category_keys').array().notNull().default(sql`'{}'::text[]`), // korean · bbq · chinese · japanese · western · asian · cafe · chicken_pub · bunsik · other
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
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    contractedListingId: uuid('contracted_listing_id').references(() => partnerListings.id, { onDelete: 'set null' }),
    claimOrgId: uuid('claim_org_id').references(() => organizations.id, { onDelete: 'set null' }),
    claimStatus: text('claim_status').notNull().default('none'),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    details: jsonb('details').$type<FoodDetails>().notNull().default(sql`'{}'::jsonb`),
    lastModifiedAt: timestamp('last_modified_at', { withTimezone: true }),
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    mgtNoUnique: uniqueIndex('food_registry_mgt_no_unique').on(t.mgtNo),
    regionIdx: index('food_registry_region_idx').on(t.sidoName, t.sgguName),
    statusIdx: index('food_registry_status_idx').on(t.statusCode),
    contractedIdx: index('food_registry_contracted_idx').on(t.contractedListingId),
    geoIdx: index('food_registry_geo_idx').on(t.lat, t.lng),
  }),
);
export type FoodRegistryRow = typeof foodRegistry.$inferSelect;
