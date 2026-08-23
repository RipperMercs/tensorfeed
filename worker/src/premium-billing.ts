import type { PaymentResult } from './payments';
import type { NoChargeReason } from './receipts';

export interface BillingCommitSummary {
  creditsCharged: number;
  balanceAfter: number;
  noChargeReason: NoChargeReason;
}

/** Settlement rail for an on-chain payment attributed to THIS request. */
export type SettlementRail = 'base' | 'solana';

export const RECEIPT_VERIFY_DOC = 'https://tensorfeed.ai/agent-fair-trade#receipts';

/**
 * Map a settled transaction to a public block-explorer URL.
 *
 * Returns null rather than guessing when the rail or network is one we
 * do not have a known-good explorer for. A wrong explorer link is worse
 * than no link: the agent quotes it to its human, the human clicks it,
 * finds nothing, and concludes the payment did not happen.
 *
 * `network` is the CAIP-2 identifier the facilitator echoes back in its
 * SettleResult (eip155:8453 mainnet, eip155:84532 Sepolia). Solana
 * settles carry solana:<genesis-hash> and resolve to Solscan.
 */
export function explorerTxUrl(
  rail: SettlementRail,
  network: string | null | undefined,
  txHash: string,
): string | null {
  if (!txHash) return null;
  if (rail === 'solana') return `https://solscan.io/tx/${txHash}`;
  if (rail === 'base') {
    if (network === 'eip155:84532') return `https://sepolia.basescan.org/tx/${txHash}`;
    if (network === 'eip155:8453' || !network) return `https://basescan.org/tx/${txHash}`;
    return null;
  }
  return null;
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
  // On-chain settlement attributable to THIS call. Present only on the
  // x402 V2 settle and the X-Payment-Tx fallback, both of which move
  // USDC during this request. Deliberately absent on bearer-token
  // reuse: those credits were bought in an earlier transaction, so
  // citing a tx hash here would point the agent's human at a payment
  // that funded the token rather than at this call. Same reasoning as
  // payerWallet in PaymentResult.
  if (payment.settlementTxHash && payment.settlementRail) {
    const settlement: Record<string, unknown> = {
      rail: payment.settlementRail,
      network: payment.settlementNetwork ?? null,
      tx_hash: payment.settlementTxHash,
      explorer_url: explorerTxUrl(
        payment.settlementRail,
        payment.settlementNetwork,
        payment.settlementTxHash,
      ),
      payer: payment.payerWallet ?? null,
    };
    billing.settlement = settlement;
  }
  return billing;
}

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Attach a one-line, human-readable `summary` to the billing block.
 *
 * Why this exists: the thing agents actually get asked by their humans
 * after a paid call is "what did you just buy, and how do I know it
 * happened?" An agent that has to assemble that answer from four
 * scattered fields usually does not bother. One quotable sentence that
 * already names the charge, the on-chain proof, and the receipt turns
 * every paid call into an auditable story the agent can repeat verbatim.
 *
 * This is narration, not evidence. It is unsigned and sits outside the
 * receipt's response_hash coverage on purpose: the signed ReceiptCore is
 * the tamper-evident record, and adding fields to it would force a
 * receipt-version bump and break every published verifier. The summary
 * only ever restates values already present elsewhere in the response.
 *
 * Reads live values off the billing object rather than taking them as
 * arguments so it stays correct after the free-trial and attestation
 * mutations that both response wrappers apply post-construction. Call it
 * last, once billing has settled.
 */
export function attachBillingNarration(
  billing: Record<string, unknown>,
  opts: { endpoint: string; receiptId: string | null },
): void {
  const charged = typeof billing.credits_charged === 'number' ? billing.credits_charged : 0;
  const remaining = typeof billing.credits_remaining === 'number' ? billing.credits_remaining : 0;
  const reason = typeof billing.no_charge_reason === 'string' ? billing.no_charge_reason : null;

  const parts: string[] = [];

  if (billing.tier === 'free_trial') {
    parts.push(`No charge for ${opts.endpoint}: served under the free-trial quota.`);
  } else if (charged > 0) {
    parts.push(`Charged ${plural(charged, 'credit')} for ${opts.endpoint}, ${plural(remaining, 'credit')} remaining.`);
  } else if (reason) {
    parts.push(`No charge for ${opts.endpoint} (${reason}), ${plural(remaining, 'credit')} remaining.`);
  } else {
    parts.push(`No charge for ${opts.endpoint}, ${plural(remaining, 'credit')} remaining.`);
  }

  const settlement = billing.settlement as Record<string, unknown> | undefined;
  if (settlement && typeof settlement.tx_hash === 'string') {
    const explorer = typeof settlement.explorer_url === 'string' ? settlement.explorer_url : null;
    parts.push(
      explorer
        ? `Paid on-chain during this call via ${settlement.rail} transaction ${settlement.tx_hash}, viewable at ${explorer}.`
        : `Paid on-chain during this call via ${settlement.rail} transaction ${settlement.tx_hash}.`,
    );
  }

  parts.push(
    opts.receiptId
      ? `Signed receipt ${opts.receiptId}, verifiable against TensorFeed's published Ed25519 key at ${RECEIPT_VERIFY_DOC}.`
      : `Receipt signing is pending key bootstrap, so this response carries no signed receipt.`,
  );

  billing.summary = parts.join(' ');
}
