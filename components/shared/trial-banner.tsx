import Link from 'next/link';
import { getTrialStatus, type TrialStatus } from '@/lib/billing/trial-quota';

/**
 * Server-rendered banner shown on every gated dashboard layout. Displays the
 * remaining days of the 1-month free trial, and points users at /upgrade as
 * the end approaches or once it has passed.
 *
 * Renders nothing for paid orgs, and nothing for accounts with no expiry
 * (free plans — 프리랜서·파트너 등록).
 */
export async function TrialBanner({ organizationId }: { organizationId: string }): Promise<JSX.Element | null> {
  let status: TrialStatus | null = null;
  try {
    status = await getTrialStatus(organizationId);
  } catch {
    return null; // DB unreachable — skip silently rather than break the dashboard.
  }
  if (!status || status.isPaid) return null;
  if (status.endsAt === null || status.daysRemaining === null) return null;

  const total = 30; // 체험 기간 기준일 — 진행 바 표시용
  const left = status.daysRemaining;
  const pct = Math.min(100, Math.max(0, ((total - left) / total) * 100));
  const isCritical = status.blocked;
  const isWarning = !isCritical && left <= 7;

  const tone = isCritical
    ? 'border-destructive/40 bg-destructive/5 text-destructive'
    : isWarning
      ? 'border-amber-300 bg-amber-50 text-amber-900'
      : 'border-brand-200 bg-brand-50 text-brand-900';
  const barColor = isCritical ? 'bg-destructive' : isWarning ? 'bg-amber-500' : 'bg-brand-500';

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${tone}`}>
      <div className="flex items-center gap-3">
        <span className="font-semibold">
          {isCritical ? '🎁 무료 체험 종료' : `🎁 무료 체험 ${left}일 남음`}
        </span>
        <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-white/60 sm:block">
          <div className={`h-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="hidden sm:inline">
          {isCritical
            ? '신규 환자 등록이 차단되었습니다'
            : `${status.endsAt.toISOString().slice(0, 10)}까지 전체 기능 이용 가능`}
        </span>
      </div>
      <Link
        href="/upgrade"
        className="rounded-md bg-white/80 px-2.5 py-1 text-[11px] font-semibold hover:bg-white"
      >
        {isCritical ? '지금 전환 →' : '유료 전환'}
      </Link>
    </div>
  );
}
