'use client';

/**
 * 방문 비콘 — 공개 포털 경로가 바뀔 때마다 /api/track/view 에 한 줄 보낸다.
 *
 * 마스터 통계 리포트(월별·일별·시간대별·나라별 트래픽, 인기 게시물)의
 * 원천이다. 개인정보는 보내지 않는다: 경로·로케일·유입 호스트·기기 종류와
 * 브라우저가 스스로 만든 무작위 세션 id 뿐이다. 나라는 서버가 Vercel
 * 헤더로 붙인다.
 *
 * sendBeacon 을 쓰는 이유: 페이지를 떠나는 순간에도 요청이 끊기지 않고,
 * 응답을 기다리지 않아 화면 성능에 영향이 없다.
 */
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const SID_KEY = 'gu_sid';
const ENTRY_KEY = 'gu_entry_sent';

function sessionId(): string {
  try {
    let v = localStorage.getItem(SID_KEY);
    if (!v) {
      v = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(SID_KEY, v);
    }
    return v;
  } catch {
    return 'anon';
  }
}

function isEntry(): boolean {
  try {
    if (sessionStorage.getItem(ENTRY_KEY)) return false;
    sessionStorage.setItem(ENTRY_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

function referrerHost(): string | null {
  try {
    if (!document.referrer) return null;
    const h = new URL(document.referrer).hostname.replace(/^www\./, '');
    return h === location.hostname.replace(/^www\./, '') ? null : h;
  } catch {
    return null;
  }
}

export default function TrackView(): null {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === last.current) return;
    last.current = pathname;
    // 헤드리스 브라우저·자동화 도구는 통계에서 뺀다
    if (typeof navigator !== 'undefined' && (navigator as Navigator & { webdriver?: boolean }).webdriver) return;
    const body = JSON.stringify({
      path: pathname,
      locale: /^\/(kr|en|zh|ja|ru|vi)(\/|$)/.exec(pathname)?.[1] ?? null,
      ref: referrerHost(),
      sid: sessionId(),
      entry: isEntry(),
    });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track/view', new Blob([body], { type: 'application/json' }));
      } else {
        void fetch('/api/track/view', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true });
      }
    } catch {
      /* 통계 실패는 조용히 무시 */
    }
  }, [pathname]);

  return null;
}
