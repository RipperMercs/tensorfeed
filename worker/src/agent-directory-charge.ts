/**
 * Verify-hireable charge flow ($5 USDC / 30 days).
 *
 * Two-step pattern parallel to /api/payment/buy-credits +
 * /api/payment/confirm, reusing the existing helpers in payments.ts
 * (createQuote, verifyBaseUSDCTransaction, screenWalletOFAC). The
 * SETTLEMENT step differs: instead of minting credits, we update the
 * operator's existing claim with verified_hireable_until = now + 30d
 * (extending from the current expiry if still in the future), bumping
 * renewal_count and total_paid_usd.
 *
 * Per the agent-directory v0 spec (C:\Users\rippe\Desktop\
 * tensorfeed-agent-directory-v0-spec.md):
 *   - $5 USDC flat, sender-wallet bound (Tx-Sniper guard)
 *   - 30-day duration
 *   - Explicit renewal action (no auto-renew)
 *   - Chainalysis re-screen at every renewal
 *   - No refunds (standard merchant posture)
 *
 * Replay protection: separate `pay:vh-tx:{txHash}` namespace so
 * verify-hireable charges don't conflict with credit-purchase records.
 */

import { Env } from './types';
import {
  createQuote,
  isValidSenderWallet,
  screenWalletOFAC,
  verifyBaseUSDCTransaction,
} from './payments';
import { safePut } from './kill-switch';
import {
  getOperatorClaim,
  putBanRecord,
  putOperatorClaim,
} from './agent-reputation-store';

/** Flat verify-hireable price. Locked at v0. */
export const VERIFY_HIREABLE_PRICE_USD = 5;

/** 30-day subscription duration. */
export const VERIFY_HIREABLE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/** Replay-protection key prefix. Separate from `pay:tx:` so it doesn't
 *  conflict with credit-purchase records. */
export const VH_TX_KEY_PREFIX = 'pay:vh-tx:';

/** Claim-intent placeholder TTL. Matches the payments.ts pattern: write
 *  a short-lived "pending" record before the on-chain verification round
 *  trip so concurrent confirm calls on different PoPs see the placeholder
 *  and bail. */
const CLAIM_INTENT_TTL_SECONDS = 60;

interface QuoteRecordShape {
  amount_usd: number;
  amount_base_units?: number;
  credits: number;
  expires_at: number;
  created: string;
  sender_wallet: string;
}

/** Recorded on every successful verify-hireable settlement. */
export interface VerifyHireableTxRecord {
  amount_usd: number;
  amount_base_units?: number;
  sender_wallet: string;
  block_number?: number;
  nonce_used: string;
  previous_verified_hireable_until: string | null;
  new_verified_hireable_until: string;
  created: string;
}

export type VerifyHireableQuoteResult =
  | {
      ok: true;
      nonce: string;
      amount_usd: number;
      wallet: string; // the PAYMENT_WALLET to send USDC to
      expires_at: number;
      memo: string; // human-readable memo for wallet UIs
      duration_days: number;
    }
  | { ok: false; error: string; status: number };

export type VerifyHireableConfirmResult =
  | {
      ok: true;
      wallet: string;
      verified_hireable_until: string;
      previous_verified_hireable_until: string | null;
      renewal_count: number;
      total_paid_usd: number;
      tx_amount_usd: number;
    }
  | { ok: false; error: string; reason?: string; status?: number };

/**
 * Issue a quote for a verify-hireable charge. The operator must
 * already have an existing OperatorClaim for `sender_wallet` (you
 * can only verify-hireable a wallet you've already claimed).
 */
export async function issueVerifyHireableQuote(
  env: Env,
  sender_wallet: string,
): Promise<VerifyHireableQuoteResult> {
  if (!isValidSenderWallet(sender_wallet)) {
    return { ok: false, error: 'invalid_sender_wallet', status: 400 };
  }
  // Confirm a claim exists for this wallet. The verify-hireable badge
  // attaches to the claim; without a claim there's nothing to flag as
  // verified.
  const claim = await getOperatorClaim(env, sender_wallet);
  if (!claim) {
    return {
      ok: false,
      error: 'no_operator_claim',
      status: 404,
    };
  }
  if (!env.PAYMENT_WALLET) {
    return { ok: false, error: 'payments_disabled', status: 503 };
  }
  const { nonce, quote, wallet } = await createQuote(
    env,
    VERIFY_HIREABLE_PRICE_USD,
    sender_wallet,
  );
  return {
    ok: true,
    nonce,
    amount_usd: VERIFY_HIREABLE_PRICE_USD,
    wallet,
    expires_at: quote.expires_at,
    memo: 'TensorFeed Verified Hireable, 30 days',
    duration_days: 30,
  };
}

export interface VerifyHireableConfirmBody {
  nonce: string;
  txHash: string;
  sender_wallet: string;
}

/**
 * Confirm a verify-hireable payment landed and grant the 30-day
 * subscription. Full decision tree:
 *
 *   1. Shape validation                       -> 400 invalid_*
 *   2. Replay: pay:vh-tx:{txHash} exists?     -> 409 tx_already_used
 *   3. Quote lookup + expiry check            -> 400 quote_*
 *   4. Quote sender_wallet matches?           -> 400 wallet_mismatch
 *   5. On-chain verification                  -> 400 chain_*
 *   6. Chainalysis re-screen (fail-closed)    -> 503 or 403
 *   7. Existing operator claim lookup         -> 404 no_operator_claim
 *   8. Settlement: extend verified_hireable_until + write tx record
 *
 * Extension semantics: if the operator's current verified_hireable_until
 * is still in the future, extend it by 30 days from THAT future date
 * (no lost time on early renewals). If it's past, start fresh at now + 30d.
 */
export async function confirmVerifyHireable(
  env: Env,
  body: VerifyHireableConfirmBody,
  now: number = Date.now(),
): Promise<VerifyHireableConfirmResult> {
  const { nonce, txHash, sender_wallet } = body;

  // 1. Shape validation
  if (!nonce || typeof nonce !== 'string' || nonce.length < 16 || nonce.length > 64) {
    return { ok: false, error: 'invalid_nonce', status: 400 };
  }
  if (!txHash || typeof txHash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return { ok: false, error: 'invalid_tx_hash', status: 400 };
  }
  if (!isValidSenderWallet(sender_wallet)) {
    return { ok: false, error: 'invalid_sender_wallet', status: 400 };
  }
  const senderLower = sender_wallet.toLowerCase();

  // 2. Replay protection (with claim-intent placeholder pattern from
  // payments.ts). Two concurrent confirms on different Cloudflare PoPs
  // could both see an empty replay record. We stake the slot BEFORE the
  // slow on-chain verification round-trip with a 60s TTL'd "pending"
  // record, so the second-PoP request reads the placeholder and bails
  // with 'tx_in_flight'. If the first attempt fails downstream, the
  // pending TTL auto-expires and the operator can retry.
  const existing = (await env.TENSORFEED_CACHE.get(
    VH_TX_KEY_PREFIX + txHash,
    'json',
  )) as (VerifyHireableTxRecord & { pending?: boolean }) | null;
  if (existing) {
    if (existing.pending) {
      return {
        ok: false,
        error: 'tx_in_flight',
        reason:
          'this transaction is already being processed by another request; wait up to 60 seconds and retry',
        status: 409,
      };
    }
    return { ok: false, error: 'tx_already_used', status: 409 };
  }

  // 3. Quote lookup
  const quote = (await env.TENSORFEED_CACHE.get(
    `pay:quote:${nonce}`,
    'json',
  )) as QuoteRecordShape | null;
  if (!quote) {
    return { ok: false, error: 'quote_not_found_or_expired', status: 400 };
  }
  if (quote.expires_at < now) {
    return { ok: false, error: 'quote_expired', status: 400 };
  }
  if (quote.amount_usd !== VERIFY_HIREABLE_PRICE_USD) {
    return {
      ok: false,
      error: 'quote_wrong_amount',
      reason: 'verify-hireable quotes must be exactly $5',
      status: 400,
    };
  }

  // 4. Sender-wallet match (Tx-Sniper guard at the quote layer)
  if (!quote.sender_wallet || quote.sender_wallet.toLowerCase() !== senderLower) {
    return { ok: false, error: 'sender_wallet_mismatch', status: 400 };
  }

  // Stake the claim-intent placeholder BEFORE the on-chain RPC roundtrip.
  // Per payments.ts CLAIM_INTENT pattern: a concurrent request on a
  // different PoP will see this and bail (step 2 above). TTL is 60s so a
  // transient RPC failure auto-heals.
  await safePut(
    env,
    env.TENSORFEED_CACHE,
    VH_TX_KEY_PREFIX + txHash,
    JSON.stringify({
      amount_usd: 0,
      sender_wallet: senderLower,
      nonce_used: nonce,
      previous_verified_hireable_until: null,
      new_verified_hireable_until: '',
      created: new Date(now).toISOString(),
      pending: true,
    }),
    { expirationTtl: CLAIM_INTENT_TTL_SECONDS },
  );

  // 5. On-chain verification
  const verified = await verifyBaseUSDCTransaction(txHash, env);
  if (!verified.ok) {
    return { ok: false, error: 'chain_verification_failed', reason: verified.reason, status: 400 };
  }
  // Tx-Sniper guard at the on-chain layer: the actual from-address of the
  // verified USDC transfer must match the quote's sender_wallet.
  if (!verified.senderAddress || verified.senderAddress.toLowerCase() !== senderLower) {
    return { ok: false, error: 'chain_sender_mismatch', status: 400 };
  }
  // Exact amount match in base units (no float tolerance).
  if (quote.amount_base_units !== undefined && verified.amountBaseUnits !== undefined) {
    if (verified.amountBaseUnits !== quote.amount_base_units) {
      return {
        ok: false,
        error: 'amount_mismatch',
        reason: `expected ${quote.amount_base_units} base units, got ${verified.amountBaseUnits}`,
        status: 400,
      };
    }
  }

  // 6. Chainalysis re-screen at every renewal (per directory spec)
  const screen = await screenWalletOFAC(senderLower, env);
  if (screen.error) {
    // Fail-closed; do NOT extend the subscription on oracle uncertainty.
    return { ok: false, error: 'ofac_oracle_unreachable', status: 503 };
  }
  if (screen.sanctioned) {
    await putBanRecord(env, {
      target: sender_wallet,
      reason: 'ofac_sanctioned_at_verify_hireable_renewal',
      evidence_url: null,
      banned_at: new Date(now).toISOString(),
      banned_by_admin: 'system:chainalysis',
    });
    return { ok: false, error: 'wallet_sanctioned', status: 403 };
  }

  // 7. Operator claim lookup (we issued the quote only after this
  // succeeded, but the claim could have been admin-revoked in the
  // meantime; check again).
  const claim = await getOperatorClaim(env, sender_wallet);
  if (!claim) {
    return { ok: false, error: 'no_operator_claim', status: 404 };
  }

  // 8. Settlement: extend verified_hireable_until
  const previousUntil = claim.verified_hireable_until ?? null;
  const previousUntilMs =
    previousUntil && Number.isFinite(Date.parse(previousUntil))
      ? Date.parse(previousUntil)
      : 0;
  // If the prior subscription is still active, extend FROM ITS END DATE
  // so the operator doesn't lose paid time on an early renewal.
  // Otherwise start fresh from now.
  const baseMs = previousUntilMs > now ? previousUntilMs : now;
  const newUntilMs = baseMs + VERIFY_HIREABLE_DURATION_MS;
  const newUntilIso = new Date(newUntilMs).toISOString();

  const updatedClaim = {
    ...claim,
    verified_hireable_until: newUntilIso,
    verified_hireable_renewal_count: (claim.verified_hireable_renewal_count ?? 0) + 1,
    verified_hireable_total_paid_usd:
      (claim.verified_hireable_total_paid_usd ?? 0) + VERIFY_HIREABLE_PRICE_USD,
  };
  await putOperatorClaim(env, updatedClaim);

  // Write the replay-protection / audit record AFTER the claim update
  // succeeds. If we crash between these two writes, the operator gets
  // a free renewal — preferable to charging for one and not granting it.
  const txRec: VerifyHireableTxRecord = {
    amount_usd: VERIFY_HIREABLE_PRICE_USD,
    amount_base_units: verified.amountBaseUnits,
    sender_wallet: senderLower,
    block_number: verified.blockNumber,
    nonce_used: nonce,
    previous_verified_hireable_until: previousUntil,
    new_verified_hireable_until: newUntilIso,
    created: new Date(now).toISOString(),
  };
  await safePut(
    env,
    env.TENSORFEED_CACHE,
    VH_TX_KEY_PREFIX + txHash,
    JSON.stringify(txRec),
  );

  // Burn the quote so it can't be re-used (defensive; the quote's own
  // 30-min TTL would also handle this).
  await env.TENSORFEED_CACHE.delete(`pay:quote:${nonce}`);

  return {
    ok: true,
    wallet: claim.wallet,
    verified_hireable_until: newUntilIso,
    previous_verified_hireable_until: previousUntil,
    renewal_count: updatedClaim.verified_hireable_renewal_count!,
    total_paid_usd: updatedClaim.verified_hireable_total_paid_usd!,
    tx_amount_usd: verified.amountUsd,
  };
}
