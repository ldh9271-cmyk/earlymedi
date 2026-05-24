import 'server-only';
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../client';
import { patients, patientMedicalHistory } from '@/drizzle/schema/patients';
import { auditLogs } from '@/drizzle/schema/audit';
import { encryptPii, hashFingerprint } from '@/lib/encryption/pgcrypto';
import { assertTrialQuotaAvailable, incrementTrialUsage } from '@/lib/billing/trial-quota';

export type ListPatientsFilter = {
  search?: string;
  status?: 'active' | 'inactive' | 'archived';
  tag?: string;
  nationality?: string;
};

export async function listPatients(
  organizationId: string,
  filter: ListPatientsFilter = {},
  limit = 80,
): Promise<Array<{
  id: string;
  fullName: string;
  aliasName: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  sex: 'male' | 'female' | 'other' | 'unknown';
  tags: string[];
  status: 'active' | 'inactive' | 'archived' | 'merged_into';
  sourceChannel: string | null;
  updatedAt: Date;
}>> {
  const where: SQL[] = [eq(patients.organizationId, organizationId)];
  if (filter.status) where.push(eq(patients.status, filter.status));
  else where.push(sql`${patients.status} <> 'merged_into'`);
  if (filter.nationality) where.push(eq(patients.nationality, filter.nationality));
  if (filter.search) {
    const term = `%${filter.search}%`;
    const orC = or(
      ilike(patients.fullName, term),
      ilike(patients.aliasName, term),
      ilike(patients.nationality, term),
    );
    if (orC) where.push(orC);
  }
  if (filter.tag) where.push(sql`${patients.tagsJson} ?? ${filter.tag}`);

  const rows = await db
    .select({
      id: patients.id,
      fullName: patients.fullName,
      aliasName: patients.aliasName,
      nationality: patients.nationality,
      dateOfBirth: patients.dateOfBirth,
      sex: patients.sex,
      tags: patients.tagsJson,
      status: patients.status,
      sourceChannel: patients.sourceChannel,
      updatedAt: patients.updatedAt,
    })
    .from(patients)
    .where(and(...where))
    .orderBy(desc(patients.updatedAt))
    .limit(limit);
  return rows;
}

export async function getPatientById(
  organizationId: string,
  patientId: string,
): Promise<{
  patient: typeof patients.$inferSelect;
  history: Array<typeof patientMedicalHistory.$inferSelect>;
} | null> {
  const [p] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.organizationId, organizationId), eq(patients.id, patientId)))
    .limit(1);
  if (!p) return null;
  const history = await db
    .select()
    .from(patientMedicalHistory)
    .where(eq(patientMedicalHistory.patientId, patientId))
    .orderBy(desc(patientMedicalHistory.createdAt));
  return { patient: p, history };
}

export type CreatePatientInput = {
  fullName: string;
  surname?: string;
  givenNames?: string;
  aliasName?: string;
  nationality?: string;
  countryCode?: string;
  locale?: string;
  sex?: 'male' | 'female' | 'other' | 'unknown';
  dateOfBirth?: string;
  passportNumber?: string;
  rrn?: string;
  phone?: string;
  email?: string;
  sourceConversationId?: string;
  sourceChannel?: string;
  tags?: string[];
  extractionJobId?: string;
};

export async function createPatient(
  organizationId: string,
  createdByUserId: string | null,
  input: CreatePatientInput,
): Promise<{ id: string; duplicateOfId?: string }> {
  // Free-trial gate: throws PaywallError if the org has used up its 10-patient
  // quota and hasn't converted to a paid plan. Caller should catch & redirect
  // to /upgrade (UI) or return HTTP 402 (API). Duplicates *don't* consume
  // quota — they still INSERT a separate row today but we early-return below
  // wouldn't help since duplicates are also new rows; we just count them.
  await assertTrialQuotaAvailable(organizationId);

  const phoneHash = input.phone ? hashFingerprint(input.phone) : null;
  const emailHash = input.email ? hashFingerprint(input.email) : null;
  const passportHash = input.passportNumber ? hashFingerprint(input.passportNumber) : null;

  // Soft duplicate detection — same org + matching fingerprint
  const dupWhere: SQL[] = [eq(patients.organizationId, organizationId)];
  const dupOr: SQL[] = [];
  if (phoneHash) dupOr.push(eq(patients.phoneHash, phoneHash));
  if (emailHash) dupOr.push(eq(patients.emailHash, emailHash));
  if (passportHash) dupOr.push(eq(patients.passportHash, passportHash));
  let duplicateOfId: string | undefined;
  if (dupOr.length > 0) {
    const orC = or(...dupOr);
    if (orC) dupWhere.push(orC);
    const [dup] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(...dupWhere))
      .limit(1);
    if (dup) duplicateOfId = dup.id;
  }

  const [phoneEnc, rrnEnc, passportEnc, emailEnc] = await Promise.all([
    input.phone ? encryptPii(input.phone) : Promise.resolve(null),
    input.rrn ? encryptPii(input.rrn) : Promise.resolve(null),
    input.passportNumber ? encryptPii(input.passportNumber) : Promise.resolve(null),
    input.email ? encryptPii(input.email) : Promise.resolve(null),
  ]);

  const portalToken = nanoid(28);

  const [inserted] = await db
    .insert(patients)
    .values({
      organizationId,
      fullName: input.fullName,
      surname: input.surname ?? null,
      givenNames: input.givenNames ?? null,
      aliasName: input.aliasName ?? null,
      nationality: input.nationality ?? null,
      countryCode: input.countryCode ?? null,
      locale: input.locale ?? null,
      sex: input.sex ?? 'unknown',
      dateOfBirth: input.dateOfBirth ?? null,
      passportNumberEncrypted: passportEnc,
      rrnEncrypted: rrnEnc,
      phoneEncrypted: phoneEnc,
      emailEncrypted: emailEnc,
      phoneHash,
      emailHash,
      passportHash,
      sourceConversationId: input.sourceConversationId ?? null,
      sourceChannel: input.sourceChannel ?? null,
      tagsJson: input.tags ?? [],
      patientPortalToken: portalToken,
      createdByUserId,
    })
    .returning({ id: patients.id });

  if (!inserted) throw new Error('patient_insert_failed');

  await db.insert(auditLogs).values({
    organizationId,
    actorUserId: createdByUserId,
    action: 'create',
    entityType: 'patient',
    entityId: inserted.id,
    diff: { source: 'crm', extractionJobId: input.extractionJobId ?? null, duplicateOfId: duplicateOfId ?? null },
  });

  // Burn one trial credit. Idempotent for paid plans (status check inside).
  await incrementTrialUsage(organizationId);

  return { id: inserted.id, duplicateOfId };
}

export async function logPatientView(
  organizationId: string,
  actorUserId: string | null,
  patientId: string,
): Promise<void> {
  await db
    .update(patients)
    .set({ lastViewedAt: new Date(), lastViewedById: actorUserId })
    .where(and(eq(patients.organizationId, organizationId), eq(patients.id, patientId)));
  await db.insert(auditLogs).values({
    organizationId,
    actorUserId,
    action: 'view',
    entityType: 'patient',
    entityId: patientId,
    diff: {},
  });
}

export async function mergePatients(
  organizationId: string,
  actorUserId: string | null,
  primaryId: string,
  duplicateId: string,
): Promise<void> {
  if (primaryId === duplicateId) return;
  await db
    .update(patients)
    .set({ status: 'merged_into', mergedIntoId: primaryId, updatedAt: new Date() })
    .where(and(eq(patients.organizationId, organizationId), eq(patients.id, duplicateId)));
  await db
    .update(patientMedicalHistory)
    .set({ patientId: primaryId })
    .where(eq(patientMedicalHistory.patientId, duplicateId));
  await db.insert(auditLogs).values({
    organizationId,
    actorUserId,
    action: 'update',
    entityType: 'patient',
    entityId: duplicateId,
    diff: { mergedInto: primaryId },
    metadata: { reason: 'merge' },
  });
}
