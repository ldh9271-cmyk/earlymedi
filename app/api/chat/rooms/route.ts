import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { getOrCreateOrderRoom, getOrCreateSupportRoom, listRoomsForUser, publicRoom } from '@/lib/chat/service';
import { getOrCreateListingRoom } from '@/lib/chat/listing-room';
import { getOrCreateTopicRoom, parseTopic } from '@/lib/chat/topic-room';

export const dynamic = 'force-dynamic';

/**
 * 소비자 채팅 방 목록·생성 (회원 전용, 쿠키 세션).
 *   GET  → { rooms }
 *   POST { orderId? | listingSlug? | topic?, locale, title? } → 예약 건 방(내 주문만) · 상품 문의 방 · 업체·장소 상담 방(topic, lib/chat/topic-room) · 일반 문의 방을 만들거나 찾아 { room }
 */
async function sessionUser(): Promise<{ id: string; email: string | null; name: string | null } | null> {
  try {
    const { data } = await createSupabaseServerClient().auth.getUser();
    if (!data.user) return null;
    const um = (data.user.user_metadata ?? {}) as { full_name?: string; username?: string };
    return { id: data.user.id, email: data.user.email ?? null, name: um.full_name || um.username || data.user.email || null };
  } catch { return null; }
}

export async function GET(): Promise<NextResponse> {
  const u = await sessionUser();
  if (!u) return NextResponse.json({ error: 'login_required' }, { status: 401 });
  const rooms = await listRoomsForUser(u.id);
  return NextResponse.json({ rooms: rooms.map(publicRoom) });
}

const CreateSchema = z.object({ orderId: z.string().uuid().nullable().optional(), listingSlug: z.string().max(200).nullable().optional(), topic: z.string().max(220).nullable().optional(), locale: z.string().max(5).optional(), title: z.string().max(120).optional() });

export async function POST(req: Request): Promise<NextResponse> {
  const u = await sessionUser();
  if (!u) return NextResponse.json({ error: 'login_required' }, { status: 401 });
  let input: z.infer<typeof CreateSchema>;
  try { input = CreateSchema.parse(await req.json()); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }
  if (input.orderId) {
    const room = await getOrCreateOrderRoom(input.orderId, u);
    if (!room) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ room: publicRoom(room) });
  }
  if (input.topic) {
    if (!parseTopic(input.topic)) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    const room = await getOrCreateTopicRoom(input.topic, u, input.locale ?? 'kr');
    if (!room) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ room: publicRoom(room) });
  }
  if (input.listingSlug) {
    const room = await getOrCreateListingRoom(input.listingSlug, u, input.locale ?? 'kr');
    if (!room) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ room: publicRoom(room) });
  }
  const room = await getOrCreateSupportRoom(u, input.locale ?? 'kr', input.title?.trim() || 'Support');
  return NextResponse.json({ room: publicRoom(room) });
}
