export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { pageViews } from '@/drizzle/schema/page-views';

/**
 * 방문 비콘 수신 — components/shared/track-view.tsx 가 보낸다.
 *
 * 나라는 클라이언트를 믿지 않고 Vercel 이 붙여 주는 x-vercel-ip-country 로
 * 정한다. 봇·크롤러는 UA 로 걸러서 통계를 부풀리지 않게 한다.
 * 어떤 경우에도 204 — 통계 때문에 화면이 오류를 보면 안 된다.
 */
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python-requests|axios/i;
const LOCALE_PATH = /^\/(kr|en|zh|ja|ru|vi)(\/[A-Za-z0-9._~\-/%]*)?$/;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ok = new NextResponse(null, { status: 204 });
  try {
    const ua = request.headers.get('user-agent') ?? '';
    if (!ua || BOT.test(ua)) return ok;

    const raw = await request.text();
    if (raw.length > 2000) return ok;
    const body = JSON.parse(raw) as { path?: unknown; locale?: unknown; ref?: unknown; sid?: unknown; entry?: unknown };

    const path = typeof body.path === 'string' ? (body.path.split('?')[0] ?? '').slice(0, 300) : '';
    if (!LOCALE_PATH.test(path)) return ok;

    const country = (request.headers.get('x-vercel-ip-country') ?? '').toUpperCase().slice(0, 2) || null;
    const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop';
    const sessionId = typeof body.sid === 'string' ? body.sid.slice(0, 64) : null;
    const referrerHost = typeof body.ref === 'string' ? body.ref.toLowerCase().slice(0, 120) : null;
    const locale = typeof body.locale === 'string' && /^(kr|en|zh|ja|ru|vi)$/.test(body.locale) ? body.locale : null;

    await db.insert(pageViews).values({
      path,
      locale,
      country,
      referrerHost,
      device,
      sessionId,
      isEntry: body.entry === true,
    });
  } catch {
    /* 통계 실패는 조용히 */
  }
  return ok;
}
