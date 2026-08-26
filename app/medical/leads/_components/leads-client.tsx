'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/shared/ui/button';
import { requestLeadTopupAction, unlockLeadAction } from '../_actions';
import { LEAD_TOPUP_OPTIONS_WON } from '@/lib/leads/pricing';

/** 충전 신청 폼 — 10만원 단위 옵션 선택 → pending 신청. */
export function TopupForm(): JSX.Element {
  const router = useRouter();
  const [amount, setAmount] = useState<number>(LEAD_TOPUP_OPTIONS_WON[0]);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent): void {
    e.preventDefault();
    start(async () => {
      try {
        await requestLeadTopupAction({ amountWon: amount });
        toast.success('충전 신청이 접수되었습니다 — 입금 확인 후 잔액에 반영됩니다.');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '충전 신청 실패');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <select
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      >
        {LEAD_TOPUP_OPTIONS_WON.map((v) => (
          <option key={v} value={v}>
            ₩{v.toLocaleString('ko-KR')}
          </option>
        ))}
      </select>
      <Button type="submit" variant="brand" size="sm" disabled={pending}>
        {pending ? '신청 중…' : '충전 신청'}
      </Button>
    </form>
  );
}

/** 리드 열람 버튼 — 잔액 차감 후 상세 공개. */
export function UnlockButton({
  conversationId,
  priceWon,
}: {
  conversationId: string;
  priceWon: number;
}): JSX.Element {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onUnlock(): void {
    start(async () => {
      try {
        const r = await unlockLeadAction({ conversationId });
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        toast.success(
          r.already
            ? '이미 열람한 리드입니다 — 무료로 다시 열었습니다.'
            : `리드를 열람했습니다 (₩${r.priceWon.toLocaleString('ko-KR')} 차감).`,
        );
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '열람 실패');
      }
    });
  }

  return (
    <Button variant="brand" size="sm" onClick={onUnlock} disabled={pending}>
      {pending ? '열람 중…' : `₩${priceWon.toLocaleString('ko-KR')} 열람`}
    </Button>
  );
}
