export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { clearActiveOrgCookie } from '@/lib/auth/session-setters';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  clearActiveOrgCookie();
  return NextResponse.redirect(new URL('/login', new URL(request.url).origin));
}
