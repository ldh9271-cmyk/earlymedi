import { sql } from 'drizzle-orm';
import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * 글로우업 채팅 — 소비자 · 사업자 · 플랫폼 3자가 같은 방을 보는 자체 채팅 (채널톡형, 2026-10-13).
 *
 * chat_rooms   방 하나 = 예약 건(order) 하나 또는 회원의 일반 문의(support) 하나.
 *              소비자(user_id, auth.users), 사업자(org_id, organizations — 예약 상품의 소유 조직), 플랫폼(마스터)이 참여.
 * chat_messages 메시지. sender_role 로 누가 보냈는지 구분하고 UI 색을 나눈다.
 *
 * 실시간은 폴링(5초)으로 한다. RLS 는 enable + 무정책(공개 REST 차단) — 앱 서버가 직결 역할로만 접근.
 */
export const chatRooms = pgTable(
  'chat_rooms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 'order' (예약 건) | 'support' (일반 문의) */
    kind: text('kind').notNull().default('support'),
    orderId: uuid('order_id'),
    userId: uuid('user_id').notNull(),
    userEmail: text('user_email'),
    userName: text('user_name'),
    /** 사업자 조직 — 예약 상품의 owner_org_id. 없으면 플랫폼만 응대 */
    orgId: uuid('org_id'),
    orgName: text('org_name'),
    title: text('title').notNull(),
    locale: text('locale').notNull().default('kr'),
    /** open | closed */
    status: text('status').notNull().default('open'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    lastMessagePreview: text('last_message_preview'),
    lastSenderRole: text('last_sender_role'),
    consumerUnread: integer('consumer_unread').notNull().default(0),
    businessUnread: integer('business_unread').notNull().default(0),
    platformUnread: integer('platform_unread').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderUq: uniqueIndex('chat_rooms_order_uq').on(t.orderId),
    userIdx: index('chat_rooms_user_idx').on(t.userId, t.lastMessageAt),
    orgIdx: index('chat_rooms_org_idx').on(t.orgId, t.lastMessageAt),
    lastIdx: index('chat_rooms_last_idx').on(t.lastMessageAt),
  }),
);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id').notNull().references(() => chatRooms.id, { onDelete: 'cascade' }),
    /** consumer | business | platform | system */
    senderRole: text('sender_role').notNull(),
    senderUserId: uuid('sender_user_id'),
    senderName: text('sender_name'),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    roomIdx: index('chat_messages_room_idx').on(t.roomId, t.createdAt),
  }),
);

export type ChatRoom = typeof chatRooms.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type ChatRole = 'consumer' | 'business' | 'platform' | 'system';
