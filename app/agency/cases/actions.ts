'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import {
  addCaseEvent,
  assignUser,
  createCase,
  resnapshotPolicy,
  transitionStage,
  unassignUser,
} from '@/lib/db/repositories/cases';

const STAGE = z.enum([
  'scoping',
  'rfq_sent',
  'quoted',
  'accepted',
  'deposit_paid',
  'scheduled',
  'arrived',
  'in_treatment',
  'post_treatment',
  'aftercare',
  'closed_won',
  'closed_lost',
  'closed_cancelled',
]);

const PRIORITY = z.enum(['low', 'normal', 'high', 'urgent']);

const ASSIGNEE_ROLE = z.enum([
  'primary_manager',
  'coordinator',
  'interpreter',
  'driver',
  'observer',
]);

const CreateCaseSchema = z.object({
  patientId: z.string().uuid(),
  title: z.string().min(2).max(200),
  sourceConversationId: z.string().uuid().optional(),
  priority: PRIORITY.optional(),
  targetHospitalIds: z.array(z.string().uuid()).optional(),
  targetProcedureCategories: z.array(z.string()).optional(),
  targetProcedureCodes: z.array(z.string()).optional(),
  estimatedArrivalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  estimatedDepartureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  patientTimezone: z.string().optional(),
  estimatedTotalKrw: z.coerce.number().int().nonnegative().optional(),
  sourceChannel: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function createCaseAction(input: z.infer<typeof CreateCaseSchema>): Promise<{
  id: string;
  caseNumber: string;
}> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const parsed = CreateCaseSchema.parse(input);
  const result = await withRls(ctx, () => createCase(ctx.orgId, ctx.userId, parsed));
  revalidatePath('/agency/cases');
  revalidatePath(`/agency/patients/${parsed.patientId}`);
  return result;
}

export async function transitionStageAction(input: {
  caseId: string;
  toStage: z.infer<typeof STAGE>;
  reason?: string;
}): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const caseId = z.string().uuid().parse(input.caseId);
  const toStage = STAGE.parse(input.toStage);
  const reason = input.reason ? z.string().max(500).parse(input.reason) : undefined;
  await withRls(ctx, () => transitionStage(ctx.orgId, ctx.userId, caseId, toStage, reason));
  revalidatePath('/agency/cases');
  revalidatePath(`/agency/cases/${caseId}`);
}

export async function addCaseNoteAction(input: {
  caseId: string;
  note: string;
}): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const caseId = z.string().uuid().parse(input.caseId);
  const note = z.string().min(1).max(2000).parse(input.note);
  await withRls(ctx, () =>
    addCaseEvent(ctx.orgId, caseId, {
      eventType: 'note_added',
      actorRole: 'agency',
      actorUserId: ctx.userId,
      title: '메모 추가',
      description: note,
    }),
  );
  revalidatePath(`/agency/cases/${caseId}`);
}

export async function assignUserAction(input: {
  caseId: string;
  userId: string;
  role?: z.infer<typeof ASSIGNEE_ROLE>;
}): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const caseId = z.string().uuid().parse(input.caseId);
  const userId = z.string().uuid().parse(input.userId);
  const role = input.role ? ASSIGNEE_ROLE.parse(input.role) : 'primary_manager';
  await withRls(ctx, () => assignUser(ctx.orgId, ctx.userId, caseId, userId, role));
  revalidatePath(`/agency/cases/${caseId}`);
}

export async function unassignUserAction(input: {
  caseId: string;
  userId: string;
  role: z.infer<typeof ASSIGNEE_ROLE>;
}): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const caseId = z.string().uuid().parse(input.caseId);
  const userId = z.string().uuid().parse(input.userId);
  const role = ASSIGNEE_ROLE.parse(input.role);
  await withRls(ctx, () => unassignUser(ctx.orgId, ctx.userId, caseId, userId, role));
  revalidatePath(`/agency/cases/${caseId}`);
}

export async function resnapshotPolicyAction(input: {
  caseId: string;
  reason: string;
}): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const caseId = z.string().uuid().parse(input.caseId);
  const reason = z.string().min(2).max(500).parse(input.reason);
  await withRls(ctx, () => resnapshotPolicy(ctx.orgId, ctx.userId, caseId, reason));
  revalidatePath(`/agency/cases/${caseId}`);
}

/**
 * Form-action entrypoint for the new-case page <form>. Parses FormData,
 * delegates to createCaseAction, then redirects to the detail page.
 */
export async function createCaseFromFormAction(formData: FormData): Promise<void> {
  const raw = {
    patientId: String(formData.get('patientId') ?? ''),
    title: String(formData.get('title') ?? ''),
    priority: (formData.get('priority') as z.infer<typeof PRIORITY> | null) ?? undefined,
    targetHospitalIds: parseCsv(formData.get('targetHospitalIds')),
    targetProcedureCategories: parseCsv(formData.get('targetProcedureCategories')),
    targetProcedureCodes: parseCsv(formData.get('targetProcedureCodes')),
    estimatedArrivalDate: nullable(formData.get('estimatedArrivalDate')),
    estimatedDepartureDate: nullable(formData.get('estimatedDepartureDate')),
    patientTimezone: nullable(formData.get('patientTimezone')),
    estimatedTotalKrw: nullable(formData.get('estimatedTotalKrw')),
    sourceChannel: nullable(formData.get('sourceChannel')),
    tags: parseCsv(formData.get('tags')),
  };
  const parsed = CreateCaseSchema.parse(raw);
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const result = await withRls(ctx, () => createCase(ctx.orgId, ctx.userId, parsed));
  revalidatePath('/agency/cases');
  revalidatePath(`/agency/patients/${parsed.patientId}`);
  redirect(`/agency/cases/${result.id}`);
}

function parseCsv(v: FormDataEntryValue | null): string[] | undefined {
  const s = nullable(v);
  if (!s) return undefined;
  return s
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

function nullable(v: FormDataEntryValue | null): string | undefined {
  if (v === null) return undefined;
  const s = String(v).trim();
  return s.length === 0 ? undefined : s;
}
