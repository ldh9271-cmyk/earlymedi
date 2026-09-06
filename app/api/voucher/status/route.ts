export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { loadOrderByToken, summarize } from '@/lib/voucher/service';

/** 공개 상태 조회 — 소비자 바우처 화면 폴링용. 개인정보 없이 상태·금액·방문 확인만. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const o = await loadOrderByToken(token);
  if (!o) return NextResponse.json({ error: 'invalid' }, { status: 404 });
  return NextResponse.json(summarize(o, { withPII: false }), { headers: { 'cache-control': 'no-store' } });
}
