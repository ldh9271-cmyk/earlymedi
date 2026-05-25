import 'server-only';
import { aiChat, type callerFromCtx } from './router';
import {
  buildTranslationMessages,
  type ConversationContextMsg,
} from './prompts/translation';

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
    if (
      (code >= 0xac00 && code <= 0xd7af) ||
      (code >= 0x1100 && code <= 0x11ff) ||
      (code >= 0x3130 && code <= 0x318f)
    ) {
      hangul++;
    } else if (
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a)
    ) {
      latin++;
    }
  }
  if (hangul > 0 && hangul >= latin / 3) return 'ko';
  if (latin > 0) return 'en';
  return 'other';
}

export type TranslationContext = {
  /** Recent conversation history, oldest-first. Used to keep terminology
   *  consistent across the thread. */
  history?: ConversationContextMsg[];
  /** Patient metadata so the AI can pick the right honorifics/register. */
  contact?: {
    displayName?: string | null;
    countryCode?: string | null;
    locale?: string | null;
  };
  /** Optional org-defined glossary (medical term → preferred translation). */
  glossarySnippet?: string;
};

/**
 * Translate `text` into `targetLocale` using the AI router (Gemini primary,
 * Claude fallback). Context-aware: when called with `ctx.history`, the
 * prompt includes the last few messages so the model keeps the same
 * vocabulary and tone across turns.
 *
 * Two error modes:
 *   - default: null on failure (best-effort path used by
 *     translateInboundMessage so a Gemini outage never blocks message
 *     persistence)
 *   - throwOnError=true: re-throws so the manual "다시 번역" button can
 *     surface what's actually wrong
 */
export async function translateText(
  caller: Caller,
  text: string,
  targetLocale: 'ko' | 'en',
  sourceLocale?: string,
  options?: { throwOnError?: boolean; ctx?: TranslationContext },
): Promise<string | null> {
  if (!text.trim()) return null;

  const detected = sourceLocale ?? detectLocale(text);
  if (detected === targetLocale) return null;

  const { system, messages } = buildTranslationMessages({
    text,
    sourceLocale: sourceLocale ?? detected,
    targetLocale,
    domain: 'medical',
    conversationContext: options?.ctx?.history,
    contactHint: options?.ctx?.contact,
    glossarySnippet: options?.ctx?.glossarySnippet,
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
 *
 * Pass `ctx.history` (oldest-first) to make the translation consistent
 * with previous turns in the conversation.
 */
export async function translateInboundMessage(
  caller: Caller,
  text: string,
  sourceLocale?: string,
  ctx?: TranslationContext,
): Promise<{ translationKo: string | null; translationEn: string | null; detectedLocale: 'ko' | 'en' | 'other' }> {
  const detected = sourceLocale ? (sourceLocale as 'ko' | 'en' | 'other') : detectLocale(text);

  const [koPromise, enPromise] = [
    detected === 'ko' ? Promise.resolve<string | null>(null) : translateText(caller, text, 'ko', detected, { ctx }),
    detected === 'en' ? Promise.resolve<string | null>(null) : translateText(caller, text, 'en', detected, { ctx }),
  ];

  const [translationKo, translationEn] = await Promise.all([koPromise, enPromise]);
  return { translationKo, translationEn, detectedLocale: detected };
}
