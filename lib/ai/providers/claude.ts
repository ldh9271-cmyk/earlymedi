import 'server-only';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, streamText } from 'ai';
import type {
  AiProvider,
  ChatRequest,
  VisionRequest,
} from '../types';
import { AiProviderError } from '../types';

const MODEL_CHAT = process.env.AI_FALLBACK_MODEL ?? 'claude-opus-4-7';
const MODEL_VISION = MODEL_CHAT;

function mapMessages(req: ChatRequest) {
  const out: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
  if (req.system) out.push({ role: 'system', content: req.system });
  for (const m of req.messages) out.push({ role: m.role, content: m.content });
  return out;
}

export const claudeProvider: AiProvider = {
  key: 'claude',
  chatModel: MODEL_CHAT,
  visionModel: MODEL_VISION,

  async chat(req, opts) {
    try {
      const r = await generateText({
        model: anthropic(MODEL_CHAT),
        messages: mapMessages(req),
        temperature: req.temperature,
        maxTokens: req.maxTokens,
        abortSignal: opts?.signal,
      });
      return {
        text: r.text,
        inputTokens: r.usage.promptTokens,
        outputTokens: r.usage.completionTokens,
        finishReason: 'stop',
        raw: r,
      };
    } catch (e) {
      throw classify(e);
    }
  },

  async *chatStream(req, opts) {
    try {
      const r = streamText({
        model: anthropic(MODEL_CHAT),
        messages: mapMessages(req),
        temperature: req.temperature,
        maxTokens: req.maxTokens,
        abortSignal: opts?.signal,
      });
      for await (const chunk of r.textStream) yield chunk;
    } catch (e) {
      throw classify(e);
    }
  },

  async vision(req: VisionRequest, opts) {
    try {
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
      const r = await generateText({
        model: anthropic(MODEL_VISION),
        // @ts-expect-error AI SDK image part
        messages,
        temperature: req.temperature ?? 0,
        maxTokens: req.maxTokens,
        abortSignal: opts?.signal,
      });
      return {
        text: r.text,
        inputTokens: r.usage.promptTokens,
        outputTokens: r.usage.completionTokens,
        finishReason: 'stop',
        raw: r,
      };
    } catch (e) {
      throw classify(e);
    }
  },
};

function classify(err: unknown): AiProviderError {
  const msg = err instanceof Error ? err.message : String(err);
  if (/rate.?limit|429/i.test(msg)) return new AiProviderError('claude', 'rate_limited', msg, err);
  if (/unauth|forbidden|api[_ ]?key|401|403/i.test(msg)) return new AiProviderError('claude', 'auth', msg, err);
  if (/timeout|unavailable|503|502/i.test(msg)) return new AiProviderError('claude', 'unavailable', msg, err);
  return new AiProviderError('claude', 'unknown', msg, err);
}
