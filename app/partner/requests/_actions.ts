'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAccess } from '@/lib/auth/route-guards';
import { proposePartnerPrice } from '@/lib/stay/request';

/** 호텔 파트너가 예약 문의에 가격을 제안한다 — 마스터가 그 금액으로 견적을 발행한다. */
export async function proposePriceAction(formData: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  const id = String(formData.get('id') ?? '');
  const won = Math.round(Number(String(formData.get('won') ?? '').replace(/[^\d]/g, '')));
  const note = String(formData.get('note') ?? '').trim() || null;
  if (!id) redirect('/partner/requests?error=missing_id');
  const r = await proposePartnerPrice(id, ctx.orgId, won, note);
  if (!r.ok) redirect(`/partner/requests?error=${encodeURIComponent(r.error)}`);
  revalidatePath('/partner/requests');
  redirect('/partner/requests?ok=1');
}
