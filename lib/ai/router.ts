import 'server-only';
import { geminiProvider } from './providers/gemini';
import { claudeProvider } from './providers/claude';
import { logAiUsage, type UsageLogInput } from './usage-logger';
import type {
  AiProvider,
  ChatRequest,
  ChatResponse,
  VisionRequest,
  ProviderKey,
} from './types';
import { AiProviderError } from './types';

const PRIMARY: AiProvider = geminiProvider;
const FALLBACK: AiProvider = claudeProvider;

type Caller = {
  organizationId: string;
  actorUserId: string | null;
  entityType?: string;
  entityId?: string;
};

/** Build a Caller from a RouteContext-shaped object. Bridges the
 *  auth layer's `{ orgId, userId }` to the AI layer's `{ organizationId, actorUserId }`. */
export function callerFromCtx(
  ctx: { orgId: string; userId: string | null },
  bound?: { entityType?: string; entityId?: string },
): Caller {
  return {
    organizationId: ctx.orgId,
    actorUserId: ctx.userId,
    entityType: bound?.entityType,
    entityId: bound?.entityId,
  };
}

const FALLBACK_CODES = new Set(['rate_limited', 'unavailable', 'invalid_response']);

async function withFallback<T>(
  caller: Caller,
  kind: UsageLogInput['kind'],
  call: (p: AiProvider) => Promise<{ text: string; inputTokens: number; outputTokens: number; raw?: unknown }>,
  visionImages = 0,
): Promise<T & ChatResponse> {
  const started = Date.now();
  try {
    const res = await call(PRIMARY);
    await logAiUsage({
      organizationId: caller.organizationId,
      actorUserId: caller.actorUserId,
      kind,
      provider: PRIMARY.key,
      model: PRIMARY.chatModel,
      entityType: caller.entityType,
      entityId: caller.entityId,
      inputTokens: res.inputTokens,
      outputTokens: res.outputTokens,
      visionImages,
      latencyMs: Date.now() - started,
    });
    return { finishReason: 'stop', ...res } as T & ChatResponse;
  } catch (e) {
    // Only attempt fallback when (a) it's a recoverable error code AND
    // (b) a Claude key is actually configured. Otherwise the Claude SDK
    // raises an "Anthropic API key is missing" that masks the real
    // (Gemini) failure the operator needs to fix.
    const fallbackKeyPresent = !!process.env.ANTHROPIC_API_KEY;
    if (e instanceof AiProviderError && FALLBACK_CODES.has(e.code) && fallbackKeyPresent) {
      const fbStarted = Date.now();
      try {
        const res = await call(FALLBACK);
        await logAiUsage({
          organizationId: caller.organizationId,
          actorUserId: caller.actorUserId,
          kind,
          provider: FALLBACK.key,
          model: FALLBACK.chatModel,
          entityType: caller.entityType,
          entityId: caller.entityId,
          inputTokens: res.inputTokens,
          outputTokens: res.outputTokens,
          visionImages,
          latencyMs: Date.now() - fbStarted,
          isFallback: true,
          fellBackFrom: PRIMARY.key,
        });
        return { finishReason: 'stop', ...res } as T & ChatResponse;
      } catch (e2) {
        await logAiUsage({
          organizationId: caller.organizationId,
          actorUserId: caller.actorUserId,
          kind,
          provider: FALLBACK.key,
          model: FALLBACK.chatModel,
          entityType: caller.entityType,
          entityId: caller.entityId,
          latencyMs: Date.now() - fbStarted,
          isFallback: true,
          fellBackFrom: PRIMARY.key,
          failed: true,
          errorCode: e2 instanceof AiProviderError ? e2.code : 'unknown',
        });
        throw e2;
      }
    }
    await logAiUsage({
      organizationId: caller.organizationId,
      actorUserId: caller.actorUserId,
      kind,
      provider: PRIMARY.key,
      model: PRIMARY.chatModel,
      entityType: caller.entityType,
      entityId: caller.entityId,
      latencyMs: Date.now() - started,
      failed: true,
      errorCode: e instanceof AiProviderError ? e.code : 'unknown',
    });
    throw e;
  }
}

export async function aiChat(
  caller: Caller,
  kind: UsageLogInput['kind'],
  req: ChatRequest,
): Promise<ChatResponse> {
  return withFallback<ChatResponse>(caller, kind, (p) => p.chat(req));
}

export async function aiVision(
  caller: Caller,
  kind: UsageLogInput['kind'],
  req: VisionRequest,
): Promise<ChatResponse> {
  const visionImages = req.messages.flatMap((m) => m.content.filter((p) => p.type === 'image')).length;
  return withFallback<ChatResponse>(caller, kind, (p) => p.vision(req), visionImages);
}

/**
 * Streaming chat. The caller is responsible for piping the stream to the
 * client; usage is logged on stream completion (best-effort).
 *
 * The fallback only triggers if PRIMARY fails BEFORE producing a chunk. Once
 * tokens start streaming, we commit to PRIMARY (a half-finished message can't
 * be re-streamed by another provider).
 */
export async function* aiChatStream(
  caller: Caller,
  kind: UsageLogInput['kind'],
  req: ChatRequest,
): AsyncIterable<string> {
  const started = Date.now();
  let producedAny = false;
  let provider: ProviderKey = PRIMARY.key;
  try {
    for await (const chunk of PRIMARY.chatStream(req)) {
      producedAny = true;
      yield chunk;
    }
  } catch (e) {
    if (!producedAny && e instanceof AiProviderError && FALLBACK_CODES.has(e.code)) {
      provider = FALLBACK.key;
      const fbStart = Date.now();
      try {
        for await (const chunk of FALLBACK.chatStream(req)) {
          yield chunk;
        }
        await logAiUsage({
          organizationId: caller.organizationId,
          actorUserId: caller.actorUserId,
          kind,
          provider,
          model: FALLBACK.chatModel,
          entityType: caller.entityType,
          entityId: caller.entityId,
          latencyMs: Date.now() - fbStart,
          isFallback: true,
          fellBackFrom: PRIMARY.key,
        });
        return;
      } catch (e2) {
        await logAiUsage({
          organizationId: caller.organizationId,
          actorUserId: caller.actorUserId,
          kind,
          provider: FALLBACK.key,
          model: FALLBACK.chatModel,
          failed: true,
          errorCode: e2 instanceof AiProviderError ? e2.code : 'unknown',
          isFallback: true,
        });
        throw e2;
      }
    }
    await logAiUsage({
      organizationId: caller.organizationId,
      actorUserId: caller.actorUserId,
      kind,
      provider,
      model: PRIMARY.chatModel,
      failed: true,
      errorCode: e instanceof AiProviderError ? e.code : 'unknown',
    });
    throw e;
  }
  // Successful PRIMARY stream — log without token counts (SDK doesn't expose them mid-stream).
  await logAiUsage({
    organizationId: caller.organizationId,
    actorUserId: caller.actorUserId,
    kind,
    provider,
    model: PRIMARY.chatModel,
    entityType: caller.entityType,
    entityId: caller.entityId,
    latencyMs: Date.now() - started,
  });
}
