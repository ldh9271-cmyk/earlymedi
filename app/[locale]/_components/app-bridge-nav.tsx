'use client';

/**
 * 앱(WebView) 전용 — 하단 탭을 '새로고침 없이' 이동시키는 연결.
 *
 * 앱 하단 탭은 예전엔 window.location.href 로 페이지 전체를 다시 불러와 느렸다. 앱은 이제 먼저
 * window.__guNavigate('/kr/clinics') 를 부르고, 이 함수가 있으면 Next 라우터로 화면만 바꾼다(true 반환).
 * 없거나 false 면 앱이 예전 방식(전체 로드)으로 이동한다. 이동이 끝나면 주소가 바뀌고, 앱 주입 스크립트가
 * gu:path 를 보내 앱의 로딩 표시가 걷힌다. 일반 브라우저에서는 등록하지 않는다.
 *
 * app/[locale]/layout.tsx 에 AppBridgeAuth 옆에 둔다.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { inApp } from '@/lib/auth/app-bridge';

declare global {
  interface Window { __guNavigate?: (href: string) => boolean }
}

export default function AppBridgeNav(): null {
  const router = useRouter();
  useEffect(() => {
    if (!inApp()) return;
    window.__guNavigate = (href: string): boolean => {
      // 같은 사이트의 경로만 (프로토콜 상대 '//' 와 외부 주소는 앱이 전체 로드로 처리)
      if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return false;
      try { router.push(href); return true; } catch { return false; }
    };
    return () => { delete window.__guNavigate; };
  }, [router]);
  return null;
}
