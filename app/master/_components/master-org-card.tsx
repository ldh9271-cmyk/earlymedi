'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, Users, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { ACCOUNT_TYPE_COLOR, ACCOUNT_TYPE_LABEL_KO } from '@/lib/auth/account-types';
import type { AccountType } from '@/lib/auth/account-types';
import { switchOrgAction } from '@/app/(auth)/select-org/actions';

/**
 * One organization card in the master control panel. Clicking it fires
 * the same switchOrgAction that powers /select-org — master is on the
 * allowlist so the server skips the membership check and just sets the
 * active-org cookie before redirecting to that tenant's dashboard.
 *
 * Visually denser than the /select-org cards because /master shows
 * potentially dozens of orgs at once and we want them to scan quickly.
 */
export function MasterOrgCard({
  orgId,
  orgName,
  accountType,
  memberCount,
}: {
  orgId: string;
  orgName: string;
  accountType: AccountType;
  memberCount: number;
}): JSX.Element {
  const router = useRouter();
  const [pending, start] = useTransition();

  function handleEnter(): void {
    start(async () => {
      try {
        const dest = await switchOrgAction({ orgId, accountType });
        router.push(dest);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '전환 실패');
      }
    });
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleEnter}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleEnter();
        }
      }}
      className={`group cursor-pointer transition hover:border-destructive/40 hover:bg-destructive/5 ${
        pending ? 'opacity-60' : ''
      }`}
      aria-busy={pending}
    >
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <Badge variant={ACCOUNT_TYPE_COLOR[accountType]} className="text-[10px]">
            {ACCOUNT_TYPE_LABEL_KO[accountType]}
          </Badge>
          <div className="flex items-center gap-1">
            <Link
              href={`/master/orgs/${orgId}`}
              onClick={(e) => e.stopPropagation()}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="조직 관리 (삭제·합치기)"
              title="조직 관리 (삭제·합치기)"
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-destructive" />
          </div>
        </div>
        <h3 className="line-clamp-1 text-sm font-semibold leading-tight">{orgName}</h3>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-0.5">
            <Users className="h-3 w-3" />
            {memberCount} 멤버
          </span>
          {pending ? <span className="text-destructive">진입 중…</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
