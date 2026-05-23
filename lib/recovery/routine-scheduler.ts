import { fromZonedTime } from 'date-fns-tz';

/**
 * Recovery routine scheduler — pure functions.
 *
 * Given a routine template + the patient's local start date + their timezone,
 * compute the absolute UTC firing time of each task. Spec rule: tasks land at
 * 10:00 in the patient's local time, never in the agency's tz.
 *
 * The function is timezone-aware via `date-fns-tz` so DST and non-Asia/Seoul
 * patients (Riyadh, Hanoi, Moscow, …) behave correctly.
 */

export type TaskKind =
  | 'message_check_in'
  | 'photo_check_in'
  | 'video_visit'
  | 'pain_score'
  | 'medication_reminder'
  | 'restriction_reminder'
  | 'follow_up_offer'
  | 'satisfaction_survey';

export type TemplateTask = {
  offsetDays: number;
  kind: TaskKind;
  title: string;
  body?: string;
  requiresResponse?: boolean;
};

export type ScheduledTask = TemplateTask & {
  /** Absolute UTC ISO instant when the task should fire. */
  scheduledAtUtc: string;
};

/** Convert a YYYY-MM-DD local date to the 10:00 instant in `timezone`. */
function tenAmInTz(localDate: string, timezone: string): Date {
  // 10:00 local → UTC instant
  return fromZonedTime(`${localDate} 10:00:00`, timezone);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Generate the absolute UTC firing times for each template task.
 *
 * Spec: D+1 / D+3 / D+7 / D+14 / D+30 / D+90 / D+180 / D+365 at 10:00 in the
 * patient's local time. The template defines which offsets exist.
 */
export function buildSchedule(input: {
  startedOn: string; // YYYY-MM-DD
  patientTimezone: string; // IANA, e.g. 'Asia/Seoul' / 'Asia/Riyadh'
  tasks: ReadonlyArray<TemplateTask>;
}): ScheduledTask[] {
  return input.tasks.map((t) => {
    const localDate = addDays(input.startedOn, t.offsetDays);
    return {
      ...t,
      scheduledAtUtc: tenAmInTz(localDate, input.patientTimezone).toISOString(),
    };
  });
}

/**
 * Standard milestone offsets per the project brief. New templates may use a
 * subset or extend with custom offsets (e.g. dental follow-up at D+45).
 */
export const STANDARD_OFFSETS = [1, 3, 7, 14, 30, 90, 180, 365] as const;

/**
 * Standard built-in templates, one per major procedure category. Used to seed
 * `recovery_routine_templates` on first run. The agency can clone + customize.
 */
export const BUILTIN_TEMPLATES: Array<{
  code: string;
  name: string;
  procedureCategory: string;
  followUpDays: number;
  tasks: TemplateTask[];
}> = [
  {
    code: 'plastic_surgery_default',
    name: '성형외과 기본 회복 루틴',
    procedureCategory: 'plastic_surgery',
    followUpDays: 365,
    tasks: [
      { offsetDays: 1, kind: 'pain_score', title: 'D+1 통증 체크', requiresResponse: true },
      { offsetDays: 1, kind: 'restriction_reminder', title: '수술 D+1 주의사항', body: '24시간 절대 안정. 흡연·음주·사우나 금지.' },
      { offsetDays: 3, kind: 'photo_check_in', title: 'D+3 회복 사진', requiresResponse: true },
      { offsetDays: 3, kind: 'pain_score', title: 'D+3 통증 체크', requiresResponse: true },
      { offsetDays: 7, kind: 'photo_check_in', title: 'D+7 회복 사진 — 부기 추적', requiresResponse: true },
      { offsetDays: 7, kind: 'message_check_in', title: 'D+7 컨디션 체크', requiresResponse: true },
      { offsetDays: 14, kind: 'video_visit', title: 'D+14 화상 재진 권유', requiresResponse: false },
      { offsetDays: 30, kind: 'photo_check_in', title: 'D+30 1개월 사진', requiresResponse: true },
      { offsetDays: 90, kind: 'satisfaction_survey', title: 'D+90 만족도 조사', requiresResponse: true },
      { offsetDays: 180, kind: 'follow_up_offer', title: 'D+180 보정·후속 시술 안내', requiresResponse: false },
      { offsetDays: 365, kind: 'follow_up_offer', title: 'D+365 1주년 재방문 캠페인', requiresResponse: false },
    ],
  },
  {
    code: 'dermatology_default',
    name: '피부과 기본 회복 루틴',
    procedureCategory: 'dermatology',
    followUpDays: 180,
    tasks: [
      { offsetDays: 1, kind: 'restriction_reminder', title: 'D+1 자외선·각질 주의', body: '시술 후 자외선 차단(SPF 50+), 세안 시 자극 금지.' },
      { offsetDays: 3, kind: 'photo_check_in', title: 'D+3 회복 사진', requiresResponse: true },
      { offsetDays: 7, kind: 'message_check_in', title: 'D+7 만족도 체크', requiresResponse: true },
      { offsetDays: 30, kind: 'photo_check_in', title: 'D+30 효과 확인 사진', requiresResponse: true },
      { offsetDays: 90, kind: 'follow_up_offer', title: 'D+90 유지 시술 안내', requiresResponse: false },
      { offsetDays: 180, kind: 'follow_up_offer', title: 'D+180 재방문 캠페인', requiresResponse: false },
    ],
  },
  {
    code: 'hair_default',
    name: '모발 이식 회복 루틴',
    procedureCategory: 'hair',
    followUpDays: 365,
    tasks: [
      { offsetDays: 1, kind: 'restriction_reminder', title: 'D+1 베개·수면 주의', body: '엎드려 자지 않기. 두피에 압력 X.' },
      { offsetDays: 3, kind: 'photo_check_in', title: 'D+3 두피 사진', requiresResponse: true },
      { offsetDays: 7, kind: 'message_check_in', title: 'D+7 딱지 탈각 단계 안내', requiresResponse: true },
      { offsetDays: 30, kind: 'photo_check_in', title: 'D+30 shock loss 안내', requiresResponse: true },
      { offsetDays: 90, kind: 'photo_check_in', title: 'D+90 재생 시작', requiresResponse: true },
      { offsetDays: 180, kind: 'photo_check_in', title: 'D+180 6개월 결과', requiresResponse: true },
      { offsetDays: 365, kind: 'satisfaction_survey', title: 'D+365 최종 결과 + 만족도', requiresResponse: true },
    ],
  },
  {
    code: 'dental_default',
    name: '치과 회복 루틴',
    procedureCategory: 'dental',
    followUpDays: 365,
    tasks: [
      { offsetDays: 1, kind: 'pain_score', title: 'D+1 통증 체크', requiresResponse: true },
      { offsetDays: 7, kind: 'message_check_in', title: 'D+7 임시·식이 가이드', requiresResponse: true },
      { offsetDays: 30, kind: 'photo_check_in', title: 'D+30 잇몸 회복 사진', requiresResponse: true },
      { offsetDays: 90, kind: 'message_check_in', title: 'D+90 정착 단계 체크', requiresResponse: true },
      { offsetDays: 180, kind: 'follow_up_offer', title: 'D+180 검진 권유', requiresResponse: false },
      { offsetDays: 365, kind: 'follow_up_offer', title: 'D+365 정기 검진 캠페인', requiresResponse: false },
    ],
  },
  {
    code: 'ophthalmology_default',
    name: '안과(라식·렌즈삽입) 회복 루틴',
    procedureCategory: 'ophthalmology',
    followUpDays: 180,
    tasks: [
      { offsetDays: 1, kind: 'restriction_reminder', title: 'D+1 눈비비기 금지', body: '24시간 점안약 + 보호 안경. 비비기 절대 금지.' },
      { offsetDays: 1, kind: 'pain_score', title: 'D+1 통증·시야 체크', requiresResponse: true },
      { offsetDays: 7, kind: 'message_check_in', title: 'D+7 시력 안정 체크', requiresResponse: true },
      { offsetDays: 30, kind: 'video_visit', title: 'D+30 화상 재진', requiresResponse: false },
      { offsetDays: 180, kind: 'satisfaction_survey', title: 'D+180 시력·만족도 점검', requiresResponse: true },
    ],
  },
  {
    code: 'checkup_default',
    name: '건강검진 사후 안내',
    procedureCategory: 'checkup',
    followUpDays: 365,
    tasks: [
      { offsetDays: 7, kind: 'message_check_in', title: 'D+7 결과지 수령 확인', requiresResponse: true },
      { offsetDays: 30, kind: 'message_check_in', title: 'D+30 결과 상담 안내', requiresResponse: false },
      { offsetDays: 365, kind: 'follow_up_offer', title: 'D+365 다음 검진 알림', requiresResponse: false },
    ],
  },
];

export function findBuiltinTemplate(category: string): (typeof BUILTIN_TEMPLATES)[number] | null {
  return BUILTIN_TEMPLATES.find((t) => t.procedureCategory === category) ?? null;
}
