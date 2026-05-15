/**
 * TensorFeed Jobs: signature + OFAC gate.
 *
 * Build step 2 of tensorfeed-jobs-api-endpoint-spec.md. This is the
 * compliance gate that runs before any storage or x402 settle. Still no
 * money path and no persistence here: it only proves control of the
 * poster wallet and screens it.
 *
 * Reuses shipped, audited primitives:
 *   - viem verifyMessage, the same EIP-191 path agent-claim-verify uses.
 *   - screenWalletOFAC (payments.ts), the same Chainalysis screen the
 *     ARB claim flow uses.
 *
 * Fail-closed divergence (deliberate): screenWalletOFAC fails OPEN on a
 * Chainalysis outage for the payments path so an oracle outage cannot
 * freeze TF payments. The jobs board has the opposite requirement: an
 * unscreened poster must NOT be allowed to list. So this gate allows
 * ONLY when the screen is unambiguously clean (sanctioned false AND no
 * error). Error is checked before sanctioned so a "not configured" or
 * "unreachable" result maps to screen_unavailable, never a false
 * sanctions label.
 *
 * SECURITY CONTRACT, read before composing this into the POST handler:
 *
 * What this gate DOES: proves the submitter controls poster_addr (EIP-191
 * EOA recovery) and that poster_addr is OFAC-clean, fail-closed.
 *
 * What this gate DELIBERATELY DOES NOT do, and the handler MUST:
 *   1. Replay protection. This gate will pass the SAME valid signed
 *      submission every time it is called. The handler MUST enforce
 *      signed_at freshness (jobs.validateSignedAt) AND nonce uniqueness
 *      against a stateful store BEFORE persisting, or the endpoint is
 *      trivially replayable.
 *   2. Rate limiting. The handler MUST rate-limit (existing Worker
 *      subsystem) and require the x402 fee BEFORE calling this gate. The
 *      fee is the economic DoS shield.
 *
 * Why signature is verified BEFORE the OFAC call, beyond cost: it stops
 * the endpoint from being usable as an unauthenticated Chainalysis
 * lookup oracle for arbitrary third-party addresses. Never reorder.
 *
 * v0 limitation: viem verifyMessage is EOA ecrecover only. Smart-contract
 * / account-abstraction wallets (ERC-1271) cannot post yet. This is
 * fail-safe (rejects, never wrongly accepts) and consistent with the
 * shipped ARB claim flow. ERC-1271 support is a future, additive item.
 */

import { verifyMessage } from 'viem';
import { screenWalletOFAC } from './payments';
import { buildSignedMessage, type GigSubmission } from './jobs';
import type { Env } from './types';

export type GateResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'bad_signature' | 'ofac_sanctioned' | 'screen_unavailable';
      detail?: string;
    };

/**
 * Verify the EIP-191 signature recovers to poster_addr over the exact
 * canonical message, then OFAC-screen poster_addr fail-closed.
 *
 * The message is derived here via buildSignedMessage, never accepted
 * from the caller, so there is a single deterministic signed string and
 * no room for a mismatched-message bug.
 */
/**
 * Step 1 of the gate: prove the submitter controls poster_addr. The
 * message is derived here via buildSignedMessage, never accepted from
 * the caller. Exposed granularly so the POST handler can burn the
 * replay nonce strictly BETWEEN signature verification and the OFAC
 * call (a victim's nonce must not be griefable by a bad-sig request).
 */
export async function verifyPosterSignature(
  sub: GigSubmission,
): Promise<boolean> {
  try {
    return await verifyMessage({
      address: sub.poster_addr as `0x${string}`,
      message: buildSignedMessage(sub),
      signature: sub.signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

/**
 * Generic EIP-191 recovery check: did `signature` over `message` come
 * from `address`. Used for the close action, where the message is
 * buildCloseMessage and the address is the listing's stored poster_addr
 * (so only the original poster can close their own listing).
 */
export async function verifyAddressSignature(
  address: string,
  message: string,
  signature: string,
): Promise<boolean> {
  try {
    return await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

export type ScreenResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'ofac_sanctioned' | 'screen_unavailable';
      detail?: string;
    };

/**
 * Step 2 of the gate: OFAC screen poster_addr, fail-closed. Allows ONLY
 * on an unambiguously clean result. Error is checked before sanctioned
 * so not-configured / unreachable maps to screen_unavailable, never a
 * false sanctions label.
 */
export async function screenPoster(
  sub: GigSubmission,
  env: Env,
): Promise<ScreenResult> {
  const screen = await screenWalletOFAC(sub.poster_addr, env);
  if (screen.error !== null) {
    return { ok: false, reason: 'screen_unavailable', detail: screen.error };
  }
  if (screen.sanctioned) {
    return { ok: false, reason: 'ofac_sanctioned' };
  }
  return { ok: true };
}

/**
 * Composed gate (signature then OFAC), unchanged behavior. Kept for
 * callers that do not need to interleave a nonce burn. The POST handler
 * uses the granular functions above instead so it can burn the nonce
 * between the two steps.
 */
export async function gatePosting(
  sub: GigSubmission,
  env: Env,
): Promise<GateResult> {
  if (!(await verifyPosterSignature(sub))) {
    return { ok: false, reason: 'bad_signature' };
  }
  return screenPoster(sub, env);
}
