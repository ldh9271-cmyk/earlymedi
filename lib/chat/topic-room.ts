import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { chatRooms, type ChatRoom } from '@/drizzle/schema/chat';
import { hospitals } from '@/drizzle/schema/hospitals';
import { hospitalRegistry } from '@/drizzle/schema/hospital-registry';
import { lodgingRegistry } from '@/drizzle/schema/lodging-registry';
import { foodRegistry } from '@/drizzle/schema/food-registry';
import { beautyRegistry } from '@/drizzle/schema/beauty-registry';
import { tourSpots } from '@/drizzle/schema/tour-spots';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { organizations } from '@/drizzle/schema/organizations';
import { FEATURED_COURSE } from '@/app/[locale]/glowup/_components/program-data';

/**
 * 업체·장소별 상담원 채팅 방 (2026-10-14) — 모든 카테고리 상세의 '상담원' 버튼이 연다.
 *
 * 방 키(chat_rooms.listing_slug, 회원×키 유니크)는 'topic 종류:식별자' 문자열:
 *   clinic:<hospitals.slug>      큐레이션 병원 상세           사업자 = hospitals.linked_org_id
 *   rclinic:<ykiho>              심평원 레지스트리 병원        사업자 = 계약 병원의 linked_org_id 또는 승인된 claim_org_id
 *   stay:<mgt_no> · eat:<mgt_no> · shop:<mgt_no>   숙박·음식·미용 레지스트리   사업자 = 계약 상품 owner_org_id 또는 승인된 claim_org_id
 *   spot:<content_id>            관광지(사업자 없음, 플랫폼 응대)
 *   course:<id>                  여행 코스(사업자 없음)
 * 상품(partner_listings)은 기존 'listing' 방(lib/chat/listing-room.ts)을 쓴다.
 * 제목·사업자는 항상 DB 에서 다시 찾는다 — 클라이언트가 보낸 제목은 믿지 않는다.
 */
export type TopicKind = 'clinic' | 'rclinic' | 'stay' | 'eat' | 'shop' | 'spot' | 'course';
const KEY_RE = /^(clinic|rclinic|stay|eat|shop|spot|course):([\p{L}\p{N}._\-=+/]{1,200})$/u;

export function parseTopic(key: string): { kind: TopicKind; id: string } | null {
  const m = KEY_RE.exec(key);
  return m && m[2] ? { kind: m[1] as TopicKind, id: m[2] } : null;
}

/** 콘솔에서 '보기' 링크로 쓰는 공개 페이지 주소 */
export function topicHref(key: string, locale: string): string | null {
  const t = parseTopic(key);
  if (!t) return null;
  const id = encodeURIComponent(t.id);
  switch (t.kind) {
    case 'clinic': return `/${locale}/clinics/${id}`;
    case 'rclinic': return `/${locale}/clinics/r/${id}`;
    case 'stay': return `/${locale}/stays/r/${id}`;
    case 'eat': return `/${locale}/eats/r/${id}`;
    case 'shop': return `/${locale}/shops/r/${id}`;
    case 'spot': return `/${locale}/attractions/${id}`;
    case 'course': return `/${locale}/glowup/courses/${id}`;
  }
}

async function orgOfListing(listingId: string | null): Promise<string | null> {
  if (!listingId) return null;
  const [l] = await db.select({ org: partnerListings.ownerOrgId }).from(partnerListings).where(eq(partnerListings.id, listingId)).limit(1);
  return l?.org ?? null;
}
const approvedClaim = (status: string, org: string | null): string | null => (status === 'approved' ? org : null);

/** 키 → 방 제목·사업자 조직. 없는 대상이면 null */
export async function resolveTopic(key: string): Promise<{ title: string; orgId: string | null } | null> {
  const t = parseTopic(key);
  if (!t) return null;
  switch (t.kind) {
    case 'clinic': {
      const [h] = await db.select({ name: hospitals.name, org: hospitals.linkedOrgId }).from(hospitals).where(eq(hospitals.slug, t.id)).limit(1);
      return h ? { title: h.name, orgId: h.org ?? null } : null;
    }
    case 'rclinic': {
      const [r] = await db.select({ name: hospitalRegistry.name, hid: hospitalRegistry.contractedHospitalId, claimOrg: hospitalRegistry.claimOrgId, claimStatus: hospitalRegistry.claimStatus })
        .from(hospitalRegistry).where(eq(hospitalRegistry.ykiho, t.id)).limit(1);
      if (!r) return null;
      let org = approvedClaim(r.claimStatus, r.claimOrg);
      if (!org && r.hid) {
        const [h] = await db.select({ org: hospitals.linkedOrgId }).from(hospitals).where(eq(hospitals.id, r.hid)).limit(1);
        org = h?.org ?? null;
      }
      return { title: r.name, orgId: org };
    }
    case 'stay':
    case 'eat':
    case 'shop': {
      const tbl = t.kind === 'stay' ? lodgingRegistry : t.kind === 'eat' ? foodRegistry : beautyRegistry;
      const [r] = await db.select({ name: tbl.name, lid: tbl.contractedListingId, claimOrg: tbl.claimOrgId, claimStatus: tbl.claimStatus })
        .from(tbl).where(eq(tbl.mgtNo, t.id)).limit(1);
      if (!r) return null;
      return { title: r.name, orgId: (await orgOfListing(r.lid)) ?? approvedClaim(r.claimStatus, r.claimOrg) };
    }
    case 'spot': {
      const [s] = await db.select({ title: tourSpots.title }).from(tourSpots).where(eq(tourSpots.contentId, t.id)).limit(1);
      return s ? { title: s.title, orgId: null } : null;
    }
    case 'course':
      return t.id === FEATURED_COURSE.id ? { title: FEATURED_COURSE.name, orgId: null } : null;
  }
}

/** 회원 × 키 당 방 하나 — 없으면 만든다. 대상이 없으면 null */
export async function getOrCreateTopicRoom(key: string, user: { id: string; email: string | null; name: string | null }, locale: string): Promise<ChatRoom | null> {
  const [existing] = await db.select().from(chatRooms).where(and(eq(chatRooms.userId, user.id), eq(chatRooms.listingSlug, key))).limit(1);
  if (existing) return existing;
  const topic = await resolveTopic(key);
  if (!topic) return null;
  let orgName: string | null = null;
  if (topic.orgId) {
    const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, topic.orgId)).limit(1);
    orgName = org?.name ?? null;
  }
  const [room] = await db.insert(chatRooms).values({
    kind: 'topic', listingSlug: key, userId: user.id, userEmail: user.email, userName: user.name,
    orgId: topic.orgId, orgName, title: topic.title.slice(0, 200), locale,
  }).onConflictDoNothing().returning();
  if (room) return room;
  const [again] = await db.select().from(chatRooms).where(and(eq(chatRooms.userId, user.id), eq(chatRooms.listingSlug, key))).limit(1);
  return again ?? null;
}
