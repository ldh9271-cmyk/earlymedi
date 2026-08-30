'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { caseQuotes } from '@/drizzle/schema/case-quotes';
import { hospitals } from '@/drizzle/schema/hospitals';

const replySchema = z.object({
  quoteId: z.string().uuid(),
  totalKrw: z.coerce.number().int().min(0).max(2_000_000_000),
  depositKrw: z.coerce.number().int().min(0).max(2_000_000_000).optional(),
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal('')),
  hospitalNotes: z.string().max(2000).optional(),
});

/**
 * RFQ 회신 — requested/received 상태의 견적 슬롯에 금액·조건을 기록한다.
 * selected/rejected 로 넘어간 슬롯은 에이전시 결정이 끝난 것이라 수정 불가.
 *
 * case_quotes 는 RLS 미적용 테이블 — 우리 조직에 연결된 병원 리스팅의
 * 슬롯인지 서브쿼리로 반드시 스코프한다 (lib/medical/console-queries 참고).
 * 케이스 타임라인(case_events)은 에이전시 스코프 쓰기라 여기서 건드리지
 * 않는다 — 에이전시 화면은 status/receivedAt 변화로 수신을 감지한다.
 */
export async function replyRfqAction(formData: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const parsed = replySchema.safeParse({
    quoteId: formData.get('quoteId'),
    totalKrw: formData.get('totalKrw'),
    depositKrw: formData.get('depositKrw') || undefined,
    validUntil: formData.get('validUntil') || undefined,
    hospitalNotes: formData.get('hospitalNotes') || undefined,
  });
  if (!parsed.success) {
    throw new Error('입력값을 확인해 주세요: ' + parsed.error.issues[0]?.message);
  }
  const input = parsed.data;

  await withRls(ctx, async () => {
    const linked = db
      .select({ id: hospitals.id })
      .from(hospitals)
      .where(eq(hospitals.linkedOrgId, ctx.orgId));

    const updated = await db
      .update(caseQuotes)
      .set({
        status: 'received',
        receivedAt: new Date(),
        totalKrw: input.totalKrw,
        depositKrw: input.depositKrw ?? null,
        validUntil: input.validUntil ? input.validUntil : null,
        hospitalNotes: input.hospitalNotes?.trim() || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(caseQuotes.id, input.quoteId),
          inArray(caseQuotes.hospitalId, linked),
          inArray(caseQuotes.status, ['requested', 'received']),
        ),
      )
      .returning({ id: caseQuotes.id });

    if (updated.length === 0) {
      throw new Error('회신할 수 없는 견적입니다 (이미 확정되었거나 권한이 없습니다).');
    }
  });

  revalidatePath('/medical/rfqs');
}
