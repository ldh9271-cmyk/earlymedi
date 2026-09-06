/**
 * 구글 로그인 진입 (클라이언트) — 우리 도메인의 /api/auth/google/start 로 보내면 동의 화면에
 * glowuptour.com 이 보인다. 켜지는 조건은 둘 중 하나이고, 아니면 false 를 돌려 호출부가 기존
 * Supabase OAuth(supabase.co 리다이렉트)로 폴백한다.
 *
 *   1) 주소에 ?gtest=1  — 전체 사용자에게 영향 없이 이 링크로 들어온 사람만 새 경로로 시험
 *   2) NEXT_PUBLIC_GOOGLE_OWN_OAUTH=1 — 검증이 끝난 뒤 전체 적용
 *
 * 2026-09-07: 전체 적용했다가 모바일 로그인 실패 신고로 되돌림. 원인 미확정이라 시험 링크부터.
 */
export function startGoogleSignIn(next: string): boolean {
  if (typeof window === 'undefined') return false;
  const forced = new URLSearchParams(window.location.search).get('gtest') === '1';
  if (!forced && process.env.NEXT_PUBLIC_GOOGLE_OWN_OAUTH !== '1') return false;
  const u = new URL('/api/auth/google/start', window.location.origin);
  u.searchParams.set('next', next);
  window.location.href = u.toString();
  return true;
}
