import 'server-only';
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../client';
import { cases, caseCounters, caseEvents, caseAssignees } from '@/drizzle/schema/cases';
import {
  hospitalDepositPolicies,
  hospitalReferralRates,
} from '@/drizzle/schema/hospitals';
import { auditLogs } from '@/drizzle/schema/audit';

type CaseStage =
  | 'scoping'
  | 'rfq_sent'
  | 'quoted'
  | 'accepted'
  | 'deposit_paid'
  | 'scheduled'
  | 'arrived'
  | 'in_treatment'
  | 'post_treatment'
  | 'aftercare'
  | 'closed_won'
  | 'closed_lost'
  | 'closed_cancelled';

type CaseEventType =
  | 'created'
  | 'stage_changed'
  | 'assignee_changed'
  | 'note_added'
  | 'message_linked'
  | 'file_attached'
  | 'rfq_sent'
  | 'quote_received'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'deposit_invoiced'
  | 'deposit_paid'
  | 'appointment_scheduled'
  | 'patient_arrived'
  | 'treatment_started'
  | 'treatment_completed'
  | 'chart_submitted'
  | 'chart_finalized'
  | 'payment_received'
  | 'payout_initiated'
  | 'aftercare_event'
  | 'partner_booking_requested'
  | 'partner_booking_confirmed'
  | 'closed_won'
  | 'closed_lost'
  | 'closed_cancelled';

type CaseActorRole = 'agency' | 'hospital' | 'patient' | 'freelancer' | 'partner' | 'ai' | 'system';

type CaseAssigneeRole =
  | 'primary_manager'
  | 'coordinator'
  | 'interpreter'
  | 'driver'
  | 'observer';

const CLOSED_STAGES: ReadonlySet<CaseStage> = new Set([
  'closed_won',
  'closed_lost',
  'closed_cancelled',
]);

const STAGE_TO_CLOSED_EVENT: Partial<Record<CaseStage, CaseEventType>> = {
  closed_won: 'closed_won',
  closed_lost: 'closed_lost',
  closed_cancelled: 'closed_cancelled',
};

export type ListCasesFilter = {
  search?: string;
  stages?: CaseStage[];
  includeClosed?: boolean; // default false — Kanban / List hide closed by default
  patientId?: string;
  assigneeUserId?: string;
  arrivalFrom?: string; // YYYY-MM-DD
  arrivalTo?: string;
};

export async function listCases(
  organizationId: string,
  filter: ListCasesFilter = {},
  limit = 200,
): Promise<Array<{
  id: string;
  caseNumber: string;
  title: string;
  stage: CaseStage;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  patientId: string;
  estimatedArrivalDate: string | null;
  estimatedTotalKrw: number | null;
  targetHospitalIds: string[];
  targetProcedureCategories: string[];
  tags: string[];
  lastActivityAt: Date;
  eventsCount: number;
  closedAt: Date | null;
}>> {
  const where: SQL[] = [eq(cases.organizationId, organizationId)];

  if (filter.stages && filter.stages.length > 0) {
    where.push(inArray(cases.stage, filter.stages));
  } else if (!filter.includeClosed) {
    where.push(
      sql`${cases.stage} NOT IN ('closed_won','closed_lost','closed_cancelled')`,
    );
  }

  if (filter.patientId) where.push(eq(cases.patientId, filter.patientId));

  if (filter.search) {
    const term = `%${filter.search}%`;
    const orC = or(ilike(cases.title, term), ilike(cases.caseNumber, term));
    if (orC) where.push(orC);
  }

  if (filter.arrivalFrom) {
    where.push(sql`${cases.estimatedArrivalDate} >= ${filter.arrivalFrom}`);
  }
  if (filter.arrivalTo) {
    where.push(sql`${cases.estimatedArrivalDate} <= ${filter.arrivalTo}`);
  }

  if (filter.assigneeUserId) {
    where.push(
      sql`EXISTS (
        SELECT 1 FROM ${caseAssignees}
        WHERE ${caseAssignees.caseId} = ${cases.id}
          AND ${caseAssignees.userId} = ${filter.assigneeUserId}
          AND ${caseAssignees.isActive} = true
      )`,
    );
  }

  const rows = await db
    .select({
      id: cases.id,
      caseNumber: cases.caseNumber,
      title: cases.title,
      stage: cases.stage,
      priority: cases.priority,
      patientId: cases.patientId,
      estimatedArrivalDate: cases.estimatedArrivalDate,
      estimatedTotalKrw: cases.estimatedTotalKrw,
      targetHospitalIds: cases.targetHospitalIdsJson,
      targetProcedureCategories: cases.targetProcedureCategoriesJson,
      tags: cases.tagsJson,
      lastActivityAt: cases.lastActivityAt,
      eventsCount: cases.eventsCount,
      closedAt: cases.closedAt,
    })
    .from(cases)
    .where(and(...where))
    .orderBy(desc(cases.lastActivityAt))
    .limit(limit);

  return rows;
}

export async function getCaseById(
  organizationId: string,
  caseId: string,
): Promise<{
  case: typeof cases.$inferSelect;
  events: Array<typeof caseEvents.$inferSelect>;
  assignees: Array<typeof caseAssignees.$inferSelect>;
} | null> {
  const [c] = await db
    .select()
    .from(cases)
    .where(and(eq(cases.organizationId, organizationId), eq(cases.id, caseId)))
    .limit(1);
  if (!c) return null;

  const [events, assignees] = await Promise.all([
    db
      .select()
      .from(caseEvents)
      .where(eq(caseEvents.caseId, caseId))
      .orderBy(desc(caseEvents.occurredAt))
      .limit(200),
    db
      .select()
      .from(caseAssignees)
      .where(and(eq(caseAssignees.caseId, caseId), eq(caseAssignees.isActive, true))),
  ]);

  return { case: c, events, assignees };
}

export type CreateCaseInput = {
  patientId: string;
  title: string;
  sourceConversationId?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  targetHospitalIds?: string[];
  targetProcedureCategories?: string[];
  targetProcedureCodes?: string[];
  estimatedArrivalDate?: string;
  estimatedDepartureDate?: string;
  patientTimezone?: string;
  estimatedTotalKrw?: number;
  currency?: string;
  sourceChannel?: string;
  tags?: string[];
};

export async function createCase(
  organizationId: string,
  createdByUserId: string | null,
  input: CreateCaseInput,
): Promise<{ id: string; caseNumber: string }> {
  const year = new Date().getUTCFullYear();
  const caseNumber = await nextCaseNumber(organizationId, year);

  const targetHospitalIds = input.targetHospitalIds ?? [];
  const snapshot = await snapshotPolicyFor(organizationId, targetHospitalIds);

  const [inserted] = await db
    .insert(cases)
    .values({
      organizationId,
      patientId: input.patientId,
      sourceConversationId: input.sourceConversationId ?? null,
      caseNumber,
      title: input.title,
      priority: input.priority ?? 'normal',
      targetHospitalIdsJson: targetHospitalIds,
      targetProcedureCategoriesJson: input.targetProcedureCategories ?? [],
      targetProcedureCodesJson: input.targetProcedureCodes ?? [],
      estimatedArrivalDate: input.estimatedArrivalDate ?? null,
      estimatedDepartureDate: input.estimatedDepartureDate ?? null,
      patientTimezone: input.patientTimezone ?? null,
      currency: input.currency ?? 'KRW',
      estimatedTotalKrw: input.estimatedTotalKrw ?? null,
      policySnapshotJson: snapshot,
      policySnapshotAt: new Date(snapshot.snapshotAt),
      sourceChannel: input.sourceChannel ?? null,
      tagsJson: input.tags ?? [],
      eventsCount: 1,
      createdByUserId,
    })
    .returning({ id: cases.id });

  if (!inserted) throw new Error('case_insert_failed');

  await db.insert(caseEvents).values({
    organizationId,
    caseId: inserted.id,
    eventType: 'created',
    actorRole: 'agency',
    actorUserId: createdByUserId,
    title: '케이스 생성',
    description: `${caseNumber} · ${input.title}`,
    payloadJson: {
      targetHospitalIds,
      targetProcedureCategories: input.targetProcedureCategories ?? [],
    },
  });

  if (createdByUserId) {
    await db.insert(caseAssignees).values({
      organizationId,
      caseId: inserted.id,
      userId: createdByUserId,
      role: 'primary_manager',
      assignedById: createdByUserId,
    });
  }

  await db.insert(auditLogs).values({
    organizationId,
    actorUserId: createdByUserId,
    action: 'create',
    entityType: 'case',
    entityId: inserted.id,
    diff: { caseNumber, title: input.title },
  });

  return { id: inserted.id, caseNumber };
}

/**
 * Bumps the per-org+year counter atomically and returns the formatted
 * caseNumber. Relies on the uniqueIndex(orgId, year) for the upsert key.
 */
async function nextCaseNumber(organizationId: string, year: number): Promise<string> {
  const [row] = await db
    .insert(caseCounters)
    .values({ organizationId, year, value: 1 })
    .onConflictDoUpdate({
      target: [caseCounters.organizationId, caseCounters.year],
      set: {
        value: sql`${caseCounters.value} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning({ value: caseCounters.value });
  if (!row) throw new Error('case_counter_failed');
  const padded = String(row.value).padStart(4, '0');
  return `EM-${year}-${padded}`;
}

/**
 * Freezes the hospital-side policies that should govern this case's
 * settlement. Phase 6 will extend this with commission policies, FX rates,
 * and billing-plan caps.
 */
async function snapshotPolicyFor(
  organizationId: string,
  hospitalIds: string[],
): Promise<{
  snapshotAt: string;
  hospitalRates: Record<string, Array<typeof hospitalReferralRates.$inferSelect>>;
  depositPolicies: Record<string, typeof hospitalDepositPolicies.$inferSelect>;
}> {
  const snapshotAt = new Date().toISOString();
  if (hospitalIds.length === 0) {
    return { snapshotAt, hospitalRates: {}, depositPolicies: {} };
  }
  const [rates, deposits] = await Promise.all([
    db
      .select()
      .from(hospitalReferralRates)
      .where(
        and(
          eq(hospitalReferralRates.organizationId, organizationId),
          inArray(hospitalReferralRates.hospitalId, hospitalIds),
        ),
      ),
    db
      .select()
      .from(hospitalDepositPolicies)
      .where(
        and(
          eq(hospitalDepositPolicies.organizationId, organizationId),
          inArray(hospitalDepositPolicies.hospitalId, hospitalIds),
        ),
      ),
  ]);

  const hospitalRates: Record<string, Array<typeof hospitalReferralRates.$inferSelect>> = {};
  for (const r of rates) {
    const list = hospitalRates[r.hospitalId] ?? [];
    list.push(r);
    hospitalRates[r.hospitalId] = list;
  }
  const depositPolicies: Record<string, typeof hospitalDepositPolicies.$inferSelect> = {};
  for (const d of deposits) {
    depositPolicies[d.hospitalId] = d;
  }
  return { snapshotAt, hospitalRates, depositPolicies };
}

export async function transitionStage(
  organizationId: string,
  actorUserId: string | null,
  caseId: string,
  toStage: CaseStage,
  reason?: string,
): Promise<void> {
  const [existing] = await db
    .select({ stage: cases.stage })
    .from(cases)
    .where(and(eq(cases.organizationId, organizationId), eq(cases.id, caseId)))
    .limit(1);
  if (!existing) throw new Error('case_not_found');
  if (existing.stage === toStage) return;

  const now = new Date();
  const isClosing = CLOSED_STAGES.has(toStage);

  await db
    .update(cases)
    .set({
      stage: toStage,
      lastActivityAt: now,
      updatedAt: now,
      eventsCount: sql`${cases.eventsCount} + 1`,
      ...(isClosing
        ? {
            closedAt: now,
            closedReason: reason ?? null,
            closedByUserId: actorUserId,
          }
        : {}),
    })
    .where(and(eq(cases.organizationId, organizationId), eq(cases.id, caseId)));

  const closedEventType = STAGE_TO_CLOSED_EVENT[toStage];
  await db.insert(caseEvents).values({
    organizationId,
    caseId,
    eventType: closedEventType ?? 'stage_changed',
    actorRole: 'agency',
    actorUserId,
    title: `단계 변경: ${existing.stage} → ${toStage}`,
    description: reason ?? null,
    payloadJson: { from: existing.stage, to: toStage, reason: reason ?? null },
  });

  await db.insert(auditLogs).values({
    organizationId,
    actorUserId,
    action: 'change_status',
    entityType: 'case',
    entityId: caseId,
    diff: { from: existing.stage, to: toStage },
    metadata: { reason: reason ?? undefined },
  });
}

export type AddCaseEventInput = {
  eventType: CaseEventType;
  title: string;
  description?: string;
  actorRole?: CaseActorRole;
  actorUserId?: string | null;
  relatedEntityType?: string;
  relatedEntityId?: string;
  payload?: Record<string, unknown>;
  occurredAt?: Date;
};

export async function addCaseEvent(
  organizationId: string,
  caseId: string,
  input: AddCaseEventInput,
): Promise<{ id: string }> {
  const [inserted] = await db
    .insert(caseEvents)
    .values({
      organizationId,
      caseId,
      eventType: input.eventType,
      actorRole: input.actorRole ?? 'agency',
      actorUserId: input.actorUserId ?? null,
      title: input.title,
      description: input.description ?? null,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      payloadJson: input.payload ?? {},
      occurredAt: input.occurredAt ?? new Date(),
    })
    .returning({ id: caseEvents.id });
  if (!inserted) throw new Error('case_event_insert_failed');

  await db
    .update(cases)
    .set({
      eventsCount: sql`${cases.eventsCount} + 1`,
      lastActivityAt: new Date(),
    })
    .where(and(eq(cases.organizationId, organizationId), eq(cases.id, caseId)));

  return { id: inserted.id };
}

export async function assignUser(
  organizationId: string,
  actorUserId: string | null,
  caseId: string,
  userId: string,
  role: CaseAssigneeRole = 'primary_manager',
): Promise<void> {
  await db
    .insert(caseAssignees)
    .values({
      organizationId,
      caseId,
      userId,
      role,
      assignedById: actorUserId,
    })
    .onConflictDoUpdate({
      target: [caseAssignees.caseId, caseAssignees.userId, caseAssignees.role],
      set: { isActive: true, assignedAt: new Date(), unassignedAt: null, assignedById: actorUserId },
    });

  await addCaseEvent(organizationId, caseId, {
    eventType: 'assignee_changed',
    actorUserId,
    title: '담당자 지정',
    payload: { userId, role, op: 'assign' },
  });
}

export async function unassignUser(
  organizationId: string,
  actorUserId: string | null,
  caseId: string,
  userId: string,
  role: CaseAssigneeRole,
): Promise<void> {
  await db
    .update(caseAssignees)
    .set({ isActive: false, unassignedAt: new Date() })
    .where(
      and(
        eq(caseAssignees.organizationId, organizationId),
        eq(caseAssignees.caseId, caseId),
        eq(caseAssignees.userId, userId),
        eq(caseAssignees.role, role),
      ),
    );

  await addCaseEvent(organizationId, caseId, {
    eventType: 'assignee_changed',
    actorUserId,
    title: '담당자 해제',
    payload: { userId, role, op: 'unassign' },
  });
}

/**
 * Re-snapshot the policy for a case (e.g. after the agency renegotiated a
 * referral rate and explicitly wants the open case to reflect the new terms).
 * Audit-logged so the reason is preserved.
 */
export async function resnapshotPolicy(
  organizationId: string,
  actorUserId: string | null,
  caseId: string,
  reason: string,
): Promise<void> {
  const [existing] = await db
    .select({ targetHospitalIds: cases.targetHospitalIdsJson })
    .from(cases)
    .where(and(eq(cases.organizationId, organizationId), eq(cases.id, caseId)))
    .limit(1);
  if (!existing) throw new Error('case_not_found');

  const snapshot = await snapshotPolicyFor(organizationId, existing.targetHospitalIds);
  await db
    .update(cases)
    .set({
      policySnapshotJson: snapshot,
      policySnapshotAt: new Date(snapshot.snapshotAt),
      updatedAt: new Date(),
    })
    .where(and(eq(cases.organizationId, organizationId), eq(cases.id, caseId)));

  await db.insert(auditLogs).values({
    organizationId,
    actorUserId,
    action: 'update',
    entityType: 'case',
    entityId: caseId,
    diff: { snapshotAt: snapshot.snapshotAt },
    metadata: { reason, op: 'resnapshot_policy' },
  });
}
