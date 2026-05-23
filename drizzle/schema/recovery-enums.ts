import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Phase 8 — EarlyCare aftercare enums.
 */

export const routineStatusEnum = pgEnum('recovery_routine_status', [
  'scheduled', // tasks generated, awaiting trigger times
  'active', // currently running (within D+0…D+followUpDays window)
  'completed', // all tasks satisfied (or final day passed)
  'paused', // operator paused (e.g. patient requested break)
  'cancelled', // case voided / patient withdrew
]);

export const routineTaskKindEnum = pgEnum('recovery_routine_task_kind', [
  'message_check_in', // ask the patient "how are you feeling?"
  'photo_check_in', // ask for a recovery photo
  'video_visit', // schedule a tele-consult
  'pain_score', // 0–10 pain scale
  'medication_reminder',
  'restriction_reminder', // e.g. avoid sauna for D+7
  'follow_up_offer', // "book a touch-up at the 90-day mark?"
  'satisfaction_survey',
]);

export const routineTaskStatusEnum = pgEnum('recovery_routine_task_status', [
  'pending',
  'sent', // delivered via channel (kakao/whatsapp/etc.)
  'patient_responded',
  'overdue',
  'escalated', // no response → manager / doctor alerted
  'skipped',
  'completed',
]);

export const recoveryPhotoStatusEnum = pgEnum('recovery_photo_status', [
  'uploaded',
  'ai_reviewed',
  'flagged_for_doctor',
  'doctor_reviewed',
  'archived',
]);

export const recoveryAlertSeverityEnum = pgEnum('recovery_alert_severity', [
  'info',
  'warning',
  'critical',
]);

export const recoveryAlertReasonEnum = pgEnum('recovery_alert_reason', [
  'no_response',
  'pain_score_high',
  'photo_anomaly', // AI vision detected swelling, redness, asymmetry
  'patient_reported_issue',
  'medication_missed',
  'restriction_violation',
]);
