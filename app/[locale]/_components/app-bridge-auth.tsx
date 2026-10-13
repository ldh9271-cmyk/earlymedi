'use client';

/**
 * 앱(WebView) 전용 — 로그인 상태를 앱에 알린다.
 *
 * 앱은 자체 fetch 로는 회원 세션을 모른다(쿠키는 WebView 안에만 있다). 그래서 페이지가 Supabase 세션을
 * 확인해 'gu:user' { id, locale } 를 postMessage 로 보내고, 앱은 그때 알림 권한 → Expo 푸시 토큰 →
 * WebView 안 fetch('/api/app/push/register') 로 등록한다. 로그아웃(SIGNED_OUT)이면 id=null 을 보내
 * 앱이 토큰을 지운다. 일반 브라우저에서는 아무 일도 하지 않는다.
 *
 * app/[locale]/layout.tsx 에 TrackView 옆에 둔다 — 랜딩을 포함한 공개 포털 전 페이지에서 한 번 마운트.
 */
import { useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { appPostUser, inApp } from '@/lib/auth/app-bridge';
import type { PublicLocale } from '@/lib/i18n/locales';

export default function AppBridgeAuth({ locale }: { locale: PublicLocale }): null {
  useEffect(() => {
    if (!inApp()) return;
    const sb = createSupabaseBrowserClient();
    if (!sb) return;
    let mounted = true;
    // 같은 상태를 두 번 보내지 않는다 (getUser 와 INITIAL_SESSION 이 겹친다)
    let last: string | null | undefined;
    const post = (id: string | null): void => {
      if (!mounted || last === id) return;
      last = id;
      appPostUser(id, locale);
    };
    void sb.auth.getUser().then(({ data }) => { if (data.user) post(data.user.id); }).catch(() => undefined);
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (session?.user) post(session.user.id);
      else if (event === 'SIGNED_OUT') post(null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [locale]);
  return null;
}
