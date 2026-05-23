'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';

type Stage =
  | 'scoping'
  | 'rfq_sent'
  | 'quoted'
  | 'accepted'
  | 'deposit_paid'
  | 'scheduled'
  | 'arrived'
  | 'in_treatment'
  | 'post_treatment'
  | 'aftercare'
  | 'closed_won'
  | 'closed_lost'
  | 'closed_cancelled';

const STAGE_LABEL: Record<Stage, string> = {
  scoping: '초기 상담',
  rfq_sent: 'RFQ 발송',
  quoted: '견적 수신',
  accepted: '견적 수락',
  deposit_paid: '예약금 수령',
  scheduled: '일정 확정',
  arrived: '입국',
  in_treatment: '시술 중',
  post_treatment: '시술 완료',
  aftercare: '사후관리',
  closed_won: '정산 완료',
  closed_lost: '미전환',
  closed_cancelled: '취소',
};

const FORWARD_ORDER: Stage[] = [
  'scoping',
  'rfq_sent',
  'quoted',
  'accepted',
  'deposit_paid',
  'scheduled',
  'arrived',
  'in_treatment',
  'post_treatment',
  'aftercare',
];

const CLOSED: Stage[] = ['closed_won', 'closed_lost', 'closed_cancelled'];

export function CaseStageActions({
  caseId,
  currentStage,
}: {
  caseId: string;
  currentStage: Stage;
}): JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState<Stage | null>(null);
  const [isPending, startTransition] = useTransition();

  const isClosed = CLOSED.includes(currentStage);
  const idx = FORWARD_ORDER.indexOf(currentStage);
  const next = idx >= 0 && idx < FORWARD_ORDER.length - 1 ? FORWARD_ORDER[idx + 1] : null;

  async function transition(stage: Stage, needsReason = false): Promise<void> {
    let reason: string | undefined;
    if (needsReason) {
      reason = window.prompt(`사유를 입력하세요 (${STAGE_LABEL[stage]})`) ?? undefined;
      if (!reason) return;
    }
    setSubmitting(stage);
    try {
      const res = await fetch(`/api/agency/cases/${caseId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, reason }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      toast.success(`단계 변경: ${STAGE_LABEL[stage]}`);
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '실패');
    } finally {
      setSubmitting(null);
    }
  }

  if (isClosed) {
    return (
      <div className="text-xs text-muted-foreground">
        종료된 케이스 — 새 케이스로 재오픈하거나 매니저에게 reopen 요청
      </div>
    );
  }

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      {next ? (
        <Button
          variant="brand"
          size="sm"
          onClick={() => transition(next)}
          disabled={submitting !== null || isPending}
        >
          {submitting === next ? '진행 중…' : `→ ${STAGE_LABEL[next]}`}
        </Button>
      ) : null}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          disabled={submitting !== null}
        >
          다른 단계 <ChevronDown className="ml-1 h-3.5 w-3.5" />
        </Button>
        {open ? (
          <div className="absolute right-0 z-40 mt-1 w-56 rounded-md border bg-white shadow-lg">
            <div className="border-b px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">앞으로</div>
            {FORWARD_ORDER.filter((s) => s !== currentStage).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => transition(s)}
                className="block w-full px-3 py-1.5 text-left text-xs hover:bg-muted"
              >
                {STAGE_LABEL[s]}
              </button>
            ))}
            <div className="border-b border-t px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">종료</div>
            {CLOSED.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => transition(s, true)}
                className="block w-full px-3 py-1.5 text-left text-xs hover:bg-muted"
              >
                {STAGE_LABEL[s]}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
