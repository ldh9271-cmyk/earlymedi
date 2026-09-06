import { sql } from 'drizzle-orm';
import {
  doublePrecision, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { partnerListings } from './partner-listings';

/**
 * beauty_registry — 전국 미용업소 레지스트리 (행정안전부 LOCALDATA 생활_미용업 원천).
 *
 * partner_listings(hair/makeup/nail/pmu/personal_color …) 는 플랫폼 등록 업소이고,
 * 이 테이블은 지자체에 인허가된 모든 미용업소(일반미용업=헤어 · 메이크업업 ·
 * 네일아트업 · 피부미용업 · 종합미용업)다. 공개 화면은
 *   - contracted_listing_id 또는 claim_status='approved' → 컬러 카드 + 등록 상세
 *   - 그 외 → 흑백 카드 + 공공정보 상세 + "우리 매장 직접 등록" CTA
 * 반영구·퍼스널컬러는 법정 업태가 아니라 상호 키워드로 태깅한다.
 *
 * 좌표는 원천이 TM(EPSG:5174)이라 적재 시 WGS84(lat/lng)로 변환해 저장.
 */
export type BeautyDetails = {
  intro?: string;
  photos?: string[];
  languages?: string[];
  hours?: string;
  priceNote?: string;
  chairs?: number;
  beds?: number;
  areaM2?: number;
};

export const beautyRegistry = pgTable(
  'beauty_registry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mgtNo: text('mgt_no').notNull(), // 관리번호 (지자체코드-업종-연도-일련)
    name: text('name').notNull(),

    bizType: text('biz_type'), // 업태구분명: 일반미용업 · 메이크업업 · 네일아트업 · 피부미용업 · 종합미용업 …
    sanitationType: text('sanitation_type'), // 위생업태명
    categoryKeys: text('category_keys').array().notNull().default(sql`'{}'::text[]`), // hair · makeup · nail · skin · pmu · personal_color · lash

    statusCode: text('status_code'), // SALS_STTS_CD (01 영업/정상, 02 휴업, 03 폐업 …)
    statusName: text('status_name'),
    detailStatusName: text('detail_status_name'),
    openedDate: text('opened_date'), // 인허가일 YYYY-MM-DD
    closedDate: text('closed_date'),

    localCode: text('local_code'), // 개방자치단체코드
    sidoName: text('sido_name'),
    sgguName: text('sggu_name'),
    addrRoad: text('addr_road'),
    addrLot: text('addr_lot'),
    zip: text('zip'),
    tel: text('tel'),

    areaM2: doublePrecision('area_m2'),
    chairs: integer('chairs').notNull().default(0),
    beds: integer('beds').notNull().default(0),

    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),

    contractedListingId: uuid('contracted_listing_id').references(() => partnerListings.id, { onDelete: 'set null' }),
    claimOrgId: uuid('claim_org_id').references(() => organizations.id, { onDelete: 'set null' }),
    claimStatus: text('claim_status').notNull().default('none'),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),

    details: jsonb('details').$type<BeautyDetails>().notNull().default(sql`'{}'::jsonb`),
    lastModifiedAt: timestamp('last_modified_at', { withTimezone: true }),
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    mgtNoUnique: uniqueIndex('beauty_registry_mgt_no_unique').on(t.mgtNo),
    regionIdx: index('beauty_registry_region_idx').on(t.sidoName, t.sgguName),
    statusIdx: index('beauty_registry_status_idx').on(t.statusCode),
    contractedIdx: index('beauty_registry_contracted_idx').on(t.contractedListingId),
    geoIdx: index('beauty_registry_geo_idx').on(t.lat, t.lng),
  }),
);

export type BeautyRegistryRow = typeof beautyRegistry.$inferSelect;
