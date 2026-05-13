/**
 * Operator claim application handler.
 *
 * Bureau Week 3 step 13. Stitches together:
 *   - agent-claim-verify (parse + sig verify + brand allowlist + replay window)
 *   - agent-moderation (Llama Guard pre-flight on free text)
 *   - screenWalletOFAC (Chainalysis sanctions screen, existing in payments.ts)
 *   - agent-reputation-store (claim + pending-claim + ban + nonce KV)
 *
 * Returns a structured result; the route handler in index.ts wraps it
 * into an HTTP Response. Keeping the orchestration in a pure-ish module
 * makes the decision-tree directly unit-testable.
 *
 * The decision tree (first match wins):
 *
 *   1. Parse / shape validation       -> bad_request   (400)
 *   2. Timestamp outside replay window -> rejected     (400)
 *   3. ECDSA signature mismatch        -> rejected     (401)
 *   4. Nonce already seen              -> rejected     (409)
 *   5. Chainalysis sanctioned          -> banned       (403, ban record written)
 *   6. Chainalysis unreachable         -> retry_later  (503, fail-closed)
 *   7. Llama Guard hard_block          -> banned       (403, ban record written,
 *                                                       evidence preserved on S4)
 *   8. Llama Guard soft_review         -> queued       (200, queue for admin)
 *   9. Llama Guard fail_closed         -> queued       (200, queue for admin)
 *  10. Brand allowlist hit             -> queued       (200, queue for admin)
 *  11. Default                         -> approved     (200, claim live)
 *
 * Nothing in this module touches the I/O layer beyond what's already
 * abstracted by agent-reputation-store + payments.screenWalletOFAC.
 * The route handler stays a thin wrapper.
 */

import { Env } from './types';
import {
  checkClaimTimestamp,
  findBrandAllowlistHit,
  parseClaimMessage,
  verifyClaimSignature,
  type ClaimValidationError,
  type ParsedClaim,
} from './agent-claim-verify';
import { moderateFields, type ModerationVerdict } from './agent-moderation';
import { screenWalletOFAC } from './payments';
import {
  isClaimNonceUsed,
  putBanRecord,
  putOperatorClaim,
  putPendingClaim,
  recordClaimNonce,
  type OperatorClaim,
} from './agent-reputation-store';

export type ClaimApplicationOutcome =
  | { ok: true; status: 'approved'; wallet: string; display_name: string }
  | {
      ok: true;
      status: 'queued';
      wallet: string;
      reason: 'brand_allowlist' | 'soft_moderation' | 'fail_closed_moderation';
      moderation?: ModerationVerdict;
      brand_hit?: string;
    }
  | {
      ok: false;
      status: 'bad_request';
      error: ClaimValidationError | 'missing_body_fields';
      detail?: string;
    }
  | {
      ok: false;
      status: 'rejected';
      reason: 'replay_window_expired' | 'signature_invalid' | 'nonce_replayed';
    }
  | {
      ok: false;
      status: 'banned';
      reason: 'ofac_sanctioned' | 'hard_moderation_block';
      category?: string;
    }
  | {
      ok: false;
      status: 'retry_later';
      reason: 'ofac_oracle_unreachable';
    };

export interface ClaimApplicationBody {
  /** Original signed message (exactly as the wallet signed it). */
  message?: unknown;
  /** EIP-191 signature, 0x-prefixed hex. */
  signature?: unknown;
}

export interface ClaimApplicationOptions {
  now?: number; // override for tests
}

export async function handleClaimApplication(
  env: Env,
  body: ClaimApplicationBody,
  opts: ClaimApplicationOptions = {},
): Promise<ClaimApplicationOutcome> {
  const now = opts.now ?? Date.now();

  // ── Body shape ────────────────────────────────────────────────────
  if (typeof body.message !== 'string' || typeof body.signature !== 'string') {
    return { ok: false, status: 'bad_request', error: 'missing_body_fields' };
  }
  const message = body.message as string;
  const signature = body.signature as string;
  if (!/^0x[0-9a-fA-F]+$/.test(signature) || signature.length < 130 || signature.length > 134) {
    return { ok: false, status: 'bad_request', error: 'missing_body_fields', detail: 'signature shape' };
  }

  // ── Step 1: Parse + shape validate ───────────────────────────────
  const parsed = parseClaimMessage(message);
  if (!parsed.ok) {
    return { ok: false, status: 'bad_request', error: parsed.error, detail: parsed.detail };
  }
  const claim = parsed.claim;

  // ── Step 2: Replay window ────────────────────────────────────────
  if (!checkClaimTimestamp(claim.timestamp, now)) {
    return { ok: false, status: 'rejected', reason: 'replay_window_expired' };
  }

  // ── Step 3: ECDSA signature ──────────────────────────────────────
  const sigValid = await verifyClaimSignature(claim, message, signature as `0x${string}`);
  if (!sigValid) {
    return { ok: false, status: 'rejected', reason: 'signature_invalid' };
  }

  // ── Step 4: Nonce replay ─────────────────────────────────────────
  if (await isClaimNonceUsed(env, claim.nonce)) {
    return { ok: false, status: 'rejected', reason: 'nonce_replayed' };
  }

  // ── Step 5+6: Chainalysis OFAC ───────────────────────────────────
  const screen = await screenWalletOFAC(claim.wallet, env);
  if (screen.error && !screen.sanctioned) {
    // The function reports `error` when the oracle was unreachable; we
    // fail-closed and ask the caller to retry. We do NOT auto-approve
    // on uncertainty.
    return { ok: false, status: 'retry_later', reason: 'ofac_oracle_unreachable' };
  }
  if (screen.sanctioned) {
    await putBanRecord(env, {
      target: claim.wallet,
      reason: 'ofac_sanctioned',
      evidence_url: null,
      banned_at: new Date(now).toISOString(),
      banned_by_admin: 'system:chainalysis',
    });
    // Record the nonce too, so an attacker can't try again with the
    // same signed message before the ban propagates.
    await recordClaimNonce(env, claim.nonce);
    return { ok: false, status: 'banned', reason: 'ofac_sanctioned' };
  }

  // ── Step 7+8+9: Llama Guard pre-flight on free text ──────────────
  const moderation = await moderateFields(env, [
    { name: 'display_name', text: claim.display_name },
    { name: 'expanded_description', text: claim.expanded_description },
  ]);
  if (moderation.verdict.action === 'hard_block') {
    await putBanRecord(env, {
      target: claim.wallet,
      reason: 'hard_moderation_block:' + moderation.verdict.category,
      evidence_url: null,
      banned_at: new Date(now).toISOString(),
      banned_by_admin: 'system:llama-guard',
    });
    await recordClaimNonce(env, claim.nonce);
    return {
      ok: false,
      status: 'banned',
      reason: 'hard_moderation_block',
      category: moderation.verdict.category,
    };
  }

  // ── Step 10: Brand allowlist ─────────────────────────────────────
  const brandHit = findBrandAllowlistHit(claim.display_name);

  // ── Determine route: approved vs queued ──────────────────────────
  // The remaining cases either auto-approve or queue for admin.
  const needsReview =
    moderation.verdict.action === 'soft_review' ||
    moderation.verdict.action === 'fail_closed' ||
    brandHit !== null;

  const claimRecord = buildClaimRecord(claim, message, signature, now, !needsReview, true);

  // Burn the nonce BEFORE we write either claim store. This serializes
  // concurrent submissions of the same signed message.
  await recordClaimNonce(env, claim.nonce);

  if (needsReview) {
    await putPendingClaim(env, claimRecord);
    const reason: 'brand_allowlist' | 'soft_moderation' | 'fail_closed_moderation' =
      moderation.verdict.action === 'soft_review'
        ? 'soft_moderation'
        : moderation.verdict.action === 'fail_closed'
          ? 'fail_closed_moderation'
          : 'brand_allowlist';
    return {
      ok: true,
      status: 'queued',
      wallet: claim.wallet,
      reason,
      moderation: moderation.verdict,
      brand_hit: brandHit ?? undefined,
    };
  }

  await putOperatorClaim(env, claimRecord);
  return {
    ok: true,
    status: 'approved',
    wallet: claim.wallet,
    display_name: claim.display_name,
  };
}

function buildClaimRecord(
  parsed: ParsedClaim,
  message: string,
  signature: string,
  now: number,
  verified: boolean,
  ofac_clean: boolean,
): OperatorClaim {
  return {
    wallet: parsed.wallet,
    display_name: parsed.display_name,
    operator_url: parsed.operator_url,
    contact: parsed.contact,
    signature,
    message,
    timestamp: parsed.timestamp,
    nonce: parsed.nonce,
    verified,
    ofac_clean,
    claimed_at: new Date(now).toISOString(),
    available_for_hire: parsed.available_for_hire,
    hourly_rate_min_usd: parsed.hourly_rate_min_usd,
    hourly_rate_max_usd: parsed.hourly_rate_max_usd,
    expanded_description: parsed.expanded_description,
    skills_tags: parsed.skills_tags,
    service_areas: parsed.service_areas,
    languages: parsed.languages,
    years_experience: parsed.years_experience,
  };
}
