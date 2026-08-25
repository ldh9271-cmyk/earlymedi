import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { attributeUser, REF_COOKIE } from '@/lib/referral/service';

export const dynamic = 'force-dynamic';

/**
 * 로그인·가입 직후 클라이언트가 호출하는 귀속 기록 엔드포인트.
 *
 * 총판 QR(/r/CODE)로 들어와 쿠키를 가진 사람이 로그인하는 순간 그 총판
 * 소속 회원으로 영구 귀속된다 (최초 접촉 우선 — 이미 귀속된 계정은
 * 바뀌지 않는다). /me·결제에서도 같은 기록을 하므로 이 라우트는 놓친
 * 경로를 메우는 안전망이다.
 */
export async function POST(): Promise<NextResponse> {
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ ok: false, reason: 'no_session' }, { status: 401 });
    const code = cookies().get(REF_COOKIE)?.value;
    if (!code) return NextResponse.json({ ok: true, attributed: false });
    const partner = await attributeUser(data.user.id, code, 'login');
    return NextResponse.json({ ok: true, attributed: !!partner });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
