export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { appOnboarding } from '@/drizzle/schema/app-onboarding';

/**
 * 안드로이드 앱 첫 실행 설문 수신 — glowuptour-app 의 src/onboarding.ts 가 보낸다.
 *
 * 값은 전부 화이트리스트로 거른다(언어·관심 분야·방문 시기는 정해진 키만). 나라는
 * Vercel 의 x-vercel-ip-country 로 서버가 붙인다. 어떤 경우에도 204 — 설문 저장이
 * 실패해도 앱 시작을 막으면 안 된다(앱 쪽도 결과를 기다리지 않는다).
 */
const LOCALE = /^(kr|en|ja|zh|ru|vi)$/;
const INTERESTS = new Set(['plastic', 'skin', 'dental', 'eye', 'hair', 'checkup', 'oriental', 'beauty', 'travel']);
const VISITS = new Set(['within1m', 'within3m', 'within6m', 'undecided']);
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
    const country = (request.headers.get('x-vercel-ip-country') ?? '').toUpperCase().slice(0, 2) || null;

    await db.insert(appOnboarding).values({
      deviceId: clean(body.deviceId, 64),
      appVersion: clean(body.appVersion, 20),
      platform: 'android',
      locale,
      deviceLang: clean(body.deviceLang, 20),
      interests,
      visit,
      skipped: body.skipped === true,
      country,
    });
  } catch {
    /* 설문 저장 실패는 조용히 */
  }
  return ok;
}
