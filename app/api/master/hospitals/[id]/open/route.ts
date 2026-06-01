import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { organizations } from '@/drizzle/schema/organizations';
import { setActiveOrgCookie } from '@/lib/auth/session-setters';

/**
 * Master shortcut to open an existing hospital row in its owning
 * Agency's edit page.
 *
 *   GET /api/master/hospitals/<hospitalId>/open
 *
 * Flow: look up the hospital → find its organizationId → flip the
 * active-org cookie to that Agency → redirect to
 * /agency/hospitals/<hospitalId>.
 *
 * Why this exists: from /master/hospitals (cross-org list) the master
 * doesn't know or care which Agency owns each row; they just want to
 * jump into the detail page. This route bridges the gap.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.redirect(new URL('/login?next=/master/hospitals', request.url));
  }
  if (!isMasterEmail(auth.user.email ?? null)) {
    return NextResponse.redirect(new URL('/select-org', request.url));
  }

  const [row] = await db
    .select({
      hospitalId: hospitals.id,
      orgId: hospitals.organizationId,
      accountType: organizations.accountType,
    })
    .from(hospitals)
    .innerJoin(organizations, eq(hospitals.organizationId, organizations.id))
    .where(eq(hospitals.id, params.id))
    .limit(1);
  if (!row) {
    return NextResponse.redirect(
      new URL('/master/hospitals?error=hospital_not_found', request.url),
    );
  }

  setActiveOrgCookie(
    row.orgId,
    row.accountType as 'agency' | 'medical' | 'non_medical' | 'freelancer',
  );

  return NextResponse.redirect(
    new URL(`/agency/hospitals/${row.hospitalId}`, request.url),
  );
}
