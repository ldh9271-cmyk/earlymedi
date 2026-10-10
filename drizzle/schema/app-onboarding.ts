import { sql } from 'drizzle-orm';
import { bigserial, boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * app_onboarding — 안드로이드 앱 첫 실행 설문(언어 · 관심 분야 · 방문 예정 시기 · 연령대).
 *
 * 앱(glowuptour-app)이 온보딩을 마치면 /api/app/onboarding 으로 한 줄 보낸다.
 * 건너뛰기도 한 줄(skipped=true) — 응답률을 보기 위해. 개인정보는 없다:
 * device_id 는 Android ID(기기 설치 단위 식별자)로 같은 기기의 중복 응답을
 * 가려내는 데만 쓴다. 나라는 Vercel 헤더로 서버가 붙인다.
 */
export const appOnboarding = pgTable(
  'app_onboarding',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
    deviceId: text('device_id'),
    appVersion: text('app_version'),
    platform: text('platform').notNull().default('android'),
    /** 앱에서 고른 사이트 언어 kr | en | ja | zh | ru | vi */
    locale: text('locale'),
    /** 기기 언어 태그 (ko-KR, ja-JP …) */
    deviceLang: text('device_lang'),
    /** plastic skin dental eye hair checkup oriental beauty travel */
    interests: text('interests').array().notNull().default(sql`'{}'::text[]`),
    /** within1m | within3m | within6m | undecided */
    visit: text('visit'),
    /** 20s | 30s | 40s | 50s | 60plus — 앱 1.1.1 부터 (2026-10-11 추가 컬럼) */
    age: text('age'),
    skipped: boolean('skipped').notNull().default(false),
    country: text('country'),
  },
  (t) => ({
    tsIdx: index('app_onboarding_ts_idx').on(t.ts),
    deviceIdx: index('app_onboarding_device_idx').on(t.deviceId),
  }),
);
