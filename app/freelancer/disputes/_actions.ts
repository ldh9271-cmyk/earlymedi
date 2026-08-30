'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { freelancerAffiliations } from '@/drizzle/schema/affiliations';
import { freelancerDisputes } from '@/drizzle/schema/freelancer-disputes';

const CreateSchema = z.object({
  affiliationId: z.string().uuid(),
  category: z.enum(['rate_error', 'missing_case', 'payment_delay', 'other']),
  subjectRef: z.string().trim().max(120).optional(),
  description: z.string().trim().min(10, '사유를 10자 이상 적어 주세요').max(4000),
});

/**
 * 정산 이의 제기 제출 — 소속(affiliation)을 통해 상대 Agency org 를
 * 확정한다. RLS freelancer_disputes_party 가 양 당사자만 허용하지만,
 * affiliation 소유 검증(freelancerOrgId = ctx.orgId)도 명시한다.
 */
export async function createDisputeAction(formData: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['freelancer'] });

  const parsed = CreateSchema.safeParse({
    affiliationId: formData.get('affiliationId'),
    category: formData.get('category'),
    subjectRef: String(formData.get('subjectRef') ?? '').trim() || undefined,
    description: String(formData.get('description') ?? '').trim(),
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요';
    redirect(`/freelancer/disputes?error=${encodeURIComponent(msg)}`);
  }
  const v = parsed.data;

  await withRls(ctx, async () => {
    const [aff] = await db
      .select({ id: freelancerAffiliations.id, agencyOrgId: freelancerAffiliations.agencyOrgId })
      .from(freelancerAffiliations)
      .where(
        and(
          eq(freelancerAffiliations.id, v.affiliationId),
          eq(freelancerAffiliations.freelancerOrgId, ctx.orgId),
        ),
      )
      .limit(1);
    if (!aff) redirect(`/freelancer/disputes?error=${encodeURIComponent('소속 Agency를 찾을 수 없습니다')}`);

    await db.insert(freelancerDisputes).values({
      freelancerOrgId: ctx.orgId,
      agencyOrgId: aff.agencyOrgId,
      affiliationId: aff.id,
      subjectRef: v.subjectRef ?? null,
      category: v.category,
      description: v.description,
      createdByUserId: ctx.userId,
    });
  });

  revalidatePath('/freelancer/disputes');
  redirect('/freelancer/disputes?submitted=1');
}
