import { sql } from 'drizzle-orm';
import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * 글로우업 채팅 — 소비자 · 사업자 · 플랫폼 3자가 같은 방을 보는 자체 채팅 (채널톡형, 2026-10-13).
 *
 * chat_rooms   방 하나 = 예약 건(order) 하나, 상품(listing) 하나(회원×상품), 또는 회원의 일반 문의(support) 하나.
 *              소비자(user_id, auth.users), 사업자(org_id, organizations — 예약 상품의 소유 조직), 플랫폼(마스터)이 참여.
 * chat_messages 메시지. sender_role 로 누가 보냈는지 구분하고 UI 색을 나눈다.
 *
 * 실시간은 폴링(5초)으로 한다. RLS 는 enable + 무정책(공개 REST 차단) — 앱 서버가 직결 역할로만 접근.
 */
export const chatRooms = pgTable(
  'chat_rooms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 'order' (예약 건) | 'listing' (상품 문의) | 'support' (일반 문의) */
    kind: text('kind').notNull().default('support'),
    orderId: uuid('order_id'),
    /** kind='listing' 일 때 상품 slug (회원×상품 당 방 하나) */
    listingSlug: text('listing_slug'),
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
    listingUq: uniqueIndex('chat_rooms_listing_uq').on(t.userId, t.listingSlug),
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

/**
 * chat_operators — 마스터가 지정한 채팅 상담 관리자. 이 이메일로 로그인한 계정은 /master/chats 에서 플랫폼 역할로 답할 수 있다
 * (마스터 권한은 없음). 2026-10-13 사용자: '일단 마스터한테 오게 하고, 마스터가 지정한 관리자가 채팅할 수 있게'.
 */
export const chatOperators = pgTable(
  'chat_operators',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    name: text('name'),
    active: integer('active').notNull().default(1),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ emailUq: uniqueIndex('chat_operators_email_uq').on(t.email) }),
);
export type ChatOperator = typeof chatOperators.$inferSelect;

export type ChatRoom = typeof chatRooms.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type ChatRole = 'consumer' | 'business' | 'platform' | 'system';
