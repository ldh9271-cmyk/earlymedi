/**
 * AI provider abstraction.
 *
 * Two failure scenarios drive the design:
 *   (a) primary model is rate-limited → automatic fallback.
 *   (b) primary model returns junk JSON → schema validation rejects, fallback retries.
 *
 * Every public AI call (chat / translate / extract / vision) goes through the
 * router (`lib/ai/router.ts`). Each call records a row in `ai_usage_logs`.
 */

export type AiMessageRole = 'system' | 'user' | 'assistant';

export type AiTextMessage = {
  role: AiMessageRole;
  content: string;
};

export type AiVisionPart =
  | { type: 'text'; text: string }
  | { type: 'image'; mimeType: string; data: string /* base64 OR url */; isUrl?: boolean };

export type AiVisionMessage = {
  role: AiMessageRole;
  content: AiVisionPart[];
};

export type ChatRequest = {
  system?: string;
  messages: AiTextMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonSchema?: unknown; // optional zod-derived JSON schema for strict structured output
};

export type ChatResponse = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
  raw?: unknown;
};

export type VisionRequest = {
  system?: string;
  messages: AiVisionMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonSchema?: unknown;
};

export type ProviderKey = 'gemini' | 'claude' | 'openai';

export interface AiProvider {
  readonly key: ProviderKey;
  readonly chatModel: string;
  readonly visionModel: string;
  chat(req: ChatRequest, opts?: { signal?: AbortSignal }): Promise<ChatResponse>;
  /** Stream `chat` as text chunks. */
  chatStream(req: ChatRequest, opts?: { signal?: AbortSignal }): AsyncIterable<string>;
  vision(req: VisionRequest, opts?: { signal?: AbortSignal }): Promise<ChatResponse>;
}

export class AiProviderError extends Error {
  constructor(
    public readonly providerKey: ProviderKey,
    public readonly code: 'rate_limited' | 'unavailable' | 'invalid_response' | 'auth' | 'unknown',
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}
