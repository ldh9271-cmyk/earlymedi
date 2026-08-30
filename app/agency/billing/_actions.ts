'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { billingAccounts } from '@/drizzle/schema/billing';
import { auditLogs } from '@/drizzle/schema/audit';

/** 청구 연락처(담당자·이메일·세금계산서 수신) 업데이트. */
const ContactSchema = z.object({
  billingName: z.string().max(120).optional().nullable(),
  billingEmail: z.string().email('유효한 이메일을 입력해 주세요').max(255).optional().nullable(),
  taxInvoiceEmail: z
    .string()
    .email('유효한 이메일을 입력해 주세요')
    .max(255)
    .optional()
    .nullable()
    .or(z.literal('')),
});

export async function updateBillingContactAction(
  raw: z.infer<typeof ContactSchema>,
): Promise<void> {
  // 청구 연락처는 계정 유형과 무관한 조직 공통 설정 — medical 콘솔(잔액·사용량)도 이 액션을 공유한다.
  const ctx = await requireAccess({ allowedAccountTypes: ['agency', 'medical'] });
  const input = ContactSchema.parse(raw);

  await withRls(ctx, async () => {
    await db
      .update(billingAccounts)
      .set({
        billingName: input.billingName?.trim() || null,
        billingEmail: input.billingEmail?.trim() || null,
        taxInvoiceEmail: input.taxInvoiceEmail?.trim() || null,
        updatedAt: new Date(),
      })
      .where(and(eq(billingAccounts.organizationId, ctx.orgId)));

    await db.insert(auditLogs).values({
      organizationId: ctx.orgId,
      actorUserId: ctx.userId,
      action: 'update',
      entityType: 'billing_account',
      entityId: ctx.orgId,
      diff: {
        billingName: input.billingName ?? null,
        billingEmail: input.billingEmail ?? null,
        taxInvoiceEmail: input.taxInvoiceEmail ?? null,
      },
    });
  });

  revalidatePath('/agency/billing');
}
