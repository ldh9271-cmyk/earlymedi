/**
 * 로그인·가입 뒤 돌아갈 경로가 "우리 사이트 안"인지 판정한다 (오픈 리다이렉트 방지).
 *
 * '/'로 시작해야 하고, '//evil.com' 은 물론 '/\evil.com' 도 막는다 — 브라우저는
 * 경로 시작의 백슬래시를 슬래시로 읽어 외부 도메인으로 나가 버린다.
 * 백슬래시·프로토콜(://)이 어디에 있든 거부한다.
 */
const BACKSLASH = String.fromCharCode(92);

export function isSafeInternalPath(p: string | null | undefined): p is string {
  if (!p || !p.startsWith('/')) return false;
  const second = p.charAt(1);
  if (second === '/' || second === BACKSLASH) return false;
  if (p.includes(BACKSLASH) || p.includes('://')) return false;
  return true;
}
