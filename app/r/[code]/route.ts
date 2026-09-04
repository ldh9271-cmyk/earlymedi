import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { referralPartners } from '@/drizzle/schema/referral-program';
import { getPartnerByCode, REF_COOKIE, REF_COOKIE_MAX_AGE, REF_JOIN_COOKIE } from '@/lib/referral/service';
import { isPublicLocale } from '@/lib/i18n/locales';

export const dynamic = 'force-dynamic';

/**
 * 추천 QR·링크 랜딩 — glowuptour.com/r/JP7K2M9Q
 *
 * 코드를 쿠키에 12개월 보관하고 파트너의 기본 로케일 홈으로 보낸다.
 * 실제 귀속은 이 쿠키를 가진 사람이 가입/예약할 때 서버가 기록한다
 * (최초 접촉 우선). `?join=1` 은 추천인 초대 — 가입 후 /me/referral 에서
 * 참여 버튼이 뜬다.
 */
export async function GET(req: Request, { params }: { params: { code: string } }): Promise<NextResponse> {
  const url = new URL(req.url);
  const code = (params.code ?? '').toUpperCase();
  const partner = await getPartnerByCode(code);
  const wantLocale = url.searchParams.get('l');
  const locale = wantLocale && isPublicLocale(wantLocale)
    ? wantLocale
    : (partner && isPublicLocale(partner.landingLocale) ? partner.landingLocale : 'en');
  // 추천인 초대(join)는 총판 코드에서만 유효 — 추천인의 코드에 ?join=1 이
  // 붙어 와도 고객 링크로 취급한다 (총판 → 추천인 → 고객, 2단계 고정).
  const join = url.searchParams.get('join') === '1' && partner?.role === 'distributor';

  const target = new URL(
    join ? `/${locale}/me/referral` : `/${locale}`,
    url.origin,
  );
  if (!partner) {
    // 모르는 코드 — 그냥 홈으로, 쿠키 없이
    return NextResponse.redirect(new URL(`/${locale}`, url.origin), 302);
  }

  await db
    .update(referralPartners)
    .set({ clicks: sql`${referralPartners.clicks} + 1` })
    .where(eq(referralPartners.id, partner.id))
    .catch(() => undefined);

  const res = NextResponse.redirect(target, 302);
  // www.glowuptour.com 과 glowuptour.com 이 모두 서비스되므로, 호스트 전용
  // 쿠키면 링크는 www 로 눌렀는데 결제는 apex 에서 하는 경우 귀속이 유실된다
  // (2026-09-04 실제 발생). 등록 도메인 전체에 공유되도록 domain 을 지정한다.
  const host = url.hostname;
  const rootDomain = host.split('.').slice(-2).join('.');
  const domain = host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host) ? undefined : `.${rootDomain}`;
  const cookieBase = { path: '/', maxAge: REF_COOKIE_MAX_AGE, sameSite: 'lax' as const, httpOnly: true, secure: url.protocol === 'https:', ...(domain ? { domain } : {}) };
  // 최초 접촉 우선 — 이미 다른 코드 쿠키가 있으면 덮어쓰지 않는다
  const existing = req.headers.get('cookie')?.match(new RegExp(`(?:^|; )${REF_COOKIE}=([^;]+)`))?.[1];
  if (!existing) res.cookies.set(REF_COOKIE, partner.code, cookieBase);
  if (join) res.cookies.set(REF_JOIN_COOKIE, partner.code, { ...cookieBase, maxAge: 60 * 60 * 24 * 30 });
  return res;
}
