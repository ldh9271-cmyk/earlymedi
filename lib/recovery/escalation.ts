/**
 * Recovery escalation rules — pure decision functions for the cron worker.
 *
 * The worker iterates open tasks and uncategorized alerts; this module decides
 * (a) whether a task is overdue, (b) which severity tier its alert should be,
 * (c) which staff role should be paged. All thresholds in one place so policy
 * tweaks land in a single review.
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

export type EscalationSeverity = 'info' | 'warning' | 'critical';

export type EscalationRecipient = 'case_manager' | 'doctor' | 'medical_director' | 'patient_only';

/**
 * Grace window per task kind. Anything past `scheduledAt + graceHours` and
 * still in `pending`/`sent` state → status flips to `overdue` and an alert
 * fires.
 */
export const GRACE_HOURS_BY_KIND: Record<TaskKind, number> = {
  pain_score: 24, // pain check overdue after 1 day silence
  photo_check_in: 48,
  message_check_in: 48,
  medication_reminder: 24,
  restriction_reminder: 24,
  video_visit: 72, // looser — scheduling itself takes time
  follow_up_offer: 168, // 7 days
  satisfaction_survey: 168,
};

export type TaskOverdueInput = {
  kind: TaskKind;
  scheduledAt: Date;
  requiresResponse: boolean;
  status: 'pending' | 'sent' | 'patient_responded' | 'overdue' | 'escalated' | 'skipped' | 'completed';
  now?: Date;
};

export function isOverdue(input: TaskOverdueInput): boolean {
  if (!input.requiresResponse) return false;
  if (input.status === 'patient_responded' || input.status === 'completed' || input.status === 'skipped') return false;
  if (input.status === 'escalated') return false;
  const now = (input.now ?? new Date()).getTime();
  const grace = (GRACE_HOURS_BY_KIND[input.kind] ?? 48) * 3_600_000;
  return now - input.scheduledAt.getTime() > grace;
}

export type AnomalyInput = {
  /** AI vision risk score (0..100). */
  overallRiskScore: number;
  /** Pain score 0..10 reported by patient. */
  painScore?: number;
  /** Patient-typed message body. */
  patientText?: string;
};

const KEYWORDS_CRITICAL = ['응급', '피', '출혈', '쇼크', 'bleeding', 'fever', 'sepsis', '38도', '38°', '40도'];
const KEYWORDS_WARNING = ['감염', 'infection', '농', '괴사', '심하', '많이 아파', 'swollen badly'];

/**
 * Combine the three signals into a single severity + recipient.
 * AI risk: ≥85 critical, ≥60 warning. Pain ≥8 critical, ≥6 warning.
 * Keyword critical beats numeric. No anomaly → info / case_manager.
 */
export function classifyAnomaly(input: AnomalyInput): {
  severity: EscalationSeverity;
  recipient: EscalationRecipient;
  reasons: string[];
} {
  const reasons: string[] = [];
  let severity: EscalationSeverity = 'info';
  let recipient: EscalationRecipient = 'case_manager';

  if (input.patientText) {
    const t = input.patientText.toLowerCase();
    if (KEYWORDS_CRITICAL.some((k) => t.includes(k.toLowerCase()))) {
      reasons.push('keyword_critical');
      severity = 'critical';
      recipient = 'medical_director';
    } else if (KEYWORDS_WARNING.some((k) => t.includes(k.toLowerCase()))) {
      reasons.push('keyword_warning');
      severity = 'warning';
      recipient = 'doctor';
    }
  }

  if (input.painScore !== undefined) {
    if (input.painScore >= 8) {
      reasons.push('pain_score_critical');
      if (severity !== 'critical') severity = 'critical';
      if (recipient === 'case_manager') recipient = 'doctor';
    } else if (input.painScore >= 6) {
      reasons.push('pain_score_warning');
      if (severity === 'info') severity = 'warning';
      if (recipient === 'case_manager') recipient = 'doctor';
    }
  }

  if (input.overallRiskScore >= 85) {
    reasons.push('photo_risk_critical');
    if (severity !== 'critical') severity = 'critical';
    if (recipient !== 'medical_director') recipient = 'doctor';
  } else if (input.overallRiskScore >= 60) {
    reasons.push('photo_risk_warning');
    if (severity === 'info') severity = 'warning';
    if (recipient === 'case_manager') recipient = 'doctor';
  }

  return { severity, recipient, reasons };
}

/** Should the no_response alert page the doctor too, or just the case manager? */
export function noResponseRecipient(
  kind: TaskKind,
  daysSinceScheduled: number,
): EscalationRecipient {
  // Pain / restriction reminders for first-week post-op silence escalate to doctor.
  if ((kind === 'pain_score' || kind === 'restriction_reminder') && daysSinceScheduled >= 1) {
    return 'doctor';
  }
  if (daysSinceScheduled >= 5) return 'doctor';
  return 'case_manager';
}
