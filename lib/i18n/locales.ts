/**
 * Supported locales for the patient-facing portal at /kr|/en|/zh|/ja.
 *
 * Kept deliberately small — these are the 4 source markets we target for
 * Korean medical tourism (KOIHA's top 5 inbound nationalities minus
 * USA/Russia which we group under EN for now). Add new entries here +
 * a dictionary file in `dictionaries/` to expand.
 */
export const PUBLIC_LOCALES = ['kr', 'en', 'zh', 'ja'] as const;

export type PublicLocale = (typeof PUBLIC_LOCALES)[number];

export const DEFAULT_LOCALE: PublicLocale = 'kr';

export function isPublicLocale(s: string): s is PublicLocale {
  return (PUBLIC_LOCALES as readonly string[]).includes(s);
}

/** Display labels in their native script for the locale switcher. */
export const LOCALE_LABELS: Record<PublicLocale, { native: string; flag: string }> = {
  kr: { native: '한국어', flag: '🇰🇷' },
  en: { native: 'English', flag: '🇺🇸' },
  zh: { native: '中文', flag: '🇨🇳' },
  ja: { native: '日本語', flag: '🇯🇵' },
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
 *   - everything else (en, de, fr, ru, vi, th, ar, …) → 'en' fallback
 *
 * Falls back to DEFAULT_LOCALE when the header is missing entirely
 * (e.g. some bots, server-side requests). We pick 'en' as the actual
 * fallback below since DEFAULT_LOCALE='kr' would surprise foreign
 * visitors landing on glowuptour.com without a language preference.
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
    if (lang.startsWith('en')) return 'en';
  }
  return 'en';
}
