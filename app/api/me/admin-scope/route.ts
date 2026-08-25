import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { getRegionAdmin } from '@/lib/referral/service';

export const dynamic = 'force-dynamic';

/**
 * 로그인한 계정의 관리 권한을 알려준다 (헤더가 "관리자 페이지" 메뉴를
 * 조건부로 띄우기 위함). MASTER_EMAILS 는 서버 전용이라 클라이언트가
 * 직접 판별할 수 없으므로 세션 기준으로 서버가 답한다.
 *
 *   총괄 마스터  → { admin: true, master: true,  href: '/master' }
 *   지역 마스터  → { admin: true, master: false, region, href: '/master/partners' }
 *   그 외        → { admin: false }
 */
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email ?? '';
    if (!email) return NextResponse.json({ admin: false });
    if (isMasterEmail(email)) {
      return NextResponse.json({ admin: true, master: true, href: '/master' });
    }
    const region = await getRegionAdmin(email);
    if (region) {
      return NextResponse.json({ admin: true, master: false, region, href: '/master/partners' });
    }
    return NextResponse.json({ admin: false });
  } catch {
    return NextResponse.json({ admin: false });
  }
}
