export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { createSimCreditOrder, simWallet } from '@/lib/ai/sim-credits';
import { tossConfigured } from '@/lib/payments/toss';

/** GET — 내 지갑(잔액·무료 횟수·가격표). 비로그인이면 가격표만. */
export async function GET(): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    const w = await simWallet('00000000-0000-0000-0000-000000000000');
    return NextResponse.json({ loggedIn: false, wallet: { ...w, balance: 0 } });
  }
  return NextResponse.json({ loggedIn: true, wallet: await simWallet(auth.user.id) });
}

/** POST {pack} — 충전 팩 인보이스 발행 → 클라이언트가 토스 결제창을 연다. */
export async function POST(req: Request): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email) return NextResponse.json({ error: 'login_required' }, { status: 401 });
  if (!tossConfigured()) return NextResponse.json({ error: 'payments_not_configured' }, { status: 503 });
  let body: { pack?: string; locale?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }
  const order = await createSimCreditOrder({ packKey: body.pack ?? '', userId: auth.user.id, userEmail: auth.user.email, locale: body.locale ?? 'kr' });
  if (!order) return NextResponse.json({ error: 'bad_pack' }, { status: 400 });
  return NextResponse.json(order);
}
