import { bigserial, boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * page_views — 공개 포털 방문 기록 (마스터 통계 리포트의 원천).
 *
 * Vercel Analytics 는 원자료를 API 로 안 내주고, 나라별·시간대별·게시물별로
 * 우리가 원하는 대로 자르려면 결국 우리 테이블이 있어야 한다. 브라우저가
 * 경로가 바뀔 때마다 /api/track/view 로 비콘을 쏘고, 서버가 Vercel 의
 * x-vercel-ip-country 헤더로 나라를 붙여 한 줄 넣는다.
 *
 * 개인정보는 넣지 않는다 — IP·이메일·이름 없음. session_id 는 브라우저가
 * 스스로 만든 무작위 값이라 사람과 연결되지 않는다. "방문(세션)" 은 이
 * 값의 distinct count 다.
 */
export const pageViews = pgTable(
  'page_views',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
    /** 쿼리스트링을 뗀 경로. 예: /kr/clinics/maxwell-hair-clinic-gangnam */
    path: text('path').notNull(),
    /** kr | en | zh | ja | ru | vi */
    locale: text('locale'),
    /** ISO 3166-1 alpha-2 (Vercel 헤더). 모르면 null. */
    country: text('country'),
    /** 유입 사이트 호스트만 (google.com, instagram.com …). 자기 사이트 내 이동은 null. */
    referrerHost: text('referrer_host'),
    /** mobile | desktop */
    device: text('device'),
    /** 브라우저가 만든 익명 id. 방문(세션) 집계 키. */
    sessionId: text('session_id'),
    /** 이 브라우저 세션의 첫 조회면 true — 진입 페이지 분석용. */
    isEntry: boolean('is_entry').notNull().default(false),
  },
  (t) => ({
    tsIdx: index('page_views_ts_idx').on(t.ts),
    pathIdx: index('page_views_path_idx').on(t.path, t.ts),
    countryIdx: index('page_views_country_idx').on(t.country, t.ts),
  }),
);
