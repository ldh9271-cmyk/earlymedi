'use server';

import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { joinAsReferrer, REF_COOKIE, REF_JOIN_COOKIE } from '@/lib/referral/service';

/**
 * 초대 링크(/r/CODE?join=1)로 들어온 계정을 추천인으로 등록한다.
 * 무료 — 가입비·구매 조건 없음. 상위는 초대 쿠키의 코드.
 */
export async function joinReferrerAction(fd: FormData): Promise<void> {
  const locale = String(fd.get('locale') ?? 'ja');
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/me/referral`)}`);

  const jar = cookies();
  const parentCode = jar.get(REF_JOIN_COOKIE)?.value ?? jar.get(REF_COOKIE)?.value;
  if (!parentCode) redirect(`/${locale}/me/referral?error=no_invite`);

  const name = String(fd.get('name') ?? '').trim().slice(0, 80) || (auth.user.email ?? 'referrer');
  try {
    await joinAsReferrer({ userId: auth.user.id, userEmail: auth.user.email ?? null, name, parentCode });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'failed';
    redirect(`/${locale}/me/referral?error=${encodeURIComponent(msg)}`);
  }
  redirect(`/${locale}/me/referral?joined=1`);
}
