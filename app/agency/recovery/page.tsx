import Link from 'next/link';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { listActiveRoutines, listOpenAlerts } from '@/lib/db/repositories/recovery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { HeartPulse, AlertTriangle } from 'lucide-react';
import { formatLocal } from '@/lib/utils/date';

export const metadata = { title: 'EarlyCare 사후관리' };

const SEVERITY_VARIANT: Record<string, 'brand' | 'hospitality' | 'destructive'> = {
  info: 'brand',
  warning: 'hospitality',
  critical: 'destructive',
};

const REASON_LABEL: Record<string, string> = {
  no_response: '무응답',
  pain_score_high: '통증 점수 ↑',
  photo_anomaly: '사진 이상 신호',
  patient_reported_issue: '환자 호소',
  medication_missed: '복약 누락',
  restriction_violation: '제약 위반',
};

export default async function RecoveryPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const [alerts, routines] = await withRls(ctx, () =>
    Promise.all([listOpenAlerts(ctx.orgId, 50), listActiveRoutines(ctx.orgId, 100)]),
  );

  const critical = alerts.filter((a) => a.severity === 'critical');
  const warning = alerts.filter((a) => a.severity === 'warning');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">EarlyCare 사후관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          D+1 / D+3 / D+7 / D+14 / D+30 / D+90 / D+180 / D+365 자동 체크인 — 환자 현지 10:00 발송.
          무응답·통증·사진 이상 신호는 자동 에스컬레이션.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Critical 알림" value={critical.length} variant="destructive" />
        <StatCard label="Warning 알림" value={warning.length} variant="hospitality" />
        <StatCard label="활성 회복 루틴" value={routines.length} variant="brand" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">알림 큐</CardTitle>
            <CardDescription>severity 순으로 정렬됨. 한 줄 클릭 → 환자 카드 이동.</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="대기 중인 알림이 없습니다"
                description="첫 회복 루틴이 만들어지고 D+N 응답이 누락되면 여기에 표시됩니다."
              />
            ) : (
              <ul className="space-y-2">
                {alerts.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start gap-3 rounded-md border bg-card px-3 py-2 text-xs"
                  >
                    <Badge variant={SEVERITY_VARIANT[a.severity] ?? 'brand'}>
                      {a.severity}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/agency/patients/${a.patientId}`}
                        className="font-medium hover:underline"
                      >
                        {a.title}
                      </Link>
                      <div className="text-[10px] text-muted-foreground">
                        {REASON_LABEL[a.reason] ?? a.reason} · {formatLocal(new Date(a.createdAt), 'Asia/Seoul', 'MM-dd HH:mm')}
                      </div>
                      {a.detail ? <div className="mt-1 text-[11px]">{a.detail}</div> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">활성 회복 루틴</CardTitle>
            <CardDescription>scheduled · active 상태. 다음 task 시각은 환자 현지 10:00.</CardDescription>
          </CardHeader>
          <CardContent>
            {routines.length === 0 ? (
              <EmptyState
                icon={HeartPulse}
                title="활성 루틴이 없습니다"
                description="시술 차트가 finalize되면 시술 카테고리 템플릿(성형·피부·모발·치과·안과·검진)으로 자동 루틴 생성."
              />
            ) : (
              <ul className="space-y-2">
                {routines.map((r) => (
                  <li key={r.id} className="rounded-md border bg-card px-3 py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/agency/patients/${r.patientId}`}
                        className="font-medium hover:underline"
                      >
                        환자 {r.patientId.slice(0, 8)}…
                      </Link>
                      <Badge variant={r.status === 'active' ? 'brand' : 'care'}>{r.status}</Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>시작 {r.startedOn} · TZ {r.patientTimezone}</span>
                      <span>
                        대기 {r.pendingTaskCount}건
                        {r.nextTaskAt ? ` · 다음 ${formatLocal(new Date(r.nextTaskAt), r.patientTimezone, 'MM-dd HH:mm')}` : ''}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: 'brand' | 'hospitality' | 'destructive';
}): JSX.Element {
  const ringClass =
    variant === 'destructive'
      ? 'ring-destructive/20 text-destructive'
      : variant === 'hospitality'
        ? 'ring-hospitality-200 text-hospitality-700'
        : 'ring-brand-200 text-brand-700';
  return (
    <Card>
      <CardContent className={`flex items-baseline justify-between p-5 ring-1 ${ringClass}`}>
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-3xl font-bold">{value}</span>
      </CardContent>
    </Card>
  );
}
