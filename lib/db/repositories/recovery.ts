import 'server-only';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { recoveryAlerts, recoveryRoutines, recoveryRoutineTasks } from '@/drizzle/schema/recovery';

export type AlertSummary = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  reason: string;
  title: string;
  detail: string | null;
  patientId: string;
  routineId: string | null;
  createdAt: Date;
};

export async function listOpenAlerts(
  organizationId: string,
  limit = 50,
): Promise<AlertSummary[]> {
  return await db
    .select({
      id: recoveryAlerts.id,
      severity: recoveryAlerts.severity,
      reason: recoveryAlerts.reason,
      title: recoveryAlerts.title,
      detail: recoveryAlerts.detail,
      patientId: recoveryAlerts.patientId,
      routineId: recoveryAlerts.routineId,
      createdAt: recoveryAlerts.createdAt,
    })
    .from(recoveryAlerts)
    .where(and(eq(recoveryAlerts.organizationId, organizationId), isNull(recoveryAlerts.resolvedAt)))
    .orderBy(
      sql`CASE ${recoveryAlerts.severity} WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END`,
      desc(recoveryAlerts.createdAt),
    )
    .limit(limit);
}

export type ActiveRoutineSummary = {
  id: string;
  patientId: string;
  startedOn: string;
  status: string;
  patientTimezone: string;
  pendingTaskCount: number;
  nextTaskAt: Date | null;
};

export async function listActiveRoutines(
  organizationId: string,
  limit = 100,
): Promise<ActiveRoutineSummary[]> {
  const rows = await db
    .select({
      id: recoveryRoutines.id,
      patientId: recoveryRoutines.patientId,
      startedOn: recoveryRoutines.startedOn,
      status: recoveryRoutines.status,
      patientTimezone: recoveryRoutines.patientTimezone,
      pendingTaskCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${recoveryRoutineTasks}
         WHERE ${recoveryRoutineTasks.routineId} = ${recoveryRoutines.id}
           AND ${recoveryRoutineTasks.status} IN ('pending','sent')
      )`,
      nextTaskAt: sql<Date | null>`(
        SELECT MIN(${recoveryRoutineTasks.scheduledAt}) FROM ${recoveryRoutineTasks}
         WHERE ${recoveryRoutineTasks.routineId} = ${recoveryRoutines.id}
           AND ${recoveryRoutineTasks.status} IN ('pending','sent')
      )`,
    })
    .from(recoveryRoutines)
    .where(
      and(
        eq(recoveryRoutines.organizationId, organizationId),
        sql`${recoveryRoutines.status} IN ('scheduled','active')`,
      ),
    )
    .orderBy(desc(recoveryRoutines.updatedAt))
    .limit(limit);
  return rows;
}

export async function resolveAlert(input: {
  organizationId: string;
  alertId: string;
  resolvedByUserId: string | null;
  note?: string;
}): Promise<void> {
  await db
    .update(recoveryAlerts)
    .set({
      resolvedAt: new Date(),
      resolvedByUserId: input.resolvedByUserId,
      resolutionNote: input.note ?? null,
    })
    .where(
      and(eq(recoveryAlerts.organizationId, input.organizationId), eq(recoveryAlerts.id, input.alertId)),
    );
}
