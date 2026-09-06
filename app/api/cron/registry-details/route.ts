export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse, type NextRequest } from 'next/server';
import { refreshStaleDetails } from '@/lib/hospital-registry/hira';
import { syncBeautyRecent } from '@/lib/beauty-registry/localdata';
import { syncLodgingRecent } from '@/lib/lodging-registry/localdata';
import { syncFoodRecent } from '@/lib/food-registry/localdata';

/**
 * Vercel Cron — 전국 병원 레지스트리 상세(진료과목·진료시간·교통) 순환 갱신.
 * 매일 새벽 40건씩 오래된 것부터 새로 받는다. 상세 페이지 열람 시에도
 * TTL(14일) 이 지나면 즉시 갱신되므로, 크론은 열람이 적은 병원의 실시간성을
 * 보완하는 역할이다. 인증: Vercel 이 CRON_SECRET 을 Bearer 로 보낸다.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!process.env.HIRA_SERVICE_KEY) return NextResponse.json({ skipped: 'no HIRA_SERVICE_KEY' });
  try {
    const n = await refreshStaleDetails(40);
    // 미용업: 최근 3일 갱신분만 앞 페이지부터 (최근 갱신 순 정렬)
    const beauty = await syncBeautyRecent(new Date(Date.now() - 3 * 86_400_000), 40).catch((e: unknown) => ({ error: e instanceof Error ? e.message : 'beauty_failed' }));
    // 숙박업: 같은 방식 (최근 3일)
    const lodging = await syncLodgingRecent(new Date(Date.now() - 3 * 86_400_000), 20).catch((e: unknown) => ({ error: e instanceof Error ? e.message : 'lodging_failed' }));
    // 일반음식점: 같은 방식 (최근 3일)
    const food = await syncFoodRecent(new Date(Date.now() - 3 * 86_400_000), 20).catch((e: unknown) => ({ error: e instanceof Error ? e.message : 'food_failed' }));
    return NextResponse.json({ refreshed: n, beauty, lodging, food });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 });
  }
}
