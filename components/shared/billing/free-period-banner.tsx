import { BIZ_FREE_BODY, BIZ_FREE_PERIOD, BIZ_FREE_TITLE } from '@/lib/billing/free-period';

/** 요금이 보이는 화면 맨 위에 두는 '무료 이용 기간' 안내. 스위치가 꺼지면 아무것도 그리지 않는다. 서버 컴포넌트. */
export function FreePeriodBanner({ compact = false }: { compact?: boolean }): JSX.Element | null {
  if (!BIZ_FREE_PERIOD) return null;
  return (
    <div className={`rounded-lg border border-[#ffd7de] bg-[#fff8f9] ${compact ? 'px-3 py-2' : 'px-4 py-3'}`} role="status">
      <div className="flex items-start gap-2">
        <span aria-hidden="true">🎁</span>
        <div>
          <div className={`font-bold ${compact ? 'text-xs' : 'text-sm'}`}>{BIZ_FREE_TITLE}</div>
          {compact ? null : <p className="mt-0.5 text-xs text-muted-foreground">{BIZ_FREE_BODY}</p>}
        </div>
      </div>
    </div>
  );
}
