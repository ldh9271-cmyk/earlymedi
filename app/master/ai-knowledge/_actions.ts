'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { deleteKnowledgeDoc, setKnowledgeDocStatus } from '@/lib/ai/knowledge/db';
import { invalidateKnowledgeCache } from '@/lib/ai/knowledge/store';

/** AI 상담 지식 문서 — 마스터 전용: 활성/비활성 전환, 삭제. 바꾸면 캐시를 무효화해 다음 상담부터 반영된다. */

const PATH = '/master/ai-knowledge';

async function assertMaster(): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  if (!isMasterEmail(auth.user.email ?? '')) redirect('/select-org');
}

export async function toggleDocAction(formData: FormData): Promise<void> {
  await assertMaster();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || (status !== 'active' && status !== 'disabled')) redirect(`${PATH}?error=missing_id`);
  let found = false;
  try {
    found = await setKnowledgeDocStatus(db, id, status);
  } catch (err) {
    redirect(`${PATH}?error=${encodeURIComponent(err instanceof Error ? err.message : 'update_failed')}`);
  }
  if (!found) redirect(`${PATH}?error=not_found`);
  invalidateKnowledgeCache();
  revalidatePath(PATH);
  redirect(
    `${PATH}?ok=${encodeURIComponent(status === 'active' ? '문서를 활성화했습니다 — 다음 상담부터 근거로 씁니다.' : '문서를 비활성화했습니다 — 다음 상담부터 근거에서 빠집니다.')}`,
  );
}

export async function deleteDocAction(formData: FormData): Promise<void> {
  await assertMaster();
  const id = String(formData.get('id') ?? '');
  if (!id) redirect(`${PATH}?error=missing_id`);
  let found = false;
  try {
    found = await deleteKnowledgeDoc(db, id);
  } catch (err) {
    redirect(`${PATH}?error=${encodeURIComponent(err instanceof Error ? err.message : 'delete_failed')}`);
  }
  if (!found) redirect(`${PATH}?error=not_found`);
  invalidateKnowledgeCache();
  revalidatePath(PATH);
  redirect(`${PATH}?ok=${encodeURIComponent('문서와 청크를 삭제했습니다.')}`);
}
