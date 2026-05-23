import type { NewBillingPlan } from '../schema/billing';

/**
 * Pricing seed — locked at Phase 1.
 * Source of truth for: app/(marketing)/pricing/page.tsx, signup wizards.
 *
 * Amounts in KRW (minor unit exponent = 0).
 * settlementFeeBp uses basis-points × 100 (150 = 1.50%).
 */
export const BILLING_PLAN_SEEDS: NewBillingPlan[] = [
  // ── Agency 3-tier ───────────────────────────────────────────
  {
    code: 'agency_starter',
    accountType: 'agency',
    name: 'Agency Starter',
    description: '소규모 유치업체 · 월 50건 미만',
    registrationFeeKrw: 100_000,
    monthlyFeeKrw: 99_000,
    annualFeeKrw: 0,
    prepaidChargeMinKrw: 0,
    trialDays: 14,
    settlementFeeBp: 150, // 1.50% of GMV
    seatLimit: 3,
    cycle: 'monthly',
    isActive: true,
    metadata: { features: { ai_concierge: true, multi_channel_inbox: true, treatment_chart_ai: true } },
  },
  {
    code: 'agency_growth',
    accountType: 'agency',
    name: 'Agency Growth',
    description: '중규모 유치업체 · 월 50–200건',
    registrationFeeKrw: 100_000,
    monthlyFeeKrw: 299_000,
    annualFeeKrw: 0,
    prepaidChargeMinKrw: 0,
    trialDays: 14,
    settlementFeeBp: 100, // 1.00%
    seatLimit: 10,
    cycle: 'monthly',
    isActive: true,
    metadata: {
      features: {
        ai_concierge: true,
        multi_channel_inbox: true,
        treatment_chart_ai: true,
        rag_pricing_chatbot: true,
        whitelabel_lite: true,
      },
    },
  },
  {
    code: 'agency_pro',
    accountType: 'agency',
    name: 'Agency Pro',
    description: '대형 유치업체 · 월 200건+ · 화이트라벨',
    registrationFeeKrw: 0, // 등록비 면제
    monthlyFeeKrw: 699_000,
    annualFeeKrw: 0,
    prepaidChargeMinKrw: 0,
    trialDays: 0,
    settlementFeeBp: 70, // 0.70%
    seatLimit: null, // unlimited
    cycle: 'monthly',
    isActive: true,
    metadata: {
      features: {
        ai_concierge: true,
        multi_channel_inbox: true,
        treatment_chart_ai: true,
        rag_pricing_chatbot: true,
        whitelabel_full: true,
        custom_domain: true,
        api_access: true,
      },
    },
  },

  // ── Medical (usage-based) ───────────────────────────────────
  {
    code: 'medical_payg',
    accountType: 'medical',
    name: 'Medical Pay-as-you-go',
    description: '사용한 만큼 차감 · 충전식',
    registrationFeeKrw: 300_000,
    monthlyFeeKrw: 0,
    annualFeeKrw: 0,
    prepaidChargeMinKrw: 500_000,
    trialDays: 0,
    settlementFeeBp: 50, // 0.50%
    seatLimit: null,
    cycle: 'usage_based',
    isActive: true,
    metadata: {
      usage_prices_krw: {
        case_received: 3_000,
        chart_autofill: 300,
        chart_finalize: 1_500,
        interpreter_match: 500,
        quote_pdf: 200,
        ai_vision_per_call: 100,
        ai_stt_per_minute: 50,
        ai_llm_per_10k_tokens: 200,
      },
    },
  },
  {
    code: 'medical_committed',
    accountType: 'medical',
    name: 'Medical Committed (연간)',
    description: '연간 약정 · 15% 할인 · 우선 정산',
    registrationFeeKrw: 300_000,
    monthlyFeeKrw: 0,
    annualFeeKrw: 6_000_000,
    prepaidChargeMinKrw: 0,
    trialDays: 0,
    settlementFeeBp: 30, // 0.30%
    seatLimit: null,
    cycle: 'annual',
    isActive: true,
    metadata: {
      committed_annual_discount_bp: 1500, // 15.00%
      usage_prices_krw: {
        case_received: 3_000,
        chart_autofill: 300,
        chart_finalize: 1_500,
        interpreter_match: 500,
        quote_pdf: 200,
      },
    },
  },

  // ── Non-medical ────────────────────────────────────────────
  {
    code: 'partner_listing',
    accountType: 'non_medical',
    name: 'Partner Listing',
    description: '디렉토리 노출 · 무료 · 거래 시 3%',
    registrationFeeKrw: 50_000,
    monthlyFeeKrw: 0,
    annualFeeKrw: 0,
    prepaidChargeMinKrw: 0,
    trialDays: 0,
    settlementFeeBp: 300, // 3.00%
    seatLimit: 2,
    cycle: 'usage_based',
    isActive: true,
    metadata: { features: { directory_listing: true } },
  },
  {
    code: 'partner_active',
    accountType: 'non_medical',
    name: 'Partner Active',
    description: '월 정액 · 우선 노출 · 거래 시 1.5%',
    registrationFeeKrw: 50_000,
    monthlyFeeKrw: 49_000,
    annualFeeKrw: 0,
    prepaidChargeMinKrw: 0,
    trialDays: 0,
    settlementFeeBp: 150, // 1.50%
    seatLimit: 5,
    cycle: 'monthly',
    isActive: true,
    metadata: {
      features: {
        directory_listing: true,
        priority_placement: true,
        availability_calendar: true,
        multilingual_menu: true,
      },
    },
  },

  // ── Freelancer (free, included in agency seats) ────────────
  {
    code: 'freelancer_free',
    accountType: 'freelancer',
    name: 'Freelancer Free',
    description: 'Agency 좌석에 포함 · 무료',
    registrationFeeKrw: 0,
    monthlyFeeKrw: 0,
    annualFeeKrw: 0,
    prepaidChargeMinKrw: 0,
    trialDays: 0,
    settlementFeeBp: 0,
    seatLimit: 1,
    cycle: 'monthly',
    isActive: true,
    metadata: { features: { referral_codes: true, tax_docs: true } },
  },
];
