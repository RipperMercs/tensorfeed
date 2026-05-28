/**
 * Trial-credits faucet orchestration.
 *
 * A new AI agent proves control of a wallet by signing an EIP-191
 * message (no on-chain transaction, no USDC, no gas) and receives a
 * bearer token preloaded with a small, expiring trial-credit grant. This
 * is the zero-setup conversion on-ramp: an agent can taste the premium
 * endpoints before it ever funds USDC, then top up the same flow once it
 * sees the value.
 *
 * Reuses the audited primitives rather than rolling new crypto:
 *   - parse + EIP-191 verify: viem verifyMessage (same as operator claims)
 *   - replay window: checkClaimTimestamp from agent-claim-verify
 *   - single-use nonce: isClaimNonceUsed / recordClaimNonce (shared
 *     agent-rep:claim-nonce namespace, so a nonce cannot be reused across
 *     a claim and a faucet grant)
 *   - sanctions: screenWalletOFAC (fail-closed: any screen error returns
 *     retry_later, sanctioned returns banned; we do not mint to a wallet
 *     we could not screen)
 *   - mint: mintTrialCredits in payments.ts (the one audited place that
 *     creates pay:credits tokens)
 *
 * One grant per wallet is enforced by a pay:faucet-claimed:{wallet} KV
 * marker with the same 30-day TTL as the grant, so the trial is renewable
 * after it expires. The grant is tiny (TRIAL_FAUCET_CREDITS) and the
 * wallet is sanctions-screened, so the worst-case abuse (a wallet racing
 * two fresh-nonce requests on different PoPs) is a bounded double-mint of
 * one extra grant, the same bounded-edge tolerance the welcome bonus
 * documents.
 *
 * The faucet message header text differs from the operator-claim header,
 * so a signature produced for one cannot be replayed as the other (viem
 * verifies the exact message bytes).
 */

import type { Env } from './types';
import { verifyMessage, isAddress, getAddress, type Address } from 'viem';
import { checkClaimTimestamp } from './agent-claim-verify';
import { isClaimNonceUsed, recordClaimNonce } from './agent-reputation-store';
import { mintTrialCredits, screenWalletOFAC } from './payments';

const FAUCET_NONCE_RE = /^[0-9a-fA-F]{16,64}$/;
const FAUCET_CLAIMED_PREFIX = 'pay:faucet-claimed:';
const FAUCET_CLAIMED_TTL_SECONDS = 30 * 24 * 60 * 60; // matches the grant TTL

/** The canonical message an agent signs to request trial credits. */
export const FAUCET_MESSAGE_TEMPLATE = [
  'I am requesting TensorFeed trial credits for this wallet.',
  '',
  'wallet: <0x address>',
  'timestamp: <ISO 8601>',
  'nonce: <16 to 64 hex chars>',
].join('\n');

export interface ParsedFaucetRequest {
  wallet: Address;
  timestamp: string;
  nonce: string;
}

export type FaucetParseResult =
  | { ok: true; req: ParsedFaucetRequest }
  | { ok: false; error: 'invalid_message_shape' | 'invalid_wallet' | 'invalid_timestamp' | 'invalid_nonce' };

/** Parse a `key: value` line. Returns null when the shape does not match. */
function parseKeyValue(line: string): { key: string; value: string } | null {
  const idx = line.indexOf(':');
  if (idx === -1) return null;
  const key = line.slice(0, idx).trim().toLowerCase();
  const value = line.slice(idx + 1).trim();
  if (!key) return null;
  return { key, value };
}

/**
 * Slim parser for the faucet message. Validates only wallet, timestamp,
 * and nonce. It deliberately does NOT accept display_name or any directory
 * fields, so the faucet never touches brand-allowlist or moderation.
 */
export function parseFaucetMessage(message: string): FaucetParseResult {
  if (typeof message !== 'string' || message.length === 0 || message.length > 2048) {
    return { ok: false, error: 'invalid_message_shape' };
  }
  const lines = message.split('\n');
  if (lines.length > 100) return { ok: false, error: 'invalid_message_shape' };
  const map = new Map<string, string>();
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const kv = parseKeyValue(line);
    if (!kv) continue; // header text and other non kv lines are ignored
    map.set(kv.key, kv.value);
  }

  const walletRaw = map.get('wallet');
  if (!walletRaw || !isAddress(walletRaw)) return { ok: false, error: 'invalid_wallet' };
  let wallet: Address;
  try {
    wallet = getAddress(walletRaw);
  } catch {
    return { ok: false, error: 'invalid_wallet' };
  }

  const timestamp = map.get('timestamp');
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) {
    return { ok: false, error: 'invalid_timestamp' };
  }

  const nonce = map.get('nonce');
  if (!nonce || !FAUCET_NONCE_RE.test(nonce)) return { ok: false, error: 'invalid_nonce' };

  return { ok: true, req: { wallet, timestamp, nonce } };
}

export type FaucetOutcome =
  | { ok: true; status: 'granted'; wallet: string; token: string; credits: number; expires_at: string }
  | { ok: false; status: 'bad_request'; error: string }
  | { ok: false; status: 'already_claimed'; wallet: string; claimed_until: string | null }
  | { ok: false; status: 'rejected'; reason: 'replay_window_expired' | 'signature_invalid' | 'nonce_replayed' }
  | { ok: false; status: 'banned'; reason: 'ofac_sanctioned' }
  | { ok: false; status: 'retry_later'; reason: 'ofac_oracle_unreachable' };

export interface FaucetBody {
  message?: unknown;
  signature?: unknown;
}

export interface FaucetDeps {
  /** Override "now" (ms) for tests. */
  now?: number;
  /** OFAC screen. Defaults to screenWalletOFAC; injectable for tests. */
  screen?: (wallet: string, env: Env) => Promise<{ sanctioned: boolean; error?: string | null }>;
  /** Mint. Defaults to mintTrialCredits; injectable for tests. */
  mint?: (env: Env, agentUa: string) => Promise<{ token: string; credits: number; expiresAt: string }>;
}

/**
 * Orchestrate a faucet claim. Decision tree (first match wins):
 *   1. Body shape / signature shape -> bad_request
 *   2. Message parse                -> bad_request
 *   3. Timestamp outside window     -> rejected (replay_window_expired)
 *   4. ECDSA mismatch               -> rejected (signature_invalid)
 *   5. Nonce already used           -> rejected (nonce_replayed)  [then burn]
 *   6. Wallet already claimed       -> already_claimed
 *   7. OFAC sanctioned              -> banned
 *   8. OFAC unreachable             -> retry_later (fail-closed)
 *   9. Default                      -> granted (mint)
 */
export async function handleFaucetClaim(
  env: Env,
  body: FaucetBody,
  agentUa: string,
  deps: FaucetDeps = {},
): Promise<FaucetOutcome> {
  const now = deps.now ?? Date.now();
  const screen = deps.screen ?? screenWalletOFAC;
  const mint = deps.mint ?? mintTrialCredits;

  // 1. Body + signature shape (cheap rejects before any ECDSA work).
  if (typeof body.message !== 'string' || typeof body.signature !== 'string') {
    return { ok: false, status: 'bad_request', error: 'missing_body_fields' };
  }
  const message = body.message;
  const signature = body.signature;
  if (!/^0x[0-9a-fA-F]+$/.test(signature) || signature.length < 130 || signature.length > 134) {
    return { ok: false, status: 'bad_request', error: 'invalid_signature_shape' };
  }

  // 2. Parse.
  const parsed = parseFaucetMessage(message);
  if (!parsed.ok) return { ok: false, status: 'bad_request', error: parsed.error };
  const { wallet, timestamp, nonce } = parsed.req;

  // 3. Replay window.
  if (!checkClaimTimestamp(timestamp, now)) {
    return { ok: false, status: 'rejected', reason: 'replay_window_expired' };
  }

  // 4. ECDSA signature.
  let sigValid = false;
  try {
    sigValid = await verifyMessage({ address: wallet, message, signature: signature as `0x${string}` });
  } catch {
    sigValid = false;
  }
  if (!sigValid) return { ok: false, status: 'rejected', reason: 'signature_invalid' };

  // 5. Nonce single-use. Check then burn immediately (before external
  // calls) so two concurrent submissions of the same signed message
  // cannot both proceed.
  if (await isClaimNonceUsed(env, nonce)) {
    return { ok: false, status: 'rejected', reason: 'nonce_replayed' };
  }
  await recordClaimNonce(env, nonce);

  // 6. One grant per wallet.
  const claimedKey = `${FAUCET_CLAIMED_PREFIX}${wallet.toLowerCase()}`;
  const existing = await env.TENSORFEED_CACHE.get(claimedKey);
  if (existing !== null) {
    return { ok: false, status: 'already_claimed', wallet, claimed_until: existing || null };
  }

  // 7 + 8. OFAC screen, fail-closed. We do not mint to a wallet we could
  // not screen, and we do not mint to a sanctioned wallet.
  const result = await screen(wallet, env);
  if (result.error) {
    return { ok: false, status: 'retry_later', reason: 'ofac_oracle_unreachable' };
  }
  if (result.sanctioned) {
    return { ok: false, status: 'banned', reason: 'ofac_sanctioned' };
  }

  // 9. Stake the one-grant marker BEFORE minting to minimize the
  // double-mint window, then mint.
  const minted = await mint(env, agentUa);
  await env.TENSORFEED_CACHE.put(claimedKey, minted.expiresAt, {
    expirationTtl: FAUCET_CLAIMED_TTL_SECONDS,
  });

  return {
    ok: true,
    status: 'granted',
    wallet,
    token: minted.token,
    credits: minted.credits,
    expires_at: minted.expiresAt,
  };
}
