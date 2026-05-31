import 'server-only';
import type { PublicLocale } from './locales';
import type { Dictionary } from './dictionaries/kr';

/**
 * Server-side dictionary loader. Dynamically imports the matching locale
 * file so the bundle only ships the active language's strings to the
 * client when used via Server Components.
 *
 * Falls back to Korean (the source-of-truth locale) for unknown inputs
 * — this can only happen if a route slipped past the layout's locale
 * validation, so it's primarily a safety net.
 */
const loaders: Record<PublicLocale, () => Promise<{ default: Dictionary }>> = {
  kr: () => import('./dictionaries/kr'),
  en: () => import('./dictionaries/en'),
  zh: () => import('./dictionaries/zh'),
  ja: () => import('./dictionaries/ja'),
};

export async function getDictionary(locale: PublicLocale): Promise<Dictionary> {
  const loader = loaders[locale] ?? loaders.kr;
  const mod = await loader();
  return mod.default;
}
