import { Env } from './types';
import { checkCircuitBreaker } from './circuit-breaker';
import type { NoChargeReason } from './receipts';
import { checkSpendCap, incrementDailySpent, validateSpendCap } from './spend-cap';
import { recordAndAssess as recordAnomalySpend, listAnomalyEvents, AnomalyEvent } from './anomaly';
import {
  checkFreeTrialQuota,
  getClientIP as getClientIPFromRequest,
  type FreeTrialQuota,
} from './rate-limit';
import { isStrictPremiumPath } from './strict-premium-endpoints';
import { describe402Freshness } from './freshness';
import {
  parseAnyXPaymentHeader,
  verifyPayment as verifyX402Payment,
  settlePayment as settleX402Payment,
  encodeSettlementHeader,
  getX402Config,
  type PaymentRequirements as X402PaymentRequirements,
  type PaymentPayload as X402PaymentPayload,
} from './x402-facilitator';
// Bazaar pilot routing (worker/src/cdp-facilitator.ts + bazaar-pilots.ts).
// X-PAYMENT settlements for paths in the bazaar pilot set route through
// CDP's hosted facilitator instead of our self-broadcast facilitator,
// triggering automatic Bazaar catalog indexing on first successful settle.
// All other endpoints continue to use the self-broadcast path unchanged.
import { cdpVerify, cdpSettle } from './cdp-facilitator';
import { SOLANA_USDC_MINT, SOLANA_NETWORK_V2, SOLANA_FEEPAYER_V2 } from './solana-rail';
import { getPaymentClaim } from './payment-claim';
import {
  isBazaarPilotPath,
  bazaarExtensionsFor,
  bazaarDescriptionFor,
  getBazaarPilotConfig,
  canonicalDiscoveryInput,
  canonicalDiscoveryOutput,
} from './bazaar-pilots';
import type { DebitResult, MintResult } from './credit-ledger';

/**
 * Payment middleware for premium endpoints.
 *
 * Architecture: USDC on Base, credits-first with x402 fallback.
 *  - Agent buys credits once via /api/payment/buy-credits + /api/payment/confirm
 *  - Worker mints a bearer token, decrements credits per call (50ms latency)
 *  - Per-call x402 still works as a discovery fallback (slower, but no pre-flight)
 *
 * KV layout (TENSORFEED_CACHE namespace):
 *   pay:credits:{token}   -> { balance, created, last_used, agent_ua, total_purchased } (no TTL)
 *   pay:tx:{txHash}       -> { amount_usd, credits, token, created } (no TTL, replay protection)
 *   pay:quote:{nonce}     -> { amount_usd, credits, expires_at, created } (TTL: 30 min)
 *   pay:revenue:{date}    -> { total_usd, tx_count, unique_agents } (no TTL, daily rollup)
 *   pay:usage:{token}     -> { entries: TokenUsageEntry[] } ring buffer of last 100 calls per token
 *
 * On-chain trust anchor: Base mainnet RPC verifies the USDC Transfer event
 * to our wallet. We log the block_number on every accepted tx for forensic
 * traceability.
 *
 * Wallet attestation for MVP: TLS + multi-publication (llms.txt,
 * /api/payment/info, README, X bio). DNS TXT signed attestation deferred
 * to Phase 2 if a real attack surface emerges.
 */

// === Constants ===

const USDC_BASE_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
// keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const USDC_DECIMALS = 6;
const DEFAULT_BASE_RPC = 'https://mainnet.base.org';

const QUOTE_TTL_SECONDS = 30 * 60;
// Tier 4 added 2026-05-26 for /api/premium/whats-new/pro (Parallel.ai-style
// tier ladder, Haiku-derived analyst synthesis at 10 credits per call).
// Tier 5 added 2026-07-09 for the CVE Check product: a flat $1.00 charge
// (50 credits x $0.02/credit).
export const TIER_COSTS: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 1, 2: 1, 3: 5, 4: 10, 5: 50 };

// First-payment welcome bonus. Granted once per sender wallet, on the
// first successful USDC payment from that address (credits flow OR
// x402 fallback). Redeemed by writing a `pay:wallet-seen:{address}`
// marker in TENSORFEED_CACHE. Race-safe under last-write-wins KV via
// the stake-first check-write-recheck pattern in
// checkAndMarkFirstPayment (2026-05-26, audit CR-2). The prior comment
// here claimed "one extra bonus capped at $1" but the actual bound was
// N parallel calls per wallet = N * $1; the stake-first fix prevents
// double-mint under any number of concurrent confirms.
const WELCOME_BONUS_CREDITS = 50;
// TTL for a pending stake in pay:wallet-seen:{addr}. Bounds the
// recovery window after a crash: if the winning request dies before
// upgrading the marker to committed, a fresh confirm within 60s falls
// through and the bonus minter can re-fire. Acceptable bounded edge.
const WALLET_SEEN_STAKE_TTL_S = 60;

// Volume tiers (credits per USD): higher tiers are cheaper per credit
function creditsPerUsd(amountUsd: number): { rate: number; tier: string } {
  if (amountUsd >= 200) return { rate: 80, tier: '40% volume discount' };
  if (amountUsd >= 30) return { rate: 65, tier: '25% volume discount' };
  if (amountUsd >= 5) return { rate: 55, tier: '10% volume discount' };
  return { rate: 50, tier: 'base' };
}

function calculateCredits(amountUsd: number): number {
  return Math.floor(amountUsd * creditsPerUsd(amountUsd).rate);
}

// === Internal types ===

interface CreditsRecord {
  balance: number;
  created: string;
  last_used: string;
  agent_ua: string;
  total_purchased: number;
  /**
   * Optional per-token daily credit-spend cap. null/undefined means
   * unlimited daily spend (bounded only by balance). When set, the cap
   * is enforced in requirePayment and the daily spend is tracked in
   * `pay:spend:{token}:{YYYY-MM-DD}` (TTL 48h). See spend-cap.ts.
   */
  daily_cap?: number | null;
}

interface QuoteRecord {
  amount_usd: number;
  // USDC base units (10^6 = 1 USDC) the quote was issued for. Used for
  // strict integer comparison against the on-chain transfer amount so
  // we cannot be tricked into issuing tier-bonus credits for an
  // underpayment that lands inside a float-tolerance window. See
  // confirmPayment's amount-match check below for the concrete
  // comparison; closes the 2026-05-05 multi-LLM-flagged finding.
  // Optional only for backwards-compat with quotes issued before this
  // field existed (within the 30-min quote TTL window of deploy).
  amount_base_units?: number;
  credits: number;
  expires_at: number;
  created: string;
  // EOA wallet address that will send the USDC payment. Lowercased hex.
  // Set at quote creation; confirmPayment refuses to mint credits unless
  // the on-chain tx's `from` address matches this exactly. Closes the
  // "Tx Sniper" attack where an attacker observes a public tx hash in
  // the Base mempool and races to /api/payment/confirm with their own
  // HTTP request to steal the credits.
  sender_wallet: string;
}

interface TxRecord {
  amount_usd: number;
  credits: number;
  token: string;
  created: string;
  block_number?: number;
  // EOA that signed the on-chain USDC transfer for this tx_hash.
  // Lowercased hex. Used to gate x402-fallback re-use of an existing
  // tx so a public mempool observer cannot replay another agent's
  // tx_hash to spend against their issued token. Optional for legacy
  // (pre-2026-05-05) records; on the x402 path, missing values fail
  // closed and force the original bearer-token flow.
  sender_wallet?: string;
  // Short-lived claim-intent marker. Set true on the placeholder record
  // written BEFORE on-chain verification; unset on the final record
  // written AFTER verification succeeds. Closes the cross-PoP KV
  // propagation race that previously allowed a single tx_hash to mint
  // N independent tokens via concurrent /api/payment/confirm calls
  // landing on different Cloudflare PoPs. Pending records carry a 60s
  // TTL so a transient verification failure self-heals.
  pending?: boolean;
}

// TTL for the in-flight claim placeholder. Sized to cover Cloudflare
// KV's documented worst-case global propagation window (~60 seconds).
const CLAIM_INTENT_TTL_SECONDS = 60;

interface DailyRollup {
  date: string;
  // Revenue side (credit purchases)
  total_usd: number;
  tx_count: number;
  // Usage side (premium endpoint calls)
  total_credits_charged: number;
  call_count: number;
  // Cross-cutting
  unique_agents: string[]; // capped at 100
  by_endpoint: Record<
    string,
    {
      calls: number;
      credits_charged: number;
      first_seen: string;
      last_seen: string;
      // Distinct paying wallets seen on this endpoint today. Optional for
      // backward compat with rollups written before the usage meter; the
      // accumulator treats a missing value as zero.
      distinct_payers?: number;
    }
  >;
  top_agents: Array<{
    agent_ua: string;
    calls: number;
    credits: number;
    purchased_usd: number;
    last_seen: string;
  }>; // capped at 25, sorted by calls desc
  // Per-wallet paid totals for the day, keyed by lowercased wallet address.
  // Populated only when a payer wallet is surfaced at settle time; the
  // UA-only call path leaves this undefined (backward compatible).
  // wallet_raw retains the original case: base58 Solana addresses are
  // case-sensitive, so the lowercase KEY (kept for dedupe stability) is
  // lossy and cannot be looked up on-chain. rail tags the settlement VM.
  top_payers?: Record<
    string,
    {
      calls: number;
      credits_charged: number;
      first_seen: string;
      last_seen: string;
      wallet_raw?: string;
      rail?: 'evm' | 'svm';
    }
  >;
  // Per-rail paid totals for the day. Only settle-attributed calls (a payer
  // wallet was surfaced) count here; bearer-token calls with no wallet have
  // no rail to attribute. Absent until the first attributed call.
  rails?: Partial<Record<'evm' | 'svm', { calls: number; credits_charged: number }>>;
  // Persisted dedupe ledger for distinct_payers, keyed by "endpoint|wallet".
  // Lives in the daily rollup so it resets with the day. Lets us increment a
  // per-endpoint distinct-payer count only the first time a wallet hits that
  // endpoint today, without storing the full payer list per endpoint.
  _payer_seen?: Record<string, boolean>;
}

// === Helpers ===

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `tf_live_${toHex(bytes)}`;
}

function generateNonce(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `tf-${toHex(bytes)}`;
}

// === Trial credits faucet (zero-payment on-ramp) ===
//
// The faucet mints a small, one-time, expiring credits grant to an agent
// that proves control of a wallet via an EIP-191 signature (no on-chain
// transaction, no USDC, no gas). It is the conversion on-ramp: a new
// agent can taste the premium endpoints before funding. The grant is an
// ordinary pay:credits token (total_purchased: 0) with a 30-day KV TTL,
// so it spends and debits exactly like a purchased token and expires on
// its own. Orchestration (signature verify, OFAC screen, single-use
// nonce, one-grant-per-wallet) lives in faucet.ts; the mint itself lives
// here next to the other token-minting paths so all credit creation is
// in one audited module.
export const TRIAL_FAUCET_CREDITS = 25;
export const TRIAL_FAUCET_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export async function mintTrialCredits(
  env: Env,
  agentUa: string,
): Promise<{ token: string; credits: number; expiresAt: string }> {
  const token = generateToken();
  const now = new Date();
  const record: CreditsRecord = {
    balance: TRIAL_FAUCET_CREDITS,
    created: now.toISOString(),
    last_used: now.toISOString(),
    agent_ua: agentUa,
    total_purchased: 0,
  };
  await env.TENSORFEED_CACHE.put(`pay:credits:${token}`, JSON.stringify(record), {
    expirationTtl: TRIAL_FAUCET_TTL_SECONDS,
  });
  const expiresAt = new Date(now.getTime() + TRIAL_FAUCET_TTL_SECONDS * 1000).toISOString();
  return { token, credits: TRIAL_FAUCET_CREDITS, expiresAt };
}

/**
 * Normalize the Bazaar extension block for CDP's indexer. CDP's hosted
 * indexer at api.cdp.coinbase.com/platform/v2/x402/discovery/resources
 * reads three signals our static BazaarPilotConfig blocks were missing
 * (per the 2026-05-25 catalog deep-dive):
 *   1. info.input.discoverable: true  (BlockRun ships this; entries
 *      without it appear to be silently skipped from /discovery)
 *   2. info.input.url  (full origin URL of the resource, repeated even
 *      though accepts[].resource carries it too)
 *   3. NO "$schema" pin on schema  (CDP loads draft-2020-12 implicitly;
 *      an explicit pin can cause silent reject in some validators)
 *
 * Returns a fresh object on every call (deep clone), so the shared
 * module-level config in bazaar-pilots.ts is never mutated.
 */
export function normalizeBazaarExtensionsForCDP(
  ext: Record<string, unknown>,
  _resourceUrl: string,
): Record<string, unknown> {
  // Pass-through empty (non-pilot endpoints).
  if (!ext || Object.keys(ext).length === 0) return ext;
  // Emit the static pilot bazaar config verbatim EXCEPT strip
  // bazaar.schema.$schema. CDP's Bazaar discovery validator compiles the
  // seller's own bazaar.schema with a draft-07 Ajv and validates info against
  // it (validateDiscoveryExtension in x402-foundation/x402,
  // bazaar/facilitator.ts: new Ajv({strict:false}).compile(schema)(info)). A
  // pinned `$schema: ".../draft/2020-12/schema"` makes that compile THROW ("no
  // schema with key or ref ...2020-12..."), which CDP surfaces as rejected /
  // "invalid discovery configuration", so the resource never catalogs.
  // Reproduced offline 2026-06-29: WITH $schema the schema throws under
  // draft-07; WITHOUT it the schema compiles AND info validates (identical to
  // cataloged peers like deepnets). CDP re-injects a normalized $schema into
  // the STORED record, which is why cataloged peers appear to keep it. Do NOT
  // add queryFields/pathFields/output.schema: the seller schema's input
  // additionalProperties:false rejects those as illegal extra props.
  const cloned: Record<string, unknown> = JSON.parse(JSON.stringify(ext));
  const bazaar = cloned.bazaar as Record<string, unknown> | undefined;
  if (bazaar && bazaar.schema && typeof bazaar.schema === 'object') {
    delete (bazaar.schema as Record<string, unknown>).$schema;
  }
  return cloned;
}

function checkRequestCircuit(request: Request, token: string) {
  const url = new URL(request.url);
  const sortedParams = [...url.searchParams.entries()].sort(
    ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0),
  );
  const canonicalQuery = sortedParams.map(([k, v]) => `${k}=${v}`).join('&');
  // Use a non-secret prefix as the lookup key so the full bearer token
  // never lives in the in-memory tracker.
  return checkCircuitBreaker(token.slice(0, 16), url.pathname, canonicalQuery);
}

function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

// === On-chain verification ===

interface VerifiedTx {
  ok: boolean;
  reason?: string;
  amountUsd: number;
  // Exact integer base units transferred on-chain (1 USDC = 10^6 base
  // units). Used for the strict-equality amount-match check against the
  // quote, so a sub-cent underpayment cannot trick us into issuing
  // tier-bonus credits via float-tolerance gaming.
  amountBaseUnits?: number;
  blockNumber?: number;
  // Lowercased 0x-prefixed sender address pulled from Transfer event topics[1].
  // Used by the Chainalysis OFAC screen on /api/payment/confirm before any
  // credits are minted.
  senderAddress?: string;
}

interface RpcLog {
  address: string;
  topics: string[];
  data: string;
}

interface RpcReceipt {
  status: string;
  logs: RpcLog[];
  blockNumber: string;
}

export async function verifyBaseUSDCTransaction(
  txHash: string,
  env: Env,
): Promise<VerifiedTx> {
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return { ok: false, reason: 'invalid_tx_hash_format', amountUsd: 0 };
  }

  const rpcUrl = env.BASE_RPC_URL || DEFAULT_BASE_RPC;
  let receipt: RpcReceipt;
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return { ok: false, reason: `rpc_http_${res.status}`, amountUsd: 0 };
    }
    const json = (await res.json()) as { result?: RpcReceipt | null; error?: { message: string } };
    if (json.error) {
      return { ok: false, reason: `rpc_error: ${json.error.message}`, amountUsd: 0 };
    }
    if (!json.result) {
      return { ok: false, reason: 'tx_not_found_or_pending', amountUsd: 0 };
    }
    receipt = json.result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `rpc_fetch_failed: ${msg}`, amountUsd: 0 };
  }

  if (receipt.status !== '0x1') {
    return { ok: false, reason: 'tx_failed_on_chain', amountUsd: 0 };
  }

  const ourWallet = env.PAYMENT_WALLET.toLowerCase();
  const usdcContractLower = USDC_BASE_CONTRACT.toLowerCase();

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== usdcContractLower) continue;
    if (!log.topics || log.topics[0] !== TRANSFER_TOPIC) continue;
    if (log.topics.length < 3) continue;
    // topics[1] is the sender, topics[2] is the recipient (both 32-byte
    // left-padded). Last 40 hex chars are the actual address.
    const fromAddress = '0x' + log.topics[1].slice(-40).toLowerCase();
    const toAddress = '0x' + log.topics[2].slice(-40).toLowerCase();
    if (toAddress !== ourWallet) continue;

    const amountWei = BigInt(log.data);
    const amountUsd = Number(amountWei) / Math.pow(10, USDC_DECIMALS);
    // amountBaseUnits is the exact integer USDC base-units transferred.
    // Cap is 10000 USDC = 10^10 base units, well under JS Number's
    // safe-integer limit (2^53), so Number() is lossless here.
    const amountBaseUnits = Number(amountWei);

    return {
      ok: true,
      amountUsd,
      amountBaseUnits,
      blockNumber: parseInt(receipt.blockNumber, 16),
      senderAddress: fromAddress,
    };
  }

  return { ok: false, reason: 'no_usdc_transfer_to_wallet', amountUsd: 0 };
}

// === OFAC sanctions screening (Chainalysis public sanctions API) ===
//
// The Chainalysis public API is free in perpetuity for OFAC SDN
// screening. Endpoint: GET https://public.chainalysis.com/api/v1/address/{addr}
// with X-API-Key header. Response shape:
//   { identifications: [{ category, name, description, url }, ...] }
// An empty array means clean. A 404 response also means clean (the
// address is not in their sanctions database). Other non-2xx responses
// are treated as transient upstream errors.
//
// Failure posture:
//  - Misconfigured (no API key bound): fail CLOSED with 503. Refusing
//    to mint credits is safer than allowing them with no screen.
//  - Chainalysis unreachable / 5xx: fail OPEN with logging. A
//    Chainalysis outage should not freeze TensorFeed payments. The
//    spec note allows flipping FAIL_CLOSED if regulator pressure or
//    audit findings ever require it.
//  - Sanctioned hit: refuse, log, and (if OFAC_AUDIT_LOG is bound)
//    persist for 7 years per the privacy policy retention statement.

interface OFACScreenResult {
  sanctioned: boolean;
  identifications: unknown[] | null;
  error: string | null;
}

interface ChainalysisResponse {
  identifications?: unknown[];
}

const CHAINALYSIS_TIMEOUT_MS = 8000;

// B-F5: in-isolate clean-screen cache. NOT KV. A short memory-only
// cache of addresses we screened unambiguously clean (200 zero-ids or
// 404) so a brief Chainalysis 429/5xx does not hard-block a repeat
// legitimate payer. A sanctioned or errored result is NEVER cached.
const OFAC_CLEAN_TTL_MS = 120_000;
const ofacCleanCache = new Map<string, number>();

function markOfacScreenClean(addr: string): void {
  ofacCleanCache.set(addr.toLowerCase(), Date.now() + OFAC_CLEAN_TTL_MS);
}

function hasRecentCleanOfacScreen(addr: string): boolean {
  const exp = ofacCleanCache.get(addr.toLowerCase());
  if (exp === undefined) return false;
  if (Date.now() > exp) {
    ofacCleanCache.delete(addr.toLowerCase());
    return false;
  }
  return true;
}

// Transient Chainalysis failure (outage / rate-limit / unreachable), as
// distinct from a confirmed sanctions hit or a misconfig. These are the
// only errors B-F5 fails closed on (without flagging the wallet).
function isTransientOfacError(err: string | null): err is string {
  return (
    !!err &&
    (err.startsWith('chainalysis_status_') ||
      err.startsWith('chainalysis_unreachable'))
  );
}

/**
 * B-F5: decide whether a transient screening failure should fail closed.
 * Returns 'reject' (no recent clean screen on file, refuse the mint, do
 * NOT flag the wallet) or 'cache_pass' (a clean screen within the TTL,
 * allow through a brief outage). Logs the decision in structured form
 * so a sustained degraded window is queryable/alertable, not silent.
 */
function ofacTransientDecision(
  addr: string,
  err: string,
  context: string,
): 'reject' | 'cache_pass' {
  const decision = hasRecentCleanOfacScreen(addr) ? 'cache_pass' : 'reject';
  console.log(
    JSON.stringify({
      event: 'ofac_screen_degraded',
      alert: decision === 'reject',
      wallet: addr,
      context,
      error: err,
      decision,
      timestamp: new Date().toISOString(),
    }),
  );
  return decision;
}

// SHA-256 hex of a string. Used to derive a stable, bounded discriminator for
// Solana payments (which carry no EIP-3009 nonce) for the OFAC block record
// and the payment-claim idempotency key.
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function screenWalletOFAC(
  walletAddress: string,
  env: Env,
): Promise<OFACScreenResult> {
  if (!walletAddress || typeof walletAddress !== 'string') {
    return { sanctioned: false, identifications: null, error: 'invalid_address' };
  }
  if (!env.CHAINALYSIS_API_KEY) {
    return { sanctioned: true, identifications: null, error: 'screening_not_configured' };
  }
  const url = 'https://public.chainalysis.com/api/v1/address/' + encodeURIComponent(walletAddress);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': env.CHAINALYSIS_API_KEY,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(CHAINALYSIS_TIMEOUT_MS),
    });
    if (!res.ok) {
      // 404 means address not in their sanctions database, treat as clean.
      if (res.status === 404) {
        markOfacScreenClean(walletAddress);
        return { sanctioned: false, identifications: [], error: null };
      }
      return { sanctioned: false, identifications: null, error: 'chainalysis_status_' + res.status };
    }
    const data = (await res.json()) as ChainalysisResponse;
    const ids = Array.isArray(data?.identifications) ? data.identifications : [];
    if (ids.length === 0) markOfacScreenClean(walletAddress);
    return { sanctioned: ids.length > 0, identifications: ids, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { sanctioned: false, identifications: null, error: 'chainalysis_unreachable: ' + msg };
  }
}

async function persistOFACBlock(
  env: Env,
  walletAddress: string,
  txHash: string,
  identifications: unknown[] | null,
): Promise<void> {
  const log = {
    event: 'ofac_block',
    wallet: walletAddress,
    tx_hash: txHash,
    identifications,
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(log));
  if (!env.OFAC_AUDIT_LOG) return;
  const day = new Date().toISOString().slice(0, 10);
  const key = 'ofac:' + day + ':' + walletAddress.toLowerCase() + ':' + txHash.toLowerCase();
  try {
    await env.OFAC_AUDIT_LOG.put(
      key,
      JSON.stringify({
        wallet: walletAddress,
        tx_hash: txHash,
        identifications,
        screened_at: log.timestamp,
      }),
      { expirationTtl: 60 * 60 * 24 * 365 * 7 }, // 7 years
    );
  } catch (e) {
    console.error('persistOFACBlock kv write failed:', e);
  }
}

// === Daily rollup (revenue + usage analytics) ===
//
// Single KV key per day captures both purchase events (revenue side) and
// per-endpoint call events (usage side) plus a top-agent leaderboard.
// One read+write per event. KV is last-write-wins; under heavy concurrency
// some increments may be lost but at MVP scale this is acceptable. If/when
// concurrency becomes a problem, move to Durable Objects with atomic
// counters.

const ROLLUP_AGENT_CAP = 100;
const ROLLUP_TOP_AGENTS_CAP = 25;

function emptyRollup(date: string): DailyRollup {
  return {
    date,
    total_usd: 0,
    tx_count: 0,
    total_credits_charged: 0,
    call_count: 0,
    unique_agents: [],
    by_endpoint: {},
    top_agents: [],
  };
}

async function readRollup(env: Env, date: string): Promise<DailyRollup> {
  const existing = (await env.TENSORFEED_CACHE.get(`pay:rollup:${date}`, 'json')) as DailyRollup | null;
  return existing || emptyRollup(date);
}

async function writeRollup(env: Env, rollup: DailyRollup): Promise<void> {
  await env.TENSORFEED_CACHE.put(`pay:rollup:${rollup.date}`, JSON.stringify(rollup));
}

// === Lifetime traction counter ===
//
// A single O(1) key tallying successful, credit-debited premium calls
// across all time. The public /api/stats headline reads ONLY this key;
// it never sums the dated rollups per request (that grows unbounded and
// would blow the KV budget). It is bumped inside logPremiumUsage's
// existing best-effort try/catch, which is itself ctx.waitUntil
// fire-and-forget at every call site, so it can never block a response
// or touch the billing path. The extra read+write rides a path that
// already does one read+write per premium call, and premium traffic is
// paid and low volume, so it is a rounding error against the 100k/day
// budget. Rationale: tensorfeed-work/traction-counter/DESIGN.md.

const LIFETIME_KEY = 'pay:stats:lifetime';

export interface LifetimeStats {
  premium_calls: number;
  total_credits_charged: number;
  // Real-money signal. usd_received is the gross USD settled across all
  // credit purchases; paid_settlements is the number of settled purchases.
  // These come from logRevenue (the settle path), not from served calls,
  // so they reflect actual revenue rather than served-response volume.
  usd_received: number;
  paid_settlements: number;
  first_at: string | null;
  last_at: string | null;
}

function emptyLifetime(): LifetimeStats {
  return {
    premium_calls: 0,
    total_credits_charged: 0,
    usd_received: 0,
    paid_settlements: 0,
    first_at: null,
    last_at: null,
  };
}

export async function getLifetimeStats(env: Env): Promise<LifetimeStats> {
  const v = (await env.TENSORFEED_CACHE.get(LIFETIME_KEY, 'json')) as Partial<LifetimeStats> | null;
  if (!v) return emptyLifetime();
  // Coalesce fields that may be absent on values persisted before they
  // existed (usd_received / paid_settlements), so callers always get a
  // fully populated object instead of undefined.
  return {
    premium_calls: v.premium_calls ?? 0,
    total_credits_charged: v.total_credits_charged ?? 0,
    usd_received: v.usd_received ?? 0,
    paid_settlements: v.paid_settlements ?? 0,
    first_at: v.first_at ?? null,
    last_at: v.last_at ?? null,
  };
}

async function bumpLifetime(env: Env, creditsCharged: number, atIso: string): Promise<void> {
  const s = await getLifetimeStats(env);
  s.premium_calls += 1;
  s.total_credits_charged += creditsCharged;
  if (!s.first_at) s.first_at = atIso;
  s.last_at = atIso;
  await env.TENSORFEED_CACHE.put(LIFETIME_KEY, JSON.stringify(s));
}

// Real-money sibling of bumpLifetime. Best-effort, same fire-and-forget
// posture: tallies gross USD settled and the count of settlements into the
// single lifetime counter so /api/stats can lead with actual revenue rather
// than served-response volume. Called from logRevenue inside its try/catch.
async function bumpLifetimeRevenue(env: Env, amountUsd: number): Promise<void> {
  const s = await getLifetimeStats(env);
  s.usd_received = parseFloat((s.usd_received + amountUsd).toFixed(2));
  s.paid_settlements += 1;
  await env.TENSORFEED_CACHE.put(LIFETIME_KEY, JSON.stringify(s));
}

/**
 * One-time, idempotent backfill: recompute the lifetime counter from the
 * persisted (no-TTL) dated rollups so /api/stats launches at the true
 * historical number instead of zero. Safe to re-run; it recomputes from
 * the authoritative rollups and overwrites. Paginates KV list so it is
 * correct beyond one page. ADMIN-gated at the route, never per-request.
 */
export async function backfillLifetimeFromRollups(env: Env): Promise<LifetimeStats> {
  let cursor: string | undefined;
  let calls = 0;
  let credits = 0;
  let usd = 0;
  let settlements = 0;
  let minDate: string | null = null;
  let maxDate: string | null = null;
  const prefix = 'pay:rollup:';
  do {
    const page = await env.TENSORFEED_CACHE.list({ prefix, cursor });
    for (const k of page.keys) {
      // Do not rely on list() honoring the prefix; guard explicitly so
      // this is correct regardless of KV-list behavior.
      if (!k.name.startsWith(prefix)) continue;
      const date = k.name.slice(prefix.length);
      const r = (await env.TENSORFEED_CACHE.get(k.name, 'json')) as DailyRollup | null;
      if (!r || typeof r.call_count !== 'number') continue;
      calls += r.call_count || 0;
      credits += r.total_credits_charged || 0;
      usd += r.total_usd || 0;
      settlements += r.tx_count || 0;
      if (!minDate || date < minDate) minDate = date;
      if (!maxDate || date > maxDate) maxDate = date;
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  const s: LifetimeStats = {
    premium_calls: calls,
    total_credits_charged: credits,
    usd_received: parseFloat(usd.toFixed(2)),
    paid_settlements: settlements,
    first_at: minDate ? `${minDate}T00:00:00.000Z` : null,
    last_at: maxDate ? `${maxDate}T23:59:59.999Z` : null,
  };
  await env.TENSORFEED_CACHE.put(LIFETIME_KEY, JSON.stringify(s));
  return s;
}

function noteUniqueAgent(rollup: DailyRollup, agentUa: string): void {
  if (!rollup.unique_agents.includes(agentUa)) {
    rollup.unique_agents.push(agentUa);
    if (rollup.unique_agents.length > ROLLUP_AGENT_CAP) {
      rollup.unique_agents = rollup.unique_agents.slice(-ROLLUP_AGENT_CAP);
    }
  }
}

function bumpTopAgent(
  rollup: DailyRollup,
  agentUa: string,
  delta: { calls?: number; credits?: number; purchased_usd?: number },
): void {
  const now = new Date().toISOString();
  let entry = rollup.top_agents.find(a => a.agent_ua === agentUa);
  if (!entry) {
    entry = { agent_ua: agentUa, calls: 0, credits: 0, purchased_usd: 0, last_seen: now };
    rollup.top_agents.push(entry);
  }
  entry.calls += delta.calls ?? 0;
  entry.credits += delta.credits ?? 0;
  entry.purchased_usd = parseFloat(((entry.purchased_usd ?? 0) + (delta.purchased_usd ?? 0)).toFixed(2));
  entry.last_seen = now;
  rollup.top_agents.sort((a, b) => b.calls - a.calls || b.credits - a.credits);
  if (rollup.top_agents.length > ROLLUP_TOP_AGENTS_CAP) {
    rollup.top_agents = rollup.top_agents.slice(0, ROLLUP_TOP_AGENTS_CAP);
  }
}

export async function logRevenue(env: Env, amountUsd: number, agentUa: string): Promise<void> {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const rollup = await readRollup(env, date);
    rollup.total_usd = parseFloat((rollup.total_usd + amountUsd).toFixed(2));
    rollup.tx_count += 1;
    noteUniqueAgent(rollup, agentUa);
    bumpTopAgent(rollup, agentUa, { purchased_usd: amountUsd });
    await writeRollup(env, rollup);

    // Lifetime real-money counter. Same best-effort path as the rollup
    // write above; surfaced on /api/stats as the actual revenue signal.
    await bumpLifetimeRevenue(env, amountUsd);
  } catch (e) {
    console.error('logRevenue failed:', e);
  }
}

/**
 * Record a successful premium endpoint call so we can see what's selling.
 * Caller should wrap in ctx.waitUntil so this never blocks the response.
 *
 * Writes to two places:
 *   1. The site-wide daily rollup (pay:rollup:{date})
 *   2. The per-token usage ring buffer (pay:usage:{token}) when token is set,
 *      so /api/payment/usage and the human-facing /account dashboard can
 *      show "you spent N credits across these endpoints" without scanning
 *      every daily rollup.
 *
 * payerWallet is optional and best-effort: when the paying wallet is
 * surfaced at settle time, it accumulates a per-wallet paid total
 * (top_payers, keyed by lowercased wallet) and counts distinct payers per
 * endpoint. The UA-only call path (no wallet) is unchanged.
 */
export async function logPremiumUsage(
  env: Env,
  endpoint: string,
  agentUa: string,
  creditsCharged: number,
  token?: string,
  payerWallet?: string,
): Promise<void> {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const rollup = await readRollup(env, date);

    rollup.call_count += 1;
    rollup.total_credits_charged += creditsCharged;
    noteUniqueAgent(rollup, agentUa);
    bumpTopAgent(rollup, agentUa, { calls: 1, credits: creditsCharged });

    const slot = rollup.by_endpoint[endpoint] || {
      calls: 0,
      credits_charged: 0,
      first_seen: now,
      last_seen: now,
      distinct_payers: 0,
    };
    slot.calls += 1;
    slot.credits_charged += creditsCharged;
    slot.last_seen = now;

    if (payerWallet) {
      const w = payerWallet.toLowerCase();
      const rail: 'evm' | 'svm' = payerWallet.startsWith('0x') ? 'evm' : 'svm';
      rollup.top_payers = rollup.top_payers || {};
      const payer = rollup.top_payers[w] || {
        calls: 0,
        credits_charged: 0,
        first_seen: now,
        last_seen: now,
      };
      payer.calls += 1;
      payer.credits_charged += creditsCharged;
      payer.last_seen = now;
      // Original case for on-chain lookup (base58 is case-sensitive; the
      // lowercase key is dedupe-stable but lossy for Solana payers).
      payer.wallet_raw = payerWallet;
      payer.rail = rail;
      rollup.top_payers[w] = payer;

      rollup.rails = rollup.rails || {};
      const railSlot = rollup.rails[rail] || { calls: 0, credits_charged: 0 };
      railSlot.calls += 1;
      railSlot.credits_charged += creditsCharged;
      rollup.rails[rail] = railSlot;

      // distinct_payers: increment only the first time this wallet hits this
      // endpoint today. The seen ledger persists in the daily rollup and
      // resets with the day.
      const seenKey = `${endpoint}|${w}`;
      rollup._payer_seen = rollup._payer_seen || {};
      if (!rollup._payer_seen[seenKey]) {
        slot.distinct_payers = (slot.distinct_payers || 0) + 1;
        rollup._payer_seen[seenKey] = true;
      }
    }

    rollup.by_endpoint[endpoint] = slot;

    await writeRollup(env, rollup);

    // Lifetime traction counter. Same best-effort try/catch, same
    // fire-and-forget call path. Never sums rollups per request.
    await bumpLifetime(env, creditsCharged, now);

    if (token && token.startsWith('tf_live_')) {
      await appendTokenUsage(env, token, endpoint, creditsCharged, now);
    }
  } catch (e) {
    console.error('logPremiumUsage failed:', e);
  }
}

// === Per-token usage ring buffer ===

const TOKEN_USAGE_CAP = 100;

export interface TokenUsageEntry {
  endpoint: string;
  credits: number;
  at: string;
}

interface TokenUsageRecord {
  entries: TokenUsageEntry[];
}

async function appendTokenUsage(
  env: Env,
  token: string,
  endpoint: string,
  credits: number,
  at: string,
): Promise<void> {
  try {
    const existing = (await env.TENSORFEED_CACHE.get(`pay:usage:${token}`, 'json')) as TokenUsageRecord | null;
    const entries = existing?.entries ?? [];
    entries.push({ endpoint, credits, at });
    if (entries.length > TOKEN_USAGE_CAP) {
      entries.splice(0, entries.length - TOKEN_USAGE_CAP);
    }
    await env.TENSORFEED_CACHE.put(`pay:usage:${token}`, JSON.stringify({ entries }));
  } catch (e) {
    console.error('appendTokenUsage failed:', e);
  }
}

export interface TokenUsageSummary {
  ok: true;
  token_balance: number | null;
  total_calls: number;
  total_credits_spent: number;
  by_endpoint: Record<string, { calls: number; credits: number; last_seen: string }>;
  recent: TokenUsageEntry[];
}

// ── Per-token payment history (purchases) ───────────────────────────
//
// pay:purchases:{token} holds an append-only list of credit purchases
// scoped to one bearer token. Used by /api/payment/history so an
// agent can audit how its credits were funded (which on-chain txs
// added how many credits and when), independent of /api/payment/usage
// which logs how those credits were *spent*.
//
// Backward compat: tokens that confirmed before this field was added
// will read an empty list. Existing pay:tx:{txHash} records remain the
// authoritative replay-protection ledger; this is purely a per-token
// view layered on top.

interface PurchaseEntry {
  tx_hash: string;
  amount_usd: number;
  credits_added: number;
  block_number?: number;
  confirmed_at: string;
}

interface PurchaseRecord {
  entries: PurchaseEntry[];
}

const PURCHASES_CAP = 100;

export async function appendTokenPurchase(
  env: Env,
  token: string,
  purchase: PurchaseEntry,
): Promise<void> {
  try {
    const existing = (await env.TENSORFEED_CACHE.get(
      `pay:purchases:${token}`,
      'json',
    )) as PurchaseRecord | null;
    const entries = existing?.entries ?? [];
    entries.push(purchase);
    if (entries.length > PURCHASES_CAP) {
      entries.splice(0, entries.length - PURCHASES_CAP);
    }
    await env.TENSORFEED_CACHE.put(
      `pay:purchases:${token}`,
      JSON.stringify({ entries }),
    );
  } catch (e) {
    console.error('appendTokenPurchase failed:', e);
  }
}

export interface PaymentHistorySummary {
  ok: true;
  token_short: string;
  current_balance: number;
  total_purchased_usd: number;
  total_credits_added: number;
  purchase_count: number;
  purchases: PurchaseEntry[];
}

/**
 * Read the per-token purchase ledger. Auth-bound: caller must already
 * have validated the bearer token. Returns null if the token is not
 * recognized so the route handler can return 404 without leaking
 * existence to a wrong-secret guess.
 */
export async function getPaymentHistory(
  env: Env,
  token: string,
): Promise<PaymentHistorySummary | null> {
  if (!token.startsWith('tf_live_')) return null;
  const credits = (await env.TENSORFEED_CACHE.get(
    `pay:credits:${token}`,
    'json',
  )) as CreditsRecord | null;
  if (!credits) return null;

  const ledger = (await env.TENSORFEED_CACHE.get(
    `pay:purchases:${token}`,
    'json',
  )) as PurchaseRecord | null;
  const entries = ledger?.entries ?? [];

  let totalUsd = 0;
  let totalCredits = 0;
  for (const e of entries) {
    totalUsd += e.amount_usd;
    totalCredits += e.credits_added;
  }

  // Newest first for caller convenience.
  const sorted = entries.slice().sort((a, b) => (a.confirmed_at < b.confirmed_at ? 1 : -1));

  return {
    ok: true,
    token_short: token.slice(0, 16) + '...',
    current_balance: credits.balance,
    total_purchased_usd: Number(totalUsd.toFixed(6)),
    total_credits_added: totalCredits,
    purchase_count: entries.length,
    purchases: sorted,
  };
}

/**
 * Read the per-token usage ring buffer and aggregate it for the dashboard.
 * Returns null if the token isn't recognized.
 */
export async function getTokenUsage(env: Env, token: string): Promise<TokenUsageSummary | null> {
  if (!token.startsWith('tf_live_')) return null;
  const credits = (await env.TENSORFEED_CACHE.get(`pay:credits:${token}`, 'json')) as CreditsRecord | null;
  if (!credits) return null;

  const usage = (await env.TENSORFEED_CACHE.get(`pay:usage:${token}`, 'json')) as TokenUsageRecord | null;
  const entries = usage?.entries ?? [];

  const byEndpoint: Record<string, { calls: number; credits: number; last_seen: string }> = {};
  let totalCredits = 0;
  for (const e of entries) {
    totalCredits += e.credits;
    const slot = byEndpoint[e.endpoint] || { calls: 0, credits: 0, last_seen: e.at };
    slot.calls += 1;
    slot.credits += e.credits;
    if (e.at > slot.last_seen) slot.last_seen = e.at;
    byEndpoint[e.endpoint] = slot;
  }

  // Recent: newest first, capped at 25
  const recent = entries.slice().reverse().slice(0, 25);

  return {
    ok: true,
    token_balance: credits.balance,
    total_calls: entries.length,
    total_credits_spent: totalCredits,
    by_endpoint: byEndpoint,
    recent,
  };
}

/**
 * Read a single day's rollup for the admin dashboard. Returns null if no
 * data exists for that date.
 */
export async function getRollup(env: Env, date: string): Promise<DailyRollup | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return (await env.TENSORFEED_CACHE.get(`pay:rollup:${date}`, 'json')) as DailyRollup | null;
}

/**
 * List dates with rollup data available, newest first.
 */
export async function listRollupDates(env: Env): Promise<string[]> {
  const list = await env.TENSORFEED_CACHE.list({ prefix: 'pay:rollup:' });
  return list.keys
    .map(k => k.name.replace('pay:rollup:', ''))
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();
}

// === Public API ===

export async function getPaymentInfo(env: Env): Promise<unknown> {
  const sample = [1.0, 5.0, 30.0, 200.0].map(amt => ({
    amount_usd: amt,
    credits: calculateCredits(amt),
    rate: creditsPerUsd(amt).tier,
  }));
  return {
    ok: true,
    agent_fair_trade:
      'TensorFeed.ai is agent fair-trade certified: open pricing, automatic no-charge on 5xx, breaker, schema fail, and stale data, Ed25519-signed receipts on every paid call, inference-only license. Built with Claude (Anthropic). Standard at /.well-known/agent-fair-trade.json.',
    operator: {
      legal_entity: 'Pizza Robot Studios LLC',
      jurisdiction: 'California, USA',
      contact: 'contact@tensorfeed.ai',
      note: 'The legal entity behind the payment wallet. Premium credits are non-refundable per Section 17.5 of the Terms of Service at https://tensorfeed.ai/terms.',
    },
    wallet: {
      address: env.PAYMENT_WALLET,
      currency: 'USDC',
      network: 'base',
      contract: USDC_BASE_CONTRACT,
      decimals: USDC_DECIMALS,
    },
    pricing: {
      base_rate: '50 credits per $1 USDC ($0.02 per credit)',
      volume_bundles: sample,
      tiers: {
        '1_enhanced_data': '1 credit per call',
        '2_computed_intelligence': '1 credit per call (routing)',
        '3_bulk_streaming': '5 credits per call',
      },
      welcome_bonus: {
        credits: WELCOME_BONUS_CREDITS,
        usd_value: (WELCOME_BONUS_CREDITS * 0.02).toFixed(2),
        description: `${WELCOME_BONUS_CREDITS} bonus credits ($${(WELCOME_BONUS_CREDITS * 0.02).toFixed(2)} of value) on the first successful USDC payment from a new sender wallet, on top of the base rate. Granted automatically; the response from /api/payment/confirm includes welcome_bonus_credits and is_first_payment fields when applied.`,
      },
      packs: {
        description:
          'Curated marketing bundles for common agent use cases. Credits remain fully fungible across all premium endpoints; packs just suggest USD amounts and highlight endpoint groupings to reduce decision friction. Volume tiers apply automatically.',
        directory: '/api/payment/packs',
      },
    },
    flow: {
      with_quote: [
        'POST /api/payment/buy-credits with { amount_usd } -> { wallet, memo, credits, expires_at }',
        'Send USDC on Base to wallet',
        'POST /api/payment/confirm with { tx_hash, nonce } -> { token, credits, balance }',
        'Use Authorization: Bearer <token> on premium endpoints',
      ],
      x402_fallback: [
        'GET /api/premium/<endpoint> with no auth -> 402 with payment instructions',
        'Send USDC on Base to wallet',
        'GET /api/premium/<endpoint> with X-Payment-Tx header -> serves data + returns token in X-Payment-Token header',
      ],
    },
    verification: {
      attestation_method: 'TLS + multi-publication',
      address_published_at: [
        'https://tensorfeed.ai/llms.txt',
        'https://tensorfeed.ai/api/payment/info',
        'https://github.com/RipperMercs/tensorfeed (README)',
        'https://x.com/tensorfeed (bio)',
      ],
      note: 'Cross-check the wallet address across all four sources before sending funds. If any disagree, do not send.',
    },
    terms: {
      no_training: 'Premium data is licensed for inference use only. Use of TensorFeed premium data for training, fine-tuning, evaluation, or distillation of ML models is prohibited.',
      refund: 'All credit purchases are final and non-refundable per Section 17.5 of the Terms. Credits do not expire and remain redeemable across tensorfeed.ai and terminalfeed.io. Buy small, top up as needed.',
      sanctions: 'Premium API access is unavailable to persons or entities subject to OFAC, EU, UK, or UN sanctions, and to residents of comprehensively sanctioned jurisdictions (Cuba, Iran, North Korea, Syria, Crimea, Donetsk, Luhansk). See https://tensorfeed.ai/terms#premium Section 17.9. Inbound credit-purchase transactions are screened against the Chainalysis public sanctions API.',
      acceptable_use: 'No reselling of bearer tokens or proxy APIs that reproduce the Premium API surface. No use of premium responses to train or evaluate competing models. See Section 17.12.',
      governing_law: 'California law, exclusive venue Los Angeles County, California. See Section 15 Governing Law and Venue.',
      kill_switch: env.PAYMENT_ENABLED === 'true' ? 'enabled' : 'disabled',
    },
  };
}

// EVM address shape: 0x followed by 40 hex chars (case-insensitive).
const SENDER_WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

export function isValidSenderWallet(addr: unknown): addr is string {
  return typeof addr === 'string' && SENDER_WALLET_RE.test(addr.trim());
}

export async function createQuote(
  env: Env,
  amountUsd: number,
  senderWallet: string,
): Promise<{ nonce: string; quote: QuoteRecord; wallet: string }> {
  // Caller must have validated sender_wallet at the API boundary
  // (see /api/payment/buy-credits). We re-normalize defensively.
  const sender = senderWallet.trim().toLowerCase();
  const credits = calculateCredits(amountUsd);
  const nonce = generateNonce();
  const expiresAt = Date.now() + QUOTE_TTL_SECONDS * 1000;
  // Persist the integer USDC base units the quote was issued for so
  // confirmPayment can do an exact-integer match against the on-chain
  // transfer amount instead of a 0.01 USD float-tolerance window.
  // Math.round handles tiny float-representation drift from amountUsd
  // arriving as 4.99 / 199.99 / etc.
  const amountBaseUnits = Math.round(amountUsd * 1_000_000);
  const quote: QuoteRecord = {
    amount_usd: amountUsd,
    amount_base_units: amountBaseUnits,
    credits,
    expires_at: expiresAt,
    created: new Date().toISOString(),
    sender_wallet: sender,
  };
  await env.TENSORFEED_CACHE.put(`pay:quote:${nonce}`, JSON.stringify(quote), {
    expirationTtl: QUOTE_TTL_SECONDS,
  });
  return { nonce, quote, wallet: env.PAYMENT_WALLET };
}

export type ConfirmResult =
  | {
      ok: true;
      token: string;
      credits: number;
      balance: number;
      tx_amount_usd: number;
      rate: string;
      welcome_bonus_credits: number;
      is_first_payment: boolean;
    }
  | { ok: false; error: string; reason?: string; status?: number };

/**
 * Stake-first check-write-recheck for the wallet-seen marker. Race-safe
 * under last-write-wins KV.
 *
 * Two parallel confirms from the same wallet:
 *   1. Both read the existing marker (none, or pending).
 *   2. Both write THEIR OWN stake (different requestIds).
 *   3. Both re-read. Last write wins; both see the SAME re-read value.
 *   4. Only the request whose requestId matches the re-read value
 *      claims first-payment status.
 *
 * Legacy backward compat: existing in-production markers are plain ISO
 * date strings (the pre-2026-05-26 shape). Those parse as JSON-string,
 * not JSON-object, and we treat them as terminal "committed" so an
 * already-bonused wallet does NOT re-mint after the upgrade.
 *
 * Edge: if the winner crashes before upgrading the marker to
 * `committed: true`, the pending stake expires in WALLET_SEEN_STAKE_TTL_S
 * and a fresh confirm could re-mint. Bounded recovery window;
 * acceptable per design.
 *
 * Exported testing surface lives in payments-welcome-bonus.test.ts.
 */
type WalletSeenMarker =
  | { committed: true; at: string }
  | { pending: string; at: string };

function parseWalletSeen(raw: unknown): WalletSeenMarker | 'legacy' | null {
  if (raw === null || raw === undefined) return null;
  // Real Cloudflare KV returns a string from .get(key); some test mocks
  // pre-parse on put and return the parsed object directly. Handle both
  // so the function is defensive in production and works against the
  // legacy makeKV mock without changing every existing test fixture.
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Not JSON: legacy plain-string marker (e.g. ISO date pre-2026-05-26).
      return 'legacy';
    }
  }
  if (typeof parsed === 'string') {
    // JSON-encoded string (e.g. legacy date written via JSON.stringify).
    return 'legacy';
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return 'legacy';
  }
  const m = parsed as Record<string, unknown>;
  if (m.committed === true && typeof m.at === 'string') {
    return { committed: true, at: m.at };
  }
  if (typeof m.pending === 'string' && typeof m.at === 'string') {
    return { pending: m.pending, at: m.at };
  }
  // Unrecognized shape: defensive-treat as legacy committed so we never
  // accidentally re-mint a bonus for a wallet with corrupt marker state.
  return 'legacy';
}

export async function checkAndMarkFirstPayment(
  env: Env,
  walletAddress: string | undefined,
): Promise<{ isFirstPayment: boolean; bonusCredits: number }> {
  if (!walletAddress) {
    return { isFirstPayment: false, bonusCredits: 0 };
  }
  const key = `pay:wallet-seen:${walletAddress.toLowerCase()}`;

  // Step 1: read existing state. Committed or legacy => not first.
  const rawExisting = await env.TENSORFEED_CACHE.get(key);
  const existing = parseWalletSeen(rawExisting);
  if (existing === 'legacy') return { isFirstPayment: false, bonusCredits: 0 };
  if (existing && 'committed' in existing) return { isFirstPayment: false, bonusCredits: 0 };

  // Step 2: stake-first. Write our pending marker with a unique requestId.
  const requestId = crypto.randomUUID();
  const myStake = JSON.stringify({ pending: requestId, at: new Date().toISOString() });
  await env.TENSORFEED_CACHE.put(key, myStake, { expirationTtl: WALLET_SEEN_STAKE_TTL_S });

  // Step 3: re-read. Whichever stake landed LAST under last-write-wins is
  // what every parallel caller now sees. Only the request whose stake
  // survived gets the bonus.
  const rawReread = await env.TENSORFEED_CACHE.get(key);
  const reread = parseWalletSeen(rawReread);
  if (reread === 'legacy') return { isFirstPayment: false, bonusCredits: 0 };
  if (reread && 'committed' in reread) return { isFirstPayment: false, bonusCredits: 0 };
  if (reread && 'pending' in reread && reread.pending === requestId) {
    return { isFirstPayment: true, bonusCredits: WELCOME_BONUS_CREDITS };
  }
  // Lost the race to another concurrent stake.
  return { isFirstPayment: false, bonusCredits: 0 };
}

export function markWalletSeen(env: Env, walletAddress: string): Promise<void> {
  // Upgrade the marker to committed. No TTL: committed markers persist
  // until manually cleared. Replaces any pending stake from this
  // request (the winner of the stake-first race) or any concurrent
  // stake that lost (the loser already returned isFirstPayment=false).
  return env.TENSORFEED_CACHE.put(
    `pay:wallet-seen:${walletAddress.toLowerCase()}`,
    JSON.stringify({ committed: true, at: new Date().toISOString() }),
  );
}

export const WELCOME_BONUS_CREDITS_VALUE = WELCOME_BONUS_CREDITS;

export async function confirmPayment(
  env: Env,
  txHash: string,
  request: Request,
  nonce?: string,
): Promise<ConfirmResult> {
  // AFTA Tx-Sniper protection: a nonce (and the sender_wallet binding
  // that comes with it) is REQUIRED. The legacy no-nonce path is closed
  // because it lets anyone watching the public Base mempool steal a
  // legitimate payer's credits by racing /api/payment/confirm with the
  // observed tx hash. See SECURITY.md and the AFTA whitepaper threat
  // model for the full attack tree.
  if (!nonce) {
    return {
      ok: false,
      error: 'nonce_required',
      reason:
        'Call /api/payment/buy-credits first to obtain a quote bound to your sender wallet, then pass the returned nonce to /api/payment/confirm. The legacy no-nonce path is disabled to prevent tx-hash sniping.',
      status: 400,
    };
  }

  const existingTx = (await env.TENSORFEED_CACHE.get(`pay:tx:${txHash}`, 'json')) as TxRecord | null;
  if (existingTx) {
    if (existingTx.pending) {
      return {
        ok: false,
        error: 'tx_in_flight',
        reason:
          'This transaction is already being processed by another request. Wait up to 60 seconds and retry; if verification ultimately fails the pending record expires and a fresh confirm will succeed.',
        status: 409,
      };
    }
    return {
      ok: false,
      error: 'tx_already_claimed',
      reason: 'This transaction has already been used to mint credits.',
    };
  }

  const quote = (await env.TENSORFEED_CACHE.get(`pay:quote:${nonce}`, 'json')) as QuoteRecord | null;
  if (!quote) {
    return {
      ok: false,
      error: 'quote_not_found_or_expired',
      reason: 'Quote may have expired (30 min TTL). Call /api/payment/buy-credits to get a new quote bound to your sender wallet.',
    };
  }
  if (Date.now() > quote.expires_at) {
    return {
      ok: false,
      error: 'quote_expired',
      reason: 'Quote expired (30 min TTL). Call /api/payment/buy-credits to get a fresh quote.',
    };
  }
  // Defensive: an old-format quote (pre-2026-05-05) without a
  // sender_wallet field would fall through the binding check and revive
  // the Tx-Sniper hole. Reject any quote missing the field.
  if (!quote.sender_wallet || !isValidSenderWallet(quote.sender_wallet)) {
    return {
      ok: false,
      error: 'quote_legacy_format',
      reason: 'This quote was issued before the sender-wallet binding requirement. Call /api/payment/buy-credits to get a fresh quote.',
      status: 400,
    };
  }

  // Claim-intent: stake the tx_hash slot BEFORE the (slow) on-chain
  // verification round-trip. Other PoPs reading pay:tx:${txHash} will
  // see the pending record and bail with tx_in_flight, dramatically
  // shrinking the cross-PoP race window that previously allowed N
  // independent token mints from one on-chain payment. TTL=60s so a
  // transient RPC failure auto-heals.
  await env.TENSORFEED_CACHE.put(
    `pay:tx:${txHash}`,
    JSON.stringify({
      amount_usd: 0,
      credits: 0,
      token: '',
      created: new Date().toISOString(),
      pending: true,
    } as TxRecord),
    { expirationTtl: CLAIM_INTENT_TTL_SECONDS },
  );

  const verified = await verifyBaseUSDCTransaction(txHash, env);
  if (!verified.ok) {
    // Leave the pending record to expire naturally; deleting it would
    // re-open the race for the duration of the delete propagation. Caller
    // can retry after the TTL.
    return { ok: false, error: 'verification_failed', reason: verified.reason };
  }

  // AFTA Tx-Sniper guard: the on-chain `from` address of the verified
  // USDC transfer must match the sender_wallet that was bound to the
  // quote when /api/payment/buy-credits was called. This is the line of
  // code that closes the public-mempool theft attack: even if an
  // attacker observes the tx hash on Base, they cannot mint credits
  // unless they also issued a quote bound to the same sending EOA, and
  // they don't have the sender's private key to do so.
  if (
    !verified.senderAddress ||
    verified.senderAddress.toLowerCase() !== quote.sender_wallet.toLowerCase()
  ) {
    return {
      ok: false,
      error: 'sender_mismatch',
      reason:
        'The on-chain sender of this USDC transfer does not match the sender_wallet bound to your quote. Issue a new quote from the same wallet that signed the on-chain payment.',
      status: 400,
    };
  }

  // OFAC sanctions screen on the sender wallet, after on-chain
  // verification but BEFORE any credits are minted. Cross-references
  // Terms 17.9 (sanctions warranty) and 17.11 (suspension/revocation).
  if (verified.senderAddress) {
    const screen = await screenWalletOFAC(verified.senderAddress, env);
    if (screen.error === 'screening_not_configured') {
      return {
        ok: false,
        error: 'screening_unavailable',
        reason: 'Sanctions screening is currently unavailable. Please retry shortly.',
        status: 503,
      };
    }
    if (screen.sanctioned) {
      await persistOFACBlock(env, verified.senderAddress, txHash, screen.identifications);
      return {
        ok: false,
        error: 'sanctions_block',
        reason:
          'This wallet address cannot be credited due to applicable sanctions law. No credits will be issued. The original USDC transfer is on-chain and irreversible. See https://tensorfeed.ai/terms#premium Section 17.9 and 17.11.',
        status: 403,
      };
    }
    if (screen.error) {
      if (isTransientOfacError(screen.error)) {
        if (
          ofacTransientDecision(
            verified.senderAddress,
            screen.error,
            'confirm_payment',
          ) === 'reject'
        ) {
          return {
            ok: false,
            error: 'screening_unavailable',
            reason:
              'Sanctions screening is temporarily unavailable and this address has no recent clean screen on file. No credits were issued and the wallet was NOT flagged or banned. The on-chain USDC transfer is irreversible; retry once screening recovers and the same payment will credit.',
            status: 503,
          };
        }
        // cache_pass: a clean screen within the TTL, allow through the
        // brief outage (decision already logged).
      } else {
        // Non-transient, non-sanctioned, non-misconfig (e.g.
        // invalid_address; callers validate shape first so this is not
        // expected here). Preserve prior behavior: log and continue.
        console.log(
          JSON.stringify({
            event: 'ofac_screen_degraded',
            wallet: verified.senderAddress,
            tx_hash: txHash,
            error: screen.error,
            decision: 'fail_open_continue',
            timestamp: new Date().toISOString(),
          }),
        );
      }
    }
  }

  // Tier-bonus protection: only honor the quote's pre-priced credits
  // (which include any volume-tier discount the agent earned at the
  // time of quote) if the on-chain payment matches the quoted amount
  // EXACTLY at the integer USDC base-unit level. The previous
  // < 0.01 USD float-tolerance comparison let an agent quote $200 for
  // 16,000 credits then send $199.99 on-chain (0.00999... < 0.01 in
  // IEEE 754) and still receive the full tier-1 credit count, a
  // sub-cent underpayment that compounded across calls. Strict integer
  // equality removes the window.
  // Backwards-compat: pre-2026-05-05 quotes lack amount_base_units;
  // those fall through to compute credits from the actual on-chain
  // amount, which is the safe (no-tier-bonus) path.
  let baseCredits: number;
  let rate: string;
  if (
    quote &&
    typeof quote.amount_base_units === 'number' &&
    typeof verified.amountBaseUnits === 'number' &&
    verified.amountBaseUnits === quote.amount_base_units
  ) {
    baseCredits = quote.credits;
    rate = creditsPerUsd(quote.amount_usd).tier;
  } else {
    baseCredits = calculateCredits(verified.amountUsd);
    rate = creditsPerUsd(verified.amountUsd).tier;
  }

  const welcome = await checkAndMarkFirstPayment(env, verified.senderAddress);
  const credits = baseCredits + welcome.bonusCredits;

  const token = generateToken();
  const now = new Date().toISOString();
  const tokenRecord: CreditsRecord = {
    balance: credits,
    created: now,
    last_used: now,
    agent_ua: request.headers.get('User-Agent') || 'unknown',
    total_purchased: credits,
  };
  const txRec: TxRecord = {
    amount_usd: verified.amountUsd,
    credits,
    token,
    created: now,
    block_number: verified.blockNumber,
    sender_wallet: verified.senderAddress.toLowerCase(),
  };

  await Promise.all([
    env.TENSORFEED_CACHE.put(`pay:credits:${token}`, JSON.stringify(tokenRecord)),
    env.TENSORFEED_CACHE.put(`pay:tx:${txHash}`, JSON.stringify(txRec)),
    nonce ? env.TENSORFEED_CACHE.delete(`pay:quote:${nonce}`) : Promise.resolve(),
    logRevenue(env, verified.amountUsd, request.headers.get('User-Agent') || 'unknown'),
    appendTokenPurchase(env, token, {
      tx_hash: txHash,
      amount_usd: verified.amountUsd,
      credits_added: credits,
      block_number: verified.blockNumber,
      confirmed_at: now,
    }),
    welcome.isFirstPayment && verified.senderAddress
      ? markWalletSeen(env, verified.senderAddress)
      : Promise.resolve(),
  ]);

  return {
    ok: true,
    token,
    credits,
    balance: credits,
    tx_amount_usd: verified.amountUsd,
    rate,
    welcome_bonus_credits: welcome.bonusCredits,
    is_first_payment: welcome.isFirstPayment,
  };
}

export type BalanceResult =
  | { ok: true; balance: number; credits_remaining: number; created: string; last_used: string; total_purchased: number }
  | { ok: false; error: string };

export async function getBalance(env: Env, token: string): Promise<BalanceResult> {
  if (!token.startsWith('tf_live_')) {
    return { ok: false, error: 'invalid_token_format' };
  }
  const record = (await env.TENSORFEED_CACHE.get(`pay:credits:${token}`, 'json')) as CreditsRecord | null;
  if (!record) {
    return { ok: false, error: 'token_not_found' };
  }
  return {
    ok: true,
    balance: record.balance,
    // Alias so agents and SDKs that read the per-call billing field name
    // (billing.credits_remaining) get the same value from this endpoint too.
    // Same number, two names, no breakage for readers of either.
    credits_remaining: record.balance,
    created: record.created,
    last_used: record.last_used,
    total_purchased: record.total_purchased,
  };
}

// === Per-token daily spend cap (self-service) ===

export interface SpendCapStatus {
  ok: true;
  token_short: string;
  daily_cap: number | null;
  daily_spent: number;
  remaining: number | null;
  reset_at: string;
  balance: number;
}

export type SpendCapResult =
  | SpendCapStatus
  | { ok: false; error: string; message?: string };

export async function getSpendCapStatus(env: Env, token: string): Promise<SpendCapResult> {
  if (!token.startsWith('tf_live_')) {
    return { ok: false, error: 'invalid_token_format' };
  }
  const record = (await env.TENSORFEED_CACHE.get(`pay:credits:${token}`, 'json')) as CreditsRecord | null;
  if (!record) {
    return { ok: false, error: 'token_not_found' };
  }
  const cap = record.daily_cap ?? null;
  const status = await checkSpendCap(env, token, cap, 0);
  return {
    ok: true,
    token_short: token.slice(0, 16) + '...',
    daily_cap: status.daily_cap,
    daily_spent: status.daily_spent,
    remaining: status.remaining,
    reset_at: status.reset_at,
    balance: record.balance,
  };
}

export async function setSpendCap(
  env: Env,
  token: string,
  rawCap: unknown,
): Promise<SpendCapResult> {
  if (!token.startsWith('tf_live_')) {
    return { ok: false, error: 'invalid_token_format' };
  }
  const validation = validateSpendCap(rawCap);
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.error || 'invalid_cap',
      message: 'Cap must be null, 0 (clear), or an integer between 1 and 1,000,000.',
    };
  }
  const record = (await env.TENSORFEED_CACHE.get(`pay:credits:${token}`, 'json')) as CreditsRecord | null;
  if (!record) {
    return { ok: false, error: 'token_not_found' };
  }
  record.daily_cap = validation.value ?? null;
  await env.TENSORFEED_CACHE.put(`pay:credits:${token}`, JSON.stringify(record));
  return getSpendCapStatus(env, token);
}

// === Self-service token revocation ===
//
// A token owner who suspects a leak can call /api/payment/revoke and
// burn the bearer immediately. Mirrors the admin/burn-token logic but
// authenticated by the token itself (proof-of-possession). The
// remaining balance is preserved on the burned record so the owner has
// a paper trail; the token simply stops working for premium calls
// because it disappears from pay:credits:{token}.
//
// We move (not delete) the record under `pay:revoked:{token}` so a
// future support request can audit it. TTL of 90 days bounds storage.

const REVOKED_TTL_SECONDS = 90 * 24 * 60 * 60;

export interface RevokeResult {
  ok: boolean;
  error?: string;
  message?: string;
  token_short?: string;
  balance_at_revoke?: number;
  revoked_at?: string;
}

export async function revokeOwnToken(env: Env, token: string): Promise<RevokeResult> {
  if (!token.startsWith('tf_live_')) {
    return { ok: false, error: 'invalid_token_format' };
  }
  const record = (await env.TENSORFEED_CACHE.get(`pay:credits:${token}`, 'json')) as CreditsRecord | null;
  if (!record) {
    return { ok: false, error: 'token_not_found' };
  }
  const revokedAt = new Date().toISOString();
  await env.TENSORFEED_CACHE.put(
    `pay:revoked:${token}`,
    JSON.stringify({ ...record, revoked_at: revokedAt }),
    { expirationTtl: REVOKED_TTL_SECONDS },
  );
  await env.TENSORFEED_CACHE.delete(`pay:credits:${token}`);
  return {
    ok: true,
    message: 'Token revoked. Any further premium call with this token will be rejected. Buy new credits at /api/payment/buy-credits to mint a fresh token.',
    token_short: token.slice(0, 16) + '...',
    balance_at_revoke: record.balance,
    revoked_at: revokedAt,
  };
}

// === Cross-Worker validate-and-charge ===
//
// Same atomic credit-charge logic that requirePayment runs internally,
// but exposed as a pure function so the /api/internal/validate-and-charge
// HTTP wrapper can call it from sister-site Workers (TerminalFeed, etc.).
//
// Bearer-token-only path. The x402 fallback is NOT supported here because
// sister sites have already authenticated their end users via this same
// token; they should not be re-broadcasting fresh on-chain payments
// through a server-to-server hop.
//
// Side effects: decrements `pay:credits:{token}` on success. The caller
// is responsible for calling logPremiumUsage (typically via
// ctx.waitUntil) so the daily rollup and per-token usage history get
// updated. We keep this helper pure-over-credits so internal callers
// can decide their own logging cadence.

export type ValidateAndChargeReason =
  | 'invalid_token'
  | 'insufficient_credits'
  | 'expired'
  | 'replayed';

export type ValidateAndChargeResult =
  | { ok: true; credits_remaining: number }
  | { ok: false; reason: ValidateAndChargeReason };

// Route a token's debit through the per-token CreditLedger DO when the
// Phase-3 flag + binding are present. Returns the DO verdict (ok=charged,
// !ok=rejected with reason), or null when the DO path is unavailable (flag
// off, missing binding, non-2xx, or thrown) so the caller falls back to the
// legacy KV read-modify-write. Mirrors commitPayment's DO routing.
async function tryLedgerDebit(
  env: Env,
  token: string,
  cost: number,
): Promise<DebitResult | null> {
  if (!(cost > 0 && env.CREDIT_LEDGER_ENABLED === 'true' && env.CREDIT_LEDGER !== undefined)) {
    return null;
  }
  try {
    const today = new Date().toISOString().slice(0, 10);
    const stub = env.CREDIT_LEDGER.get(env.CREDIT_LEDGER.idFromName(token));
    const res = await stub.fetch(
      new Request('https://credit-ledger.do/debit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, amount: cost, today }),
      }),
    );
    if (!res.ok) {
      console.warn('credit-ledger DO debit non-2xx (federation rail), falling back to KV:', res.status);
      return null;
    }
    return (await res.json()) as DebitResult;
  } catch (err) {
    console.warn('credit-ledger DO debit failed (federation rail), falling back to KV:', err);
    return null;
  }
}

// Route a refund / credit-add through the DO mint. Returns the MintResult,
// or null on unavailable so the caller falls back to the legacy KV add.
async function tryLedgerMint(
  env: Env,
  token: string,
  amount: number,
): Promise<MintResult | null> {
  if (!(amount > 0 && env.CREDIT_LEDGER_ENABLED === 'true' && env.CREDIT_LEDGER !== undefined)) {
    return null;
  }
  try {
    const stub = env.CREDIT_LEDGER.get(env.CREDIT_LEDGER.idFromName(token));
    const res = await stub.fetch(
      new Request('https://credit-ledger.do/mint', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, amount }),
      }),
    );
    if (!res.ok) {
      console.warn('credit-ledger DO mint non-2xx (federation refund), falling back to KV:', res.status);
      return null;
    }
    return (await res.json()) as MintResult;
  } catch (err) {
    console.warn('credit-ledger DO mint failed (federation refund), falling back to KV:', err);
    return null;
  }
}

// Ask the DO to mirror its current balance to KV. The DO `debit` auto-mirrors,
// but `mint` does not, so after a DO mint refund we must explicitly mirror so
// the public read source (`pay:credits:{token}` in KV) ends correct (the money
// invariant). Best effort: a failed mirror leaves a transient DO-vs-KV
// divergence that Part B reconciles; it never throws into the refund path.
async function tryLedgerMirrorToKV(env: Env, token: string): Promise<void> {
  if (!(env.CREDIT_LEDGER_ENABLED === 'true' && env.CREDIT_LEDGER !== undefined)) {
    return;
  }
  try {
    const stub = env.CREDIT_LEDGER.get(env.CREDIT_LEDGER.idFromName(token));
    const res = await stub.fetch(
      new Request('https://credit-ledger.do/mirror-to-kv', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      }),
    );
    if (!res.ok) {
      console.warn('credit-ledger DO mirror-to-kv non-2xx (federation refund):', res.status);
    }
  } catch (err) {
    console.warn('credit-ledger DO mirror-to-kv failed (federation refund):', err);
  }
}

export async function validateAndCharge(
  env: Env,
  args: { token: string; cost: number; endpoint?: string },
): Promise<ValidateAndChargeResult> {
  const { token, cost } = args;
  if (
    typeof token !== 'string' ||
    !token ||
    !token.startsWith('tf_live_')
  ) {
    return { ok: false, reason: 'invalid_token' };
  }
  if (!Number.isFinite(cost) || cost < 0) {
    return { ok: false, reason: 'invalid_token' };
  }
  const record = (await env.TENSORFEED_CACHE.get(
    `pay:credits:${token}`,
    'json',
  )) as CreditsRecord | null;
  if (!record) {
    return { ok: false, reason: 'invalid_token' };
  }
  // Atomic debit via the per-token DO (race-safe). Falls back to the legacy
  // KV read-modify-write below on flag-off / missing binding / DO error.
  const doResult = await tryLedgerDebit(env, token, cost);
  if (doResult !== null) {
    if (doResult.ok) return { ok: true, credits_remaining: doResult.balance };
    return { ok: false, reason: 'insufficient_credits' }; // insufficient_credits or cap_exceeded
  }
  // Legacy KV path (bounded race; default until the flag/binding).
  if (record.balance < cost) {
    return { ok: false, reason: 'insufficient_credits' };
  }
  record.balance -= cost;
  record.last_used = new Date().toISOString();
  await env.TENSORFEED_CACHE.put(`pay:credits:${token}`, JSON.stringify(record));
  return { ok: true, credits_remaining: record.balance };
}

// === Federated AFTA rail: reserve + commit (split flow for sister sites) ===
//
// The `validateAndCharge` helper above is atomic and good for callers who
// don't need to honor AFTA no-charge guarantees themselves. Sister sites
// (TerminalFeed.io, future VR.org) need the deferred-debit model: validate
// up front, run the handler, then either commit the debit or log a
// no-charge event. These helpers expose that flow over the wire.
//
// Race-safety: validateOnly now atomically decrements the credit balance
// and writes a per-call reservation record (TTL=5 min). commitInternal
// consumes the reservation, restoring credits on a no-charge result and
// finalizing on a charge result. This closes the federation double-spend
// vector identified in the 2026-05-05 Gemini audit, where parallel
// validate calls could all see sufficient balance, all serve responses,
// and only commit afterwards. Without the atomic reserve, an agent with
// 100 credits could drain N x 50-credit calls by parallelizing.

interface ReservationRecord {
  token: string;
  cost: number;
  reserved_at: string;
}

const RESERVATION_TTL_SECONDS = 5 * 60;

export type ValidateOnlyResult =
  | {
      ok: true;
      credits_remaining: number;
      sufficient: boolean;
      reservation_id: string;
    }
  | { ok: false; reason: 'invalid_token' | 'insufficient_credits' };

export async function validateOnly(
  env: Env,
  args: { token: string; cost: number },
): Promise<ValidateOnlyResult> {
  const { token, cost } = args;
  if (
    typeof token !== 'string' ||
    !token ||
    !token.startsWith('tf_live_')
  ) {
    return { ok: false, reason: 'invalid_token' };
  }
  if (!Number.isFinite(cost) || cost < 0) {
    return { ok: false, reason: 'invalid_token' };
  }
  const record = (await env.TENSORFEED_CACHE.get(
    `pay:credits:${token}`,
    'json',
  )) as CreditsRecord | null;
  if (!record) {
    return { ok: false, reason: 'invalid_token' };
  }
  const reservationId = generateNonce();
  const reservation: ReservationRecord = {
    token,
    cost,
    reserved_at: new Date().toISOString(),
  };
  // Atomic reserve via the DO debit. The reservation record is the refund
  // bookkeeping commitInternal consumes; the DO owns the actual debit and
  // auto-mirrors the debited balance to KV. Falls back to the legacy KV
  // reserve below on flag-off / missing binding / DO error.
  const doResult = await tryLedgerDebit(env, token, cost);
  if (doResult !== null) {
    if (!doResult.ok) return { ok: false, reason: 'insufficient_credits' };
    await env.TENSORFEED_CACHE.put(
      `pay:reservation:${reservationId}`,
      JSON.stringify(reservation),
      { expirationTtl: RESERVATION_TTL_SECONDS },
    );
    return {
      ok: true,
      credits_remaining: doResult.balance,
      sufficient: true,
      reservation_id: reservationId,
    };
  }
  // Legacy KV reserve (bounded race). Debit the balance up front, hold the
  // value in a reservation record. commitInternal will either finalize
  // (charge path: no-op, debit already happened) or restore (no-charge
  // path: refund the reserved credits to balance). A 5-minute TTL bounds
  // the worst-case "soft loss" if a sister-site handler crashes before
  // commit.
  if (record.balance < cost) {
    return { ok: false, reason: 'insufficient_credits' };
  }
  const reservedFromBalance = record.balance - cost;
  record.balance = reservedFromBalance;
  record.last_used = new Date().toISOString();
  await Promise.all([
    env.TENSORFEED_CACHE.put(`pay:credits:${token}`, JSON.stringify(record)),
    env.TENSORFEED_CACHE.put(
      `pay:reservation:${reservationId}`,
      JSON.stringify(reservation),
      { expirationTtl: RESERVATION_TTL_SECONDS },
    ),
  ]);
  return {
    ok: true,
    credits_remaining: reservedFromBalance,
    sufficient: true,
    reservation_id: reservationId,
  };
}

export type CommitInternalResult =
  | { ok: true; credits_charged: number; balance_after: number; no_charge_reason: NoChargeReason }
  | { ok: false; reason: 'invalid_token' | 'reservation_not_found' | 'reservation_mismatch' };

/**
 * Internal commit. Sister sites call this after their handler runs.
 * Pass the `reservationId` returned by validateOnly so we can release
 * the reservation atomically and (if `noChargeReason` is set) restore
 * the reserved credits to the token balance.
 *
 * Backwards-compatibility: callers that omit `reservationId` fall back
 * to the legacy "decrement-on-commit" path. That path is race-y by
 * construction (multiple parallel handlers can each commit a charge
 * past the balance) and is retained only for clients that have not yet
 * migrated. New federation deployments must thread reservationId.
 *
 * The `endpoint` arg should be the sister-site path (e.g.
 * `/api/premium/quotes/series` on TerminalFeed) so the public no-charge
 * ledger groups events correctly across the network.
 */
export async function commitInternal(
  env: Env,
  args: {
    token: string;
    cost: number;
    endpoint: string;
    noChargeReason: NoChargeReason;
    reservationId?: string;
  },
): Promise<CommitInternalResult> {
  const { token, cost, endpoint, noChargeReason, reservationId } = args;
  if (
    typeof token !== 'string' ||
    !token ||
    !token.startsWith('tf_live_')
  ) {
    return { ok: false, reason: 'invalid_token' };
  }

  // === Reservation-aware path (race-safe) ===
  if (reservationId) {
    const reservation = (await env.TENSORFEED_CACHE.get(
      `pay:reservation:${reservationId}`,
      'json',
    )) as ReservationRecord | null;
    if (!reservation) {
      return { ok: false, reason: 'reservation_not_found' };
    }
    if (reservation.token !== token || reservation.cost !== cost) {
      // Defensive: the reservation must match the call. A mismatch
      // indicates a buggy or hostile caller; refuse to mutate state.
      return { ok: false, reason: 'reservation_mismatch' };
    }
    // Consume the reservation regardless of outcome so it cannot be
    // double-committed.
    await env.TENSORFEED_CACHE.delete(`pay:reservation:${reservationId}`);

    if (noChargeReason !== null) {
      // Refund the reserved credits (validateOnly debited them up front).
      // Route through the DO mint when available so the refund is atomic
      // and auto-mirrors to KV; fall back to the legacy KV add otherwise.
      let balanceAfter = 0;
      const mintResult = await tryLedgerMint(env, reservation.token, reservation.cost);
      if (mintResult !== null) {
        balanceAfter = mintResult.balance;
        // The DO mint updates DO storage but does NOT auto-mirror (only debit
        // does), so push the restored balance to the KV read source explicitly
        // to keep the public balance endpoint correct.
        await tryLedgerMirrorToKV(env, reservation.token);
      } else {
        const record = (await env.TENSORFEED_CACHE.get(
          `pay:credits:${reservation.token}`,
          'json',
        )) as CreditsRecord | null;
        if (record) {
          record.balance += reservation.cost;
          record.last_used = new Date().toISOString();
          balanceAfter = record.balance;
          await env.TENSORFEED_CACHE.put(
            `pay:credits:${reservation.token}`,
            JSON.stringify(record),
          );
        }
      }
      await logNoChargeEvent(env, noChargeReason, endpoint, reservation.cost, reservation.token);
      return {
        ok: true,
        credits_charged: 0,
        balance_after: balanceAfter,
        no_charge_reason: noChargeReason,
      };
    }

    // Charge path: the debit already happened in validateOnly (DO debit or
    // legacy KV reserve). Surface the current (DO-mirrored or KV) balance;
    // no further debit here, so there is no double-debit.
    const record = (await env.TENSORFEED_CACHE.get(
      `pay:credits:${reservation.token}`,
      'json',
    )) as CreditsRecord | null;
    return {
      ok: true,
      credits_charged: reservation.cost,
      balance_after: record?.balance ?? 0,
      no_charge_reason: null,
    };
  }

  // === Legacy no-reservation path (deprecated; DO-routed for atomicity) ===
  // Retained for callers that haven't migrated to the reservation API. The
  // charge debit is now routed through the DO when available (falling back
  // to the legacy KV read-modify-write), so this path is atomic under the
  // flag even without a reservation.
  // No-charge path: log the event without touching the credit balance.
  if (noChargeReason !== null) {
    const record = (await env.TENSORFEED_CACHE.get(
      `pay:credits:${token}`,
      'json',
    )) as CreditsRecord | null;
    await logNoChargeEvent(env, noChargeReason, endpoint, cost, token);
    return {
      ok: true,
      credits_charged: 0,
      balance_after: record?.balance ?? 0,
      no_charge_reason: noChargeReason,
    };
  }

  // Charge path: atomic debit via the DO, fall back to legacy KV.
  const doResult = await tryLedgerDebit(env, token, cost);
  if (doResult !== null) {
    if (doResult.ok) {
      return { ok: true, credits_charged: cost, balance_after: doResult.balance, no_charge_reason: null };
    }
    // DO rejected (insufficient/cap): no-charge, mirroring commitPayment.
    await logNoChargeEvent(env, 'stale_data', endpoint, cost, token);
    return { ok: true, credits_charged: 0, balance_after: doResult.balance, no_charge_reason: 'stale_data' };
  }
  const record = (await env.TENSORFEED_CACHE.get(
    `pay:credits:${token}`,
    'json',
  )) as CreditsRecord | null;
  if (!record) {
    return { ok: false, reason: 'invalid_token' };
  }
  const balanceAfter = Math.max(0, record.balance - cost);
  record.balance = balanceAfter;
  record.last_used = new Date().toISOString();
  await env.TENSORFEED_CACHE.put(`pay:credits:${token}`, JSON.stringify(record));
  return {
    ok: true,
    credits_charged: cost,
    balance_after: balanceAfter,
    no_charge_reason: null,
  };
}

// === Middleware: requirePayment + commitPayment (deferred-debit model) ===

/**
 * Agent Fair-Trade Agreement (AFTA) deferred-debit flow:
 *
 *   1. requirePayment() validates token + breaker + balance >= cost,
 *      but does NOT debit. Returns currentBalance + cost.
 *   2. Handler computes the response (which may surface captured_at
 *      for staleness checks).
 *   3. commitPayment() either debits (normal path) or records a
 *      no-charge event (5xx, breaker, schema-fail, stale-data).
 *
 * This swap from "debit on entry" to "validate on entry, commit on
 * success" is what makes the no-charge guarantees enforceable in code
 * rather than just promised in marketing copy. Every no-charge event
 * is logged to pay:no-charge:{date} so the daily aggregate at
 * /api/payment/no-charge-stats is auditable.
 */

export interface PaymentResult {
  paid: boolean;
  response?: Response;
  // When paid=true, populated for the commit step:
  token?: string;
  cost?: number;             // credits to be debited on commit (0 if no-charge)
  currentBalance?: number;   // balance BEFORE the pending debit
  // Best-case post-commit balance, exposed for legacy callers and the
  // X-Payment-Token-Balance header. commitPayment returns the real value.
  tokenRemaining?: number;
  newToken?: boolean;        // true if minted via x402 (caller should advertise)
  // Set when the X-PAYMENT (canonical Coinbase x402 V2) path settles. Caller
  // should attach as PAYMENT-RESPONSE on the eventual 200 response.
  paymentResponseHeader?: string;
  // Set when the call was granted under the free-trial quota (no auth
  // headers, IP under daily cap). Causes commitPayment to log a no-charge
  // event with reason='free_trial' and skip credit/wallet I/O entirely.
  freeTrial?: FreeTrialQuota;
  // On-chain payer address (auth.from) surfaced only when this invocation
  // settled a fresh on-chain payment this request: the X-PAYMENT (Coinbase
  // x402 V2) settle and the X-Payment-Tx fallback. Threaded into
  // logPremiumUsage so the KV paid rollup's top_payers reflects who paid.
  // Bearer-token reuse does not set this: that wallet paid on an earlier
  // call, not this one, so attributing it here would double-count.
  payerWallet?: string;
}

export async function requirePayment(
  request: Request,
  env: Env,
  tier: 1 | 2 | 3 | 4 | 5,
): Promise<PaymentResult> {
  if (env.PAYMENT_ENABLED !== 'true') {
    return {
      paid: false,
      response: jsonResponse(
        {
          ok: false,
          error: 'payment_disabled',
          message: 'Premium endpoints are temporarily disabled. See /api/payment/info for status.',
        },
        503,
      ),
    };
  }

  const cost = TIER_COSTS[tier];

  // Path 1: bearer token (credits flow, primary)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (!token.startsWith('tf_live_')) {
      return {
        paid: false,
        response: jsonResponse({ ok: false, error: 'invalid_token_format' }, 401),
      };
    }
    const record = (await env.TENSORFEED_CACHE.get(`pay:credits:${token}`, 'json')) as CreditsRecord | null;
    if (!record) {
      return { paid: false, response: jsonResponse({ ok: false, error: 'token_not_found' }, 401) };
    }

    // Circuit breaker: refuse to charge credits if this token is hammering
    // the API. Two layers run in checkRequestCircuit:
    //   - identical-request: same path+query repeated > TUPLE_THRESHOLD
    //   - burn-rate: any requests > BURN_RATE_THRESHOLD in the window
    // Burn-rate catches loops that randomize the URL (e.g. ?nonce=...)
    // and would otherwise sail past the per-tuple breaker.
    const breaker = checkRequestCircuit(request, token);
    if (breaker.tripped) {
      const isBurnRate = breaker.trip_kind === 'burn_rate';
      const retryAfterSeconds = breaker.cooldown_seconds ?? (isBurnRate ? 300 : 120);
      const errorCode = isBurnRate ? 'burn_rate_exceeded' : 'infinite_loop_detected';
      const message = isBurnRate
        ? `Burn-rate breaker tripped. This token issued ${breaker.count} requests in the last minute across all endpoints. Slow the agent's request rate or split traffic across multiple tokens.`
        : `Circuit breaker tripped. The same request was issued ${breaker.count} times in the last minute. Re-evaluate the agent's planning logic before retrying.`;
      return {
        paid: false,
        response: jsonResponse(
          {
            ok: false,
            error: errorCode,
            trip_kind: breaker.trip_kind,
            message,
            cooldown_seconds: retryAfterSeconds,
            retry_after_unix_ms: breaker.retry_after_unix_ms,
            balance: record.balance,
            doc: 'https://tensorfeed.ai/developers/agent-payments#circuit-breaker',
          },
          429,
          { 'Retry-After': String(retryAfterSeconds) },
        ),
      };
    }

    if (record.balance < cost) {
      return {
        paid: false,
        response: jsonResponse(
          {
            ok: false,
            error: 'insufficient_credits',
            balance: record.balance,
            required: cost,
            top_up_at: '/api/payment/buy-credits',
          },
          402,
        ),
      };
    }

    // Per-token daily spend cap (defense-in-depth, optional). Tokens
    // without a configured cap pass through. Tokens with a cap that
    // would be exceeded by this call return 429 daily_cap_exceeded
    // BEFORE the deferred debit, so no credits are charged.
    const capCheck = await checkSpendCap(env, token, record.daily_cap, cost);
    if (!capCheck.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((new Date(capCheck.reset_at).getTime() - Date.now()) / 1000),
      );
      return {
        paid: false,
        response: jsonResponse(
          {
            ok: false,
            error: 'daily_cap_exceeded',
            message: `This token has a per-day spend cap of ${capCheck.daily_cap} credits and has already spent ${capCheck.daily_spent} today. The pending call would exceed the cap by ${capCheck.would_exceed_by} credits. The cap resets at ${capCheck.reset_at}. Adjust at /api/payment/spend-cap.`,
            daily_spent: capCheck.daily_spent,
            daily_cap: capCheck.daily_cap,
            would_exceed_by: capCheck.would_exceed_by,
            reset_at: capCheck.reset_at,
            balance: record.balance,
            doc: '/developers/agent-payments#daily-spend-cap',
          },
          429,
          { 'Retry-After': String(retryAfterSeconds) },
        ),
      };
    }

    // AFTA deferred-debit: do NOT decrement here. commitPayment will
    // run after the handler resolves and either debit or record a
    // no-charge event under the published guarantees.
    return {
      paid: true,
      token,
      cost,
      currentBalance: record.balance,
      tokenRemaining: record.balance - cost,
    };
  }

  // Path 2: x402 fallback (per-call payment via tx hash)
  const txHash = request.headers.get('X-Payment-Tx');
  if (txHash) {
    // AFTA Tx-Sniper protection: x402 fallback also requires a quote
    // nonce so the on-chain sender can be verified against the quote's
    // sender_wallet binding. Same primitive as /api/payment/confirm.
    const quoteNonce = request.headers.get('X-Payment-Quote');
    if (!quoteNonce) {
      return {
        paid: false,
        response: jsonResponse(
          {
            ok: false,
            error: 'quote_required',
            message:
              'x402 fallback requires both X-Payment-Tx and X-Payment-Quote headers. Issue a quote at /api/payment/buy-credits with your sender_wallet, then include the returned nonce as X-Payment-Quote.',
            doc: '/developers/agent-payments#x402-fallback',
          },
          402,
        ),
      };
    }
    const x402Quote = (await env.TENSORFEED_CACHE.get(
      `pay:quote:${quoteNonce}`,
      'json',
    )) as QuoteRecord | null;
    if (!x402Quote || Date.now() > x402Quote.expires_at) {
      return {
        paid: false,
        response: jsonResponse(
          {
            ok: false,
            error: 'quote_not_found_or_expired',
            message: 'Quote nonce missing, expired, or already consumed.',
          },
          402,
        ),
      };
    }
    if (!x402Quote.sender_wallet || !isValidSenderWallet(x402Quote.sender_wallet)) {
      return {
        paid: false,
        response: jsonResponse(
          {
            ok: false,
            error: 'quote_legacy_format',
            message: 'Issue a fresh quote bound to your sender_wallet.',
          },
          402,
        ),
      };
    }

    const existing = (await env.TENSORFEED_CACHE.get(`pay:tx:${txHash}`, 'json')) as TxRecord | null;
    if (existing) {
      // Pending claim-intent (a concurrent confirm is in flight): bail
      // with tx_in_flight so the second request does not duplicate-mint
      // off the same on-chain payment. TTL is 60s.
      if (existing.pending) {
        return {
          paid: false,
          response: jsonResponse(
            {
              ok: false,
              error: 'tx_in_flight',
              message:
                'This tx is already being processed by another request. Retry in a few seconds.',
            },
            409,
          ),
        };
      }
      // Existing-tx re-use: only the original on-chain sender (whose
      // address is recorded on the TxRecord) may charge against the
      // already-issued token. Legacy records without sender_wallet fail
      // closed; the agent must use Authorization: Bearer with the
      // originally-issued token instead.
      if (
        !existing.sender_wallet ||
        existing.sender_wallet.toLowerCase() !== x402Quote.sender_wallet.toLowerCase()
      ) {
        return {
          paid: false,
          response: jsonResponse(
            {
              ok: false,
              error: 'sender_mismatch',
              message:
                'This tx was minted by a different wallet. Use the original bearer token (Authorization: Bearer tf_live_...) returned at first mint.',
            },
            403,
          ),
        };
      }
      const tokenRecord = (await env.TENSORFEED_CACHE.get(`pay:credits:${existing.token}`, 'json')) as CreditsRecord | null;
      if (tokenRecord && tokenRecord.balance >= cost) {
        // AFTA deferred-debit: don't decrement until commitPayment.
        return {
          paid: true,
          token: existing.token,
          cost,
          currentBalance: tokenRecord.balance,
          tokenRemaining: tokenRecord.balance - cost,
        };
      }
      return {
        paid: false,
        response: jsonResponse(
          {
            ok: false,
            error: 'tx_already_used',
            message: 'This tx was already claimed and the issued token is depleted.',
            token: existing.token,
            top_up_at: '/api/payment/buy-credits',
          },
          409,
        ),
      };
    }

    // Claim-intent: stake the tx_hash slot BEFORE the on-chain
    // verification round-trip. Same purpose as in confirmPayment:
    // shrinks the cross-PoP KV race window that would otherwise let a
    // single tx_hash mint multiple tokens from concurrent x402 calls.
    await env.TENSORFEED_CACHE.put(
      `pay:tx:${txHash}`,
      JSON.stringify({
        amount_usd: 0,
        credits: 0,
        token: '',
        created: new Date().toISOString(),
        pending: true,
      } as TxRecord),
      { expirationTtl: CLAIM_INTENT_TTL_SECONDS },
    );

    const verified = await verifyBaseUSDCTransaction(txHash, env);
    if (!verified.ok) {
      // Leave the pending record to expire (60s); avoiding delete sidesteps
      // the propagation race that motivated the claim-intent in the first
      // place.
      return {
        paid: false,
        response: jsonResponse(
          { ok: false, error: 'tx_verification_failed', reason: verified.reason },
          402,
        ),
      };
    }

    // AFTA Tx-Sniper guard for new mints on the x402 path: the on-chain
    // `from` must match the sender_wallet bound to the X-Payment-Quote
    // nonce. Closes the public-mempool theft attack on this surface.
    if (
      !verified.senderAddress ||
      verified.senderAddress.toLowerCase() !== x402Quote.sender_wallet.toLowerCase()
    ) {
      return {
        paid: false,
        response: jsonResponse(
          {
            ok: false,
            error: 'sender_mismatch',
            message:
              'On-chain sender of this tx does not match the sender_wallet on your X-Payment-Quote. Issue a fresh quote from the same wallet that signed the on-chain payment.',
          },
          403,
        ),
      };
    }

    // OFAC sanctions screen for the x402 fallback. Same gate as
    // /api/payment/confirm: misconfig fails closed, transient errors
    // fail open with logging, sanctioned hits refuse and persist.
    if (verified.senderAddress) {
      const screen = await screenWalletOFAC(verified.senderAddress, env);
      if (screen.error === 'screening_not_configured') {
        return {
          paid: false,
          response: jsonResponse(
            {
              ok: false,
              error: 'screening_unavailable',
              message: 'Sanctions screening is currently unavailable. Please retry shortly.',
            },
            503,
          ),
        };
      }
      if (screen.sanctioned) {
        await persistOFACBlock(env, verified.senderAddress, txHash, screen.identifications);
        return {
          paid: false,
          response: jsonResponse(
            {
              ok: false,
              error: 'sanctions_block',
              message:
                'This wallet address cannot be credited due to applicable sanctions law. No credits will be issued. The original USDC transfer is on-chain and irreversible. See https://tensorfeed.ai/terms#premium Section 17.9 and 17.11.',
            },
            403,
          ),
        };
      }
      if (screen.error) {
        if (isTransientOfacError(screen.error)) {
          if (
            ofacTransientDecision(
              verified.senderAddress,
              screen.error,
              'require_payment_mint',
            ) === 'reject'
          ) {
            return {
              paid: false,
              response: jsonResponse(
                {
                  ok: false,
                  error: 'screening_unavailable',
                  message:
                    'Sanctions screening is temporarily unavailable and this address has no recent clean screen on file. No credits were issued and the wallet was NOT flagged or banned. Retry once screening recovers.',
                },
                503,
              ),
            };
          }
          // cache_pass: allow through the brief outage (logged).
        } else {
          console.log(
            JSON.stringify({
              event: 'ofac_screen_degraded',
              wallet: verified.senderAddress,
              tx_hash: txHash,
              error: screen.error,
              decision: 'fail_open_continue',
              timestamp: new Date().toISOString(),
            }),
          );
        }
      }
    }

    const baseCredits = calculateCredits(verified.amountUsd);
    const welcome = await checkAndMarkFirstPayment(env, verified.senderAddress);
    const credits = baseCredits + welcome.bonusCredits;
    if (credits < cost) {
      return {
        paid: false,
        response: jsonResponse(
          {
            ok: false,
            error: 'insufficient_credits_from_tx',
            tx_credits: credits,
            required: cost,
            tx_amount_usd: verified.amountUsd,
            message: `Your tx of $${verified.amountUsd.toFixed(2)} buys ${credits} credits, but this call requires ${cost}. Send more.`,
          },
          402,
        ),
      };
    }

    const token = generateToken();
    const now = new Date().toISOString();
    // AFTA deferred-debit: mint at full credits, commitPayment will
    // debit cost (or skip if no-charge guarantee triggers).
    const tokenRecord: CreditsRecord = {
      balance: credits,
      created: now,
      last_used: now,
      agent_ua: request.headers.get('User-Agent') || 'unknown',
      total_purchased: credits,
    };
    const txRec: TxRecord = {
      amount_usd: verified.amountUsd,
      credits,
      token,
      created: now,
      block_number: verified.blockNumber,
      sender_wallet: verified.senderAddress.toLowerCase(),
    };

    await Promise.all([
      env.TENSORFEED_CACHE.put(`pay:credits:${token}`, JSON.stringify(tokenRecord)),
      env.TENSORFEED_CACHE.put(`pay:tx:${txHash}`, JSON.stringify(txRec)),
      env.TENSORFEED_CACHE.delete(`pay:quote:${quoteNonce}`),
      logRevenue(env, verified.amountUsd, request.headers.get('User-Agent') || 'unknown'),
      appendTokenPurchase(env, token, {
        tx_hash: txHash,
        amount_usd: verified.amountUsd,
        credits_added: credits,
        block_number: verified.blockNumber,
        confirmed_at: now,
      }),
      welcome.isFirstPayment && verified.senderAddress
        ? markWalletSeen(env, verified.senderAddress)
        : Promise.resolve(),
    ]);

    return {
      paid: true,
      token,
      cost,
      currentBalance: tokenRecord.balance,
      tokenRemaining: tokenRecord.balance - cost,
      newToken: true,
      payerWallet: verified.senderAddress,
    };
  }

  // Path 3: standard Coinbase x402 V2 (X-PAYMENT header, EIP-3009 signed
  // transferWithAuthorization). This is the canonical wire format spoken
  // by AgentCore Payments and the @coinbase/x402 SDK out of the box.
  // Coexists additively with Paths 1 and 2; only triggers when X-PAYMENT
  // is present and follows the spec's "exact" scheme: auth.value must
  // equal requirements.amount.
  // Accept the signed payload on EITHER the legacy X-PAYMENT header OR the
  // x402 v2 transport header PAYMENT-SIGNATURE. TF advertises x402Version 2 and
  // already emits the v2 response headers (PAYMENT-REQUIRED, PAYMENT-RESPONSE);
  // the current @x402/fetch + @x402/svm v2 buyer sends the request payload on
  // PAYMENT-SIGNATURE, so reading only X-PAYMENT made TF unpayable by a
  // spec-current v2 agent. The header VALUE (base64 payload) is identical on
  // both, so downstream parsing, OFAC keying, mint-dedup, and the PaymentClaim
  // idemKey are unchanged regardless of which header carried it.
  const xPaymentHeader =
    request.headers.get('X-PAYMENT') || request.headers.get('PAYMENT-SIGNATURE');
  if (xPaymentHeader) {
    const url = new URL(request.url);
    const resourceUrl = `${url.origin}${url.pathname}`;
    const x402Config = getX402Config(env);
    // Pilot endpoints carry a bazaar extension at settle time so CDP's
    // indexer can catalog them. Without extensions in the settle POST,
    // CDP returns EXTENSION-RESPONSES: e30= ({}) and the endpoint never
    // surfaces on agentic.market (the 402 body's extensions block is for
    // buyer-side validators only). Non-pilots get {} which is dropped
    // before serialization.
    //
    // Normalization 2026-05-25: CDP's hosted indexer reads three signals
    // that TF's static BazaarPilotConfig blocks don't provide:
    //   1. info.input.discoverable: true (BlockRun ships this; without it
    //      CDP appears to skip the entry from /discovery/resources)
    //   2. info.input.url (full origin URL, repeated; CDP correlates
    //      against this field even though resource is also at accepts[])
    //   3. NO $schema pin on extensions.bazaar.schema (CDP loads draft-
    //      2020-12 implicitly; an explicit pin can cause silent reject)
    // Inject at settle time so the static configs stay simple. Deep
    // clone to avoid mutating the shared module-level config.
    const pilotExtensions = normalizeBazaarExtensionsForCDP(
      bazaarExtensionsFor(url.pathname),
      resourceUrl,
    );
    const evmRequirements: X402PaymentRequirements = {
      scheme: 'exact',
      network: x402Config.network,
      amount: String(cost * 20000),
      asset: x402Config.usdcAddress,
      payTo: env.PAYMENT_WALLET as `0x${string}`,
      maxTimeoutSeconds: 60,
      resource: resourceUrl,
      // Per-network domain name. Mainnet USDC.name() = "USD Coin";
      // Sepolia USDC.name() = "USDC". The `extra` field is the spec-defined
      // hint clients use to construct the EIP-712 domain.
      extra: { name: x402Config.domain.name, version: x402Config.domain.version, resource: resourceUrl },
      ...(Object.keys(pilotExtensions).length > 0 ? { extensions: pilotExtensions } : {}),
    };
    // Second rail: Solana mainnet USDC via CDP. Built only when the rail is
    // advertised (flag on + receive wallet set); undefined keeps it dark. payTo
    // is a base58 pubkey forwarded verbatim to CDP (the `0x${string}` cast is a
    // type accommodation, not an EVM address).
    const solanaRequirements: X402PaymentRequirements | undefined =
      env.SOLANA_PAYMENT_ENABLED === 'true' && env.SOLANA_PAYMENT_WALLET
        ? {
            scheme: 'exact',
            network: SOLANA_NETWORK_V2,
            amount: String(cost * 20000),
            asset: SOLANA_USDC_MINT,
            payTo: env.SOLANA_PAYMENT_WALLET as `0x${string}`,
            maxTimeoutSeconds: 60,
            resource: resourceUrl,
            extra: { feePayer: SOLANA_FEEPAYER_V2, resource: resourceUrl },
            // Carry the pilot bazaar extension on the Solana rail too, mirroring
            // evmRequirements above. cdpSettle echoes requirements.extensions
            // into paymentPayload.extensions, which is the discovery payload CDP
            // reads to catalog. Without this the SOL rail settled but never
            // appeared in Bazaar (only the resource key was present, not the
            // extension). pilotExtensions is the canonical verbatim config.
            ...(Object.keys(pilotExtensions).length > 0 ? { extensions: pilotExtensions } : {}),
          }
        : undefined;
    const liveAccepts = solanaRequirements
      ? [evmRequirements, solanaRequirements]
      : [evmRequirements];

    const parsed = parseAnyXPaymentHeader(xPaymentHeader);
    if (!parsed) {
      return {
        paid: false,
        response: jsonResponse(
          {
            x402Version: 2,
            success: false,
            errorReason: 'invalid_payload',
            message: 'X-PAYMENT header is not valid base64 JSON or is missing required fields.',
            accepts: liveAccepts,
            resource: { url: resourceUrl, mimeType: 'application/json' },
          },
          400,
        ),
      };
    }
    // Dark-rail guard: a Solana payload arriving while Solana is not advertised.
    // No compliant agent sees Solana in `accepts` while dark, so this only
    // catches probes. Reject as invalid_payload (the rail is not offered).
    if (parsed.rail === 'solana' && !solanaRequirements) {
      return {
        paid: false,
        response: jsonResponse(
          {
            x402Version: 2,
            success: false,
            errorReason: 'invalid_payload',
            message: 'Solana payments are not enabled for this resource.',
            accepts: liveAccepts,
            resource: { url: resourceUrl, mimeType: 'application/json' },
          },
          400,
        ),
      };
    }
    const requirements: X402PaymentRequirements =
      parsed.rail === 'solana' ? solanaRequirements! : evmRequirements;

    // Solana always settles through CDP (the self-broadcast facilitator is
    // viem/EIP-712-bound and cannot touch SVM). EVM pilots route via CDP too;
    // other EVM endpoints stay on the self-broadcast path unchanged.
    const viaCDP = parsed.rail === 'solana' || isBazaarPilotPath(url.pathname);
    const verify = viaCDP
      ? await cdpVerify(env, parsed.payload as X402PaymentPayload, requirements)
      : await verifyX402Payment(parsed.payload as X402PaymentPayload, requirements, undefined, x402Config);
    if (!verify.isValid) {
      // Surface verify.message + log it. Without this the buyer side only
      // sees the generic errorReason code (e.g. unexpected_verify_error)
      // with no way to know what CDP actually returned. Logged + returned.
      console.error(`x402 verify failed: ${verify.invalidReason} - ${verify.message || '(no message)'}`);
      return {
        paid: false,
        response: jsonResponse(
          {
            x402Version: 2,
            success: false,
            errorReason: verify.invalidReason,
            invalidMessage: verify.message || null,
            accepts: [requirements],
            resource: { url: resourceUrl, mimeType: 'application/json' },
          },
          402,
        ),
      };
    }

    const payerAddress = verify.payer!;

    // OFAC screen on the on-chain authorizer (auth.from). Same gate as
    // /api/payment/confirm and the X-Payment-Tx fallback. Misconfig fails
    // closed; sanctioned hits refuse and persist.
    const screen = await screenWalletOFAC(payerAddress, env);
    if (screen.error === 'screening_not_configured') {
      return {
        paid: false,
        response: jsonResponse(
          {
            x402Version: 2,
            success: false,
            errorReason: 'unexpected_verify_error',
            message: 'Sanctions screening is currently unavailable. Please retry shortly.',
          },
          503,
        ),
      };
    }
    if (screen.sanctioned) {
      // Solana carries no EIP-3009 nonce; derive a stable bounded discriminator
      // from a hash of the inbound transaction (pre-settle, so settle.transaction
      // is not yet available here).
      const ofacReason =
        parsed.rail === 'solana'
          ? `x402-sol:${(await sha256Hex(parsed.payload.payload.transaction)).slice(0, 32)}`
          : `x402-auth:${parsed.payload.payload.authorization.nonce}`;
      await persistOFACBlock(
        env,
        payerAddress,
        ofacReason,
        screen.identifications,
      );
      return {
        paid: false,
        response: jsonResponse(
          {
            x402Version: 2,
            success: false,
            errorReason: 'unexpected_verify_error',
            message:
              'This wallet address cannot be credited due to applicable sanctions law. The authorization was not broadcast. See https://tensorfeed.ai/terms#premium Section 17.9 and 17.11.',
          },
          403,
        ),
      };
    }

    // B-F5: transient Chainalysis failure (429/5xx/unreachable). This
    // path already fails closed on misconfig + sanctioned above; here
    // we fail closed on a transient outage too UNLESS the address has a
    // recent in-isolate clean screen. Never flags or persists a block.
    if (isTransientOfacError(screen.error)) {
      if (
        ofacTransientDecision(
          payerAddress,
          screen.error,
          'require_payment_x402',
        ) === 'reject'
      ) {
        return {
          paid: false,
          response: jsonResponse(
            {
              x402Version: 2,
              success: false,
              errorReason: 'unexpected_verify_error',
              message:
                'Sanctions screening is temporarily unavailable and this address has no recent clean screen on file. The authorization was not broadcast and the wallet was NOT flagged. Please retry shortly.',
            },
            503,
          ),
        };
      }
      // cache_pass: a clean screen within the TTL, allow through (logged).
    }

    // PaymentClaim DO gate (flag + binding + CDP path). Serializes the
    // settle+mint sequence per payment-idempotency key so exactly one
    // concurrent request mints; closes the CDP-path double-mint TOCTOU on both
    // the Solana rail and the EVM-via-CDP pilot paths. claimIdemKey = a hash of
    // the inbound X-PAYMENT payload (identical on a retry, distinct per
    // payment). A null binding/flag falls back to the legacy KV mint-dedup below.
    const claimIdemKey =
      viaCDP && env.PAYMENT_CLAIM_ENABLED === 'true' ? await sha256Hex(xPaymentHeader) : null;
    const claimStub = claimIdemKey ? getPaymentClaim(env, claimIdemKey) : null;
    let claimWon = false;
    if (claimStub && claimIdemKey) {
      const claimResp = await claimStub.fetch(
        new Request('https://payment-claim/claim', {
          method: 'POST',
          body: JSON.stringify({ idemKey: claimIdemKey, nowMs: Date.now() }),
        }),
      );
      const claim = (await claimResp.json()) as { status?: string; token?: string };
      if (claim.status === 'done' && typeof claim.token === 'string') {
        const rec = (await env.TENSORFEED_CACHE.get(
          `pay:credits:${claim.token}`,
          'json',
        )) as CreditsRecord | null;
        if (rec) {
          // Another request already settled + minted this exact payment. Return
          // the original token without settling again (pre-settle exactly-once).
          return {
            paid: true,
            token: claim.token,
            cost,
            currentBalance: rec.balance,
            tokenRemaining: rec.balance - cost,
            newToken: true,
            payerWallet: payerAddress,
          };
        }
        // Committed token record purged: fall through and re-mint. Settle is
        // idempotent on broadcast, so this re-broadcasts to the same tx.
      } else if (claim.status === 'in_flight') {
        return {
          paid: false,
          response: jsonResponse(
            {
              x402Version: 2,
              success: false,
              errorReason: 'payment_in_flight',
              message:
                'A settlement for this exact payment is already in progress. Retry shortly with the same X-PAYMENT to receive your token.',
            },
            409,
          ),
        };
      } else {
        claimWon = true;
      }
    }
    // Finalize a won claim after a successful mint (records the token + settled
    // signature so a later/concurrent caller gets 'done'), or release it on
    // settle failure so a genuine retry can re-win without the TTL wait.
    const commitClaim = async (
      mintedToken: string,
      signature: string | undefined,
    ): Promise<void> => {
      if (claimStub && claimWon && claimIdemKey) {
        await claimStub.fetch(
          new Request('https://payment-claim/commit', {
            method: 'POST',
            body: JSON.stringify({
              idemKey: claimIdemKey,
              token: mintedToken,
              nowMs: Date.now(),
              signature,
              payer: payerAddress,
            }),
          }),
        );
      }
    };
    const releaseClaim = async (): Promise<void> => {
      if (claimStub && claimWon && claimIdemKey) {
        await claimStub.fetch(
          new Request('https://payment-claim/release', {
            method: 'POST',
            body: JSON.stringify({ idemKey: claimIdemKey }),
          }),
        );
      }
    };

    // Settle on-chain via USDC.transferWithAuthorization. For pilot
    // endpoints routed through CDP, Coinbase's hosted facilitator
    // performs the broadcast (paying gas); for everything else our
    // self-broadcast module uses the X402_BROADCAST_KEY hot wallet.
    // Both return a SettleResult-shaped object.
    // Thread the pilot's Bazaar description into the CDP /settle resource
    // object so the cataloged row carries a searchable description. CDP
    // catalogs from the settle paymentPayload.resource; without a
    // description the row is metadata-blank and capability search never
    // surfaces TF. Null for non-pilot paths (cdpSettle is only called on
    // pilot paths here, but keep it defensive: undefined preserves the
    // prior { url, mimeType } resource shape).
    const settle = viaCDP
      ? await cdpSettle(
          env,
          parsed.payload as X402PaymentPayload,
          requirements,
          getBazaarPilotConfig(url.pathname)?.description,
        )
      : await settleX402Payment(parsed.payload as X402PaymentPayload, env);
    // Bazaar pilot observability. CDP's EXTENSION-RESPONSES header indicates
    // whether our bazaar metadata was accepted ("processing"/"indexed") or
    // rejected ("rejected"). The header wire format is not stable (bare
    // literal vs base64(JSON); see cdp-facilitator decodeBazaarStatus), so
    // log the decoded bazaarStatus as the grep-able signal and keep the raw
    // header alongside for debugging. Cheap; only fires on CDP-routed paths.
    if (viaCDP && 'extensionResponses' in settle) {
      const cdpResult = settle as { extensionResponses?: string; bazaarStatus?: string };
      console.log(
        `[bazaar-pilot] path=${url.pathname} success=${settle.success} bazaarStatus=${
          cdpResult.bazaarStatus ?? '(none)'
        } extensionResponsesRaw=${cdpResult.extensionResponses ?? '(none)'} tx=${
          settle.transaction ?? '(none)'
        }`,
      );
    }
    if (!settle.success) {
      // Settle failed: free the claim so a genuine retry can re-win immediately
      // instead of getting 'in_flight' until the TTL lapses.
      await releaseClaim();
      return {
        paid: false,
        response: jsonResponse(
          {
            x402Version: 2,
            success: false,
            errorReason: settle.errorReason,
            message: settle.message,
            accepts: [requirements],
          },
          402,
        ),
      };
    }

    // Mint-dedup (audit HIGH-1, 2026-05-28). settleX402Payment / cdpSettle are
    // idempotent on BROADCAST (one tx per (from, nonce) within the 7-day auth
    // window), but the mint below is not. Without this gate, replaying the same
    // still-valid X-PAYMENT header would mint a SECOND full-credit token for one
    // on-chain payment. Gate the mint on the same (from, nonce) identity the
    // settle idempotency uses: if this authorization already minted a token,
    // return that original token (a lost-response retry gets its token back; a
    // deliberate replay gets no free credits). Covers both the self-broadcast
    // and CDP-routed paths, since settle is unified above.
    const mintDedupKey =
      parsed.rail === 'solana'
        ? `pay:x402mint:sol:${settle.transaction}`
        : `pay:x402mint:${payerAddress}:${parsed.payload.payload.authorization.nonce}`;
    const MINT_DEDUP_TTL_SECONDS = 7 * 24 * 60 * 60; // matches X402_AUTH_TTL_SECONDS, the auth-claim replay window
    const priorMint = (await env.TENSORFEED_CACHE.get(mintDedupKey, 'json')) as { token: string } | null;
    if (priorMint && typeof priorMint.token === 'string') {
      const priorRecord = (await env.TENSORFEED_CACHE.get(`pay:credits:${priorMint.token}`, 'json')) as CreditsRecord | null;
      if (priorRecord) {
        if (priorRecord.balance < cost) {
          return {
            paid: false,
            response: jsonResponse(
              {
                x402Version: 2,
                success: false,
                errorReason: 'insufficient_funds',
                message: `This authorization already minted a credits token, which now has ${priorRecord.balance} credits, fewer than the ${cost} this call requires. Use that token via Authorization: Bearer, top up at /api/payment/buy-credits, or send a new payment.`,
              },
              402,
            ),
          };
        }
        // Already minted for this authorization: return the original token,
        // do NOT mint again and do NOT re-charge.
        await commitClaim(priorMint.token, settle.transaction);
        return {
          paid: true,
          token: priorMint.token,
          cost,
          currentBalance: priorRecord.balance,
          tokenRemaining: priorRecord.balance - cost,
          newToken: true,
          paymentResponseHeader: encodeSettlementHeader(settle),
          payerWallet: payerAddress,
        };
      }
      // Marker present but the token record is gone (manual purge): fall
      // through and mint a fresh token; the marker is overwritten below.
    }

    // Mint a credits token from the settled amount. The "exact" scheme
    // means auth.value === requirements.amount, so this token starts with
    // exactly enough credits for THIS call (plus any first-payment
    // welcome bonus). Repeat use should switch to the credits flow.
    const amountUsd =
      parsed.rail === 'solana'
        ? Number(requirements.amount) / 1e6
        : Number(parsed.payload.payload.authorization.value) / 1e6;
    const baseCredits = calculateCredits(amountUsd);
    const welcome = await checkAndMarkFirstPayment(env, payerAddress);
    const credits = baseCredits + welcome.bonusCredits;
    if (credits < cost) {
      return {
        paid: false,
        response: jsonResponse(
          {
            x402Version: 2,
            success: false,
            errorReason: 'insufficient_funds',
            message: `Authorization for $${amountUsd.toFixed(2)} buys ${credits} credits, but this call requires ${cost}.`,
          },
          402,
        ),
      };
    }

    const token = generateToken();
    const now = new Date().toISOString();
    const tokenRecord: CreditsRecord = {
      balance: credits,
      created: now,
      last_used: now,
      agent_ua: request.headers.get('User-Agent') || 'unknown',
      total_purchased: credits,
    };

    await Promise.all([
      env.TENSORFEED_CACHE.put(`pay:credits:${token}`, JSON.stringify(tokenRecord)),
      env.TENSORFEED_CACHE.put(mintDedupKey, JSON.stringify({ token }), { expirationTtl: MINT_DEDUP_TTL_SECONDS }),
      logRevenue(env, amountUsd, request.headers.get('User-Agent') || 'unknown'),
      appendTokenPurchase(env, token, {
        tx_hash: settle.transaction!,
        amount_usd: amountUsd,
        credits_added: credits,
        block_number: 0,
        confirmed_at: now,
      }),
      welcome.isFirstPayment ? markWalletSeen(env, payerAddress) : Promise.resolve(),
    ]);

    // Finalize the claim so any later/concurrent request for this exact payment
    // gets 'done' + this token instead of settling and minting a second one.
    await commitClaim(token, settle.transaction);

    return {
      paid: true,
      token,
      cost,
      currentBalance: tokenRecord.balance,
      tokenRemaining: tokenRecord.balance - cost,
      newToken: true,
      paymentResponseHeader: encodeSettlementHeader(settle),
      payerWallet: payerAddress,
    };
  }

  // No bearer, no X-Payment-Tx, no X-PAYMENT. Before serving the
  // canonical 402 challenge, give this IP a free-trial slot if its
  // 24h quota allows. The trial is intentionally outside the standard
  // payment paths: it does not mint a bearer token and it does not
  // settle on-chain. The handler dispatches the same code path as a
  // paid call; commitPayment sees `noChargeReason === 'free_trial'`
  // and logs the no-charge event without touching credit state.
  //
  // Strict-premium endpoints (worker/src/strict-premium-endpoints.ts)
  // bypass the trial entirely. These paths are the TF moat
  // (historical full-window time-series, heavy aggregations, curated
  // premium-only datasets). They have free siblings for discovery
  // (e.g. pricing_series_free 7-day-capped). Strict-premium hits
  // fall straight through to the canonical 402 challenge.
  //
  // Only granted when there is genuinely no payment attempt. If the
  // caller supplied a malformed Authorization header earlier in the
  // function, we already returned 401 above and never reach here.
  const requestUrl = new URL(request.url);
  const isStrict = isStrictPremiumPath(requestUrl.pathname);
  const trialIp = getClientIPFromRequest(request);
  const trial = isStrict ? null : checkFreeTrialQuota(trialIp);
  if (trial && trial.allowed) {
    return {
      paid: true,
      cost,
      currentBalance: 0,
      tokenRemaining: 0,
      freeTrial: trial,
    };
  }
  // Quota exhausted, or strict-premium path -> return the canonical
  // 402 challenge with the exhaustion context (if any) and a flag
  // so the response copy can be honest about what is on offer.
  return {
    paid: false,
    response: paymentRequiredResponse(env, cost, tier, request, trial ?? undefined, isStrict),
  };
}

/**
 * Build the COMPACT extensions block for the 402 PAYMENT-REQUIRED header.
 * Keeps only bazaar.info.input (the param schema catalog validators such as
 * x402scan read from the header) plus routeTemplate, dropping the heavy
 * bazaar.info.output.example and the full JSON Schema. The base64 of the
 * canonical PaymentRequired is emitted in BOTH PAYMENT-REQUIRED and
 * WWW-Authenticate, so it counts twice against undici's 16KB header cap; the
 * input descriptor is well under 1KB, but we size-check the compact block and
 * return {} if a pathological pilot's input is too large, so buyer SDKs never
 * hit a Headers Overflow Error. The full extensions stay in the response BODY.
 */
export function buildHeaderExtensions(
  extensions: Record<string, unknown>,
  maxB64Len = 5000,
): Record<string, unknown> {
  const fullExt = extensions as {
    bazaar?: { info?: { input?: unknown }; routeTemplate?: unknown };
    'builder-code'?: unknown;
  };
  const compact: Record<string, unknown> = {};
  // builder-code (ERC-8021 attribution) is tiny and is the value the client
  // echoes back, so it must survive header compaction; preserve it as-is.
  if (fullExt['builder-code']) compact['builder-code'] = fullExt['builder-code'];
  const bzInput = fullExt?.bazaar?.info?.input;
  if (bzInput && typeof bzInput === 'object') {
    const compactBazaar: Record<string, unknown> = { info: { input: bzInput } };
    if (fullExt.bazaar?.routeTemplate) compactBazaar.routeTemplate = fullExt.bazaar.routeTemplate;
    compact.bazaar = compactBazaar;
  }
  if (btoa(JSON.stringify(compact)).length > maxB64Len) {
    // Oversized: drop the heavier bazaar block but keep builder-code if it fits alone.
    const bcOnly = compact['builder-code'] ? { 'builder-code': compact['builder-code'] } : {};
    return btoa(JSON.stringify(bcOnly)).length > maxB64Len ? {} : bcOnly;
  }
  return compact;
}

// Free preview siblings, keyed by the paid endpoint's pathname. When a paid
// endpoint has a free discovery taste under /api/preview/*, its 402 challenge
// advertises it so an agent that just bounced off the paywall is pointed
// straight at the free sample instead of leaving empty-handed. Add an entry
// here when you ship a new /api/preview/* sibling.
const PREVIEW_SIBLINGS: Record<string, string> = {
  '/api/premium/whats-new': '/api/preview/whats-new',
  '/api/premium/whats-new/pro': '/api/preview/whats-new/pro',
  '/api/premium/inference-providers/arbitrage': '/api/preview/inference-providers/arbitrage',
  '/api/premium/policy/timeline': '/api/preview/policy/timeline',
  '/api/premium/ai-cves/ai-stack-cves': '/api/preview/ai-cves/ai-stack-cves',
  '/api/premium/model-deprecations/timeline': '/api/preview/model-deprecations/timeline',
  '/api/premium/ai-crypto-pulse': '/api/preview/ai-crypto-pulse',
  // research/authors already ships a genuine top-25 free taste at the path
  // below (the paid endpoint returns the full top-100), so the 402 points at
  // the existing free sibling rather than a new /api/preview/* route.
  '/api/premium/research/authors': '/api/research/authors',
};

/** The free /api/preview/* sibling for a paid pathname, or undefined if none. */
export function previewSiblingFor(pathname: string): string | undefined {
  return PREVIEW_SIBLINGS[pathname];
}

// Returning-caller free-poll hint, keyed by the paid endpoint's pathname. The
// whats-new briefs (base + pro) issue an opaque `cursor` on every paid brief
// and honor `?since=<cursor>`: an unchanged poll is a free no-charge (no 402,
// no settlement, no credit), so an agent pays only when something new has
// broken since its cursor. The delta-cursor mechanic shipped 2026-07-06 (base)
// and 2026-07-07 (pro) but was invisible before payment. Advertising it in the
// 402 lets a returning agent learn the free-poll loop BEFORE its first paid
// call, not only after it. Add an entry when another endpoint gains the
// delta-cursor mechanic.
export interface PollHint {
  param: 'since';
  how: string;
  benefit: string;
  cursor_lives_in: string;
}
const WHATS_NEW_POLL_HINT: PollHint = {
  param: 'since',
  how: 'Pass ?since=<cursor> using the cursor from your last paid brief.',
  benefit:
    'An unchanged poll is free: no 402, no settlement, no credit. You are billed only when something new has broken since your cursor.',
  cursor_lives_in: 'the `poll` continuation returned on every paid brief',
};
const POLL_HINTS: Record<string, PollHint> = {
  '/api/premium/whats-new': WHATS_NEW_POLL_HINT,
  '/api/premium/whats-new/pro': WHATS_NEW_POLL_HINT,
};

/** The returning-caller free-poll hint for a paid pathname, or undefined. */
export function pollHintFor(pathname: string): PollHint | undefined {
  return POLL_HINTS[pathname];
}

// Base builder-code (ERC-8021) attribution. The seller app code `a` is declared
// in the 402 extensions under the canonical "builder-code" key (the exact shape
// @x402/extensions declareBuilderCodeExtension emits, pinned by payments.test).
// The CDP facilitator reads `a`, adds its own `w`, CBOR-encodes them, and appends
// the ERC-8021 Schema 2 suffix to the settlement calldata. GATED: returns {}
// unless env.BUILDER_CODE_APP holds a valid code, so the 402 stays byte-identical
// to today until the secret is set. Enable on mainnet ONLY after a Sepolia settle
// confirms non-attributing clients still settle; revert = wrangler secret delete.
const BUILDER_CODE_PATTERN = /^[a-z0-9_]{1,32}$/;
const BUILDER_CODE_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    a: { type: 'string', pattern: '^[a-z0-9_]{1,32}$', description: 'App builder code' },
    w: { type: 'string', pattern: '^[a-z0-9_]{1,32}$', description: 'Wallet builder code' },
    s: { type: 'array', items: { type: 'string', pattern: '^[a-z0-9_]{1,32}$' }, description: 'Service builder codes' },
  },
  additionalProperties: false,
} as const;

/** The builder-code 402 extension block for a valid app code, or {} when unset/invalid. */
export function builderCodeExtension(appCode: string | undefined): Record<string, unknown> {
  if (!appCode || !BUILDER_CODE_PATTERN.test(appCode)) return {};
  return { 'builder-code': { info: { a: appCode }, schema: BUILDER_CODE_SCHEMA } };
}

export function paymentRequiredResponse(
  env: Env,
  creditsRequired: number,
  tier: number,
  request: Request,
  exhaustedFreeTrial?: FreeTrialQuota,
  strictPremium?: boolean,
): Response {
  const minUsd = Math.max(1, creditsRequired * 0.02);
  // Atomic USDC units (6 decimals): 1 credit = $0.02 = 20000 micro-USDC.
  const amount = String(creditsRequired * 20000);
  const url = new URL(request.url);
  const resourceUrl = `${url.origin}${url.pathname}`;
  const x402Config = getX402Config(env);

  // Compose the human-and-LLM-facing message. Three cases:
  //   1. Strict-premium path: trial does not apply. Tell the agent
  //      directly that this endpoint is strict-premium and point at
  //      the free siblings used for discovery.
  //   2. Exhausted trial: caller burned today's 100-call quota.
  //   3. Cold caller: no prior trial use this window.
  const trialMessage = strictPremium
    ? 'This endpoint is strict-premium and does not offer the per-IP free trial. Sign an EIP-3009 transferWithAuthorization via X-PAYMENT or use the credits flow. Free siblings exist for discovery (pricing_series_free, benchmark_series_free, status_uptime_free, status_leaderboard_free, each 7-day-capped).'
    : exhaustedFreeTrial
      ? `This IP has used all ${exhaustedFreeTrial.limit} free premium calls in the current 24-hour window. The free quota resets at ${exhaustedFreeTrial.resetAt}. To continue immediately, sign an EIP-3009 transferWithAuthorization via X-PAYMENT or buy credits.`
      : 'This is a paid endpoint. Sign an EIP-3009 transferWithAuthorization and submit it via X-PAYMENT, or use the credits flow for repeat use.';

  // Advertise the free-trial allowance ONLY on non-strict endpoints
  // so the response is honest about what is on offer. Strict-premium
  // paths return `free_trial: null` so an agent does not waste cycles
  // trying to use a trial that does not apply.
  const freeTrialAdvert = strictPremium
    ? null
    : {
        calls_per_ip_per_day: 100,
        window: '24h rolling per IP',
        auth_required: false,
        docs: '/api/free-tier/status',
        note:
          'TensorFeed offers 100 free premium API calls per IP per 24-hour window. No authentication, no signup, no wallet required. After the cap is reached this 402 challenge fires and on-chain or credit-flow payment is required.',
        ...(exhaustedFreeTrial
          ? {
              status: 'exhausted',
              used_today: exhaustedFreeTrial.used,
              remaining: exhaustedFreeTrial.remaining,
              resets_at: exhaustedFreeTrial.resetAt,
              retry_in_seconds: exhaustedFreeTrial.resetSeconds,
            }
          : {}),
      };

  // Canonical x402 V2 PaymentRequired object. Per the HTTP transport v2 spec
  // (github.com/coinbase/x402/specs/transports-v2/http.md): "All x402 protocol
  // information is communicated through headers (PAYMENT-REQUIRED,
  // PAYMENT-SIGNATURE, PAYMENT-RESPONSE)". Response body is "a server
  // implementation concern." CDP's Bazaar crawler reads the header, not the
  // body. Without the header, the bazaar extension is invisible at indexing
  // time even though settles return EXTENSION-RESPONSES: processing. This
  // was the load-bearing gap causing TF and several federation members to
  // never appear in /discovery/resources. Confirmed by Ethan Oroshiba on
  // GitHub #2207 on 2026-05-14 and corroborated by inspecting cataloged
  // endpoints (blockrun.ai emits both `payment-required` and
  // `WWW-Authenticate: X402 requirements="..."` headers).
  // The canonical x402 input/output schema lives at accepts[].outputSchema
  // per the coinbase x402 DiscoveryInfo shape ({ input, output? }). x402scan
  // and spec-compliant indexers read the param schema from THERE, not from
  // our non-standard extensions.bazaar.info key (which serves CDP / Bazaar).
  // TF already computes exactly a DiscoveryInfo at extensions.bazaar.info, so
  // surface it canonically too. Guard for non-pilot paths (no bazaar config),
  // where the normalized extensions carry no bazaar.info and outputSchema is
  // omitted entirely. The CDP-only typing additions (queryFields, schema, ...)
  // ride along harmlessly; the canonical readers key off input.type/method/
  // queryParams which are always present on a piloted DiscoveryInfo.
  const canonicalExtensions = {
    ...normalizeBazaarExtensionsForCDP(bazaarExtensionsFor(url.pathname), resourceUrl),
    // Inert unless env.BUILDER_CODE_APP is set; then declares the seller app code.
    ...builderCodeExtension(env.BUILDER_CODE_APP),
  };
  const bazaarInfo = (
    (canonicalExtensions as { bazaar?: { info?: unknown } })?.bazaar?.info
  ) as { input?: unknown; output?: unknown } | undefined;
  // Full DiscoveryInfo for the BODY (no size limit): input + output.
  // canonicalExtensions.bazaar.info carries CDP/Bazaar typing extras
  // (queryFields, pathFields, derived output.schema) and, after CDP
  // normalization, possibly discoverable + url. Those belong in the
  // extensions.bazaar block (which CDP reads, unchanged), but the canonical
  // accepts[].outputSchema discovery surface that x402scan reads must contain
  // ONLY the coinbase x402 QueryInput fields. Pick the canonical-only copy so
  // a strict indexer cannot reject the registration on unknown keys. We clean
  // the COPY here, never the source.
  const bodyOutputSchema =
    bazaarInfo && bazaarInfo.input
      ? {
          input: canonicalDiscoveryInput(bazaarInfo.input as Record<string, unknown>),
          ...(bazaarInfo.output
            ? { output: canonicalDiscoveryOutput(bazaarInfo.output as Record<string, unknown>) }
            : {}),
        }
      : undefined;

  const canonicalPaymentRequired = {
    x402Version: 2,
    error: 'payment_required',
    resource: {
      url: resourceUrl,
      description: bazaarDescriptionFor(url.pathname, 'TensorFeed premium API'),
      mimeType: 'application/json',
    },
    accepts: [
      {
        scheme: 'exact',
        network: x402Config.network,
        amount,
        asset: x402Config.usdcAddress,
        payTo: env.PAYMENT_WALLET,
        maxTimeoutSeconds: 60,
        // Echo the resource URL at both top-level `resource` and inside
        // `extra.resource` per x402-surface-check@0.2.2 P2 finding (pay-skills
        // PR #68, 2026-05-14). Some validators cross-check the URL between
        // top-level resource.url and accepts[].resource / accepts[].extra.resource;
        // duplication is cheap and satisfies either lookup. EIP-712 domain hints
        // (name, version) preserved.
        resource: resourceUrl,
        extra: {
          name: x402Config.domain.name,
          version: x402Config.domain.version,
          resource: resourceUrl,
        },
        // Canonical x402 DiscoveryInfo. Present only on piloted paths.
        ...(bodyOutputSchema ? { outputSchema: bodyOutputSchema } : {}),
      },
      // Second rail: Solana mainnet USDC via CDP, advertised only when the
      // rail is enabled. All values are ASCII (base58 + CAIP-2 with a colon),
      // so the btoa header encoding below stays safe.
      ...(env.SOLANA_PAYMENT_ENABLED === 'true' && env.SOLANA_PAYMENT_WALLET
        ? [
            {
              scheme: 'exact',
              network: SOLANA_NETWORK_V2,
              amount,
              asset: SOLANA_USDC_MINT,
              payTo: env.SOLANA_PAYMENT_WALLET,
              maxTimeoutSeconds: 60,
              resource: resourceUrl,
              extra: { feePayer: SOLANA_FEEPAYER_V2, resource: resourceUrl },
              // Same canonical DiscoveryInfo as the Base entry. Rail-scoped
              // indexers and Bazaar records built from a Solana settle read
              // THIS entry, so it must carry the schema parity (2026-07-02:
              // every TF Bazaar record was Base-only while this entry
              // shipped without outputSchema). The header compaction below
              // reduces it to input-only, same as the Base entry.
              ...(bodyOutputSchema ? { outputSchema: bodyOutputSchema } : {}),
            },
          ]
        : []),
    ],
    extensions: canonicalExtensions,
  };

  // Base64-encode canonical PaymentRequired for the headers. JSON output is
  // ASCII for our content (English descriptions, hex addresses, numeric
  // amounts), so btoa is safe. Use TextEncoder->String.fromCharCode if we
  // ever introduce Unicode in resource/description fields.
  //
  // Header carries a COMPACT input-only extensions block via
  // buildHeaderExtensions: just bazaar.info.input (the param schema that
  // catalog validators reading the HEADER, not the body, need; x402scan
  // reported "missing input schema" when we stripped extensions entirely).
  // The heavy bazaar.info.output.example + full JSON Schema stay body-only,
  // so the body still serves crawlers that read it (agentic.market, CDP
  // /discovery). The 16KB-overflow guard is preserved inside the helper:
  // this base64 is emitted in BOTH PAYMENT-REQUIRED and WWW-Authenticate, so
  // it counts twice, and a pathological oversized input falls back to {}.
  // Original overflow bug found 2026-05-25 debugging the 4 endpoints that
  // would not settle (repro tensorfeed-work/buyer-debug.mjs); restored input
  // discovery here without reintroducing it (audit, x402scan).
  // Header accepts entry: keep accepts[0].outputSchema INPUT-ONLY. The heavy
  // part of a DiscoveryInfo is info.output.example, which can run kilobytes;
  // the header rides in BOTH PAYMENT-REQUIRED and WWW-Authenticate (counts
  // twice) under a 16KB overflow guard, so we mirror buildHeaderExtensions'
  // input-only compaction philosophy. x402scan reads the input schema from
  // the header; the full DiscoveryInfo (with output) stays in the body for
  // crawlers that read it. Non-pilot paths have no outputSchema, so the entry
  // is passed through unchanged.
  const headerAccepts = canonicalPaymentRequired.accepts.map((entry) => {
    const e = entry as { outputSchema?: { input?: unknown; output?: unknown } };
    if (e.outputSchema && e.outputSchema.input) {
      return { ...entry, outputSchema: { input: e.outputSchema.input } };
    }
    return entry;
  });
  const headerCanonical = {
    ...canonicalPaymentRequired,
    accepts: headerAccepts,
    extensions: buildHeaderExtensions(canonicalPaymentRequired.extensions as Record<string, unknown>),
  };
  const canonicalB64 = btoa(JSON.stringify(headerCanonical));

  return jsonResponse(
    {
      // Extended body. Per spec the body is implementation-defined; we keep
      // the canonical fields here too for human-friendly debugging plus our
      // TF-specific extras (free_trial advert, credits-flow pointers, legacy
      // x402 fallback notes). Real agents read the headers; humans hitting
      // the endpoint in a browser get this richer view.
      ...canonicalPaymentRequired,
      ok: false,
      message: trialMessage,
      free_trial: freeTrialAdvert,
      // Point bounced agents at the free preview taste when this endpoint has one.
      ...(previewSiblingFor(url.pathname) ? { free_preview: previewSiblingFor(url.pathname) } : {}),
      // Teach a returning caller the free unchanged-poll (?since=<cursor>) on
      // the cursor-enabled endpoints, so it learns the retention loop before
      // its first paid call, not only after. Body-only (not in the base64
      // header), so the Bazaar manifest is untouched.
      ...(pollHintFor(url.pathname) ? { returning: pollHintFor(url.pathname) } : {}),
      // Static freshness commitment for this endpoint: the SLA it promises and
      // the no-charge-on-stale guarantee, so an agent reads the freshness terms
      // BEFORE paying. Derived only from the in-memory SLA registry, so it adds
      // zero I/O to the challenge path (the high-volume indexer/prober traffic
      // must never trigger a KV or cache read). Body-only, like free_preview and
      // returning; the base64 header and Bazaar manifest are untouched. The live
      // data age ships on the paid response and its receipt, not here.
      freshness: describe402Freshness(url.pathname),
      payment: {
        wallet: env.PAYMENT_WALLET,
        currency: 'USDC',
        network: 'base',
        contract: USDC_BASE_CONTRACT,
        minimum_amount_usd: minUsd,
        tier,
        credits_required: creditsRequired,
        credits_per_usd: 50,
      },
      endpoints: {
        info: '/api/payment/info',
        quote: '/api/payment/buy-credits',
        confirm: '/api/payment/confirm',
        balance: '/api/payment/balance',
      },
      flow_options: {
        x402_v2: 'Sign an EIP-3009 transferWithAuthorization for the exact `amount` above against USDC on Base mainnet, base64-encode the PaymentPayload, retry with X-PAYMENT header. AgentCore Payments and @coinbase/x402 do this automatically.',
        recommended: 'Buy credits once via /api/payment/buy-credits, get a bearer token, use Authorization: Bearer <token> for all future calls (50ms latency).',
        x402_legacy: 'Pre-broadcast USDC on Base, retry this request with X-Payment-Tx + X-Payment-Quote headers. TensorFeed-specific fallback; agents on AgentCore Payments use X-PAYMENT instead.',
      },
      faucet: {
        endpoint: '/api/payment/trial-credits',
        method: 'POST',
        credits: TRIAL_FAUCET_CREDITS,
        cost: 'free',
        how: `No payment, no USDC, no gas. Sign an EIP-191 message proving you control a wallet, POST { message, signature }, and receive a bearer token preloaded with ${TRIAL_FAUCET_CREDITS} trial credits. One grant per wallet. Use it to evaluate any premium endpoint, then top up the same token via /api/payment/buy-credits.`,
      },
    },
    402,
    {
      // x402 V2 HTTP transport spec: PAYMENT-REQUIRED carries the canonical
      // PaymentRequired schema in the header. Bazaar crawlers read this.
      'PAYMENT-REQUIRED': canonicalB64,
      // RFC 7235 auth-challenge convention; cataloged x402 servers (blockrun,
      // etc.) emit this alongside PAYMENT-REQUIRED for maximum compatibility
      // with HTTP clients that follow standard auth-challenge handling.
      'WWW-Authenticate': `X402 requirements="${canonicalB64}"`,
      // Expose the x402 headers to browser-side agents. Without this, CORS
      // hides the headers from any client running in a browser context.
      'Access-Control-Expose-Headers':
        'PAYMENT-REQUIRED, PAYMENT-RESPONSE, WWW-Authenticate, X-Payment-Address, X-Payment-Currency, X-Payment-Network, X-Payment-Credits-Required, X-Payment-Min-USD',
      // TF-specific summary headers (non-spec, kept for backward compat with
      // legacy clients sniffing X-Payment-* on the 402).
      'X-Payment-Address': env.PAYMENT_WALLET,
      'X-Payment-Currency': 'USDC',
      'X-Payment-Network': 'base',
      'X-Payment-Credits-Required': String(creditsRequired),
      'X-Payment-Min-USD': String(minUsd),
    },
  );
}

// === AFTA: commitPayment + no-charge logging ===

const NO_CHARGE_PREFIX = 'pay:no-charge:';
const NO_CHARGE_INDEX_KEY = 'pay:no-charge:index';
const NO_CHARGE_MAX_INDEX_DATES = 365 * 3;

interface NoChargeEvent {
  ts: string;
  reason: NoChargeReason;
  endpoint: string;
  cost_skipped: number;
  token_short: string;
}

interface DailyNoChargeRollup {
  date: string;
  count: number;
  by_reason: Record<string, number>;
  by_endpoint: Record<string, number>;
  credits_skipped: number;
  events: NoChargeEvent[];   // capped at 200 for the most recent
}

function noChargeKey(date: string): string {
  return `${NO_CHARGE_PREFIX}${date}`;
}

function dateString(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function shortenToken(token: string): string {
  if (!token || !token.startsWith('tf_live_')) return token.slice(0, 8) + '...';
  const body = token.slice(8);
  return `tf_live_${body.slice(0, 8)}...${body.slice(-8)}`;
}

async function readNoChargeIndex(env: Env): Promise<string[]> {
  const raw = await env.TENSORFEED_CACHE.get(NO_CHARGE_INDEX_KEY, 'json') as string[] | null;
  return raw || [];
}

async function pushNoChargeIndexDate(env: Env, date: string): Promise<void> {
  const dates = await readNoChargeIndex(env);
  if (!dates.includes(date)) {
    dates.unshift(date);
    if (dates.length > NO_CHARGE_MAX_INDEX_DATES) dates.length = NO_CHARGE_MAX_INDEX_DATES;
    await env.TENSORFEED_CACHE.put(NO_CHARGE_INDEX_KEY, JSON.stringify(dates));
  }
}

async function logNoChargeEvent(
  env: Env,
  reason: NonNullable<NoChargeReason>,
  endpoint: string,
  costSkipped: number,
  token: string,
): Promise<void> {
  const date = dateString();
  const existing = (await env.TENSORFEED_CACHE.get(noChargeKey(date), 'json')) as DailyNoChargeRollup | null;
  const event: NoChargeEvent = {
    ts: new Date().toISOString(),
    reason,
    endpoint,
    cost_skipped: costSkipped,
    token_short: shortenToken(token),
  };
  const rollup: DailyNoChargeRollup = existing || {
    date,
    count: 0,
    by_reason: {},
    by_endpoint: {},
    credits_skipped: 0,
    events: [],
  };
  rollup.count += 1;
  rollup.credits_skipped += costSkipped;
  rollup.by_reason[reason] = (rollup.by_reason[reason] || 0) + 1;
  rollup.by_endpoint[endpoint] = (rollup.by_endpoint[endpoint] || 0) + 1;
  rollup.events.unshift(event);
  if (rollup.events.length > 200) rollup.events.length = 200;
  await env.TENSORFEED_CACHE.put(noChargeKey(date), JSON.stringify(rollup));
  await pushNoChargeIndexDate(env, date);
}

/**
 * AFTA commit phase. Called by premiumResponse() after the handler
 * returns. Honors the published no-charge guarantees:
 *
 *   - 5xx                          -> no charge
 *   - circuit_breaker              -> no charge (already handled in
 *                                     requirePayment, but re-checked here
 *                                     for completeness)
 *   - schema_validation_failure    -> no charge
 *   - stale_data                   -> no charge, response is also
 *                                     flagged with stale: true so the
 *                                     agent knows to retry later
 *
 * Idempotent on the no-charge path. Race condition note: between
 * requirePayment and commitPayment another request can clear the
 * balance; in that case commitPayment debits to 0 rather than
 * negative. Same risk as the previous read-modify-write code; the
 * deferred-debit refactor does not introduce a new risk.
 */
export async function commitPayment(
  env: Env,
  payment: PaymentResult,
  endpoint: string,
  noChargeReason: NoChargeReason,
): Promise<{ creditsCharged: number; balanceAfter: number; noChargeReason: NoChargeReason }> {
  // Free-trial path: no token, no debit, no balance. Log the no-charge
  // event so the public no-charge stats reflect the trial volume and
  // the funnel from "free trial used" to "credits purchased" can be
  // tracked downstream. Honors any handler-supplied noChargeReason
  // (e.g. stale_data), defaulting to 'free_trial' otherwise.
  if (payment.freeTrial) {
    const reason: NoChargeReason = noChargeReason ?? 'free_trial';
    await logNoChargeEvent(env, reason, endpoint, payment.cost ?? 0, 'free_trial');
    return { creditsCharged: 0, balanceAfter: 0, noChargeReason: reason };
  }
  if (!payment.paid || !payment.token || payment.cost === undefined) {
    return { creditsCharged: 0, balanceAfter: 0, noChargeReason: null };
  }
  const cost = payment.cost;

  if (noChargeReason !== null) {
    await logNoChargeEvent(env, noChargeReason, endpoint, cost, payment.token);
    return {
      creditsCharged: 0,
      balanceAfter: payment.currentBalance ?? 0,
      noChargeReason,
    };
  }

  // === Tier 2 Phase 3 (2026-05-26): CreditLedger DO debit path ====
  //
  // When CREDIT_LEDGER_ENABLED='true' AND the CREDIT_LEDGER DO binding
  // is present, route the debit + daily-spend update through the DO.
  // Cloudflare serializes per-instance access so the read-modify-write
  // on the credit balance is race-safe by construction, closing audit
  // findings H-1 (credit-debit TOCTOU) and H-2 (daily spend-cap parallel
  // bypass) atomically. The DO auto-mirrors back to `pay:credits:{token}`
  // + `pay:spend:{token}:{date}` so the public balance endpoint and the
  // legacy `checkSpendCap` upstream reader continue to serve fresh data.
  //
  // Falls back to the legacy KV read-modify-write path on flag-off,
  // missing binding, or any DO error so we degrade to the prior behavior
  // (with its known bounded race) rather than fail a paid request.
  // Phase 4 (planned) removes the legacy path once the flag has been on
  // in production for the grace window.
  if (
    cost > 0 &&
    env.CREDIT_LEDGER_ENABLED === 'true' &&
    env.CREDIT_LEDGER !== undefined
  ) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const id = env.CREDIT_LEDGER.idFromName(payment.token);
      const stub = env.CREDIT_LEDGER.get(id);
      const res = await stub.fetch(
        new Request('https://credit-ledger.do/debit', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: payment.token, amount: cost, today }),
        }),
      );
      if (res.ok) {
        const data = (await res.json()) as {
          ok: boolean;
          balance: number;
          reason?: 'insufficient_credits' | 'cap_exceeded' | 'not_initialized';
        };
        if (data.ok) {
          // DO succeeded. Anomaly detection still runs (independent of
          // the debit mechanism) so the rolling 7-day hourly buffer
          // stays accurate.
          try {
            await recordAnomalySpend(env, payment.token, cost);
          } catch (err) {
            console.error('recordAnomalySpend failed:', err);
          }
          return { creditsCharged: cost, balanceAfter: data.balance, noChargeReason: null };
        }
        // DO rejected (insufficient_credits or cap_exceeded). This
        // should be rare because requirePayment already pre-checks
        // balance and the upstream checkSpendCap pre-checks the cap.
        // A reject here means a race between pre-flight and commit
        // (e.g. parallel calls drained the balance below cost between
        // the pre-check and this debit, or the cap got hit). Treat as
        // a no-charge stale-data event so the agent isn't billed for a
        // call that didn't successfully debit.
        const reason: NoChargeReason = 'stale_data';
        await logNoChargeEvent(env, reason, endpoint, cost, payment.token);
        return {
          creditsCharged: 0,
          balanceAfter: data.balance,
          noChargeReason: reason,
        };
      }
      // Non-2xx from the DO. Fall through to legacy KV path so the
      // paid request still gets debited (with the known bounded race).
      console.warn('credit-ledger DO returned non-2xx, falling back to legacy KV path:', res.status);
    } catch (err) {
      // DO call threw (transient binding issue, network, etc). Fall
      // through to legacy. Logged as warn because the legacy path
      // covers the request; only persistent DO failure becomes
      // operationally meaningful.
      console.warn('credit-ledger DO debit failed, falling back to legacy KV path:', err);
    }
  }

  // === Legacy KV-only debit path (default until CREDIT_LEDGER_ENABLED) ==
  //
  // Has the bounded TOCTOU described in audit H-1. Circuit breaker caps
  // burst at ~100/min/token; race-y but bounded. Will be removed in
  // Phase 4 after the DO path has soaked in production.
  const record = (await env.TENSORFEED_CACHE.get(`pay:credits:${payment.token}`, 'json')) as CreditsRecord | null;
  if (!record) {
    // Token disappeared (admin burn, race). Treat as no-charge so the
    // agent isn't billed for a call we cannot account for.
    await logNoChargeEvent(env, 'stale_data', endpoint, cost, payment.token);
    return { creditsCharged: 0, balanceAfter: 0, noChargeReason: 'stale_data' };
  }
  const balanceAfter = Math.max(0, record.balance - cost);
  record.balance = balanceAfter;
  record.last_used = new Date().toISOString();
  await env.TENSORFEED_CACHE.put(`pay:credits:${payment.token}`, JSON.stringify(record));
  // Track today's spend so the per-token daily cap (if any) sees the
  // actual debit. Always increment, even when the token has no cap, so
  // the counter is ready the moment a cap is added later in the day.
  if (cost > 0) {
    try {
      await incrementDailySpent(env, payment.token, cost);
    } catch (err) {
      console.error('incrementDailySpent failed:', err);
    }
    // Anomaly detection: record into the rolling 7-day hourly buffer
    // and append to the anomaly event log on first detection per hour.
    // Always wrapped: anomaly machinery must never fail a paid request.
    try {
      await recordAnomalySpend(env, payment.token, cost);
    } catch (err) {
      console.error('recordAnomalySpend failed:', err);
    }
  }
  return { creditsCharged: cost, balanceAfter, noChargeReason: null };
}

// === Anomaly events surfacing (admin-only) ===

export async function getAnomalyEvents(env: Env): Promise<AnomalyEvent[]> {
  return listAnomalyEvents(env);
}

export async function getNoChargeRollup(env: Env, date?: string): Promise<DailyNoChargeRollup | null> {
  const targetDate = date || dateString();
  return (await env.TENSORFEED_CACHE.get(noChargeKey(targetDate), 'json')) as DailyNoChargeRollup | null;
}

export async function listNoChargeDates(env: Env): Promise<string[]> {
  return readNoChargeIndex(env);
}
