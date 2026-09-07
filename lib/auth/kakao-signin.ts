/**
 * 카카오 로그인 (클라이언트) — Supabase 기본 제공 프로바이더를 그대로 쓴다.
 *
 * 구글과 달리 카카오 동의 화면은 리다이렉트 도메인이 아니라 카카오 개발자센터에 등록한
 * 앱 이름·아이콘(GlowUpTour)을 보여주므로, 자체 도메인 흐름을 따로 만들 필요가 없다.
 *
 * 노출 스위치: NEXT_PUBLIC_KAKAO_LOGIN=1 — Supabase 대시보드에서 Kakao 프로바이더를
 * 켜기 전에 버튼이 먼저 보이면 눌러도 실패하므로, 설정이 끝난 뒤 켠다.
 */
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';

export function kakaoLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_KAKAO_LOGIN === '1';
}

/** 성공하면 카카오로 이동하므로 반환되지 않는다. 실패 사유는 문자열로 돌려준다. */
export async function startKakaoSignIn(next: string): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return 'Supabase not connected (demo mode).';
  const redirectTo = new URL('/api/auth/callback', window.location.origin);
  redirectTo.searchParams.set('next', next);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: redirectTo.toString(),
      // 카카오 앱에 설정된 동의항목만 요청한다. Supabase 기본값은 account_email 까지 요청하는데
      // 이메일은 비즈 앱 전환 전에는 '권한 없음' 이라 그대로 두면 카카오가 동의 화면에서 막는다.
      scopes: process.env.NEXT_PUBLIC_KAKAO_SCOPES || 'profile_nickname',
    },
  });
  return error ? error.message : null;
}
