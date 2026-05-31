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
