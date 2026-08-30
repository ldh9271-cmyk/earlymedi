'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { visaRequests } from '@/drizzle/schema/visa';

/**
 * 비자·여행 서류 — 유치업체 콘솔 액션.
 *
 * 우리는 비자를 발급하지 않는다. 병원 초청장 준비 → 재외공관 접수 →
 * 심사 결과까지의 "상태"를 기록·관리할 뿐이다 (visa.ts 스키마 주석 참조).
 * 모든 조회·변경은 RLS(visa_requests_isolation, org 격리) 안에서 이뤄진다.
 */

const CreateSchema = z.object({
  patientId: z.string().uuid(),
  category: z.enum(['C_3_3', 'G_1_10', 'C_3_9', 'E_6', 'other']),
  inviterHospitalId: z.string().uuid().optional(),
  consulateCountryCode: z.string().trim().max(2).toUpperCase().optional(),
  consulateCity: z.string().trim().max(80).optional(),
  intendedEntryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  intendedExitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().trim().max(2000).optional(),
});

function back(error?: string): never {
  redirect(error ? `/agency/visa?error=${encodeURIComponent(error)}` : '/agency/visa');
}

export async function createVisaRequestAction(formData: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });

  const raw = Object.fromEntries(
    ['patientId', 'category', 'inviterHospitalId', 'consulateCountryCode', 'consulateCity', 'intendedEntryDate', 'intendedExitDate', 'notes']
      .map((k) => [k, String(formData.get(k) ?? '').trim()])
      .filter(([, v]) => v !== ''),
  );
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) back('입력값을 확인해 주세요 (환자·비자 종류는 필수)');
  const v = parsed.data;

  let durationDays: number | null = null;
  if (v.intendedEntryDate && v.intendedExitDate) {
    const days = Math.round(
      (Date.parse(v.intendedExitDate) - Date.parse(v.intendedEntryDate)) / 86_400_000,
    );
    if (days < 0) back('출국 예정일이 입국 예정일보다 빠릅니다');
    durationDays = days;
  }

  await withRls(ctx, () =>
    db.insert(visaRequests).values({
      organizationId: ctx.orgId,
      patientId: v.patientId,
      inviterHospitalId: v.inviterHospitalId ?? null,
      category: v.category,
      consulateCountryCode: v.consulateCountryCode ?? null,
      consulateCity: v.consulateCity ?? null,
      intendedEntryDate: v.intendedEntryDate ?? null,
      intendedExitDate: v.intendedExitDate ?? null,
      durationDays,
      notes: v.notes ?? null,
      createdByUserId: ctx.userId,
    }),
  );

  revalidatePath('/agency/visa');
  back();
}

/** 허용 상태 전이 — 그 외 조합은 거부. */
const TRANSITIONS: Record<string, string[]> = {
  drafting: ['invitation_issued', 'cancelled'],
  invitation_issued: ['submitted', 'cancelled'],
  submitted: ['approved', 'rejected', 'cancelled'],
};

export async function updateVisaStatusAction(formData: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const id = String(formData.get('id') ?? '');
  const next = String(formData.get('next') ?? '');
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 500);
  if (!id || !next) back('missing_params');

  await withRls(ctx, async () => {
    const [row] = await db
      .select({ id: visaRequests.id, status: visaRequests.status })
      .from(visaRequests)
      .where(and(eq(visaRequests.id, id), eq(visaRequests.organizationId, ctx.orgId)))
      .limit(1);
    if (!row) back('요청을 찾을 수 없습니다');
    if (!(TRANSITIONS[row.status] ?? []).includes(next)) {
      back(`현재 상태(${row.status})에서 전환할 수 없습니다`);
    }

    await db
      .update(visaRequests)
      .set({
        status: next as typeof row.status,
        ...(next === 'submitted' ? { submittedAt: new Date() } : {}),
        ...(next === 'approved' || next === 'rejected'
          ? { decisionAt: new Date(), decisionReason: reason || null }
          : {}),
        ...(next === 'cancelled' && reason ? { decisionReason: reason } : {}),
        updatedAt: new Date(),
      })
      .where(eq(visaRequests.id, row.id));
  });

  revalidatePath('/agency/visa');
  back();
}
