import Link from 'next/link';
import { getTrialStatus, type TrialStatus } from '@/lib/billing/trial-quota';

/**
 * Server-rendered banner shown on every gated dashboard layout. Displays
 * the remaining free patient quota when the org is on trial, and points
 * users at /upgrade when they're approaching or past the limit.
 *
 * Renders nothing for paid orgs (no banner clutter).
 */
export async function TrialBanner({ organizationId }: { organizationId: string }): Promise<JSX.Element | null> {
  let status: TrialStatus | null = null;
  try {
    status = await getTrialStatus(organizationId);
  } catch {
    return null; // DB unreachable — skip silently rather than break the dashboard.
  }
  if (!status || status.isPaid) return null;

  const pct = Math.min(100, (status.used / status.limit) * 100);
  const isCritical = status.used >= status.limit;
  const isWarning = !isCritical && status.remaining <= 3;

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
          🎁 무료 체험 {status.used} / {status.limit}명
        </span>
        <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-white/60 sm:block">
          <div className={`h-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="hidden sm:inline">
          {isCritical
            ? '무료 한도 초과 — 추가 환자 등록 차단됨'
            : isWarning
              ? `${status.remaining}명 남음`
              : `${status.remaining}명 더 등록 가능`}
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
