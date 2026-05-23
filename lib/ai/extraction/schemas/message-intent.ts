import { z } from 'zod';

/**
 * Inbound message classifier output. We use this for stage promotion
 * (lead → qualified → quoted), priority bumps, and risk-flag toasts.
 */
export const MessageIntentSchema = z.object({
  intent_class: z
    .string()
    .max(80)
    .describe('Snake-case label, e.g. "rhinoplasty_quote_request" or "post_op_concern"'),
  procedure_categories: z.array(z.string()).max(8).default([]),
  body_parts: z.array(z.string()).max(8).default([]),
  budget_currency: z.string().length(3).nullable().optional(),
  budget_min_minor: z.number().int().nonnegative().nullable().optional(),
  budget_max_minor: z.number().int().nonnegative().nullable().optional(),
  travel_window: z
    .object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
    .nullable()
    .optional(),
  sentiment_score: z.number().int().min(-100).max(100),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']),
  is_dual_intent: z
    .boolean()
    .describe('True when the message expresses both medical-treatment and tourism intent.'),
  is_dual_intent_evidence: z.string().max(500).optional(),
  risk_flags: z
    .array(
      z.enum([
        'lawsuit',
        'refund_demand',
        'aggressive_complaint',
        'unverified_minor',
        'consent_issue',
        'price_dispute',
        'medical_emergency',
        'identity_theft',
        'profanity',
      ]),
    )
    .default([]),
  extracted_entities: z
    .object({
      patient_name: z.string().nullable().optional(),
      country_code: z.string().length(2).nullable().optional(),
      preferred_language: z.string().nullable().optional(),
      passport_number: z.string().nullable().optional(),
      date_of_birth: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
    })
    .default({}),
  recommended_next_stage: z.enum(['lead', 'qualified', 'case', 'quoted', 'booked']),
  recommended_quick_reply_shortcut: z.string().nullable().optional(),
  recommended_actions: z.array(z.string()).default([]),
  one_line_summary_ko: z.string().max(200),
});

export type ExtractedMessageIntent = z.infer<typeof MessageIntentSchema>;
