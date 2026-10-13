import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * push_tickets — Expo 푸시 발송 티켓 (2026-10-13).
 *
 * Expo Push API 는 발송 요청에 즉시 'ok' 티켓을 주고, 기기까지 실제로 전달됐는지는
 * 잠시 뒤 영수증(getReceipts)으로만 알 수 있다. 앱을 지우고 다시 설치하면 옛 설치본
 * 토큰이 남는데, 이 경우 티켓은 ok 인데 영수증이 DeviceNotRegistered 로 돌아온다.
 *
 * sendExpoMessages 가 ok 티켓을 {ticket_id, token} 으로 적어 두고,
 * 크론(/api/cron/push-receipts, 15분)이 1분~24시간 사이의 티켓을 모아 영수증을 조회해
 * DeviceNotRegistered 토큰을 push_tokens 에서 지운다. 조회된 티켓은 삭제, 24시간 지난 것은 일괄 삭제.
 *
 * RLS 는 enable + 무정책 — 서버 직결 역할만 접근.
 */
export const pushTickets = pgTable(
  'push_tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Expo 가 돌려준 티켓 id (영수증 조회 키) */
    ticketId: text('ticket_id').notNull().unique(),
    /** 티켓이 가리키는 기기 토큰 — ExponentPushToken[xxxx] */
    token: text('token').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdIdx: index('push_tickets_created_idx').on(t.createdAt),
  }),
);

export type PushTicket = typeof pushTickets.$inferSelect;
