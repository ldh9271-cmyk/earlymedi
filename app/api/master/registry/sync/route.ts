export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse, type NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { hospitalRegistry } from '@/drizzle/schema/hospital-registry';
import { syncBasisPage, refreshStaleDetails, syncDeptCode } from '@/lib/hospital-registry/hira';
import { syncBeautyPage, syncBeautyRecent } from '@/lib/beauty-registry/localdata';
import { beautyRegistry } from '@/drizzle/schema/beauty-registry';
import { syncLodgingPage, syncLodgingRecent } from '@/lib/lodging-registry/localdata';
import { lodgingRegistry } from '@/drizzle/schema/lodging-registry';
import { syncFoodPage, syncFoodRecent } from '@/lib/food-registry/localdata';
import { foodRegistry } from '@/drizzle/schema/food-registry';
import { syncGalleryPage, syncGalleryRecent } from '@/lib/tour-registry/tourapi';
import { tourSpots } from '@/drizzle/schema/tour-spots';

/**
 * 마스터 전용 — 심평원 병원정보 동기화.
 *
 *  POST { pageNo, clCd?, sidoCd? }  → 한 페이지(1,000건) upsert, done 여부 반환.
 *                                    마스터 화면의 SyncRunner 가 done 까지 반복 호출.
 *  POST { details: true, limit? }   → 상세(진료과목·시간·교통) 오래된 것부터 N건 갱신.
 *  GET                              → 적재 현황.
 */
async function assertMaster(): Promise<NextResponse | null> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !isMasterEmail(auth.user.email ?? '')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return null;
}

export async function GET(): Promise<NextResponse> {
  const denied = await assertMaster();
  if (denied) return denied;
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      hospitalGrade: sql<number>`count(*) filter (where ${hospitalRegistry.clCd} in ('01','11','21','28','29','41','93'))::int`,
      contracted: sql<number>`count(*) filter (where ${hospitalRegistry.contractedHospitalId} is not null or ${hospitalRegistry.claimStatus} = 'approved')::int`,
      foreign: sql<number>`count(*) filter (where ${hospitalRegistry.foreignLicensed})::int`,
      withDetails: sql<number>`count(*) filter (where ${hospitalRegistry.detailsSyncedAt} is not null)::int`,
      lastSync: sql<string | null>`max(${hospitalRegistry.syncedAt})`,
    })
    .from(hospitalRegistry);
  const [beauty] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${beautyRegistry.statusCode} = '01')::int`,
      contracted: sql<number>`count(*) filter (where ${beautyRegistry.contractedListingId} is not null or ${beautyRegistry.claimStatus} = 'approved')::int`,
      lastSync: sql<string | null>`max(${beautyRegistry.syncedAt})`,
    })
    .from(beautyRegistry);
  const [lodging] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${lodgingRegistry.statusCode} = '01')::int`,
      contracted: sql<number>`count(*) filter (where ${lodgingRegistry.contractedListingId} is not null or ${lodgingRegistry.claimStatus} = 'approved')::int`,
      lastSync: sql<string | null>`max(${lodgingRegistry.syncedAt})`,
    })
    .from(lodgingRegistry);
  const [food] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${foodRegistry.statusCode} = '01')::int`,
      contracted: sql<number>`count(*) filter (where ${foodRegistry.contractedListingId} is not null or ${foodRegistry.claimStatus} = 'approved')::int`,
      lastSync: sql<string | null>`max(${foodRegistry.syncedAt})`,
    })
    .from(foodRegistry);
  const [tour] = await db
    .select({ total: sql<number>`count(*)::int`, lastSync: sql<string | null>`max(${tourSpots.syncedAt})` })
    .from(tourSpots);
  return NextResponse.json({ ...row, beauty, lodging, food, tour, hasKey: Boolean(process.env.HIRA_SERVICE_KEY) });
}

import { enrichHotelListingsFromTourApi } from '@/lib/lodging-registry/tourapi-stay';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await assertMaster();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { pageNo?: number; clCd?: string; sidoCd?: string; details?: boolean; limit?: number; deptCode?: string; beautyPage?: number; beautyRecent?: boolean; lodgingPage?: number; lodgingRecent?: boolean; foodPage?: number; foodRecent?: boolean; tourPage?: number; tourRecent?: boolean; hotelMedia?: boolean };
  try {
    if (body.hotelMedia) {
      // 글로우 인증 호텔 게시물 사진·소개 (TourAPI 숙박) — 15건씩, 버튼을 반복해 누르면 이어서 채움
      const r = await enrichHotelListingsFromTourApi(15);
      return NextResponse.json(r);
    }
    if (body.tourRecent) {
      const r = await syncGalleryRecent(5);
      return NextResponse.json(r);
    }
    if (body.tourPage) {
      const r = await syncGalleryPage(Math.max(1, Number(body.tourPage) || 1));
      return NextResponse.json(r);
    }
    if (body.foodRecent) {
      const r = await syncFoodRecent(new Date(Date.now() - 3 * 86_400_000), 20);
      return NextResponse.json(r);
    }
    if (body.foodPage) {
      const r = await syncFoodPage(Math.max(1, Number(body.foodPage) || 1));
      return NextResponse.json(r);
    }
    if (body.lodgingRecent) {
      const r = await syncLodgingRecent(new Date(Date.now() - 3 * 86_400_000), 20);
      return NextResponse.json(r);
    }
    if (body.lodgingPage) {
      const r = await syncLodgingPage(Math.max(1, Number(body.lodgingPage) || 1));
      return NextResponse.json(r);
    }
    if (body.beautyRecent) {
      const r = await syncBeautyRecent(new Date(Date.now() - 3 * 86_400_000), 40);
      return NextResponse.json(r);
    }
    if (body.beautyPage) {
      const r = await syncBeautyPage(Math.max(1, Number(body.beautyPage) || 1));
      return NextResponse.json(r);
    }
    if (body.deptCode) {
      const r = await syncDeptCode(String(body.deptCode).padStart(2, '0'));
      return NextResponse.json(r);
    }
    if (body.details) {
      const n = await refreshStaleDetails(Math.min(Math.max(body.limit ?? 30, 1), 80));
      return NextResponse.json({ refreshed: n });
    }
    const pageNo = Math.max(1, Number(body.pageNo) || 1);
    const result = await syncBasisPage({ pageNo, clCd: body.clCd || undefined, sidoCd: body.sidoCd || undefined });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'sync_failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
