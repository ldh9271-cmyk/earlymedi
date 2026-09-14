export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isPublicLocale } from '@/lib/i18n/locales';
import { runSimulation, SIM_GROUP_RECS, SIM_PRESETS } from '@/lib/ai/simulate';
import { fetchFeaturedListings } from '@/lib/listings/query';
import { localizeKoLabel } from '@/lib/i18n/ko-label';
import type { PublicLocale } from '@/lib/i18n/locales';
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
  // 확인되지 않은 이메일 계정은 무료 1회를 못 쓴다 — 일회용 메일로 가입을 반복해 무료 실행(건당 비용)을 긁는 걸 막는다
  if (!auth.user.email_confirmed_at && !auth.user.phone_confirmed_at) return NextResponse.json({ error: 'confirm_email' }, { status: 403 });

  let body: { image?: string; mimeType?: string; preset?: string; locale?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }
  const preset = body.preset ?? '';
  const presetDef = SIM_PRESETS[preset];
  if (!presetDef) return NextResponse.json({ error: 'bad_preset' }, { status: 400 });
  const image = (body.image ?? '').replace(/^data:[^;]+;base64,/, '');
  const mimeType = body.mimeType && /^image\/(jpeg|png|webp)$/.test(body.mimeType) ? body.mimeType : 'image/jpeg';
  if (!image || image.length < 100) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  if (image.length > 11_000_000) return NextResponse.json({ error: 'too_large' }, { status: 413 });
  const locale: PublicLocale = isPublicLocale(body.locale ?? '') ? (body.locale as PublicLocale) : 'kr';

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
  // 결과 옆에 "이 스타일 잘하는 샵" — 시뮬레이션을 예약 유입으로 잇는다 (얼굴 분석 추천과 같은 모양)
  const rec = SIM_GROUP_RECS[presetDef.group];
  const [wallet, shops] = await Promise.all([
    simWallet(auth.user.id),
    fetchFeaturedListings({ locale, categories: rec.categories, limit: 4 }).catch(() => []),
  ]);
  const recs = shops.map((l) => ({
    title: l.title, href: `/${locale}/listings/${l.slug}`, img: l.coverImageUrl,
    promo: l.promoLabel ? localizeKoLabel(l.promoLabel, locale) : null,
  }));
  return NextResponse.json({ image: out.image, mimeType: out.mimeType, cost: hold.cost, wallet, recs, landingHref: `/${locale}/glowup/pc/c/${rec.landing}` });
}
