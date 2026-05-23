import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { getCaseById } from '@/lib/db/repositories/cases';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { formatLocal } from '@/lib/utils/date';
import { CaseStageActions } from '@/components/agency/cases/case-stage-actions';

export const metadata = { title: '케이스 상세' };

const STAGE_LABEL: Record<string, string> = {
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

const PRIORITY_VARIANT: Record<string, 'brand' | 'hospitality' | 'care' | 'destructive' | 'outline'> = {
  low: 'outline',
  normal: 'brand',
  high: 'hospitality',
  urgent: 'destructive',
};

const EVENT_ICON: Record<string, string> = {
  created: '🆕',
  stage_changed: '↪',
  assignee_changed: '👤',
  note_added: '📝',
  message_linked: '💬',
  file_attached: '📎',
  rfq_sent: '📤',
  quote_received: '📥',
  quote_accepted: '✅',
  quote_rejected: '❌',
  deposit_invoiced: '🧾',
  deposit_paid: '💰',
  appointment_scheduled: '📅',
  patient_arrived: '✈️',
  treatment_started: '🏥',
  treatment_completed: '✓',
  chart_submitted: '📋',
  chart_finalized: '🔒',
  payment_received: '💴',
  payout_initiated: '↗',
  aftercare_event: '🌱',
  partner_booking_requested: '🏨',
  partner_booking_confirmed: '✓',
  closed_won: '🏆',
  closed_lost: '⚠',
  closed_cancelled: '⊘',
};

export default async function CaseDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const data = await withRls(ctx, () => getCaseById(ctx.orgId, params.id));
  if (!data) notFound();
  const { case: c, events, assignees } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/agency/cases" className="text-xs text-muted-foreground hover:underline">
            ← 케이스
          </Link>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground">{c.caseNumber}</div>
          <h1 className="text-2xl font-bold tracking-tight">{c.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="brand">{STAGE_LABEL[c.stage] ?? c.stage}</Badge>
            <Badge variant={PRIORITY_VARIANT[c.priority] ?? 'outline'}>{c.priority}</Badge>
            {c.estimatedArrivalDate ? <span>· 도착 {c.estimatedArrivalDate}</span> : null}
            <span>· 최종 활동 {formatLocal(new Date(c.lastActivityAt), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')}</span>
          </div>
        </div>
        <CaseStageActions caseId={c.id} currentStage={c.stage} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">타임라인</CardTitle>
              <CardDescription>append-only — 모든 변경·결제·차트·사후관리 이벤트 기록</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-xs text-muted-foreground">아직 이벤트가 없습니다.</p>
              ) : (
                <ol className="space-y-2.5">
                  {events.map((e) => (
                    <li key={e.id} className="flex gap-3 rounded-md border-l-2 border-brand-200 bg-muted/30 px-3 py-2">
                      <span className="text-base leading-tight">{EVENT_ICON[e.eventType] ?? '•'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium">{e.title ?? e.eventType}</div>
                        {e.description ? (
                          <div className="mt-0.5 text-[11px] text-muted-foreground">{e.description}</div>
                        ) : null}
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {e.actorRole} · {formatLocal(new Date(e.occurredAt), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">메타 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <MetaRow label="환자" value={c.patientId.slice(0, 8) + '…'} link={`/agency/patients/${c.patientId}`} />
              <MetaRow label="대상 시술" value={(c.targetProcedureCategoriesJson ?? []).join(', ') || '—'} />
              <MetaRow label="대상 병원" value={(c.targetHospitalIdsJson ?? []).length ? `${(c.targetHospitalIdsJson ?? []).length}개` : '—'} />
              <MetaRow label="예상 총액" value={c.estimatedTotalKrw ? `₩${c.estimatedTotalKrw.toLocaleString('ko-KR')}` : '—'} />
              <MetaRow label="문의 채널" value={c.sourceChannel ?? '—'} />
              <MetaRow label="태그" value={(c.tagsJson ?? []).join(', ') || '—'} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">담당자</CardTitle>
            </CardHeader>
            <CardContent>
              {assignees.length === 0 ? (
                <p className="text-xs text-muted-foreground">담당자가 지정되지 않았습니다.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {assignees.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-md border px-2 py-1.5">
                      <span className="font-medium">{a.role}</span>
                      <span className="text-[10px] text-muted-foreground">{a.userId.slice(0, 8)}…</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value, link }: { label: string; value: string; link?: string }): JSX.Element {
  return (
    <div className="flex items-baseline justify-between border-b border-dashed border-border/50 pb-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {link ? (
        <Link href={link} className="font-medium hover:underline">
          {value}
        </Link>
      ) : (
        <span className="font-medium">{value}</span>
      )}
    </div>
  );
}
