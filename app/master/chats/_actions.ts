'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { assignRoomOrg, getRoom, postMessage, setRoomStatus } from '@/lib/chat/service';

async function requireMaster(): Promise<{ userId: string; email: string }> {
  const { data } = await createSupabaseServerClient().auth.getUser();
  if (!data.user) redirect('/login');
  if (!isMasterEmail(data.user.email ?? '')) redirect('/select-org');
  return { userId: data.user.id, email: data.user.email ?? '' };
}

/** 플랫폼(마스터)이 답한다. */
export async function masterSendAction(formData: FormData): Promise<void> {
  const me = await requireMaster();
  const roomId = String(formData.get('roomId') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  const room = roomId ? await getRoom(roomId) : null;
  if (!room) redirect('/master/chats?error=not_found');
  if (body) await postMessage(room.id, { role: 'platform', userId: me.userId, name: '글로우업투어' }, body);
  revalidatePath('/master/chats');
  redirect(`/master/chats?room=${room.id}`);
}

/** 종료/다시 열기 */
export async function masterSetStatusAction(formData: FormData): Promise<void> {
  await requireMaster();
  const roomId = String(formData.get('roomId') ?? '');
  const status = String(formData.get('status') ?? '') === 'closed' ? 'closed' : 'open';
  if (roomId) await setRoomStatus(roomId, status);
  revalidatePath('/master/chats');
  redirect(`/master/chats?room=${roomId}`);
}

/** 사업자 조직 연결(일반 문의 방을 특정 업체에 붙이거나 바꿀 때) */
export async function masterAssignOrgAction(formData: FormData): Promise<void> {
  await requireMaster();
  const roomId = String(formData.get('roomId') ?? '');
  const orgId = String(formData.get('orgId') ?? '').trim() || null;
  if (roomId) await assignRoomOrg(roomId, orgId);
  revalidatePath('/master/chats');
  redirect(`/master/chats?room=${roomId}`);
}
