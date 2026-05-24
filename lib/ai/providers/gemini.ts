import 'server-only';
import { google } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';
import type { AiProvider, ChatRequest } from '../types';
import { AiProviderError } from '../types';

// Default to a model that is GA on the free Gemini API key tier. 2.5-pro
// is paywalled on most projects; flash is fast, free-tier-enabled, and
// more than adequate for translation / classification / chat replies.
// Override with AI_PRIMARY_MODEL=gemini-2.5-pro once the org's billing
// is enabled in the GCP project that issued the key.
const MODEL_CHAT = process.env.AI_PRIMARY_MODEL ?? 'gemini-2.0-flash-001';
const MODEL_VISION = process.env.AI_VISION_MODEL ?? MODEL_CHAT;

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
