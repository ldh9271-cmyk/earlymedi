import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Case-lifecycle enums (Phase 5).
 *
 * The `case_stage` enum drives the 4-view board (Kanban·List·Calendar·Map).
 * Closed stages — `closed_won`, `closed_lost`, `closed_cancelled` — are excluded
 * from the active Kanban by default but kept on List/Calendar via filter.
 */

export const caseStageEnum = pgEnum('case_stage', [
  'scoping',          // 초기 상담 — needs / budget gathering
  'rfq_sent',         // RFQ 발송 — waiting for hospital quotes
  'quoted',           // 견적 수신 — comparing quotes
  'accepted',         // 견적 수락 — quote accepted, deposit pending
  'deposit_paid',     // 예약금 수령 — deposit received
  'scheduled',        // 일정 확정 — appointment scheduled
  'arrived',          // 입국 — patient in-country
  'in_treatment',     // 시술 중
  'post_treatment',   // 시술 완료 — in-country recovery
  'aftercare',        // 사후관리 — back home, EarlyCare Plus
  'closed_won',       // 정산 완료
  'closed_lost',      // 경쟁사·드롭 등으로 미전환
  'closed_cancelled', // 진행 중 취소
]);

/**
 * Append-only timeline event types. Each event renders one row on the patient
 * detail timeline and the case detail page. Downstream phases (6 = billing,
 * 7 = visa, 8 = aftercare) emit additional event types — keep the list
 * forward-compatible: new types add cleanly without touching existing rows.
 */
export const caseEventTypeEnum = pgEnum('case_event_type', [
  'created',
  'stage_changed',
  'assignee_changed',
  'note_added',
  'message_linked',          // conversation message attached
  'file_attached',
  'rfq_sent',
  'quote_received',
  'quote_accepted',
  'quote_rejected',
  'deposit_invoiced',
  'deposit_paid',
  'appointment_scheduled',
  'patient_arrived',
  'treatment_started',
  'treatment_completed',
  'chart_submitted',
  'chart_finalized',
  'payment_received',
  'payout_initiated',
  'aftercare_event',
  'partner_booking_requested',
  'partner_booking_confirmed',
  'closed_won',
  'closed_lost',
  'closed_cancelled',
]);

export const caseAssigneeRoleEnum = pgEnum('case_assignee_role', [
  'primary_manager', // 케이스 매니저 — 1인
  'coordinator',     // 현지 코디네이터
  'interpreter',     // 통역 (Phase 5.8에서 자동 매칭 가능)
  'driver',          // 드라이버 (Phase 5.8)
  'observer',        // 관찰자 — 알림 없음
]);

export const caseActorRoleEnum = pgEnum('case_actor_role', [
  'agency',
  'hospital',
  'patient',
  'freelancer',
  'partner',
  'ai',
  'system',
]);
