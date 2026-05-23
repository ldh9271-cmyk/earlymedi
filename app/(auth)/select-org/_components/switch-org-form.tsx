'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared/ui/button';
import { switchOrgAction } from '../actions';
import type { AccountType } from '@/lib/auth/account-types';

export function SwitchOrgForm({
  orgId,
  accountType,
  nextPath,
}: {
  orgId: string;
  accountType: AccountType;
  nextPath?: string;
}): JSX.Element {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <form
      action={() => {
        start(async () => {
          const dest = await switchOrgAction({ orgId, accountType, nextPath });
          router.push(dest);
        });
      }}
    >
      <Button type="submit" variant="outline" size="sm" className="w-full" disabled={pending}>
        {pending ? '전환 중…' : '이 조직으로 진입'}
      </Button>
    </form>
  );
}
