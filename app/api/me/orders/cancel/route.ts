export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { requestCancel } from '@/lib/refund/service';

/** 소비자 예약 취소 — POST { orderId, reason? } → { ok, mode: 'cancelled'|'requested', estimate } */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { orderId?: string; reason?: string };
  const orderId = String(body.orderId ?? '');
  if (!/^[0-9a-f-]{36}$/.test(orderId)) return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 });
  const r = await requestCancel(orderId, auth.user.id, body.reason ?? null);
  return NextResponse.json(r, { status: r.ok ? 200 : r.reason === 'forbidden' ? 403 : 400 });
}
