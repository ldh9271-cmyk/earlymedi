/**
 * The 4 actors of the EarlyMedi system.
 * Every authenticated request must resolve to one of these via active org.
 */

export const ACCOUNT_TYPES = ['agency', 'freelancer', 'medical', 'non_medical'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * URL-path prefix per account_type. The 5-step middleware compares the
 * request path against this map. Mismatch → 403.
 */
export const ACCOUNT_TYPE_TO_PREFIX: Record<AccountType, string> = {
  agency: '/agency',
  freelancer: '/freelancer',
  medical: '/medical',
  non_medical: '/partner',
};

export const PREFIX_TO_ACCOUNT_TYPE: Record<string, AccountType> = {
  '/agency': 'agency',
  '/freelancer': 'freelancer',
  '/medical': 'medical',
  '/partner': 'non_medical',
};

/** All paths under /agency, /freelancer, /medical, /partner are gated. */
export const GATED_PREFIXES = Object.keys(PREFIX_TO_ACCOUNT_TYPE);

/** Paths that bypass the gated layer (always public or auth-flow only). */
export const PUBLIC_PREFIXES = [
  '/',
  '/login',
  '/signup',
  '/select-org',
  '/master', // master account control panel — does its own auth check inside
  '/account', // password reset / profile pages — public so reset emails work even without an active-org cookie
  '/invite',
  '/verify-email',
  '/api/auth',
  // 외부 메신저(Kakao i 오픈빌더, WeChat OA, LINE 등)가 우리 webhook을
  // 호출할 때는 Supabase 세션 쿠키가 없으므로 미들웨어 인증을 우회해야
  // 함. 각 webhook 라우트는 자체적으로 channel id + signature 검증으로
  // 보호된다. 이 한 줄을 빼먹으면 Kakao 스킬 테스트가 401 UNAUTHORIZED를
  // 반환하면서 봇이 작동하지 않는다.
  '/api/webhooks',
  '/pricing',
  '/about',
  '/legal',
  '/showroom', // design preview routes (Supabase 없이도 컴포넌트 가시화)
  '/_next',
  '/favicon.ico',
];

export function isAccountType(value: string): value is AccountType {
  return (ACCOUNT_TYPES as readonly string[]).includes(value);
}

export function prefixForAccountType(t: AccountType): string {
  return ACCOUNT_TYPE_TO_PREFIX[t];
}

export function accountTypeForPath(pathname: string): AccountType | null {
  for (const [prefix, type] of Object.entries(PREFIX_TO_ACCOUNT_TYPE)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return type;
    }
  }
  return null;
}

/** Brand-friendly Korean labels for UI. */
export const ACCOUNT_TYPE_LABEL_KO: Record<AccountType, string> = {
  agency: '유치업체',
  freelancer: '프리랜서',
  medical: '의료기관',
  non_medical: '파트너업체',
};

export const ACCOUNT_TYPE_LABEL_EN: Record<AccountType, string> = {
  agency: 'Agency',
  freelancer: 'Freelancer',
  medical: 'Medical',
  non_medical: 'Non-medical Partner',
};

/** Brand accent color per category — used by sidebar / chips. */
export const ACCOUNT_TYPE_COLOR: Record<AccountType, 'brand' | 'hospitality' | 'care' | 'slate'> = {
  agency: 'brand', // Indigo 600
  freelancer: 'hospitality', // Amber 500
  medical: 'care', // Emerald 500
  non_medical: 'slate', // neutral
};
