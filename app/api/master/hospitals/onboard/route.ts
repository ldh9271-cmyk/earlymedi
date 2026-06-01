import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { organizations } from '@/drizzle/schema/organizations';
import { setActiveOrgCookie } from '@/lib/auth/session-setters';

/**
 * Master entry point into the existing Agency hospital-onboarding wizard.
 *
 *   GET /api/master/hospitals/onboard?agencyOrgId=<uuid>
 *
 * Flow:
 *   1. Verify caller is a master.
 *   2. Verify the target org exists and is account_type='agency'.
 *      (Wizard is Agency-scoped — Medical orgs use a different surface.)
 *   3. Flip the active-org cookie to that Agency so middleware lets the
 *      master pass through /agency/* without an org_memberships row.
 *   4. 302 → /agency/hospitals/onboard.
 *
 * After the wizard finishes, the new hospital row inherits the chosen
 * Agency's organizationId. Master can then return to /master/hospitals
 * to see it in the cross-org list.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.redirect(new URL('/login?next=/master/hospitals', request.url));
  }
  if (!isMasterEmail(auth.user.email ?? null)) {
    return NextResponse.redirect(new URL('/select-org', request.url));
  }

  const agencyOrgId = request.nextUrl.searchParams.get('agencyOrgId');
  if (!agencyOrgId) {
    return NextResponse.redirect(
      new URL('/master/hospitals?error=missing_agency', request.url),
    );
  }

  // Verify target org exists + is an Agency.
  const [row] = await db
    .select({ id: organizations.id, accountType: organizations.accountType })
    .from(organizations)
    .where(eq(organizations.id, agencyOrgId))
    .limit(1);
  if (!row) {
    return NextResponse.redirect(
      new URL('/master/hospitals?error=org_not_found', request.url),
    );
  }
  if (row.accountType !== 'agency') {
    return NextResponse.redirect(
      new URL('/master/hospitals?error=not_an_agency', request.url),
    );
  }

  // Flip the active-org cookie. setActiveOrgCookie writes the auth-grade
  // cookie that middleware reads at every request.
  setActiveOrgCookie(row.id, 'agency');

  return NextResponse.redirect(new URL('/agency/hospitals/onboard', request.url));
}
