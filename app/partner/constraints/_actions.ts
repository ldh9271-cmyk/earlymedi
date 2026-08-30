'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { partnerFacilities } from '@/drizzle/schema/partner-facilities';
import { partnerServices } from '@/drizzle/schema/partner-services';

/**
 * 시술 후 제약 태그 저장.
 *
 * 키는 에이전시 시술 카탈로그(procedures_catalog.constraints_json)의
 * avoidSauna/avoidUv/avoidAlcohol/avoidIntenseExercise 와 짝을 맞춘
 * sauna | uv | alcohol | intense_exercise — 같은 어휘를 쓰면 회복 기간
 * 중인 게스트의 패키지 구성에서 시술 제약과 시설·서비스 태그를 바로
 * 대조할 수 있다. attributes.postOpAvoid 에 콤마 문자열로 저장한다.
 *
 * partner_services / partner_facilities 는 RLS 가 없으므로
 * organizationId 조건이 필수다.
 */

// 'use server' 파일은 async 함수만 export 가능 — 라벨 맵은 page.tsx 쪽에 둔다.
const CONSTRAINT_KEYS = ['sauna', 'uv', 'alcohol', 'intense_exercise'] as const;

export async function setPostOpConstraintsAction(formData: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  const kind = String(formData.get('kind') ?? '');
  const id = String(formData.get('id') ?? '');
  const keys = formData
    .getAll('avoid')
    .map(String)
    .filter((k): k is (typeof CONSTRAINT_KEYS)[number] =>
      (CONSTRAINT_KEYS as readonly string[]).includes(k),
    );
  if (!id || (kind !== 'facility' && kind !== 'service')) {
    redirect('/partner/constraints?error=missing_params');
  }

  const table = kind === 'facility' ? partnerFacilities : partnerServices;
  await withRls(ctx, async () => {
    const [row] = await db
      .select({ id: table.id, attributes: table.attributes })
      .from(table)
      .where(and(eq(table.id, id), eq(table.organizationId, ctx.orgId)))
      .limit(1);
    if (!row) redirect('/partner/constraints?error=not_found');

    const attributes = { ...(row.attributes ?? {}) } as Record<string, string | number | boolean>;
    if (keys.length > 0) attributes.postOpAvoid = keys.join(',');
    else delete attributes.postOpAvoid;

    await db
      .update(table)
      .set({ attributes, updatedAt: new Date() })
      .where(and(eq(table.id, id), eq(table.organizationId, ctx.orgId)));
  });

  revalidatePath('/partner/constraints');
  redirect('/partner/constraints');
}
