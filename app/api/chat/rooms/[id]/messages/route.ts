import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { getRoom, listMessages, markRead, postMessage } from '@/lib/chat/service';

export const dynamic = 'force-dynamic';

/**
 * 소비자 채팅 메시지 (회원 전용, 내 방만).
 *   GET  ?after=ISO → { room, messages } (폴링; 열람 시 소비자 unread 0)
 *   POST { body }   → { message }
 */
async function sessionUser(): Promise<{ id: string; email: string | null; name: string | null } | null> {
  try {
    const { data } = await createSupabaseServerClient().auth.getUser();
    if (!data.user) return null;
    const um = (data.user.user_metadata ?? {}) as { full_name?: string; username?: string };
    return { id: data.user.id, email: data.user.email ?? null, name: um.full_name || um.username || data.user.email || null };
  } catch { return null; }
}

export async function GET(req: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const u = await sessionUser();
  if (!u) return NextResponse.json({ error: 'login_required' }, { status: 401 });
  const room = await getRoom(params.id);
  if (!room || room.userId !== u.id) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const afterRaw = new URL(req.url).searchParams.get('after');
  const after = afterRaw ? new Date(afterRaw) : null;
  const messages = await listMessages(room.id, after && !Number.isNaN(after.getTime()) ? after : null);
  if (room.consumerUnread > 0) await markRead(room.id, 'consumer');
  return NextResponse.json({ room: { ...room, consumerUnread: 0 }, messages });
}

const PostSchema = z.object({ body: z.string().min(1).max(4000) });

export async function POST(req: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const u = await sessionUser();
  if (!u) return NextResponse.json({ error: 'login_required' }, { status: 401 });
  const room = await getRoom(params.id);
  if (!room || room.userId !== u.id) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let input: z.infer<typeof PostSchema>;
  try { input = PostSchema.parse(await req.json()); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }
  const message = await postMessage(room.id, { role: 'consumer', userId: u.id, name: u.name }, input.body);
  if (!message) return NextResponse.json({ error: 'closed' }, { status: 409 });
  return NextResponse.json({ message });
}
