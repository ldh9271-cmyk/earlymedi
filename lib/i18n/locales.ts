/**
 * Supported locales for the patient-facing portal at
 * /kr|/en|/zh|/ja|/ru|/vi.
 *
 * Source markets covered: Korea (home), English (US/EU fallback),
 * China, Japan, Russian-speaking CIS (Russia/Kazakhstan/Uzbekistan),
 * Vietnam — the top 6 inbound nationalities for Korean medical
 * tourism. Add new entries here + a dictionary file in `dictionaries/`
 * to expand.
 */
export const PUBLIC_LOCALES = ['kr', 'en', 'zh', 'ja', 'ru', 'vi'] as const;

export type PublicLocale = (typeof PUBLIC_LOCALES)[number];

export const DEFAULT_LOCALE: PublicLocale = 'kr';

export function isPublicLocale(s: string): s is PublicLocale {
  return (PUBLIC_LOCALES as readonly string[]).includes(s);
}

/** Display labels in their native script for the locale switcher. */
export const LOCALE_LABELS: Record<PublicLocale, { native: string; flag: string }> = {
  kr: { native: '한국어',     flag: '🇰🇷' },
  en: { native: 'English',    flag: '🇺🇸' },
  zh: { native: '中文',       flag: '🇨🇳' },
  ja: { native: '日本語',     flag: '🇯🇵' },
  ru: { native: 'Русский',    flag: '🇷🇺' },
  vi: { native: 'Tiếng Việt', flag: '🇻🇳' },
};

/**
 * Map our locale to a BCP-47 tag for proper HTML lang attribute and
 * downstream AI translation calls (Gemini understands either form but
 * the tagged version is more explicit).
 */
export const LOCALE_TO_BCP47: Record<PublicLocale, string> = {
  kr: 'ko-KR',
  en: 'en-US',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ru: 'ru-RU',
  vi: 'vi-VN',
};

/**
 * Hostnames that should treat `/` as a patient-facing entry point and
 * auto-redirect to the best-matching locale prefix. Any other host
 * (earlymedi.vercel.app, localhost, preview deployments) keeps `/`
 * pointing at the existing B2B marketing landing — operators expect
 * that page when they bookmark the platform.
 *
 * When we add more patient-facing brand domains (regional or
 * partnership-specific), append them here — the middleware will
 * pick them up without any other change.
 */
export const PATIENT_DOMAINS: ReadonlySet<string> = new Set([
  'glowuptour.com',
  'www.glowuptour.com',
]);

/**
 * Parse the browser's Accept-Language header and pick the best-matching
 * public locale. Order of preference is the order in PUBLIC_LOCALES so
 * a "kr,en" header still resolves to 'kr'.
 *
 * Pragmatic choices:
 *   - `ko*` → 'kr' (Korean speakers get Korean — overwhelmingly the home market)
 *   - `zh*` → 'zh' (zh-CN, zh-TW, zh-HK all map to Simplified for now)
 *   - `ja*` → 'ja'
 *   - `ru*` / `kk*` / `uz*` → 'ru' (Russian umbrella for CIS markets)
 *   - `vi*` → 'vi'
 *   - everything else (en, de, fr, th, ar, …) → 'en' fallback
 *
 * Falls back to 'en' when the header is missing entirely (bots, SSR).
 * DEFAULT_LOCALE='kr' would surprise foreign visitors landing on
 * glowuptour.com without a language preference.
 */
export function detectLocaleFromAcceptLanguage(header: string | null): PublicLocale {
  if (!header) return 'en';
  // e.g. "ko-KR,ko;q=0.9,en-US;q=0.8" → ["ko-KR", "ko", "en-US"]
  const langs = header
    .toLowerCase()
    .split(',')
    .map((s) => (s.split(';')[0] ?? '').trim())
    .filter(Boolean);
  for (const lang of langs) {
    if (lang.startsWith('ko')) return 'kr';
    if (lang.startsWith('zh')) return 'zh';
    if (lang.startsWith('ja')) return 'ja';
    // CIS markets — Russian umbrella covers Kazakhstan/Uzbekistan too.
    if (lang.startsWith('ru') || lang.startsWith('kk') || lang.startsWith('uz')) return 'ru';
    if (lang.startsWith('vi')) return 'vi';
    if (lang.startsWith('en')) return 'en';
  }
  return 'en';
}
