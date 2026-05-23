import { z } from 'zod';

/**
 * Treatment-chart AI autofill schema.
 *
 * The vision/chat model is instructed to emit a single JSON object matching
 * this shape. The engine validates with `safeParse`; on failure it falls back
 * to the secondary provider (Claude → Gemini) once before surfacing a
 * `review_required` job.
 *
 * Every monetary value is integer KRW minor units (won). `confidence` is
 * 0–100 (we convert to bp at persist time).
 */
export const TreatmentChartItemSchema = z.object({
  raw_text: z.string().min(1),
  procedure_name_normalized: z.string().min(1),
  procedure_master_match: z
    .object({
      code: z.string().nullable().optional(),
      catalog_id: z.string().uuid().nullable().optional(),
    })
    .optional(),
  body_part: z.string().nullable().optional(),
  quantity: z.number().int().min(1).default(1),
  unit_price_krw: z.number().int().min(0),
  line_total_krw: z.number().int().min(0),
  vat_included: z.boolean().default(false),
  vat_rate_bp: z.number().int().min(0).max(10_000).default(1_000),
  vat_treatment: z.enum(['exempt', 'taxable', 'mixed']).default('taxable'),
  is_addon: z.boolean().default(false),
  discount_krw: z.number().int().min(0).default(0),
  confidence: z.number().min(0).max(100),
  notes: z.string().nullable().optional(),
});

export const TreatmentChartDiscountSchema = z.object({
  label: z.string(),
  amount_krw: z.number().int().min(0),
  applies_to_line_numbers: z.array(z.number().int().nonnegative()).optional(),
});

export const TreatmentChartExtractionSchema = z.object({
  source_summary: z.string(),
  treatment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
  doctor_name: z.string().nullable().optional(),
  items: z.array(TreatmentChartItemSchema).min(1),
  discounts: z.array(TreatmentChartDiscountSchema).default([]),
  deposit_received_krw: z.number().int().min(0).default(0),
  total_amount_krw: z.number().int().min(0),
  vat_amount_krw: z.number().int().min(0).default(0),
  payment_method: z.string().nullable().optional(),
  currency: z.string().default('KRW'),
  warnings: z.array(z.string()).default([]),
  overall_confidence: z.number().min(0).max(100),
});

export type TreatmentChartExtraction = z.infer<typeof TreatmentChartExtractionSchema>;
export type TreatmentChartItemExtraction = z.infer<typeof TreatmentChartItemSchema>;

/** Key fields used by the engine's confidence classifier (per-field scoring). */
export const TREATMENT_CHART_KEY_FIELDS = [
  'treatment_date',
  'items',
  'total_amount_krw',
  'overall_confidence',
] as const;
