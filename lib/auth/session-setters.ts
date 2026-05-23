import 'server-only';
import { cookies } from 'next/headers';
import { ACTIVE_ORG_COOKIE } from './active-org';
import type { AccountType } from './account-types';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 90, // 90 days
};

/**
 * Server-action helper: persist the active org cookie after login or
 * org-switch. Format: `<orgId>:<accountType>`.
 */
export function setActiveOrgCookie(orgId: string, accountType: AccountType): void {
  cookies().set(ACTIVE_ORG_COOKIE, `${orgId}:${accountType}`, COOKIE_OPTIONS);
}

export function clearActiveOrgCookie(): void {
  cookies().delete(ACTIVE_ORG_COOKIE);
}
