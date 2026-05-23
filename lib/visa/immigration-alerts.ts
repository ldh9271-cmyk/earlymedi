/**
 * Immigration / stay alerts — pure functions.
 *
 * Given a visa request's intended exit date, derive a small ladder of
 * notification milestones so the agency case manager and the patient know
 * how many days remain. The cron worker (Phase 8's QStash) reads these to
 * schedule the actual messages.
 *
 * Alerts fire at:
 *   D-30 / D-14 / D-7 / D-3 / D-1 / D+0 (entry deadline)
 *   D-30 / D-7 / D-1 / D+0 / D+3 (overstay warning)
 *
 * Each alert has a severity that maps onto the recovery_alerts table's
 * severity enum (info/warning/critical).
 */

export type ImmigrationAlertKind = 'pre_entry_reminder' | 'overstay_warning' | 'overstay_critical';

export type ImmigrationAlert = {
  kind: ImmigrationAlertKind;
  fireAt: string; // YYYY-MM-DD
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string;
};

function shiftDate(ymd: string, deltaDays: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

const PRE_ENTRY_OFFSETS: Array<{ delta: number; severity: 'info' | 'warning' | 'critical' }> = [
  { delta: -30, severity: 'info' },
  { delta: -14, severity: 'info' },
  { delta: -7, severity: 'warning' },
  { delta: -3, severity: 'warning' },
  { delta: -1, severity: 'critical' },
  { delta: 0, severity: 'critical' },
];

const OVERSTAY_OFFSETS: Array<{ delta: number; kind: ImmigrationAlertKind; severity: 'info' | 'warning' | 'critical' }> = [
  { delta: -30, kind: 'overstay_warning', severity: 'info' },
  { delta: -7, kind: 'overstay_warning', severity: 'warning' },
  { delta: -1, kind: 'overstay_warning', severity: 'critical' },
  { delta: 0, kind: 'overstay_critical', severity: 'critical' },
  { delta: 3, kind: 'overstay_critical', severity: 'critical' },
];

export function buildEntryReminderAlerts(intendedEntryDate: string): ImmigrationAlert[] {
  return PRE_ENTRY_OFFSETS.map(({ delta, severity }) => ({
    kind: 'pre_entry_reminder' as const,
    fireAt: shiftDate(intendedEntryDate, delta),
    severity,
    title:
      delta === 0
        ? '오늘 입국 예정'
        : delta < 0
          ? `입국 D${delta} (${Math.abs(delta)}일 전)`
          : `입국 D+${delta}`,
    body:
      delta < -7
        ? '비자·항공권·보험 준비 상태를 확인하세요.'
        : delta < 0
          ? '입국 직전 — 여행자보험·초청장·예약 확인서 인쇄본을 챙기세요.'
          : '입국일 — 입국심사 시 초청장·치료 일정·체류 주소를 제출 준비.',
  }));
}

export function buildOverstayAlerts(intendedExitDate: string): ImmigrationAlert[] {
  return OVERSTAY_OFFSETS.map(({ delta, kind, severity }) => ({
    kind,
    fireAt: shiftDate(intendedExitDate, delta),
    severity,
    title:
      delta === 0
        ? '오늘 출국 예정'
        : delta < 0
          ? `출국 D${delta} (${Math.abs(delta)}일 전)`
          : `⚠ 체류 초과 D+${delta}`,
    body:
      delta < -7
        ? '귀국 항공권·세관 신고 준비 안내.'
        : delta < 0
          ? '잔여 시술/회복 일정을 출국일에 맞춰 정리. 필요 시 연장 신청을 검토.'
          : '체류 기한 경과 — 즉시 출입국·외국인청 연장 신청 또는 출국 처리. 24시간 내 미조치 시 불법체류 분류.',
  }));
}

export function buildAllAlerts(input: { intendedEntryDate: string; intendedExitDate: string }): ImmigrationAlert[] {
  return [
    ...buildEntryReminderAlerts(input.intendedEntryDate),
    ...buildOverstayAlerts(input.intendedExitDate),
  ];
}
