import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * push_tokens — 앱(안드로이드·iOS)의 Expo 푸시 토큰 (2026-10-13).
 *
 * 앱이 로그인된 회원을 알게 되면(웹 → 'gu:user' 브릿지) 알림 권한을 받고 Expo 토큰을 만들어
 * /api/app/push/register 로 올린다 — WebView 안에서 fetch 하므로 회원 쿠키 세션이 붙는다.
 * 토큰 하나 = 기기(설치) 하나. 같은 기기에서 다른 계정으로 로그인하면 user_id 만 옮겨 간다.
 *
 *  chat_enabled     상담원·업체가 채팅에 답했을 때 (lib/chat/service postMessage)
 *  booking_enabled  견적 인보이스 도착 · 예약 확정 (lib/quote, lib/stay, lib/hospital-visit, 마스터 확정)
 *  locale           앱이 마지막으로 알린 사이트 언어 — 알림 제목·본문 사전 선택에 쓴다
 *
 * Expo 가 DeviceNotRegistered 를 돌려주면(앱 삭제 등) 행을 지운다 (lib/push/expo.ts).
 * RLS 는 enable + 무정책 — 서버 직결 역할만 접근.
 */
export const pushTokens = pgTable(
  'push_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    /** ExponentPushToken[xxxx] */
    token: text('token').notNull().unique(),
    /** android | ios */
    platform: text('platform').notNull().default('android'),
    appVersion: text('app_version'),
    /** kr | en | ja | zh | ru | vi */
    locale: text('locale'),
    chatEnabled: boolean('chat_enabled').notNull().default(true),
    bookingEnabled: boolean('booking_enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    /** 마지막 등록/갱신 호출 시각 — 오래 안 보인 토큰 정리용 */
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('push_tokens_user_idx').on(t.userId),
  }),
);

export type PushToken = typeof pushTokens.$inferSelect;
