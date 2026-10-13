'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAccess } from '@/lib/auth/route-guards';
import { getRoom, postMessage } from '@/lib/chat/service';

/** 사업자(협력업체)가 자기 조직에 연결된 방에 답한다. */
export async function partnerSendAction(formData: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical', 'medical'] });
  const roomId = String(formData.get('roomId') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  const room = roomId ? await getRoom(roomId) : null;
  if (!room || room.orgId !== ctx.orgId) redirect('/partner/chats?error=not_found');
  if (body) await postMessage(room.id, { role: 'business', userId: ctx.userId, name: room.orgName ?? ctx.email }, body);
  revalidatePath('/partner/chats');
  redirect(`/partner/chats?room=${room.id}`);
}
