import type { NextResponse } from 'next/server';
import { REF_COOKIE, REF_COOKIE_MAX_AGE } from './service';

/**
 * 추천 쿠키(gu_ref) 공통 규칙 — /r/<code> 랜딩(app/r/[code]/route.ts)과 앱 온보딩 API
 * (app/api/app/onboarding/route.ts)가 같은 옵션·같은 '최초 접촉 우선' 규칙으로 심는다.
 */
export type RefCookieOptions = {
  path: '/';
  maxAge: number;
  sameSite: 'lax';
  httpOnly: true;
  secure: boolean;
  domain?: string;
};

/**
 * www.glowuptour.com 과 glowuptour.com 이 모두 서비스되므로, 호스트 전용 쿠키면 링크는 www 로
 * 눌렀는데 결제는 apex 에서 하는 경우 귀속이 유실된다 (2026-09-04 실제 발생). 등록 도메인 전체에
 * 공유되도록 domain 을 지정한다. localhost·IP 는 domain 없이.
 */
export function refCookieOptions(url: URL): RefCookieOptions {
  const host = url.hostname;
  const rootDomain = host.split('.').slice(-2).join('.');
  const domain = host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host) ? undefined : `.${rootDomain}`;
  return {
    path: '/',
    maxAge: REF_COOKIE_MAX_AGE,
    sameSite: 'lax',
    httpOnly: true,
    secure: url.protocol === 'https:',
    ...(domain ? { domain } : {}),
  };
}

/** 요청에 이미 실려 온 gu_ref 값 — 최초 접촉 우선 판단용. */
export function existingRefCode(req: Request): string | undefined {
  return req.headers.get('cookie')?.match(new RegExp(`(?:^|; )${REF_COOKIE}=([^;]+)`))?.[1];
}

/**
 * gu_ref 를 심는다 — 최초 접촉 우선: 이미 다른 코드 쿠키가 있으면 덮어쓰지 않는다.
 * 돌려주는 값은 실제로 심었는지.
 */
export function setRefCookie(res: NextResponse, req: Request, code: string, url: URL = new URL(req.url)): boolean {
  if (existingRefCode(req)) return false;
  res.cookies.set(REF_COOKIE, code, refCookieOptions(url));
  return true;
}
