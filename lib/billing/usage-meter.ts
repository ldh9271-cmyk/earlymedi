/**
 * Usage meter — records billable events (AI vision/STT/LLM, chart finalize,
 * etc.) for `medical` accounts on Pay-as-you-go / Committed plans.
 *
 * Each event is a typed (kind, units) pair. The committed plan deducts from
 * the prepaid balance; pay-as-you-go invoices monthly at end-of-period.
 *
 * Spec rates (Committed):
 *   - case_received                 ₩3,000
 *   - ai_chart_autofill             ₩300
 *   - chart_finalize                ₩1,500
 *   - interpreter_match             ₩500
 *   - quote_pdf                     ₩200
 *
 * Overage rates (when usage exceeds plan inclusions):
 *   - ai_vision                     ₩100 / 호출
 *   - ai_stt                        ₩50 / 분
 *   - ai_llm                        ₩200 / 10K 토큰
 */

export type UsageEventKind =
  | 'case_received'
  | 'ai_chart_autofill'
  | 'chart_finalize'
  | 'interpreter_match'
  | 'quote_pdf'
  | 'ai_vision'
  | 'ai_stt_minute'
  | 'ai_llm_10k_tokens';

export const USAGE_UNIT_KRW: Record<UsageEventKind, number> = {
  case_received: 3_000,
  ai_chart_autofill: 300,
  chart_finalize: 1_500,
  interpreter_match: 500,
  quote_pdf: 200,
  ai_vision: 100,
  ai_stt_minute: 50,
  ai_llm_10k_tokens: 200,
};

export type UsageEvent = {
  kind: UsageEventKind;
  units: number;
};

export function priceUsageEvent(e: UsageEvent): number {
  return Math.max(0, USAGE_UNIT_KRW[e.kind] * Math.max(0, e.units));
}

export function priceUsageBatch(events: ReadonlyArray<UsageEvent>): number {
  return events.reduce((s, e) => s + priceUsageEvent(e), 0);
}

/**
 * Decide whether the next event should be metered, blocked (balance too low),
 * or allowed-with-overage. Caller passes the current prepaid balance and the
 * plan-specific allowed-overage flag (true for Committed, false for Pay-as-you-go).
 */
export type GateDecision =
  | { ok: true; chargeKrw: number; newBalanceAfterChargeKrw: number }
  | { ok: false; reason: 'insufficient_balance' };

export function gateUsage(
  event: UsageEvent,
  currentBalanceKrw: number,
  allowNegative: boolean,
): GateDecision {
  const charge = priceUsageEvent(event);
  const after = currentBalanceKrw - charge;
  if (after < 0 && !allowNegative) {
    return { ok: false, reason: 'insufficient_balance' };
  }
  return { ok: true, chargeKrw: charge, newBalanceAfterChargeKrw: after };
}
