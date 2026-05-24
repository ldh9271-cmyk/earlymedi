import 'server-only';
import { aiChat, type callerFromCtx } from './router';
import { buildTranslationMessages } from './prompts/translation';

type Caller = ReturnType<typeof callerFromCtx>;

/**
 * Detect whether a text is likely Korean by counting Hangul characters.
 * Fast, deterministic, no API call. Returns the more probable BCP-47
 * locale tag (ko / en / other) without committing to non-Korean specifics.
 */
export function detectLocale(text: string): 'ko' | 'en' | 'other' {
  if (!text) return 'other';
  let hangul = 0;
  let latin = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Hangul syllables block (AC00-D7AF) + Hangul Jamo (1100-11FF) + Compat (3130-318F)
    if (
      (code >= 0xac00 && code <= 0xd7af) ||
      (code >= 0x1100 && code <= 0x11ff) ||
      (code >= 0x3130 && code <= 0x318f)
    ) {
      hangul++;
    } else if (
      (code >= 0x41 && code <= 0x5a) || // A-Z
      (code >= 0x61 && code <= 0x7a) // a-z
    ) {
      latin++;
    }
  }
  if (hangul > 0 && hangul >= latin / 3) return 'ko';
  if (latin > 0) return 'en';
  return 'other';
}

/**
 * Translate `text` into `targetLocale` using the AI router (Gemini primary,
 * Claude fallback). Auto-detects source locale when `sourceLocale` is omitted.
 *
 * Two return modes via the `throwOnError` flag:
 *   - false (default): null on failure (best-effort path used by
 *     translateInboundMessage so a Gemini outage never blocks message
 *     persistence)
 *   - true: re-throws the underlying provider error, so the manual
 *     "다시 번역" button can show what's actually wrong (model not
 *     found, key invalid, quota, etc.)
 */
export async function translateText(
  caller: Caller,
  text: string,
  targetLocale: 'ko' | 'en',
  sourceLocale?: string,
  options?: { throwOnError?: boolean },
): Promise<string | null> {
  if (!text.trim()) return null;

  // Skip work if source and target are the same language already.
  const detected = sourceLocale ?? detectLocale(text);
  if (detected === targetLocale) return null;

  const { system, messages } = buildTranslationMessages({
    text,
    sourceLocale: sourceLocale ?? detected,
    targetLocale,
    domain: 'medical',
  });

  try {
    const res = await aiChat(caller, 'translate', {
      system,
      messages,
      temperature: 0.2,
      maxTokens: Math.min(2000, Math.ceil(text.length * 3)),
    });
    const out = res.text.trim();
    return out || null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[translate] failed:', err instanceof Error ? err.message : err);
    if (options?.throwOnError) throw err;
    return null;
  }
}

/**
 * Translate an inbound message into BOTH Korean (for staff) and English
 * (for non-Korean staff) when those aren't already the source language.
 * Returns whichever fields were filled — pass them straight to the
 * messages.translationKo / translationEn columns.
 */
export async function translateInboundMessage(
  caller: Caller,
  text: string,
  sourceLocale?: string,
): Promise<{ translationKo: string | null; translationEn: string | null; detectedLocale: 'ko' | 'en' | 'other' }> {
  const detected = sourceLocale ? (sourceLocale as 'ko' | 'en' | 'other') : detectLocale(text);

  // Parallel translation for the languages we *don't* already have.
  const [koPromise, enPromise] = [
    detected === 'ko' ? Promise.resolve<string | null>(null) : translateText(caller, text, 'ko', detected),
    detected === 'en' ? Promise.resolve<string | null>(null) : translateText(caller, text, 'en', detected),
  ];

  const [translationKo, translationEn] = await Promise.all([koPromise, enPromise]);
  return { translationKo, translationEn, detectedLocale: detected };
}
