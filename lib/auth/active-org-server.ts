import 'server-only';
import { cookies, headers } from 'next/headers';
import { ACTIVE_ORG_COOKIE, ACTIVE_ORG_HEADER } from './active-org-constants';

/**
 * 현재 활성 조직 id — 미들웨어가 헤더로 넣어 주지만, PUBLIC_PREFIXES(/scan, /v, /api/voucher …)는
 * 미들웨어가 헤더를 세팅하지 않으므로 쿠키(`orgId:accountType`)에서도 읽는다.
 */
export function activeOrgId(): string {
  const fromHeader = headers().get(ACTIVE_ORG_HEADER);
  if (fromHeader) return fromHeader;
  const raw = cookies().get(ACTIVE_ORG_COOKIE)?.value ?? '';
  return raw.split(':')[0] ?? '';
}
