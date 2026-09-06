import { sql } from 'drizzle-orm';
import { doublePrecision, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * tour_spots — 전국 관광지(관광사진) 레지스트리 (한국관광공사 포토코리아 PhotoGalleryService1).
 * 관광 사진 10만여 장(공공누리 1유형). 사진 제목·촬영지·키워드·웹 이미지 URL 을 담고,
 * 촬영지 텍스트에서 시도/시군구를 파싱한다. 이 API 는 정확한 GPS 좌표가 없어
 * 지도 노출은 시도(광역) 중심 좌표 기준(region-level)이다.
 */
export const tourSpots = pgTable(
  'tour_spots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentId: text('content_id').notNull(),
    title: text('title').notNull(),
    imageUrl: text('image_url'),
    thumbUrl: text('thumb_url'),
    location: text('location'), // 촬영지 원문
    sidoName: text('sido_name'),
    sgguName: text('sggu_name'),
    keyword: text('keyword'), // 콤마 구분 검색 키워드
    categoryKeys: text('category_keys').array().notNull().default(sql`'{}'::text[]`), // nature · heritage · city · coast · theme · night · other
    photographer: text('photographer'),
    photoMonth: text('photo_month'),
    lat: doublePrecision('lat'), // geo_source 'kakao_kw' 면 실좌표, 아니면 시도 중심 좌표(근사)
    lng: doublePrecision('lng'),
    geoSource: text('geo_source'), // null = 미시도 · 'kakao_kw' = 카카오 키워드 검색 실좌표 · 'centroid' = 못 찾아 시도 중심 유지
    geoMatched: text('geo_matched'), // 카카오가 찾은 장소명 | 주소 (검증용)
    createdTime: text('created_time'),
    modifiedTime: text('modified_time'),
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    contentIdUnique: uniqueIndex('tour_spots_content_id_unique').on(t.contentId),
    regionIdx: index('tour_spots_region_idx').on(t.sidoName, t.sgguName),
    geoIdx: index('tour_spots_geo_idx').on(t.lat, t.lng),
  }),
);
export type TourSpotRow = typeof tourSpots.$inferSelect;
