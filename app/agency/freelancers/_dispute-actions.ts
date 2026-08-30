'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { freelancerDisputes } from '@/drizzle/schema/freelancer-disputes';

/**
 * Agency 측 이의 제기 처리 — 검토 시작 / 해결 / 기각.
 * RLS freelancer_disputes_party 가 당사자만 허용하지만, 갱신 조건에도
 * agency_org_id 를 명시한다. 기각은 사유(회신 메모)가 필수다.
 */
export async function resolveDisputeAction(formData: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const id = String(formData.get('id') ?? '');
  const next = String(formData.get('next') ?? '');
  const note = String(formData.get('note') ?? '').trim().slice(0, 2000);
  if (!id || !['reviewing', 'resolved', 'rejected'].includes(next)) {
    redirect('/agency/freelancers?error=missing_params');
  }
  if (next === 'rejected' && !note) {
    redirect(`/agency/freelancers?error=${encodeURIComponent('기각 시 회신 메모가 필요합니다')}`);
  }

  await withRls(ctx, async () => {
    const updated = await db
      .update(freelancerDisputes)
      .set({
        status: next as 'reviewing' | 'resolved' | 'rejected',
        ...(note ? { resolutionNote: note } : {}),
        ...(next === 'resolved' || next === 'rejected' ? { resolvedAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(freelancerDisputes.id, id), eq(freelancerDisputes.agencyOrgId, ctx.orgId)))
      .returning({ id: freelancerDisputes.id });
    if (updated.length === 0) {
      redirect(`/agency/freelancers?error=${encodeURIComponent('처리할 수 없는 티켓입니다')}`);
    }
  });

  revalidatePath('/agency/freelancers');
  redirect('/agency/freelancers');
}
