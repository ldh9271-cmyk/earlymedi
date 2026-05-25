import 'server-only';
import { google } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';
import type { AiProvider, ChatRequest } from '../types';
import { AiProviderError } from '../types';

// Default to gemini-2.5-flash — currently the newest GA model on the
// free-tier Gemini API. gemini-2.0-flash-001 was deprecated for new
// users in May 2026 (Google: "This model is no longer available to
// new users. Please update your code to use a newer model").
// Override with AI_PRIMARY_MODEL=gemini-2.5-pro once the org's billing
// is enabled in the GCP project that issued the key.
const MODEL_CHAT = process.env.AI_PRIMARY_MODEL ?? 'gemini-2.5-flash';
const MODEL_VISION = process.env.AI_VISION_MODEL ?? MODEL_CHAT;

// gemini-2.5-flash defaults to "thinking" mode — the model burns
// internal-reasoning tokens BEFORE producing visible output, and those
// thinking tokens count against maxTokens. For our use cases
// (translation + 5-tone reply suggestions) we don't need chain-of-
// thought reasoning, and leaving thinking on means a 384-token budget
// gets eaten by thinking with only ~30 tokens left for the actual
// response — that's why suggestions were getting cut mid-sentence
// ("…한국에서 코 성형에 관심을"). Setting thinkingBudget: 0 disables
// thinking and gives the model the full budget for the visible answer.
// Set AI_GEMINI_THINKING_BUDGET=-1 to restore dynamic thinking, or to
// a positive integer to cap it manually.
const THINKING_BUDGET = (() => {
  const raw = process.env.AI_GEMINI_THINKING_BUDGET;
  if (raw === undefined || raw === '') return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
})();

const PROVIDER_OPTIONS = {
  google: {
    thinkingConfig: { thinkingBudget: THINKING_BUDGET },
  },
} as const;

function mapMessages(req: ChatRequest): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const out: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
  if (req.system) out.push({ role: 'system', content: req.system });
  for (const m of req.messages) out.push({ role: m.role, content: m.content });
  return out;
}

export const geminiProvider: AiProvider = {
  key: 'gemini',
  chatModel: MODEL_CHAT,
  visionModel: MODEL_VISION,

  async chat(req, opts) {
    try {
      const result = await generateText({
        model: google(MODEL_CHAT),
        messages: mapMessages(req),
        temperature: req.temperature,
        maxTokens: req.maxTokens,
        abortSignal: opts?.signal,
        providerOptions: PROVIDER_OPTIONS,
      });
      return {
        text: result.text,
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
        finishReason: normalize(result.finishReason),
        raw: result,
      };
    } catch (e) {
      throw classify(e);
    }
  },

  async *chatStream(req, opts) {
    try {
      const result = streamText({
        model: google(MODEL_CHAT),
        messages: mapMessages(req),
        temperature: req.temperature,
        maxTokens: req.maxTokens,
        abortSignal: opts?.signal,
        providerOptions: PROVIDER_OPTIONS,
      });
      for await (const chunk of result.textStream) {
        yield chunk;
      }
    } catch (e) {
      throw classify(e);
    }
  },

  async vision(req, opts) {
    try {
      // The AI SDK's `generateText` natively supports image parts via content array.
      const messages = req.messages.map((m) => ({
        role: m.role,
        content: m.content.map((p) => {
          if (p.type === 'text') return { type: 'text' as const, text: p.text };
          return {
            type: 'image' as const,
            image: p.isUrl ? p.data : Buffer.from(p.data, 'base64'),
            mimeType: p.mimeType,
          };
        }),
      }));
      const result = await generateText({
        model: google(MODEL_VISION),
        // @ts-expect-error AI SDK content union covers image parts
        messages,
        temperature: req.temperature ?? 0,
        maxTokens: req.maxTokens,
        abortSignal: opts?.signal,
        providerOptions: PROVIDER_OPTIONS,
      });
      return {
        text: result.text,
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
        finishReason: normalize(result.finishReason),
        raw: result,
      };
    } catch (e) {
      throw classify(e);
    }
  },
};

function normalize(
  reason: string | undefined,
): 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error' {
  switch (reason) {
    case 'stop':
    case 'length':
    case 'tool_calls':
    case 'content_filter':
      return reason;
    default:
      return 'stop';
  }
}

function classify(err: unknown): AiProviderError {
  const msg = err instanceof Error ? err.message : String(err);
  if (/rate.?limit|quota|429/i.test(msg)) return new AiProviderError('gemini', 'rate_limited', msg, err);
  if (/unauth|forbidden|api[_ ]?key|401|403/i.test(msg)) return new AiProviderError('gemini', 'auth', msg, err);
  if (/timeout|unavailable|503|502/i.test(msg)) return new AiProviderError('gemini', 'unavailable', msg, err);
  return new AiProviderError('gemini', 'unknown', msg, err);
}
