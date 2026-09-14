export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isPublicLocale } from '@/lib/i18n/locales';
import { runSimulation, SIM_PRESETS } from '@/lib/ai/simulate';
import { logSimulation, refundRun, reserveRun, simWallet } from '@/lib/ai/sim-credits';

/**
 * POST /api/ai/simulate — 사진 + 프리셋 → 편집된 이미지.
 *
 * 로그인 필수(무료 1회·포인트 모두 계정에 붙는다). 비용은 먼저 잡고,
 * 모델이 거부/실패하면 되돌린다. 이미지는 어디에도 저장하지 않는다.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'login_required' }, { status: 401 });

  let body: { image?: string; mimeType?: string; preset?: string; locale?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }
  const preset = body.preset ?? '';
  if (!SIM_PRESETS[preset]) return NextResponse.json({ error: 'bad_preset' }, { status: 400 });
  const image = (body.image ?? '').replace(/^data:[^;]+;base64,/, '');
  const mimeType = body.mimeType && /^image\/(jpeg|png|webp)$/.test(body.mimeType) ? body.mimeType : 'image/jpeg';
  if (!image || image.length < 100) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  if (image.length > 11_000_000) return NextResponse.json({ error: 'too_large' }, { status: 413 });
  const locale = isPublicLocale(body.locale ?? '') ? String(body.locale) : 'kr';

  const hold = await reserveRun(auth.user.id);
  if (!hold) {
    const w = await simWallet(auth.user.id);
    return NextResponse.json({ error: 'insufficient_points', wallet: w }, { status: 402 });
  }

  const out = await runSimulation(image, mimeType, preset);
  if (!out.ok) {
    await refundRun(hold.ledgerId);
    await logSimulation({ userId: auth.user.id, locale, preset, status: out.reason === 'refused' ? 'refused' : 'failed', costPoints: 0, durationMs: out.durationMs });
    return NextResponse.json({ error: out.reason }, { status: out.reason === 'refused' ? 422 : 502 });
  }
  await logSimulation({ userId: auth.user.id, locale, preset, status: 'ok', costPoints: hold.cost, durationMs: out.durationMs });
  const wallet = await simWallet(auth.user.id);
  return NextResponse.json({ image: out.image, mimeType: out.mimeType, cost: hold.cost, wallet });
}
