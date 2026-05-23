import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCOUNT_TYPE_TO_PREFIX,
  PUBLIC_PREFIXES,
  accountTypeForPath,
} from './account-types';
import { createSupabaseMiddlewareClient } from './supabase-middleware';
import { ACTIVE_ORG_COOKIE, ACTIVE_ORG_HEADER } from './active-org-constants';

/**
 * 5-step authorization middleware.
 *
 *  1. Authentication       — Supabase session present?
 *  2. Active-org decision  — pick the org from cookie / URL prefix / default
 *  3. Membership check     — does the user have org_memberships.status='active' there?
 *  4. URL ↔ account_type   — does the URL prefix match this org's account_type?
 *  5. RLS context          — attach x-em-active-org header so server code sets app.current_org_id
 *
 * On failure: redirect (/login or /select-org) for HTML pages,
 * 401/403 JSON for /api/*.
 *
 * NOTE: the middleware does NOT load Drizzle (Edge runtime). It defers
 * membership verification to the Server Component / API guard, but enforces
 * URL ↔ account_type match using a fast cookie attribute set during login.
 *
 * The cookie payload format is:
 *   em.active_org = "<orgId>:<accountType>"
 *
 * This is safe to trust for routing because every login + select-org write
 * refreshes it server-side. Tampering only re-routes the user to a page where
 * the Server Component guard (requireAccess) will redirect them back. Step 5
 * (RLS context) is the authoritative defense — even with a forged cookie, no
 * data can be read without an active membership.
 */
export async function fiveStepAuth(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  // Public paths bypass entirely.
  if (isPublic(pathname)) {
    const { response: getResponse } = createSupabaseMiddlewareClient(request);
    return getResponse();
  }

  const { supabase, response: getResponse } = createSupabaseMiddlewareClient(request);

  // STEP 1: Authentication
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    if (pathname.startsWith('/api/')) {
      return json({ error: 'unauthenticated' }, 401);
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // STEP 2: Active-org decision (from cookie)
  const cookieValue = request.cookies.get(ACTIVE_ORG_COOKIE)?.value ?? '';
  const [orgIdFromCookie, accountTypeFromCookie] = cookieValue.split(':');

  // STEP 4: URL ↔ account_type
  // Parsed first so we can use it as a candidate when no cookie is present.
  const urlAccountType = accountTypeForPath(pathname);

  if (!orgIdFromCookie || !accountTypeFromCookie) {
    // No cookie — funnel through /select-org so the server can populate it.
    if (pathname.startsWith('/api/')) {
      return json({ error: 'no_active_org' }, 403);
    }
    const url = request.nextUrl.clone();
    url.pathname = '/select-org';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // STEP 4: URL prefix must match the cookie's account_type when in a gated area.
  if (urlAccountType && urlAccountType !== accountTypeFromCookie) {
    if (pathname.startsWith('/api/')) {
      return json({ error: 'account_type_mismatch' }, 403);
    }
    const expectedPrefix =
      ACCOUNT_TYPE_TO_PREFIX[accountTypeFromCookie as keyof typeof ACCOUNT_TYPE_TO_PREFIX];
    const url = request.nextUrl.clone();
    url.pathname = expectedPrefix ? `${expectedPrefix}/dashboard` : '/select-org';
    url.searchParams.set('denied', '1');
    return NextResponse.redirect(url);
  }

  // STEP 3 + 5: Membership + RLS context.
  // Drizzle isn't available in Edge runtime, so we punt the SQL membership
  // check to the Server Component guard (requireAccess). The header below is
  // what every server-side handler keys on for `app.current_org_id`.
  const response = getResponse();
  response.headers.set(ACTIVE_ORG_HEADER, orgIdFromCookie);
  response.headers.set('x-em-actor', auth.user.id);
  return response;
}

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(p + '?'),
  );
}

function json(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status });
}
