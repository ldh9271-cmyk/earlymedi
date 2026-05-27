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
/** Normalize a BCP-47 tag to its base language tag for equality checks
 *  ('zh' / 'zh-CN' / 'zh-Hans' all become 'zh'). */
function baseTag(loc: string): string {
  return loc.split(/[-_]/)[0]?.toLowerCase() ?? loc.toLowerCase();
}

/**
 * Lightweight character-distribution language detector. Counts the
 * Unicode blocks present in `text` and returns the dominant language
 * code. Used to label inbound messages before persisting so the inbox
 * shows the right "AI 번역 · ZH → KO" chip and the AI translator can
 * route the source through the correct prompt.
 *
 * Detection order (specificity beats raw count):
 *   - Hangul block → 'ko'  (Korean)
 *   - Cyrillic block → 'ru'  (Russian; covers Belarusian/Ukrainian etc.)
 *   - Hiragana/Katakana → 'ja'  (Japanese; kana never appears in pure Chinese)
 *   - CJK Han only (no kana) → 'zh'  (Chinese; Japanese kanji-only is rare)
 *   - Latin → 'en'
 *   - empty/unclassifiable → 'other'
 *
 * Why specificity-first instead of pure count: a Japanese sentence often
 * has more Han characters than kana, but the presence of even one kana
 * char is a strong Japanese signal. Same idea for Hangul (single Korean
 * particle in a mostly-English sentence still indicates Korean intent).
 */
export function detectLocale(text: string): 'ko' | 'en' | 'zh' | 'ja' | 'ru' | 'other' {
  if (!text) return 'other';
  let hangul = 0;
  let latin = 0;
  let cyrillic = 0;
  let kana = 0;
  let han = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (
      (code >= 0xac00 && code <= 0xd7af) || // Hangul Syllables
      (code >= 0x1100 && code <= 0x11ff) || // Hangul Jamo
      (code >= 0x3130 && code <= 0x318f) // Hangul Compatibility Jamo
    ) {
      hangul++;
    } else if (
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a)
    ) {
      latin++;
    } else if (
      (code >= 0x0400 && code <= 0x04ff) || // Cyrillic
      (code >= 0x0500 && code <= 0x052f) // Cyrillic Supplement
    ) {
      cyrillic++;
    } else if (
      (code >= 0x3040 && code <= 0x309f) || // Hiragana
      (code >= 0x30a0 && code <= 0x30ff) // Katakana
    ) {
      kana++;
    } else if (
      (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs (Hanzi/Kanji/Hanja)
      (code >= 0x3400 && code <= 0x4dbf) // CJK Extension A
    ) {
      han++;
    }
  }
  // Specificity ordering — kana and cyrillic are unique to one
  // language, so they win immediately when present.
  if (kana > 0) return 'ja';
  if (cyrillic > 0) return 'ru';

  // Korean vs Chinese disambiguation — both can have Han characters,
  // but Korean is overwhelmingly Hangul with occasional Hanja, while
  // Chinese sometimes quotes Korean words (e.g. "(또는 = 或者)").
  // For 'ko' to win we need BOTH:
  //   (a) hangul outnumbers han  — kills the case where a single
  //       Korean word is quoted inside a long Chinese sentence
  //   (b) hangul is substantial vs latin (latin / 3 floor) — kills the
  //       case where one Korean character appears in a long English
  //       sentence
  if (hangul > 0 && hangul > han && hangul >= latin / 3) return 'ko';

  if (han > 0) return 'zh';
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
 * `targetLocale` accepts any BCP-47 base or region tag — 'ko', 'en',
 * 'zh', 'zh-CN', 'ja', 'ru', etc. — and Gemini handles the rendering.
 * It was previously typed `'ko' | 'en'`, which silently funneled every
 * non-Korean patient (Chinese / Japanese / Russian) into English on the
 * outbound auto-translate path. Now the patient's contactLocale flows
 * through unchanged.
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
  targetLocale: string,
  sourceLocale?: string,
  options?: { throwOnError?: boolean; ctx?: TranslationContext },
): Promise<string | null> {
  if (!text.trim()) return null;

  const detected = sourceLocale ?? detectLocale(text);
  // Compare base tags so 'zh' / 'zh-CN' / 'zh-Hans' are treated as the
  // same language and we don't waste an API call re-translating to
  // itself. detectLocale returns only 'ko' | 'en' | 'other', so for
  // exotic source languages the 'other' side never collides.
  if (baseTag(detected) === baseTag(targetLocale)) return null;

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
      // Always generous — translations were being truncated to "안녕하세요"
      // when the source was a short non-Latin string (Chinese / Russian)
      // because the old formula `text.length * 3` underestimated how
      // many Korean tokens are needed. A short Chinese sentence costs
      // ~10 input tokens but a faithful Korean rendering can be 60+
      // tokens. Cap at 4096 to stay well within Gemini's free-tier
      // per-request output limit while giving the model plenty of headroom.
      maxTokens: 4096,
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
): Promise<{
  translationKo: string | null;
  translationEn: string | null;
  detectedLocale: 'ko' | 'en' | 'zh' | 'ja' | 'ru' | 'other';
}> {
  // Normalize caller-provided source locale into the same enum that
  // detectLocale returns. Anything outside the known set falls back
  // to auto-detection so a mislabeled message still gets routed
  // correctly (the Kakao webhook used to hardcode 'ko' for every
  // incoming message — Chinese inquiries got marked as Korean and
  // skipped translation entirely).
  const known = ['ko', 'en', 'zh', 'ja', 'ru', 'other'] as const;
  type Known = (typeof known)[number];
  const normalized = sourceLocale
    ? (known.includes(sourceLocale.toLowerCase() as Known)
        ? (sourceLocale.toLowerCase() as Known)
        : null)
    : null;
  const detected = normalized ?? detectLocale(text);

  // Skip ko→ko / en→en — every other source language still gets
  // translated into BOTH Korean (for Korean staff) and English (for
  // English-speaking staff). For 'other' we still do both: AI gets
  // sourceLocale='other' and figures it out from the actual content.
  const [koPromise, enPromise] = [
    detected === 'ko' ? Promise.resolve<string | null>(null) : translateText(caller, text, 'ko', detected, { ctx }),
    detected === 'en' ? Promise.resolve<string | null>(null) : translateText(caller, text, 'en', detected, { ctx }),
  ];

  const [translationKo, translationEn] = await Promise.all([koPromise, enPromise]);
  return { translationKo, translationEn, detectedLocale: detected };
}
