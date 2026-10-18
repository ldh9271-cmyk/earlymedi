import type { NextRequest } from 'next/server';
import { fiveStepAuth } from '@/lib/auth/middleware';

export default async function middleware(request: NextRequest) {
  return await fiveStepAuth(request);
}

export const config = {
  matcher: [
    // Run middleware on every path except next internals + public assets.
    // opengraph-image: 루트 og:image(app/opengraph-image.tsx)는 로그인 없이 스크래퍼가 받아야 한다 — 미들웨어가 /login 으로 보내지 않게 제외
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|opengraph-image|.*\\..*).*)',
  ],
};
