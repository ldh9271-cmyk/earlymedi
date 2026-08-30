'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { partnerContracts } from '@/drizzle/schema/contracts';

const schema = z.object({ contractId: z.string().uuid() });

/**
 * 협력업체 측 계약 서명 — partner_signed_at 을 기록한다.
 * 의료기관 콘솔(app/medical/contracts)과 같은 규칙: 양측 서명이
 * 갖춰지면 활성화되고, 활성 계약이 있어야 에이전시 패키지 빌더에
 * 노출·송객이 이뤄진다. RLS contracts_write 가 당사자 조직만
 * 허용하지만, 갱신 조건에도 partner_org_id 를 명시한다.
 */
export async function signContractAction(formData: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  const parsed = schema.safeParse({ contractId: formData.get('contractId') });
  if (!parsed.success) throw new Error('잘못된 요청입니다.');

  await withRls(ctx, async () => {
    const updated = await db
      .update(partnerContracts)
      .set({ partnerSignedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(partnerContracts.id, parsed.data.contractId),
          eq(partnerContracts.partnerOrgId, ctx.orgId),
          isNull(partnerContracts.partnerSignedAt),
          isNull(partnerContracts.terminatedAt),
        ),
      )
      .returning({ id: partnerContracts.id, agencySignedAt: partnerContracts.agencySignedAt });

    if (updated.length === 0) throw new Error('서명할 수 없는 계약입니다.');

    // 양측 서명 완료 → 활성화 (발효일 미설정 시 오늘부터)
    if (updated[0]?.agencySignedAt) {
      await db
        .update(partnerContracts)
        .set({ isActive: true, effectiveFrom: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(partnerContracts.id, parsed.data.contractId),
            eq(partnerContracts.partnerOrgId, ctx.orgId),
            isNull(partnerContracts.effectiveFrom),
          ),
        );
      await db
        .update(partnerContracts)
        .set({ isActive: true, updatedAt: new Date() })
        .where(
          and(
            eq(partnerContracts.id, parsed.data.contractId),
            eq(partnerContracts.partnerOrgId, ctx.orgId),
          ),
        );
    }
  });

  revalidatePath('/partner/contracts');
}
