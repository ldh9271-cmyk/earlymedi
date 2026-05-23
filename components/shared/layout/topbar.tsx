'use client';

import Link from 'next/link';
import { Bell, ChevronDown, LogOut, Search, Settings, UserCircle } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { ACCOUNT_TYPE_COLOR, ACCOUNT_TYPE_LABEL_KO } from '@/lib/auth/account-types';
import type { AccountType } from '@/lib/auth/account-types';

export function Topbar({
  accountType,
  userEmail,
  userName,
}: {
  accountType: AccountType;
  userEmail: string;
  userName?: string;
}): JSX.Element {
  const color = ACCOUNT_TYPE_COLOR[accountType];
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-5 backdrop-blur">
      <div className="flex items-center gap-2 text-sm text-muted-foreground md:hidden">
        EarlyMedi AI Concierge
      </div>

      <Badge variant={color} className="hidden md:inline-flex">
        {ACCOUNT_TYPE_LABEL_KO[accountType]}
      </Badge>

      <div className="ml-2 hidden flex-1 md:flex">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="환자·케이스·병원 검색 (⌘K)"
            className="h-9 w-full rounded-md border border-input bg-muted/40 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="알림">
          <Bell className="h-4 w-4" />
        </Button>
        <Link href="/select-org">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <span className="hidden text-xs text-muted-foreground sm:inline">조직 전환</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <div className="hidden h-8 w-px bg-border md:block" />
        <div className="hidden items-center gap-2 text-sm md:flex">
          <UserCircle className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{userName ?? userEmail}</span>
        </div>
        <Link href={`${accountType === 'non_medical' ? '/partner' : `/${accountType}`}/settings`}>
          <Button variant="ghost" size="icon" aria-label="설정">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
        <form action="/api/auth/signout" method="post">
          <Button type="submit" variant="ghost" size="icon" aria-label="로그아웃">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
