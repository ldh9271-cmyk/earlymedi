import { NextResponse } from 'next/server';
import { detectLocaleFromAcceptLanguage } from '@/lib/i18n/locales';

export const dynamic = 'force-dynamic';

/**
 * 코드 없는 /r — 추천 링크는 항상 /r/<코드>(app/r/[code]/route.ts)인데, 주소를 잘라 치거나 잘못 적으면
 * 404 가 떴다(2026-10-19). 보여 줄 파트너가 없으니 쿠키 없이 브라우저 언어의 홈으로 보낸다.
 */
export function GET(req: Request): NextResponse {
  const url = new URL(req.url);
  const locale = detectLocaleFromAcceptLanguage(req.headers.get('accept-language'));
  return NextResponse.redirect(new URL(`/${locale}`, url.origin), 302);
}
