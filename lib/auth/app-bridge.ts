/**
 * 안드로이드 앱(WebView) 브릿지 — 클라이언트 전용.
 *
 * 앱은 페이지 시작 때 <html data-gu-app="android" data-gu-app-caps="oauth pickimage geo"> 를 붙이고
 * window.ReactNativeWebView.postMessage 로 메시지를 받는다 (glowuptour-app/App.tsx).
 *
 * OAuth: 구글·페이스북은 앱 내장 WebView 로그인을 막으므로, 인증 URL 을 앱에 넘겨 외부 브라우저(크롬
 * 커스텀 탭)에서 로그인한다. redirectTo 에 app=1 을 붙이면 /api/auth/callback 이 세션 교환 대신
 * glowuptour://auth-callback?code=… 로 앱을 깨우고, 앱이 그 code 로 WebView 에서 콜백을 다시 연다.
 * PKCE code_verifier 는 WebView 쿠키에만 있으므로 code 가 새어도 다른 곳에서는 못 쓴다.
 */
type RNWebView = { postMessage: (m: string) => void };

function rn(): RNWebView | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { ReactNativeWebView?: RNWebView }).ReactNativeWebView ?? null;
}

/** 이 앱 버전이 해당 기능을 지원하는지 (구버전 앱에서는 false). */
export function appHas(cap: 'oauth' | 'pickimage' | 'geo'): boolean {
  if (!rn()) return false;
  const caps = document.documentElement.getAttribute('data-gu-app-caps') ?? '';
  return caps.split(/\s+/).includes(cap);
}

/** 앱에서 OAuth 를 외부 브라우저로 돌릴 수 있으면 URL 을 넘기는 함수, 아니면 null. */
export function appOAuthBridge(): ((url: string) => void) | null {
  if (!appHas('oauth')) return null;
  const bridge = rn();
  return bridge ? (url: string) => bridge.postMessage(JSON.stringify({ type: 'gu:oauth', url })) : null;
}
