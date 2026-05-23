'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/shared/ui/button';

type ChartStatus =
  | 'draft'
  | 'submitted'
  | 'agency_review'
  | 'changes_requested'
  | 'agency_approved'
  | 'patient_shared'
  | 'finalized'
  | 'voided';
type AccountType = 'agency' | 'freelancer' | 'medical' | 'non_medical';

type AvailableAction = {
  label: string;
  op: 'transition' | 'sign';
  transition?:
    | 'submit'
    | 'start_review'
    | 'request_changes'
    | 'resubmit'
    | 'approve'
    | 'share'
    | 'finalize'
    | 'void';
  role?: 'hospital' | 'agency' | 'patient';
  variant?: 'brand' | 'hospitality' | 'care' | 'destructive' | 'outline';
  needsReason?: boolean;
};

function actionsFor(status: ChartStatus, accountType: AccountType, signed: Set<string>): AvailableAction[] {
  const out: AvailableAction[] = [];
  if (accountType === 'medical') {
    if (status === 'draft') out.push({ label: '에이전시에 제출', op: 'transition', transition: 'submit', variant: 'care' });
    if (status === 'changes_requested') out.push({ label: '재제출', op: 'transition', transition: 'resubmit', variant: 'care' });
    if ((status === 'draft' || status === 'agency_approved' || status === 'patient_shared') && !signed.has('hospital')) {
      out.push({ label: '병원 서명', op: 'sign', role: 'hospital', variant: 'outline' });
    }
  }
  if (accountType === 'agency') {
    if (status === 'submitted') out.push({ label: '검토 시작', op: 'transition', transition: 'start_review', variant: 'brand' });
    if (status === 'agency_review') {
      out.push({ label: '승인', op: 'transition', transition: 'approve', variant: 'care' });
      out.push({ label: '수정 요청', op: 'transition', transition: 'request_changes', variant: 'hospitality', needsReason: true });
    }
    if (status === 'agency_approved') out.push({ label: '환자에게 공유', op: 'transition', transition: 'share', variant: 'care' });
    if (status === 'patient_shared') out.push({ label: 'finalize 시도', op: 'transition', transition: 'finalize', variant: 'care' });
    if ((status === 'agency_review' || status === 'agency_approved' || status === 'patient_shared') && !signed.has('agency')) {
      out.push({ label: '에이전시 서명', op: 'sign', role: 'agency', variant: 'outline' });
    }
  }
  if (status !== 'finalized' && status !== 'voided') {
    out.push({ label: '취소(void)', op: 'transition', transition: 'void', variant: 'destructive', needsReason: true });
  }
  return out;
}

export function ChartActions({
  chartId,
  accountType,
  status,
  signedRoles,
}: {
  chartId: string;
  accountType: AccountType;
  status: ChartStatus;
  signedRoles: string[];
}): JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const actions = actionsFor(status, accountType, new Set(signedRoles));

  async function run(a: AvailableAction): Promise<void> {
    let reason: string | undefined;
    if (a.needsReason) {
      reason = window.prompt(`사유를 입력하세요 (${a.label})`) ?? undefined;
      if (!reason) return;
    }
    setBusyAction(a.label);
    try {
      const body =
        a.op === 'sign'
          ? { op: 'sign', role: a.role }
          : { op: 'transition', transition: a.transition, reason };
      const res = await fetch(`/api/medical/charts/${chartId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      toast.success(`${a.label} 완료`);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '실패');
    } finally {
      setBusyAction(null);
    }
  }

  if (actions.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        {status === 'finalized' ? '확정된 차트 — 수정 불가, 새 버전만 생성 가능' : '현재 단계에서 수행 가능한 작업이 없습니다'}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button
          key={a.label}
          type="button"
          size="sm"
          variant={a.variant ?? 'outline'}
          disabled={isPending || busyAction === a.label}
          onClick={() => run(a)}
        >
          {busyAction === a.label ? '처리 중…' : a.label}
        </Button>
      ))}
    </div>
  );
}
