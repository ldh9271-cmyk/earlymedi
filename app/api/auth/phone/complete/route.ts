export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { afterSignIn, safeNext } from '@/lib/auth/post-signin';

/**
 * 전화 OTP(왓츠앱) 로그인 마무리.
 *
 * 다른 소셜 로그인은 콜백 라우트를 거치면서 afterSignIn 을 태우는데,
 * 전화 OTP 는 리다이렉트 없이 브라우저에서 바로 세션이 만들어진다.
 * 그래서 클라이언트가 검증 직후 이 라우트를 한 번 두드려, 추천인 귀속·
 * 총판 계정 연결·가입 알림이 같은 경로로 처리되게 한다.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { next?: string };
  const next = safeNext(body.next, '/kr');
  await afterSignIn(supabase, data.user, next, request).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
