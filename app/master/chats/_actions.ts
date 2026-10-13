'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { assignRoomOrg, getRoom, postMessage, setRoomStatus } from '@/lib/chat/service';
import { addOperator, requireChatStaff, setOperatorActive } from '@/lib/chat/operators';

/** 마스터 또는 마스터가 지정한 채팅 관리자(chat_operators) */
const requireMaster = requireChatStaff;

/** 플랫폼(마스터)이 답한다. */
export async function masterSendAction(formData: FormData): Promise<void> {
  const me = await requireMaster();
  const roomId = String(formData.get('roomId') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  const room = roomId ? await getRoom(roomId) : null;
  if (!room) redirect('/master/chats?error=not_found');
  if (body) await postMessage(room.id, { role: 'platform', userId: me.userId, name: me.name }, body);
  revalidatePath('/master/chats');
  redirect(`/master/chats?room=${room.id}`);
}

/** 종료/다시 열기 (마스터만) */
export async function masterSetStatusAction(formData: FormData): Promise<void> {
  const me = await requireMaster();
  if (!me.isMaster) redirect('/master/chats?error=master_only');
  const roomId = String(formData.get('roomId') ?? '');
  const status = String(formData.get('status') ?? '') === 'closed' ? 'closed' : 'open';
  if (roomId) await setRoomStatus(roomId, status);
  revalidatePath('/master/chats');
  redirect(`/master/chats?room=${roomId}`);
}

/** 사업자 조직 연결(일반 문의 방을 특정 업체에 붙이거나 바꿀 때) */
export async function masterAssignOrgAction(formData: FormData): Promise<void> {
  const me = await requireMaster();
  if (!me.isMaster) redirect('/master/chats?error=master_only');
  const roomId = String(formData.get('roomId') ?? '');
  const orgId = String(formData.get('orgId') ?? '').trim() || null;
  if (roomId) await assignRoomOrg(roomId, orgId);
  revalidatePath('/master/chats');
  redirect(`/master/chats?room=${roomId}`);
}

/** 채팅 관리자 추가(이메일) — 마스터만. 같은 이메일이면 이름 갱신·활성화 */
export async function masterAddOperatorAction(formData: FormData): Promise<void> {
  const me = await requireMaster();
  if (!me.isMaster) redirect('/master/chats?error=master_only');
  const email = String(formData.get('email') ?? '');
  const name = String(formData.get('name') ?? '');
  try { await addOperator(email, name || null, me.email); } catch (e) { redirect(`/master/chats?error=${encodeURIComponent(e instanceof Error ? e.message : 'add_failed')}`); }
  revalidatePath('/master/chats');
  redirect('/master/chats?ok=operator');
}

/** 채팅 관리자 비활성/활성 — 마스터만 */
export async function masterToggleOperatorAction(formData: FormData): Promise<void> {
  const me = await requireMaster();
  if (!me.isMaster) redirect('/master/chats?error=master_only');
  const id = String(formData.get('id') ?? '');
  const active = String(formData.get('active') ?? '') === '1';
  if (id) await setOperatorActive(id, active);
  revalidatePath('/master/chats');
  redirect('/master/chats');
}
