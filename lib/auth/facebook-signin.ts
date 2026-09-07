/**
 * 페이스북 로그인 (클라이언트) — Supabase 기본 제공 프로바이더를 그대로 쓴다.
 *
 * 카카오와 같은 구조다. 동의 화면에 뜨는 이름·아이콘은 Meta 개발자 콘솔의
 * 앱 설정을 따라가므로 자체 도메인 흐름(구글처럼)을 만들 필요가 없다.
 *
 * 이메일: 페이스북의 `email` 은 계정에 이메일이 없거나 사용자가 거부하면
 * 안 내려온다. 그 경우 `afterSignIn` 은 그대로 돌지만 인보이스·바우처가
 * 나갈 곳이 없으므로, 콜백에서 이메일 없는 사용자는 별도 안내가 필요하다.
 *
 * 노출 스위치: NEXT_PUBLIC_FACEBOOK_LOGIN=1 — Supabase 대시보드에서 Facebook
 * 프로바이더를 켜기 전에 버튼이 보이면 눌러도 실패하므로, 설정이 끝난 뒤 켠다.
 */
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';

export function facebookLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FACEBOOK_LOGIN === '1';
}

/** 성공하면 페이스북으로 이동하므로 반환되지 않는다. 실패 사유는 문자열로 돌려준다. */
export async function startFacebookSignIn(next: string): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return 'Supabase not connected (demo mode).';
  const redirectTo = new URL('/api/auth/callback', window.location.origin);
  redirectTo.searchParams.set('next', next);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    // Supabase 기본값이 public_profile + email 이다. 카카오 때 배운 대로
    // scopes 를 덧붙이면 Meta 앱에 설정되지 않은 권한까지 요청해 막히므로 건드리지 않는다.
    options: { redirectTo: redirectTo.toString() },
  });
  return error ? error.message : null;
}
