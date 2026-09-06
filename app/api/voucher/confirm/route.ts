export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { loadOrderByToken, summarize } from '@/lib/voucher/service';
import { consumerRespond } from '@/lib/voucher/settlement';

/**
 * 소비자 금액 확인/이의 (3자 검증 3단계) — 주문 소유자만.
 * POST { token, action: 'confirm' | 'dispute', note? } → { ok, summary } | { ok:false, reason }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { token?: string; action?: string; note?: string };
  const token = String(body.token ?? '').trim();
  const action = body.action === 'dispute' ? 'dispute' : body.action === 'confirm' ? 'confirm' : null;
  if (!token || !action) return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 });
  const o = await loadOrderByToken(token);
  if (!o) return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 404 });
  const r = await consumerRespond(o, auth.user.id, action, body.note ?? null);
  if (!r.ok) return NextResponse.json(r, { status: r.reason === 'forbidden' ? 403 : 400 });
  const fresh = (await loadOrderByToken(token)) ?? o;
  return NextResponse.json({ ok: true, summary: summarize(fresh, { withPII: true }) });
}
