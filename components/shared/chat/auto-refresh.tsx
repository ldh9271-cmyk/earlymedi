'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** 콘솔 채팅 화면용 — 일정 간격으로 서버 컴포넌트를 다시 그려 새 메시지를 받는다 (v1 은 폴링). */
export function AutoRefresh({ everyMs = 8000 }: { everyMs?: number }): null {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(id);
  }, [router, everyMs]);
  return null;
}
