import type { PaymentResult } from './payments';
import type { NoChargeReason } from './receipts';

export interface BillingCommitSummary {
  creditsCharged: number;
  balanceAfter: number;
  noChargeReason: NoChargeReason;
}

// Single owner of the billing block on every premium response: the 200
// wrapper (premiumResponse) and the no-charge validation-failure wrapper
// (premiumValidationFailure) in index.ts both build it here.
//
// Contract note (audit 2026-07-31): the minted tf_live_ credential is
// delivered ONLY in the X-Payment-Token response header, never in the
// body. Response bodies are the payload most likely to be logged, cached
// to disk, or echoed into an LLM transcript; the header is the channel
// most loggers omit. Do not add the raw token to this object. The
// token_delivery field exists so a caller that previously read the
// removed billing.token field gets a pointer instead of silence.
export function buildPremiumBillingBlock(
  commit: BillingCommitSummary,
  payment: PaymentResult,
): Record<string, unknown> {
  const billing: Record<string, unknown> = {
    credits_charged: commit.creditsCharged,
    credits_remaining: commit.balanceAfter,
  };
  if (commit.noChargeReason !== null) {
    billing.no_charge_reason = commit.noChargeReason;
    billing.afta_doc = 'https://tensorfeed.ai/agent-fair-trade';
  }
  if (payment.newToken) {
    billing.new_token_issued = true;
    billing.token_delivery = 'header:X-Payment-Token';
  }
  return billing;
}
