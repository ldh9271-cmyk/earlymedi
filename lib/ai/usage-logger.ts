import 'server-only';
import { db } from '@/lib/db/client';
import { aiUsageLogs } from '@/drizzle/schema/ai';
import type { ProviderKey } from './types';

/**
 * Cost rates per provider/model. Values are integers in KRW per million tokens
 * (so we can stay integer-only). Verified against public price lists; tweak
 * via env override if needed.
 */
const RATE_KRW_PER_MTOK: Record<string, { input: number; output: number }> = {
  // Gemini 2.5 Pro: ~ $1.25/M in, $5/M out → KRW 1700/M, 6800/M
  'gemini-2.5-pro': { input: 1700, output: 6800 },
  // Claude Opus 4.7: $15/M in, $75/M out → KRW 20400/M, 102000/M
  'claude-opus-4-7': { input: 20400, output: 102000 },
  // OpenAI GPT-4.1 (fallback option): $2.5/M in, $10/M out
  'gpt-4.1': { input: 3400, output: 13600 },
};

export type UsageLogInput = {
  organizationId: string;
  actorUserId: string | null;
  kind:
    | 'chat'
    | 'translate'
    | 'summarize'
    | 'classify'
    | 'extract'
    | 'vision_ocr'
    | 'speech_to_text'
    | 'embedding'
    | 'safety_classifier';
  provider: ProviderKey | 'gcv' | 'tesseract';
  model: string;
  entityType?: string;
  entityId?: string;
  inputTokens?: number;
  outputTokens?: number;
  visionImages?: number;
  audioSeconds?: number;
  latencyMs?: number;
  isFallback?: boolean;
  fellBackFrom?: string;
  failed?: boolean;
  errorCode?: string;
};

function estimateCostKrw(model: string, inputTokens: number, outputTokens: number): number {
  const rate = RATE_KRW_PER_MTOK[model];
  if (!rate) return 0;
  const inputCost = Math.ceil((rate.input * inputTokens) / 1_000_000);
  const outputCost = Math.ceil((rate.output * outputTokens) / 1_000_000);
  return inputCost + outputCost;
}

export async function logAiUsage(input: UsageLogInput): Promise<void> {
  const cost = estimateCostKrw(input.model, input.inputTokens ?? 0, input.outputTokens ?? 0);
  await db.insert(aiUsageLogs).values({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    kind: input.kind,
    provider: input.provider,
    model: input.model,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    inputTokens: input.inputTokens ?? 0,
    outputTokens: input.outputTokens ?? 0,
    visionImages: input.visionImages ?? 0,
    audioSeconds: input.audioSeconds ?? 0,
    latencyMs: input.latencyMs ?? 0,
    isFallback: input.isFallback ?? false,
    fellBackFrom: input.fellBackFrom ?? null,
    failed: input.failed ?? false,
    errorCode: input.errorCode ?? null,
    estimatedCostKrw: cost,
  });
}

export const __testing = { estimateCostKrw };
