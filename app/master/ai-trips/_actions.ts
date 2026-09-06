'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { aiTripPlans } from '@/drizzle/schema/ai-trip-plans';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { issueTripQuote } from '@/lib/ai/trip-workflow';

/** AI 여행 일정 — 마스터 전용: 검증 메모·최종 일정·견적 금액을 입력해 인보이스를 발행한다. */

async function assertMaster(): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  if (!isMasterEmail(auth.user.email ?? '')) redirect('/select-org');
}

export async function issueQuoteAction(formData: FormData): Promise<void> {
  await assertMaster();
  const planId = String(formData.get('planId') ?? '');
  const quoteWon = Math.round(Number(String(formData.get('quoteWon') ?? '').replace(/[^0-9.]/g, '')) || 0);
  const quoteNote = String(formData.get('quoteNote') ?? '').trim().slice(0, 2000);
  const verifiedPlanMd = String(formData.get('verifiedPlanMd') ?? '').trim().slice(0, 20000);
  if (!planId) redirect('/master/ai-trips?error=missing_id');
  if (!Number.isFinite(quoteWon) || quoteWon <= 0) redirect(`/master/ai-trips?plan=${planId}&error=${encodeURIComponent('견적 금액(원)을 입력해 주세요')}`);
  const r = await issueTripQuote({ planId, quoteWon, quoteNote, verifiedPlanMd });
  if (!r.ok) redirect(`/master/ai-trips?plan=${planId}&error=${encodeURIComponent(r.error)}`);
  revalidatePath('/master/ai-trips');
  redirect(`/master/ai-trips?plan=${planId}&ok=${encodeURIComponent(`견적 발행 완료 · ${r.invoiceNo}`)}`);
}

export async function cancelPlanAction(formData: FormData): Promise<void> {
  await assertMaster();
  const planId = String(formData.get('planId') ?? '');
  if (!planId) redirect('/master/ai-trips?error=missing_id');
  try {
    const [plan] = await db.select({ orderId: aiTripPlans.orderId, status: aiTripPlans.status }).from(aiTripPlans).where(eq(aiTripPlans.id, planId)).limit(1);
    if (plan?.orderId && plan.status !== 'paid') {
      await db.update(checkoutOrders).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(checkoutOrders.id, plan.orderId));
    }
    await db.update(aiTripPlans).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(aiTripPlans.id, planId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'cancel_failed';
    if (msg.includes('NEXT_REDIRECT')) throw err;
    redirect(`/master/ai-trips?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath('/master/ai-trips');
  redirect('/master/ai-trips');
}
