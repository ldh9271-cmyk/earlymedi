import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { referralPartners } from '@/drizzle/schema/referral-program';
import { getPartnerByCode, REF_JOIN_COOKIE } from '@/lib/referral/service';
import { refCookieOptions, setRefCookie } from '@/lib/referral/cookie';
import { isPublicLocale } from '@/lib/i18n/locales';

export const dynamic = 'force-dynamic';

/** 모바일 브라우저 판별 — 데스크톱은 랜딩 없이 바로 홈. */
const MOBILE_UA = /Android|iPhone|iPad|iPod/i;
/** 앱 WebView — App.tsx 가 UA 끝에 `GlowUpTourApp/<ver> (Android|iOS)` 를 붙인다. */
const APP_UA = /GlowUpTourApp/;

/**
 * 추천 QR·링크 랜딩 — glowuptour.com/r/JP7K2M9Q
 *
 * 코드를 쿠키에 12개월 보관하고(lib/referral/cookie.ts, 최초 접촉 우선) 파트너의 기본 로케일 홈으로
 * 보낸다. 실제 귀속은 이 쿠키를 가진 사람이 가입/예약할 때 서버가 기록한다.
 *
 * 모바일 브라우저(앱 아님)로 온 고객 링크는 홈 대신 짧은 랜딩(/[locale]/r/[code])으로 보낸다 —
 * '앱 설치'(Play 는 설치 리퍼러 ref=<코드>, iOS 는 NEXT_PUBLIC_IOS_APP_URL 이 있을 때) 또는
 * '웹에서 바로 시작'(?go=web → 이 라우트 → 홈). 앱 WebView 는 브라우저와 쿠키를 공유하지 않으므로
 * 'QR → 앱 설치 → 앱에서 가입' 순서면 앱이 설치 리퍼러·온보딩 추천 코드로 이 주소를 ?app=1 로 다시
 * 열어 WebView 안에 쿠키를 심는다 (glowuptour-app App.tsx · src/referral.ts).
 *
 *   ?l=<locale>  랜딩 언어 지정 (앱은 사용자가 고른 언어로 연다)
 *   ?go=web      랜딩의 '웹에서 바로 시작' — 랜딩 없이 홈
 *   ?app=1       앱 WebView 가 쿠키를 심으러 여는 경우 — 랜딩 없이 홈 (UA 로도 판별)
 *   ?join=1      추천인 초대(파트너 코드만 유효) — 가입 후 /me/referral 에서 참여 버튼이 뜬다
 */
export async function GET(req: Request, { params }: { params: { code: string } }): Promise<NextResponse> {
  const url = new URL(req.url);
  const code = (params.code ?? '').toUpperCase();
  const partner = await getPartnerByCode(code);
  const wantLocale = url.searchParams.get('l');
  const locale = wantLocale && isPublicLocale(wantLocale)
    ? wantLocale
    : (partner && isPublicLocale(partner.landingLocale) ? partner.landingLocale : 'en');
  // 추천인 초대(join)는 파트너 코드에서만 유효 — 추천인의 코드에 ?join=1 이
  // 붙어 와도 고객 링크로 취급한다 (파트너 → 추천인 → 고객, 2단계 고정).
  const join = url.searchParams.get('join') === '1' && partner?.role === 'distributor';

  if (!partner) {
    // 모르는 코드 — 그냥 홈으로, 쿠키 없이
    return NextResponse.redirect(new URL(`/${locale}`, url.origin), 302);
  }

  const ua = req.headers.get('user-agent') ?? '';
  const fromApp = url.searchParams.get('app') === '1' || APP_UA.test(ua);
  const goWeb = url.searchParams.get('go') === 'web';
  const showLanding = !join && !fromApp && !goWeb && MOBILE_UA.test(ua);

  // 클릭 집계 — 랜딩에서 돌아오는 두 번째 홉(go=web)과 앱이 쿠키를 심으러 여는 호출(app=1)은
  // 같은 스캔이므로 세지 않는다.
  if (!goWeb && !fromApp) {
    await db
      .update(referralPartners)
      .set({ clicks: sql`${referralPartners.clicks} + 1` })
      .where(eq(referralPartners.id, partner.id))
      .catch(() => undefined);
  }

  const target = new URL(
    join ? `/${locale}/me/referral` : showLanding ? `/${locale}/r/${partner.code}` : `/${locale}`,
    url.origin,
  );
  const res = NextResponse.redirect(target, 302);
  // 최초 접촉 우선 — 이미 다른 코드 쿠키가 있으면 덮어쓰지 않는다
  setRefCookie(res, req, partner.code, url);
  const cookieBase = refCookieOptions(url);
  if (join) res.cookies.set(REF_JOIN_COOKIE, partner.code, { ...cookieBase, maxAge: 60 * 60 * 24 * 30 });
  // 고객 링크(join 없음)로 왔으면 이전에 남은 초대 쿠키를 지운다 — 같은 기기에서 초대 링크를 먼저
  // 열어 본 뒤 고객 QR 을 쓰면 /me/referral 에 '추천인으로 참여' 폼이 떠서 고객이 추천인으로
  // 등록되는 것처럼 보였다 (2026-10-06). 마지막에 연 링크의 의도를 따른다.
  else res.cookies.set(REF_JOIN_COOKIE, '', { ...cookieBase, maxAge: 0 });
  return res;
}
