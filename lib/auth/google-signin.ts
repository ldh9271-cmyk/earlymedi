/**
 * 구글 로그인 진입 (클라이언트) — NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID 가 있으면 우리 도메인의
 * /api/auth/google/start 로 보내 동의 화면에 glowuptour.com 이 보이게 하고, 없으면 false 를 돌려
 * 호출부가 기존 Supabase OAuth(supabase.co 리다이렉트)로 폴백한다.
 */
export function startGoogleSignIn(next: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID) return false;
  const u = new URL('/api/auth/google/start', window.location.origin);
  u.searchParams.set('next', next);
  window.location.href = u.toString();
  return true;
}
