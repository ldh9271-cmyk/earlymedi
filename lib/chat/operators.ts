import 'server-only';
import { redirect } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { chatOperators, type ChatOperator } from '@/drizzle/schema/chat';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';

/**
 * 채팅 상담 권한 — 마스터(MASTER_EMAILS) 또는 마스터가 chat_operators 에 등록한 이메일.
 * 관리자는 /master/chats 에서 플랫폼 역할로 답할 수만 있고 다른 마스터 화면 권한은 없다.
 */
export type ChatStaff = { userId: string; email: string; name: string; isMaster: boolean };

export async function listOperators(): Promise<ChatOperator[]> {
  return db.select().from(chatOperators).orderBy(asc(chatOperators.createdAt));
}

export async function isChatOperator(email: string): Promise<{ ok: boolean; name: string | null }> {
  const e = email.trim().toLowerCase();
  if (!e) return { ok: false, name: null };
  try {
    const [row] = await db.select({ active: chatOperators.active, name: chatOperators.name }).from(chatOperators).where(eq(chatOperators.email, e)).limit(1);
    return { ok: !!row && row.active === 1, name: row?.name ?? null };
  } catch { return { ok: false, name: null }; }
}

/** 세션 사용자가 마스터 또는 활성 관리자가 아니면 로그인/홈으로 보낸다 */
export async function requireChatStaff(): Promise<ChatStaff> {
  const { data } = await createSupabaseServerClient().auth.getUser();
  if (!data.user) redirect('/login?next=%2Fmaster%2Fchats');
  const email = (data.user.email ?? '').toLowerCase();
  if (isMasterEmail(email)) return { userId: data.user.id, email, name: '글로우업투어', isMaster: true };
  const op = await isChatOperator(email);
  if (!op.ok) redirect('/kr');
  return { userId: data.user.id, email, name: op.name ? `글로우업투어 · ${op.name}` : '글로우업투어', isMaster: false };
}

export async function addOperator(email: string, name: string | null, byEmail: string): Promise<void> {
  const e = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('이메일 형식이 올바르지 않습니다');
  await db.insert(chatOperators).values({ email: e, name: name?.trim() || null, active: 1, createdBy: byEmail })
    .onConflictDoUpdate({ target: chatOperators.email, set: { name: name?.trim() || null, active: 1 } });
}

export async function setOperatorActive(id: string, active: boolean): Promise<void> {
  await db.update(chatOperators).set({ active: active ? 1 : 0 }).where(eq(chatOperators.id, id));
}
