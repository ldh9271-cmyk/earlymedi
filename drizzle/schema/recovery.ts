import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';
import { patients } from './patients';
import { cases } from './cases';
import { treatmentCharts } from './treatment-charts';
import {
  recoveryAlertReasonEnum,
  recoveryAlertSeverityEnum,
  recoveryPhotoStatusEnum,
  routineStatusEnum,
  routineTaskKindEnum,
  routineTaskStatusEnum,
} from './recovery-enums';

/**
 * recovery_routine_templates — global blueprint per procedure category.
 *
 * The seed provides one template per major category (성형·피부·모발·치과 등).
 * Each template encodes the D+N milestones for that recovery curve:
 *   {offsetDays:1,kind:'message_check_in'}, {offsetDays:3,kind:'photo_check_in'}…
 *
 * Agencies can clone a template and customize per hospital or per case.
 */
export const routineTemplates = pgTable(
  'recovery_routine_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** When organizationId is null, this is a global template (seeded). */
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    code: text('code').notNull(), // e.g. 'plastic_surgery_default'
    name: text('name').notNull(),
    procedureCategory: text('procedure_category'), // procedureCategoryEnum value
    /** D+N task milestones — see schedule shape in routine-scheduler.ts */
    tasksJson: jsonb('tasks_json')
      .$type<
        Array<{
          offsetDays: number;
          kind:
            | 'message_check_in'
            | 'photo_check_in'
            | 'video_visit'
            | 'pain_score'
            | 'medication_reminder'
            | 'restriction_reminder'
            | 'follow_up_offer'
            | 'satisfaction_survey';
          title: string;
          body?: string;
          requiresResponse?: boolean;
        }>
      >()
      .notNull()
      .default(sql`'[]'::jsonb`),
    followUpDays: integer('follow_up_days').notNull().default(365),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgCodeUnique: uniqueIndex('recovery_routine_templates_org_code_unique').on(t.organizationId, t.code),
    categoryIdx: index('recovery_routine_templates_category_idx').on(t.procedureCategory),
  }),
);

export type RoutineTemplate = typeof routineTemplates.$inferSelect;
export type NewRoutineTemplate = typeof routineTemplates.$inferInsert;

/**
 * recovery_routines — one per (patient + chart). Generated when a treatment
 * chart finalizes. The patient's local timezone + treatment date define when
 * each task fires (10:00 in their local tz, per spec).
 */
export const recoveryRoutines = pgTable(
  'recovery_routines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
    chartId: uuid('chart_id').references(() => treatmentCharts.id, { onDelete: 'set null' }),
    templateId: uuid('template_id').references(() => routineTemplates.id, { onDelete: 'set null' }),

    status: routineStatusEnum('status').notNull().default('scheduled'),
    startedOn: text('started_on').notNull(), // YYYY-MM-DD — patient's local date
    patientTimezone: text('patient_timezone').notNull().default('Asia/Seoul'),
    patientLocale: text('patient_locale').notNull().default('ko'),

    /** Frozen at routine creation so policy edits don't retro-mutate schedule. */
    snapshotJson: jsonb('snapshot_json')
      .$type<{
        templateCode: string;
        followUpDays: number;
        tasks: Array<{ offsetDays: number; kind: string; title: string }>;
      }>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelledReason: text('cancelled_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgPatientIdx: index('recovery_routines_org_patient_idx').on(t.organizationId, t.patientId),
    statusIdx: index('recovery_routines_status_idx').on(t.organizationId, t.status),
  }),
);

export type RecoveryRoutine = typeof recoveryRoutines.$inferSelect;
export type NewRecoveryRoutine = typeof recoveryRoutines.$inferInsert;

/**
 * recovery_routine_tasks — concrete D+N task instances on a routine.
 *
 * `scheduledAt` is absolute UTC, computed from (startedOn + offsetDays @ 10:00
 * in patientTimezone). The scheduler (QStash in prod, in-process cron in dev)
 * looks up tasks where `status='pending' AND scheduledAt <= now`.
 */
export const recoveryRoutineTasks = pgTable(
  'recovery_routine_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    routineId: uuid('routine_id')
      .notNull()
      .references(() => recoveryRoutines.id, { onDelete: 'cascade' }),

    offsetDays: integer('offset_days').notNull(),
    kind: routineTaskKindEnum('kind').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    requiresResponse: boolean('requires_response').notNull().default(true),

    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    overdueAt: timestamp('overdue_at', { withTimezone: true }), // when no_response escalation fired

    status: routineTaskStatusEnum('status').notNull().default('pending'),
    /** Channel used to deliver — kakao/whatsapp/email/sms etc. */
    deliveryChannelKind: text('delivery_channel_kind'),
    deliveryExternalId: text('delivery_external_id'),
    responseSummary: text('response_summary'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    routineIdx: index('recovery_routine_tasks_routine_idx').on(t.routineId, t.offsetDays),
    dueIdx: index('recovery_routine_tasks_due_idx').on(t.status, t.scheduledAt),
  }),
);

export type RoutineTask = typeof recoveryRoutineTasks.$inferSelect;
export type NewRoutineTask = typeof recoveryRoutineTasks.$inferInsert;

/**
 * recovery_photos — patient-uploaded recovery photos, optionally bound to a
 * specific routine task. Storage paths only; the binary lives in Supabase
 * Storage's `recovery-photos` private bucket.
 */
export const recoveryPhotos = pgTable(
  'recovery_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    routineId: uuid('routine_id').references(() => recoveryRoutines.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => recoveryRoutineTasks.id, { onDelete: 'set null' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),

    storagePath: text('storage_path').notNull(),
    mimeType: text('mime_type').notNull(),
    width: integer('width'),
    height: integer('height'),

    capturedAt: timestamp('captured_at', { withTimezone: true }),
    bodyPart: text('body_part'),

    status: recoveryPhotoStatusEnum('status').notNull().default('uploaded'),

    /** AI vision result — swelling/redness/asymmetry scores (0..100). */
    aiAnalysisJson: jsonb('ai_analysis_json')
      .$type<{
        swelling?: number;
        redness?: number;
        asymmetry?: number;
        infectionSignals?: number;
        overallRiskScore: number;
        warnings: string[];
        model: string;
        analyzedAt: string;
      } | null>()
      .default(sql`null`),

    doctorReviewedById: uuid('doctor_reviewed_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    doctorReviewNote: text('doctor_review_note'),
    doctorReviewedAt: timestamp('doctor_reviewed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    routineIdx: index('recovery_photos_routine_idx').on(t.routineId),
    statusIdx: index('recovery_photos_status_idx').on(t.organizationId, t.status),
    patientIdx: index('recovery_photos_patient_idx').on(t.patientId),
  }),
);

export type RecoveryPhoto = typeof recoveryPhotos.$inferSelect;

/**
 * recovery_alerts — escalation queue. Every alert fires from either:
 *   - no_response after a task's overdue grace period
 *   - photo AI flag (overallRiskScore ≥ threshold)
 *   - patient-reported issue (free-text response containing keywords)
 *   - high pain score
 *
 * The agency dashboard pulls these via the EarlyCare board (Phase 8 UI).
 */
export const recoveryAlerts = pgTable(
  'recovery_alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    routineId: uuid('routine_id').references(() => recoveryRoutines.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => recoveryRoutineTasks.id, { onDelete: 'set null' }),
    photoId: uuid('photo_id').references(() => recoveryPhotos.id, { onDelete: 'set null' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),

    severity: recoveryAlertSeverityEnum('severity').notNull(),
    reason: recoveryAlertReasonEnum('reason').notNull(),
    title: text('title').notNull(),
    detail: text('detail'),

    assignedUserId: uuid('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedByUserId: uuid('resolved_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    resolutionNote: text('resolution_note'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    activeIdx: index('recovery_alerts_active_idx').on(t.organizationId, t.resolvedAt),
    severityIdx: index('recovery_alerts_severity_idx').on(t.severity, t.createdAt),
    patientIdx: index('recovery_alerts_patient_idx').on(t.patientId),
  }),
);

export type RecoveryAlert = typeof recoveryAlerts.$inferSelect;
