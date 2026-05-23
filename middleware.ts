import type { NextRequest } from 'next/server';
import { fiveStepAuth } from '@/lib/auth/middleware';

export default async function middleware(request: NextRequest) {
  return await fiveStepAuth(request);
}

export const config = {
  matcher: [
    // Run middleware on every path except next internals + public assets.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
};
