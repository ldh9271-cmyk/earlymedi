import { z } from 'zod';

export const ConfidenceMapSchema = z
  .record(z.string(), z.number().int().min(0).max(10_000))
  .default({});

export const ExtractionMetaSchema = z.object({
  source_summary: z.string().max(2_000),
  overall_confidence_bp: z.number().int().min(0).max(10_000),
  confidence: ConfidenceMapSchema,
  warnings: z.array(z.string()).default([]),
});

export type ExtractionMeta = z.infer<typeof ExtractionMetaSchema>;
