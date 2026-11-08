'use client';

import { usePathname } from 'next/navigation';

/**
 * 처리 버튼이 상세 페이지(/master/orders/[id])에서 눌렸으면 서버 액션이 그 페이지로 돌아오도록
 * 현재 경로를 숨은 필드로 넣는다. 목록(/master/orders)에서는 아무것도 렌더하지 않는다.
 * 서버 액션 쪽 판정: _actions.ts 의 back().
 */
export default function ReturnTo(): JSX.Element | null {
  const p = usePathname();
  if (!p || !/^\/master\/orders\/[^/]+$/.test(p)) return null;
  return <input type="hidden" name="returnTo" value={p} />;
}
