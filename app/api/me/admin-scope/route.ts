import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { getPartnerByUserId, getRegionAdminCountries } from '@/lib/referral/service';

export const dynamic = 'force-dynamic';

/**
 * 로그인한 계정의 관리 권한을 알려준다 (헤더가 "관리자 페이지" 메뉴를
 * 조건부로 띄우기 위함). MASTER_EMAILS 는 서버 전용이라 클라이언트가
 * 직접 판별할 수 없으므로 세션 기준으로 서버가 답한다.
 *
 *   총괄 마스터  → { admin: true, master: true,  href: '/master' }
 *   지역 마스터  → { admin: true, master: false, regions, href: '/master/partners' }
 *   파트너 계정  → { admin: false, partner: true, role } — 헤더가 '파트너 화면'(/me/referral) 링크를 띄운다
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
    const regions = await getRegionAdminCountries(email);
    if (regions.length > 0) {
      // region 은 예전 클라이언트 호환용 (첫 국가)
      return NextResponse.json({ admin: true, master: false, regions, region: regions[0], href: '/master/partners' });
    }
    // 파트너(모객 파트너·추천인)로 등록된 계정이면 자기 파트너 화면으로 가는 메뉴를 띄운다
    const uid = data.user?.id;
    const partner = uid ? await getPartnerByUserId(uid).catch(() => null) : null;
    if (partner) return NextResponse.json({ admin: false, partner: true, role: partner.role });
    return NextResponse.json({ admin: false });
  } catch {
    return NextResponse.json({ admin: false });
  }
}
