import 'server-only';
import type { ChatMessage } from '@/drizzle/schema/chat';
import { geminiProvider } from '@/lib/ai/providers/gemini';
import { buildTranslationMessages, type ConversationContextMsg } from '@/lib/ai/prompts/translation';
import { detectLocale } from '@/lib/ai/translation';

/**
 * 글로우업 채팅 자동 번역 — 통합 인박스와 같은 원칙(원문 보존 + 번역문 별도 저장)을 3자 채팅에 적용 (2026-10-13).
 *
 *  방 언어(chat_rooms.locale)가 한국어가 아니면
 *   고객 글        body = 원문(고객 언어), body_ko = 한국어 번역 → 상담원·업체 콘솔은 body_ko 를 본다
 *   상담원·업체 글 body = 고객 언어로 번역(고객에게는 이것만 전달), body_ko = 한국어 원문
 *  번역은 Gemini 를 직접 부른다(lib/ai/router 는 조직 단위 사용량 로그가 필수라 조직 없는 플랫폼 채팅에 못 씀).
 *  실패·8초 초과면 null → 호출자는 원문 그대로 저장한다. 번역 때문에 메시지가 막히는 일은 없다.
 */
export const CHAT_LOCALE_TAG: Record<string, string> = { kr: 'ko', en: 'en', zh: 'zh', ja: 'ja', ru: 'ru', vi: 'vi' };
export const CHAT_LANG_LABEL: Record<string, string> = { ko: '한국어', en: '영어', zh: '중국어', ja: '일본어', ru: '러시아어', vi: '베트남어', other: '기타' };

/** 방 locale(kr/en/…) → 번역 언어 태그. 모르는 값은 한국어(번역 안 함) */
export function chatTargetTag(locale: string): string {
  return CHAT_LOCALE_TAG[locale] ?? 'ko';
}
export function chatLangLabel(tag: string | null | undefined): string {
  return tag ? (CHAT_LANG_LABEL[tag.split(/[-_]/)[0]?.toLowerCase() ?? tag] ?? tag) : '';
}
const base = (t: string): string => t.split(/[-_]/)[0]?.toLowerCase() ?? t.toLowerCase();

/** 최근 메시지(오래된 순) → 번역 프롬프트의 맥락. 고객 글은 환자(inbound), 나머지는 상담사(outbound) */
export function chatHistoryContext(msgs: ChatMessage[]): ConversationContextMsg[] {
  return msgs
    .filter((m) => m.senderRole !== 'system')
    .map((m) => m.senderRole === 'consumer'
      ? { direction: 'inbound' as const, body: m.body, bodyLocale: m.bodyLang, translationKo: m.bodyKo }
      : { direction: 'outbound' as const, body: m.bodyKo ?? m.body, bodyLocale: m.bodyKo ? 'ko' : m.bodyLang });
}

/**
 * text 를 target 언어로. 이미 그 언어거나(문자 분포로 판정), 글자가 없는 글(이모지만)이면 null.
 * 결과가 원문과 같아도 null — 호출자가 "번역됨" 표시를 잘못 붙이지 않게.
 */
export async function translateChatText(
  text: string,
  target: string,
  opts?: { history?: ConversationContextMsg[]; contact?: { displayName?: string | null; locale?: string | null } },
): Promise<string | null> {
  const t = text.trim();
  if (!t || !/\p{L}/u.test(t)) return null;
  const src = detectLocale(t);
  if (base(src) === base(target)) return null;
  const { system, messages } = buildTranslationMessages({
    text: t, sourceLocale: src, targetLocale: target, domain: 'travel',
    conversationContext: opts?.history?.slice(-6), contactHint: opts?.contact,
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await geminiProvider.chat({ system, messages, temperature: 0.2, maxTokens: 2048 }, { signal: ctrl.signal });
    const out = res.text.trim();
    return out && out !== t ? out : null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[chat-translate] failed:', e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
