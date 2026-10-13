export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse, type NextRequest } from 'next/server';
import { checkPushReceipts } from '@/lib/push/receipts';

/**
 * Vercel Cron (15분) — Expo 푸시 영수증 확인 → 죽은 토큰 정리.
 * 발송 때 받은 ok 티켓(push_tickets)을 1분~24시간 사이에 getReceipts 로 조회해
 * DeviceNotRegistered 토큰을 push_tokens 에서 지우고, 24시간 지난 티켓·90일 안 보인 토큰을 정리한다.
 * 인증: Vercel 이 CRON_SECRET 을 Bearer 로 보낸다 (registry-details 와 동일).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const result = await checkPushReceipts();
    return NextResponse.json(result);
  } catch (err) {
    // 테이블 미적용(drizzle/sql/push-tickets.sql) 등
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 });
  }
}
