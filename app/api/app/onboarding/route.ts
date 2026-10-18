export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { appOnboarding } from '@/drizzle/schema/app-onboarding';
import { attributeUser, getPartnerByCode } from '@/lib/referral/service';
import { setRefCookie } from '@/lib/referral/cookie';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';

/**
 * 앱(안드로이드·iOS) 첫 실행 설문 수신 — glowuptour-app 의 src/onboarding.ts 가 보낸다.
 *
 * 값은 전부 화이트리스트로 거른다(언어·관심 분야·방문 시기·연령대는 정해진 키만). 나라는
 * Vercel 의 x-vercel-ip-country 로 서버가 붙인다. 어떤 경우에도 204 — 설문 저장이
 * 실패해도 앱 시작을 막으면 안 된다(앱 쪽도 결과를 기다리지 않는다).
 *
 * refCode(앱 1.3.0+, 선택): 온보딩 '추천 코드' 칸 또는 Play 설치 리퍼러(ref=<코드>)에서 온 값.
 * 유효한 파트너·추천인 코드면 응답 쿠키로 gu_ref 를 심고(최초 접촉 우선 — /r/<code> 와 같은 규칙,
 * lib/referral/cookie.ts), 이미 로그인한 회원이면 그 자리에서 귀속한다(source 'app'). 앱은 이와 별개로
 * WebView 로 /r/<code>?app=1 도 열어 WebView 쿠키에 남긴다 — iOS 는 네이티브 fetch 와 WebView 의
 * 쿠키 저장소가 다르기 때문. 둘 중 먼저 닿는 쪽이 심고, 나머지는 '이미 있음'으로 건너뛴다.
 */
const REF_CODE = /^[A-Z0-9_]{4,16}$/;

async function applyRefCode(request: NextRequest, res: NextResponse, code: string): Promise<void> {
  const partner = await getPartnerByCode(code);
  if (!partner) return;
  setRefCookie(res, request, partner.code);
  const { data } = await createSupabaseServerClient().auth.getUser();
  if (data.user) await attributeUser(data.user.id, partner.code, 'app');
}

const LOCALE = /^(kr|en|ja|zh|ru|vi)$/;
const INTERESTS = new Set(['plastic', 'skin', 'dental', 'eye', 'hair', 'checkup', 'oriental', 'beauty', 'travel']);
const VISITS = new Set(['within1m', 'within3m', 'within6m', 'undecided']);
const AGES = new Set(['20s', '30s', '40s', '50s', '60plus']);
const clean = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ok = new NextResponse(null, { status: 204 });
  try {
    const raw = await request.text();
    if (raw.length > 4000) return ok;
    const body = JSON.parse(raw) as Record<string, unknown>;

    const locale = typeof body.locale === 'string' && LOCALE.test(body.locale) ? body.locale : null;
    const interests = Array.isArray(body.interests)
      ? [...new Set(body.interests.filter((k): k is string => typeof k === 'string' && INTERESTS.has(k)))]
      : [];
    const visit = typeof body.visit === 'string' && VISITS.has(body.visit) ? body.visit : null;
    const age = typeof body.age === 'string' && AGES.has(body.age) ? body.age : null;
    // 플랫폼: 앱 1.1.2 부터 보냄 (ios | android). 없으면 안드로이드(구버전).
    const platform = body.platform === 'ios' ? 'ios' : 'android';
    const country = (request.headers.get('x-vercel-ip-country') ?? '').toUpperCase().slice(0, 2) || null;

    const row = {
      deviceId: clean(body.deviceId, 64),
      appVersion: clean(body.appVersion, 20),
      platform,
      locale,
      deviceLang: clean(body.deviceLang, 20),
      interests,
      visit,
      skipped: body.skipped === true,
      country,
    };
    try {
      await db.insert(appOnboarding).values({ ...row, age });
    } catch {
      // age 컬럼이 아직 없는 DB(drizzle/sql/app-onboarding.sql 미적용)에서도 응답은 잃지 않는다
      await db.insert(appOnboarding).values(row).catch(() => undefined);
    }
    // 추천 코드 — 설문 저장과 독립적으로 처리 (한쪽 실패가 다른 쪽을 막지 않게)
    const refCode = typeof body.refCode === 'string' ? body.refCode.trim().toUpperCase() : '';
    if (REF_CODE.test(refCode)) await applyRefCode(request, ok, refCode).catch(() => undefined);
  } catch {
    /* 설문 저장 실패는 조용히 */
  }
  return ok;
}
