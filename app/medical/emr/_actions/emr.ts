'use server';

import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { billingAccounts } from '@/drizzle/schema/billing';

const schema = z.object({
  vendor: z.string().min(1).max(120),
  contactName: z.string().max(120).optional(),
  contactPhone: z.string().max(60).optional(),
  memo: z.string().max(1000).optional(),
});

export type EmrRequest = {
  vendor: string;
  contactName?: string;
  contactPhone?: string;
  memo?: string;
  status: 'requested';
  requestedAt: string;
};

/**
 * EMR 연동 신청 접수 — 사용 중인 EMR 벤더와 담당자 정보를 저장한다.
 * organizations 에 범용 metadata 컬럼이 없어, 조직당 1행이고
 * billing_self_write RLS 가 걸린 billing_accounts.metadata 를 조직
 * 운영 설정 저장소로 쓴다 (키: emr). 실제 연동 작업은 접수 후 담당
 * 매니저가 벤더와 일정을 조율해 진행한다.
 */
export async function requestEmrAction(formData: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const parsed = schema.safeParse({
    vendor: formData.get('vendor'),
    contactName: formData.get('contactName') || undefined,
    contactPhone: formData.get('contactPhone') || undefined,
    memo: formData.get('memo') || undefined,
  });
  if (!parsed.success) throw new Error('입력값을 확인해 주세요.');

  const payload: EmrRequest = {
    vendor: parsed.data.vendor.trim(),
    contactName: parsed.data.contactName?.trim() || undefined,
    contactPhone: parsed.data.contactPhone?.trim() || undefined,
    memo: parsed.data.memo?.trim() || undefined,
    status: 'requested',
    requestedAt: new Date().toISOString(),
  };

  await withRls(ctx, async () => {
    const updated = await db
      .update(billingAccounts)
      .set({
        metadata: sql`${billingAccounts.metadata} || ${JSON.stringify({ emr: payload })}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(billingAccounts.organizationId, ctx.orgId))
      .returning({ id: billingAccounts.id });
    if (updated.length === 0) throw new Error('빌링 계정을 찾을 수 없습니다.');
  });

  revalidatePath('/medical/emr');
}
