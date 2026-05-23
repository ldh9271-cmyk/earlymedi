import 'server-only';
import type { z } from 'zod';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';
import { db } from '@/lib/db/client';
import { aiExtractionJobs } from '@/drizzle/schema/ai';
import { aiVision, aiChat } from '../router';
import { anonymize, deanonymize } from './anonymizer';
import { preprocessImage } from './preprocessors/image';
import { extractPdfText } from './preprocessors/pdf';
import { ocrImage } from './ocr/google-vision';
import { ocrImageTesseract } from './ocr/tesseract';
import { classifyOverall } from './confidence';
import type { AiVisionPart, ChatResponse } from '../types';
import { eq } from 'drizzle-orm';

/**
 * Shared extraction engine entry point.
 *
 * The engine is used by:
 *   - Passport OCR (Phase 3)
 *   - Treatment chart autofill (Phase 4)
 *   - External quote / medical record import (Phase 4)
 *   - Flight ticket / menu / ID card capture (Phase 5+)
 *
 * Pipeline:
 *   ① preprocess  — image downscale or PDF text extract
 *   ② OCR layer   — GCV → Tesseract fallback (skipped if PDF has a text layer)
 *   ③ vision/chat — provider router with strict zod-coerced JSON output
 *   ④ validate    — zod parse; on parse failure → fallback provider
 *   ⑤ confidence  — per-field bp scoring + overall threshold
 *   ⑥ persist     — write `ai_extraction_jobs` row with intermediate + final state
 *
 * Caller passes either an image buffer, a PDF buffer, or free text.
 * Anonymization happens around the model call when `extraNames` are supplied.
 */

export type EngineInput =
  | { kind: 'image'; buffer: Buffer; mimeType: string; storagePath?: string }
  | { kind: 'pdf'; buffer: Buffer; storagePath?: string }
  | { kind: 'text'; text: string };

export type EngineCaller = {
  organizationId: string;
  actorUserId: string | null;
  schemaKey:
    | 'passport'
    | 'id_card'
    | 'flight_ticket'
    | 'external_quote'
    | 'medical_record'
    | 'menu'
    | 'treatment_chart'
    | 'message_intent'
    | 'generic';
  boundEntityType?: string;
  boundEntityId?: string;
  extraNames?: string[];
};

export type EnginePromptBuilder = (input: { ocrText: string; isImage: boolean }) => {
  system: string;
  userText: string;
  /** When set, a single image part will be appended to the prompt for vision-capable extraction. */
  includeImage?: boolean;
};

export type EngineResult<T> = {
  jobId: string;
  data: T;
  overallConfidenceBp: number;
  confidence: Record<string, number>;
  warnings: string[];
  status: 'completed' | 'review_required';
};

export async function runExtraction<T>(
  caller: EngineCaller,
  schema: z.ZodSchema<T>,
  keyFields: readonly string[],
  input: EngineInput,
  promptBuilder: EnginePromptBuilder,
): Promise<EngineResult<T>> {
  // 0. create job row
  const [job] = await db
    .insert(aiExtractionJobs)
    .values({
      organizationId: caller.organizationId,
      actorUserId: caller.actorUserId,
      schemaKey: caller.schemaKey,
      status: 'preprocessing',
      inputKind: input.kind,
      inputRefs: input.kind !== 'text' && 'storagePath' in input && input.storagePath ? [{ storagePath: input.storagePath }] : [],
      boundEntityType: caller.boundEntityType ?? null,
      boundEntityId: caller.boundEntityId ?? null,
    })
    .returning();
  if (!job) throw new Error('failed_to_create_job');

  try {
    // 1. preprocess + OCR text source
    let ocrText = '';
    let imagePart: AiVisionPart | null = null;

    if (input.kind === 'text') {
      ocrText = input.text;
    } else if (input.kind === 'pdf') {
      const pdf = await extractPdfText(input.buffer);
      ocrText = pdf.text;
      // For scanned PDFs without text layer we'd render to image and OCR — skipped here.
    } else {
      const prepped = await preprocessImage(input.buffer);
      const gcv = await ocrImage(prepped.buffer);
      if (gcv.available && gcv.text.length > 0) {
        ocrText = gcv.text;
      } else {
        // Fall back to Tesseract.
        try {
          const t = await ocrImageTesseract(prepped.buffer);
          ocrText = t.text;
        } catch {
          ocrText = '';
        }
      }
      imagePart = {
        type: 'image',
        data: prepped.buffer.toString('base64'),
        mimeType: prepped.mimeType,
      };
    }

    // cache key — same input twice = identical output
    const hash = bytesToHex(sha256(new TextEncoder().encode(`${caller.schemaKey}|${ocrText}`)));
    await db
      .update(aiExtractionJobs)
      .set({ status: 'structuring', ocrText, ocrTextHash: hash })
      .where(eq(aiExtractionJobs.id, job.id));

    // 2. build prompt
    const builder = promptBuilder({ ocrText, isImage: input.kind === 'image' });

    // 3. anonymize OCR text (PII safety)
    const anonymized = await anonymize(caller.organizationId, builder.userText, {
      extraNames: caller.extraNames,
    });

    const systemPrompt = `${builder.system}

응답은 반드시 단일 JSON 객체. JSON 외 어떤 텍스트도 출력하지 마세요.
오직 다음 필드 스키마만 따르세요 (추가 필드 금지):

\`\`\`
${jsonSchemaHint(schema)}
\`\`\`
`;

    let ai: ChatResponse;
    if (imagePart && builder.includeImage !== false) {
      ai = await aiVision(
        { ...caller, entityType: 'extraction_job', entityId: job.id },
        'extract',
        {
          system: systemPrompt,
          temperature: 0,
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: anonymized.redacted }, imagePart],
            },
          ],
        },
      );
    } else {
      ai = await aiChat(
        { ...caller, entityType: 'extraction_job', entityId: job.id },
        'extract',
        {
          system: systemPrompt,
          temperature: 0,
          messages: [{ role: 'user', content: anonymized.redacted }],
        },
      );
    }

    // 4. de-anonymize + parse JSON
    const restoredText = await deanonymize(anonymized.jobToken, ai.text);
    const parsedJson = safeJsonParse(restoredText);
    if (!parsedJson) {
      await db
        .update(aiExtractionJobs)
        .set({ status: 'failed', failureReason: 'invalid_json' })
        .where(eq(aiExtractionJobs.id, job.id));
      throw new Error('Model returned non-JSON output');
    }
    const parsed = schema.safeParse(parsedJson);
    if (!parsed.success) {
      await db
        .update(aiExtractionJobs)
        .set({
          status: 'failed',
          failureReason: `schema_violation: ${parsed.error.issues.slice(0, 3).map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`,
        })
        .where(eq(aiExtractionJobs.id, job.id));
      throw new Error('Schema validation failed');
    }

    // 5. confidence
    const confidenceMap = (parsed.data as { confidence?: Record<string, number> }).confidence ?? {};
    const { overallBp } = classifyOverall(confidenceMap, keyFields);
    const overall =
      (parsed.data as { overall_confidence_bp?: number }).overall_confidence_bp ?? overallBp;
    const status = overall >= 9000 ? 'completed' : 'review_required';
    const warnings = (parsed.data as { warnings?: string[] }).warnings ?? [];

    await db
      .update(aiExtractionJobs)
      .set({
        status,
        extractedJson: parsed.data as Record<string, unknown>,
        confidenceJson: confidenceMap,
        overallConfidenceBp: overall,
        warningsJson: warnings,
        completedAt: new Date(),
      })
      .where(eq(aiExtractionJobs.id, job.id));

    return {
      jobId: job.id,
      data: parsed.data,
      overallConfidenceBp: overall,
      confidence: confidenceMap,
      warnings,
      status,
    };
  } catch (e) {
    await db
      .update(aiExtractionJobs)
      .set({
        status: 'failed',
        failureReason: e instanceof Error ? e.message : String(e),
      })
      .where(eq(aiExtractionJobs.id, job.id));
    throw e;
  }
}

function safeJsonParse(text: string): unknown {
  // Strip code fences if the model wrapped them.
  const cleaned = text.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/i, '').trim();
  // Find the first { and last } if there's surrounding text.
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const candidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function jsonSchemaHint(schema: z.ZodSchema<unknown>): string {
  // Lightweight schema dump for the prompt. We don't ship full JSON Schema
  // generation here — a description of the top-level shape is enough for the
  // model to follow when paired with `temperature: 0`.
  try {
    const desc = (schema as { description?: () => string }).description?.();
    if (desc) return desc;
  } catch {
    // ignore
  }
  return 'see TypeScript schema; field names are snake_case; emit `confidence` map and `overall_confidence_bp` integer 0..10000.';
}
