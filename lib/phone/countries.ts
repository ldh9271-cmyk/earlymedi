/**
 * 국가 코드 + 국제전화 번호 앞자리.
 *
 * 가입 폼과 왓츠앱 OTP 로그인이 같은 목록을 쓴다 — 한쪽만 늘어나면
 * "가입할 땐 있던 나라가 로그인할 땐 없다"는 이상한 상황이 생긴다.
 * 가장 자주 오는 송출국 위주이고, 'OTHER'는 자유 입력을 대체하지 않고
 * "기타"로 분류만 한다(에이전시 쪽에서 후속 보완).
 */
export type PhoneCountry = { code: string; name: string; dial: string };

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: 'KR', name: 'Korea (한국)', dial: '+82' },
  { code: 'CN', name: 'China (中国)', dial: '+86' },
  { code: 'JP', name: 'Japan (日本)', dial: '+81' },
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'RU', name: 'Russia (Россия)', dial: '+7' },
  { code: 'VN', name: 'Vietnam (Việt Nam)', dial: '+84' },
  { code: 'TH', name: 'Thailand (ไทย)', dial: '+66' },
  { code: 'MY', name: 'Malaysia', dial: '+60' },
  { code: 'ID', name: 'Indonesia', dial: '+62' },
  { code: 'PH', name: 'Philippines', dial: '+63' },
  { code: 'SG', name: 'Singapore', dial: '+65' },
  { code: 'TW', name: 'Taiwan (台灣)', dial: '+886' },
  { code: 'HK', name: 'Hong Kong', dial: '+852' },
  { code: 'AE', name: 'UAE', dial: '+971' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { code: 'KZ', name: 'Kazakhstan', dial: '+7' },
  { code: 'MN', name: 'Mongolia', dial: '+976' },
  { code: 'IN', name: 'India', dial: '+91' },
  { code: 'AU', name: 'Australia', dial: '+61' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'OTHER', name: 'Other / 기타', dial: '' },
];

/**
 * 사용자가 친 번호를 E.164 로 바로잡는다.
 *
 *   '010-1234-5678' + KR → '+821012345678'   (앞의 0 은 국내용이라 뗀다)
 *   '+81 90 1234 5678'   → '+819012345678'   (이미 + 로 시작하면 국가 선택 무시)
 *
 * 왓츠앱·SMS 게이트웨이는 E.164 가 아니면 그냥 실패하고, 실패 사유도
 * 친절하지 않아서 여기서 미리 맞춰 보낸다.
 */
export function toE164(raw: string, dial: string): string | null {
  const trimmed = raw.replace(/[\s()\-.]/g, '');
  if (!trimmed) return null;
  if (trimmed.startsWith('+')) {
    return /^\+[1-9]\d{6,14}$/.test(trimmed) ? trimmed : null;
  }
  if (!dial) return null;
  const local = trimmed.replace(/^0+/, '');
  if (!/^\d{6,14}$/.test(local)) return null;
  const e164 = `${dial}${local}`;
  return /^\+[1-9]\d{6,14}$/.test(e164) ? e164 : null;
}
