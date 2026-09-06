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
  return NextResponse.json({ ...row, beauty, hasKey: Boolean(process.env.HIRA_SERVICE_KEY) });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await assertMaster();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { pageNo?: number; clCd?: string; sidoCd?: string; details?: boolean; limit?: number; deptCode?: string; beautyPage?: number; beautyRecent?: boolean };
  try {
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
