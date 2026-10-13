import 'server-only';
import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { chatMessages, chatRooms, type ChatMessage, type ChatRole, type ChatRoom } from '@/drizzle/schema/chat';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { organizations } from '@/drizzle/schema/organizations';
import { sendAdminTelegram } from '@/lib/notify/admin-alert';

/**
 * 글로우업 채팅 서비스 — 방 만들기·목록·메시지·읽음·알림. 권한 판단은 호출자(API/서버 액션)가 한다.
 *
 *  방 종류
 *   order   예약 건 하나(checkout_orders). 소비자 = 주문 user_id, 사업자 = 주문 meta.listingOrgId 또는 상품 owner_org_id.
 *   support 회원의 일반 문의(주문 없음). 사업자 없이 플랫폼이 응대. 회원당 열린 방 하나를 재사용.
 *
 *  읽지 않음: 보낸 쪽을 제외한 두 쪽의 unread 를 +1, 각자 방을 열면 0 으로.
 *  알림: 소비자·사업자가 쓰면 마스터 텔레그램. (사업자·소비자에게 가는 푸시/메일은 2단계)
 */
export const CHAT_PREVIEW_LEN = 80;
const esc = (s: string): string => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c);

export type RoomSummary = ChatRoom;

/** 주문 소유자 확인 + 사업자 조직 추정 */
async function orderFor(orderId: string): Promise<{ id: string; userId: string | null; userEmail: string | null; title: string; invoiceNo: string; locale: string; orgId: string | null; orgName: string | null } | null> {
  const [o] = await db.select({ id: checkoutOrders.id, userId: checkoutOrders.userId, userEmail: checkoutOrders.userEmail, title: checkoutOrders.listingTitle, invoiceNo: checkoutOrders.invoiceNo, locale: checkoutOrders.locale, meta: checkoutOrders.meta }).from(checkoutOrders).where(eq(checkoutOrders.id, orderId)).limit(1);
  if (!o) return null;
  const orgId = (o.meta as { listingOrgId?: string | null } | null)?.listingOrgId ?? null;
  let orgName: string | null = null;
  if (orgId) {
    const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
    orgName = org?.name ?? null;
  }
  return { id: o.id, userId: o.userId, userEmail: o.userEmail, title: o.title, invoiceNo: o.invoiceNo, locale: o.locale, orgId, orgName };
}

/** 예약 건 방 — 없으면 만든다. 주문 소유자가 아니면 null. */
export async function getOrCreateOrderRoom(orderId: string, user: { id: string; email: string | null; name: string | null }, opts?: { asMaster?: boolean }): Promise<ChatRoom | null> {
  const o = await orderFor(orderId);
  if (!o) return null;
  if (!opts?.asMaster && o.userId !== user.id) return null;
  const [existing] = await db.select().from(chatRooms).where(eq(chatRooms.orderId, orderId)).limit(1);
  if (existing) return existing;
  const [room] = await db.insert(chatRooms).values({
    kind: 'order', orderId, userId: o.userId ?? user.id, userEmail: o.userEmail ?? user.email, userName: user.name,
    orgId: o.orgId, orgName: o.orgName, title: `${o.title} · ${o.invoiceNo}`, locale: o.locale,
  }).onConflictDoNothing().returning();
  if (room) return room;
  const [again] = await db.select().from(chatRooms).where(eq(chatRooms.orderId, orderId)).limit(1);
  return again ?? null;
}

/** 일반 문의 방 — 회원당 열린 방 하나 재사용 */
export async function getOrCreateSupportRoom(user: { id: string; email: string | null; name: string | null }, locale: string, title: string): Promise<ChatRoom> {
  const [existing] = await db.select().from(chatRooms).where(and(eq(chatRooms.userId, user.id), eq(chatRooms.kind, 'support'), eq(chatRooms.status, 'open'))).orderBy(desc(chatRooms.createdAt)).limit(1);
  if (existing) return existing;
  const [room] = await db.insert(chatRooms).values({ kind: 'support', userId: user.id, userEmail: user.email, userName: user.name, title, locale }).returning();
  if (!room) throw new Error('chat_room_create_failed');
  return room;
}

export async function listRoomsForUser(userId: string): Promise<ChatRoom[]> {
  return db.select().from(chatRooms).where(eq(chatRooms.userId, userId)).orderBy(desc(sql`coalesce(${chatRooms.lastMessageAt}, ${chatRooms.createdAt})`)).limit(50);
}
export async function listRoomsForOrg(orgId: string): Promise<ChatRoom[]> {
  return db.select().from(chatRooms).where(eq(chatRooms.orgId, orgId)).orderBy(desc(sql`coalesce(${chatRooms.lastMessageAt}, ${chatRooms.createdAt})`)).limit(200);
}
export async function listRoomsForPlatform(limit = 200): Promise<ChatRoom[]> {
  return db.select().from(chatRooms).orderBy(desc(chatRooms.platformUnread), desc(sql`coalesce(${chatRooms.lastMessageAt}, ${chatRooms.createdAt})`)).limit(limit);
}
export async function getRoom(roomId: string): Promise<ChatRoom | null> {
  const [r] = await db.select().from(chatRooms).where(eq(chatRooms.id, roomId)).limit(1);
  return r ?? null;
}

/** 메시지 목록(오래된 순). after 를 주면 그 이후만 — 폴링용. */
export async function listMessages(roomId: string, after?: Date | null, limit = 200): Promise<ChatMessage[]> {
  const where = after ? and(eq(chatMessages.roomId, roomId), gt(chatMessages.createdAt, after)) : eq(chatMessages.roomId, roomId);
  return db.select().from(chatMessages).where(where).orderBy(chatMessages.createdAt).limit(limit);
}

/** 읽음 처리 — 그 역할의 unread 를 0 으로 */
export async function markRead(roomId: string, role: ChatRole): Promise<void> {
  const col = role === 'consumer' ? { consumerUnread: 0 } : role === 'business' ? { businessUnread: 0 } : role === 'platform' ? { platformUnread: 0 } : null;
  if (!col) return;
  await db.update(chatRooms).set({ ...col, updatedAt: new Date() }).where(eq(chatRooms.id, roomId));
}

/** 메시지 보내기 — 방 요약·unread 갱신 + (소비자·사업자 발신이면) 마스터 텔레그램 */
export async function postMessage(roomId: string, sender: { role: ChatRole; userId: string | null; name: string | null }, body: string): Promise<ChatMessage | null> {
  const text = body.trim().slice(0, 4000);
  if (!text) return null;
  const room = await getRoom(roomId);
  if (!room || room.status === 'closed') return null;
  const [msg] = await db.insert(chatMessages).values({ roomId, senderRole: sender.role, senderUserId: sender.userId, senderName: sender.name, body: text }).returning();
  const now = new Date();
  await db.update(chatRooms).set({
    lastMessageAt: now, lastMessagePreview: text.slice(0, CHAT_PREVIEW_LEN), lastSenderRole: sender.role, updatedAt: now,
    consumerUnread: sender.role === 'consumer' ? room.consumerUnread : room.consumerUnread + 1,
    businessUnread: sender.role === 'business' ? room.businessUnread : room.businessUnread + 1,
    platformUnread: sender.role === 'platform' ? room.platformUnread : room.platformUnread + 1,
  }).where(eq(chatRooms.id, roomId));
  if (sender.role !== 'platform') {
    const who = sender.role === 'consumer' ? '🙋 고객' : '🏪 사업자';
    await sendAdminTelegram(`<b>💬 채팅 ${who}</b> ${esc(room.title)}\n${esc(sender.name ?? room.userEmail ?? '')}: ${esc(text.slice(0, 300))}\n→ /master/chats`).catch(() => false);
  }
  return msg ?? null;
}

export async function setRoomStatus(roomId: string, status: 'open' | 'closed'): Promise<void> {
  await db.update(chatRooms).set({ status, updatedAt: new Date() }).where(eq(chatRooms.id, roomId));
}
export async function assignRoomOrg(roomId: string, orgId: string | null): Promise<void> {
  let orgName: string | null = null;
  if (orgId) { const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId)).limit(1); orgName = org?.name ?? null; }
  await db.update(chatRooms).set({ orgId, orgName, updatedAt: new Date() }).where(eq(chatRooms.id, roomId));
}

/** 회원이 읽지 않은 메시지 총합 — 위젯 배지용 */
export async function unreadForUser(userId: string): Promise<number> {
  const [r] = await db.select({ n: sql<number>`coalesce(sum(${chatRooms.consumerUnread}), 0)::int` }).from(chatRooms).where(eq(chatRooms.userId, userId));
  return r?.n ?? 0;
}
