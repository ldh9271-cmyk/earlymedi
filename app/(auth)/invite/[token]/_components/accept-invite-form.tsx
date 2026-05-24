'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared/ui/button';
import { acceptTeamInviteAction } from '@/lib/team/actions';

export function AcceptInviteForm({ token }: { token: string }): JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAccept(): void {
    setError(null);
    startTransition(async () => {
      try {
        const dest = await acceptTeamInviteAction(token);
        router.replace(dest);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '초대 수락 실패';
        setError(translateError(msg));
      }
    });
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="brand"
        className="w-full"
        onClick={handleAccept}
        disabled={isPending}
      >
        {isPending ? '합류 중…' : '초대 수락하고 합류하기 →'}
      </Button>
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function translateError(code: string): string {
  switch (code) {
    case 'unauthenticated':
      return '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.';
    case 'invite_not_found':
      return '초대를 찾을 수 없습니다.';
    case 'invite_revoked':
      return '이 초대는 취소되었습니다.';
    case 'invite_already_accepted':
      return '이미 수락된 초대입니다.';
    case 'invite_expired':
      return '초대 링크가 만료되었습니다.';
    case 'org_not_found':
      return '조직 정보를 찾을 수 없습니다.';
    default:
      return code;
  }
}
