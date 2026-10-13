import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { chatRooms, type ChatRoom } from '@/drizzle/schema/chat';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { organizations } from '@/drizzle/schema/organizations';

/**
 * 상품(listing)별 채팅 방 — 회원 × 상품 당 하나. 상품 상세의 '채팅 문의' 가 연다.
 * 사업자 = 상품 owner_org_id (파트너 콘솔 /partner/chats 에서 보임), 플랫폼(마스터·지정 관리자)도 함께 본다.
 */
export async function getOrCreateListingRoom(slug: string, user: { id: string; email: string | null; name: string | null }, locale: string): Promise<ChatRoom | null> {
  const [l] = await db.select({ title: partnerListings.title, ownerOrgId: partnerListings.ownerOrgId }).from(partnerListings).where(eq(partnerListings.slug, slug)).limit(1);
  if (!l) return null;
  const [existing] = await db.select().from(chatRooms).where(and(eq(chatRooms.userId, user.id), eq(chatRooms.listingSlug, slug))).limit(1);
  if (existing) return existing;
  let orgName: string | null = null;
  if (l.ownerOrgId) {
    const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, l.ownerOrgId)).limit(1);
    orgName = org?.name ?? null;
  }
  const [room] = await db.insert(chatRooms).values({
    kind: 'listing', listingSlug: slug, userId: user.id, userEmail: user.email, userName: user.name,
    orgId: l.ownerOrgId ?? null, orgName, title: l.title, locale,
  }).onConflictDoNothing().returning();
  if (room) return room;
  const [again] = await db.select().from(chatRooms).where(and(eq(chatRooms.userId, user.id), eq(chatRooms.listingSlug, slug))).limit(1);
  return again ?? null;
}
