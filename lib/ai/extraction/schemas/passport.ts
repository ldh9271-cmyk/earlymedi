import { z } from 'zod';
import { ConfidenceMapSchema } from './common';

/**
 * ICAO 9303 MRZ-derived fields. Confidence keys mirror property names so
 * the UI can highlight specific cells.
 */
export const PassportSchema = z.object({
  document_type: z.enum(['passport', 'unknown']).default('passport'),
  issuing_country: z.string().length(3).optional(),
  surname: z.string().max(60),
  given_names: z.string().max(120),
  passport_number: z.string().max(20),
  nationality: z.string().length(3).optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  sex: z.enum(['M', 'F', 'X', 'unknown']).default('unknown'),
  date_of_issue: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_of_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  place_of_birth: z.string().max(80).optional(),
  mrz_line_1: z.string().optional(),
  mrz_line_2: z.string().optional(),
  source_summary: z.string().max(2_000),
  overall_confidence_bp: z.number().int().min(0).max(10_000),
  confidence: ConfidenceMapSchema,
  warnings: z.array(z.string()).default([]),
});

export type ExtractedPassport = z.infer<typeof PassportSchema>;

export const PASSPORT_KEY_FIELDS = [
  'surname',
  'given_names',
  'passport_number',
  'date_of_birth',
  'date_of_expiry',
] as const;
