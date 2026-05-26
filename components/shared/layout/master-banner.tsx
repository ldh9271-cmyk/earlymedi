import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { ACCOUNT_TYPE_LABEL_KO } from '@/lib/auth/account-types';
import type { AccountType } from '@/lib/auth/account-types';

/**
 * Red sticky banner shown at the top of every dashboard when a master
 * account is impersonating an organization. Two jobs:
 *
 *   1. Never let the operator forget they're acting on someone else's
 *      data. The red stripe + lock icon is intentionally loud.
 *   2. One-click switch back to /select-org for choosing a different
 *      organization, so master mode doesn't trap them in one tenant.
 *
 * Only rendered when AppShell receives `isMaster={true}` from the
 * server-side layout. Non-master users never see this component.
 */
export function MasterBanner({
  orgName,
  accountType,
}: {
  orgName: string;
  accountType: AccountType;
}): JSX.Element {
  return (
    <div className="border-b border-destructive/50 bg-destructive/10 px-5 py-2 md:px-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-destructive">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <ShieldAlert className="h-3.5 w-3.5" />
          마스터 모드
        </span>
        <span className="text-destructive/80">
          현재 <span className="font-semibold text-destructive">{orgName}</span>
          {' · '}
          <span className="font-medium">{ACCOUNT_TYPE_LABEL_KO[accountType]}</span>로 보는 중
        </span>
        <Link
          href="/select-org"
          className="ml-auto inline-flex items-center rounded-md border border-destructive/40 bg-background/60 px-2 py-0.5 text-[11px] font-medium text-destructive hover:bg-background"
        >
          다른 조직으로 전환 →
        </Link>
      </div>
    </div>
  );
}
