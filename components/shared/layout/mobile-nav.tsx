'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/shared/brand/logo';

/**
 * 모바일(<md) 전용 내비 드로어 — 콘솔 사이드바가 `hidden md:flex` 라
 * 폰에서는 메뉴 전체(인박스·CRM·케이스·정산…)에 접근할 길이 없었다.
 * 햄버거 버튼을 누르면 왼쪽에서 드로어가 열리고, 그 안에 데스크톱과
 * 동일한 서버 렌더 메뉴(<SidebarNav>)가 children 으로 들어온다.
 *
 * - 링크를 눌러 경로가 바뀌면 자동으로 닫힌다 (usePathname 감시).
 * - 열려 있는 동안 body 스크롤을 잠근다.
 * - 오버레이는 createPortal 로 body 에 렌더한다 — Topbar 의
 *   backdrop-blur(backdrop-filter)가 fixed 자손의 containing block 이
 *   돼서, 제자리에 두면 드로어가 헤더 높이 안에 갇힌다.
 * - 아이콘은 서버에서 JSX 로 렌더돼 children 에 담겨 오므로
 *   LucideIcon 함수가 클라이언트 경계를 넘는 문제가 없다.
 */
export function MobileNavDrawer({ children }: { children: React.ReactNode }): JSX.Element {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 내비게이션이 일어나면 드로어를 닫는다.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 드로어가 열려 있는 동안 뒤 배경 스크롤 잠금.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="메뉴 열기"
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition hover:bg-muted"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 md:hidden">
          {/* 배경 딤 — 탭하면 닫힘 */}
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-background shadow-xl">
            <div className="flex h-16 shrink-0 items-center justify-between px-5">
              <Logo size="sm" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="메뉴 닫기"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* SidebarNav (서버 렌더) — 데스크톱 사이드바와 동일 메뉴 */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
          </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
