import { Env } from './types';
import { checkCircuitBreaker } from './circuit-breaker';
import type { NoChargeReason } from './receipts';
import { checkSpendCap, incrementDailySpent, validateSpendCap } from './spend-cap';
import { recordAndAssess as recordAnomalySpend, listAnomalyEvents, AnomalyEvent } from './anomaly';

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
const TIER_COSTS: Record<1 | 2 | 3, number> = { 1: 1, 2: 1, 3: 5 };

// First-payment welcome bonus. Granted once per sender wallet, on the
// first successful USDC payment from that address (credits flow OR
// x402 fallback). Redeemed by writing a `pay:wallet-seen:{address}`
// marker in TENSORFEED_CACHE; race conditions across simultaneous
// payments from the same wallet are accepted (worst case: one extra
// bonus, capped at $1 of value).
const WELCOME_BONUS_CREDITS = 50;

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
  credits: number;
  expires_at: number;
  created: string;
}

interface TxRecord {
  amount_usd: number;
  credits: number;
  token: string;
  created: string;
  block_number?: number;
}

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
    { calls: number; credits_charged: number; first_seen: string; last_seen: string }
  >;
  top_agents: Array<{
    agent_ua: string;
    calls: number;
    credits: number;
    purchased_usd: number;
    last_seen: string;
  }>; // capped at 25, sorted by calls desc
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

    return {
      ok: true,
      amountUsd,
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
        return { sanctioned: false, identifications: [], error: null };
      }
      return { sanctioned: false, identifications: null, error: 'chainalysis_status_' + res.status };
    }
    const data = (await res.json()) as ChainalysisResponse;
    const ids = Array.isArray(data?.identifications) ? data.identifications : [];
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

async function logRevenue(env: Env, amountUsd: number, agentUa: string): Promise<void> {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const rollup = await readRollup(env, date);
    rollup.total_usd = parseFloat((rollup.total_usd + amountUsd).toFixed(2));
    rollup.tx_count += 1;
    noteUniqueAgent(rollup, agentUa);
    bumpTopAgent(rollup, agentUa, { purchased_usd: amountUsd });
    await writeRollup(env, rollup);
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
 */
export async function logPremiumUsage(
  env: Env,
  endpoint: string,
  agentUa: string,
  creditsCharged: number,
  token?: string,
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
    };
    slot.calls += 1;
    slot.credits_charged += creditsCharged;
    slot.last_seen = now;
    rollup.by_endpoint[endpoint] = slot;

    await writeRollup(env, rollup);

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
      contact: 'evan@tensorfeed.ai',
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

export async function createQuote(
  env: Env,
  amountUsd: number,
): Promise<{ nonce: string; quote: QuoteRecord; wallet: string }> {
  const credits = calculateCredits(amountUsd);
  const nonce = generateNonce();
  const expiresAt = Date.now() + QUOTE_TTL_SECONDS * 1000;
  const quote: QuoteRecord = {
    amount_usd: amountUsd,
    credits,
    expires_at: expiresAt,
    created: new Date().toISOString(),
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

export async function checkAndMarkFirstPayment(
  env: Env,
  walletAddress: string | undefined,
): Promise<{ isFirstPayment: boolean; bonusCredits: number }> {
  if (!walletAddress) {
    return { isFirstPayment: false, bonusCredits: 0 };
  }
  const key = `pay:wallet-seen:${walletAddress.toLowerCase()}`;
  const seen = await env.TENSORFEED_CACHE.get(key);
  if (seen) {
    return { isFirstPayment: false, bonusCredits: 0 };
  }
  return { isFirstPayment: true, bonusCredits: WELCOME_BONUS_CREDITS };
}

export function markWalletSeen(env: Env, walletAddress: string): Promise<void> {
  return env.TENSORFEED_CACHE.put(
    `pay:wallet-seen:${walletAddress.toLowerCase()}`,
    new Date().toISOString(),
  );
}

export const WELCOME_BONUS_CREDITS_VALUE = WELCOME_BONUS_CREDITS;

export async function confirmPayment(
  env: Env,
  txHash: string,
  request: Request,
  nonce?: string,
): Promise<ConfirmResult> {
  const existingTx = (await env.TENSORFEED_CACHE.get(`pay:tx:${txHash}`, 'json')) as TxRecord | null;
  if (existingTx) {
    return {
      ok: false,
      error: 'tx_already_claimed',
      reason: 'This transaction has already been used to mint credits.',
    };
  }

  let quote: QuoteRecord | null = null;
  if (nonce) {
    quote = (await env.TENSORFEED_CACHE.get(`pay:quote:${nonce}`, 'json')) as QuoteRecord | null;
    if (!quote) {
      return {
        ok: false,
        error: 'quote_not_found_or_expired',
        reason: 'Quote may have expired (30 min TTL). Call /api/payment/confirm without nonce to use the default rate.',
      };
    }
    if (Date.now() > quote.expires_at) {
      return {
        ok: false,
        error: 'quote_expired',
        reason: 'Call /api/payment/confirm without nonce to use the default rate based on actual tx amount.',
      };
    }
  }

  const verified = await verifyBaseUSDCTransaction(txHash, env);
  if (!verified.ok) {
    return { ok: false, error: 'verification_failed', reason: verified.reason };
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

  let baseCredits: number;
  let rate: string;
  if (quote && Math.abs(verified.amountUsd - quote.amount_usd) < 0.01) {
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
  | { ok: true; balance: number; created: string; last_used: string; total_purchased: number }
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
  if (record.balance < cost) {
    return { ok: false, reason: 'insufficient_credits' };
  }
  record.balance -= cost;
  record.last_used = new Date().toISOString();
  await env.TENSORFEED_CACHE.put(`pay:credits:${token}`, JSON.stringify(record));
  return { ok: true, credits_remaining: record.balance };
}

// === Federated AFTA rail: validate + commit (split flow for sister sites) ===
//
// The `validateAndCharge` helper above is atomic and good for callers who
// don't need to honor AFTA no-charge guarantees themselves. Sister sites
// (TerminalFeed.io, future VR.org) need the deferred-debit model: validate
// up front, run the handler, then either commit the debit or log a
// no-charge event. These two helpers expose that flow over the wire.

export type ValidateOnlyResult =
  | { ok: true; credits_remaining: number; sufficient: boolean }
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
  if (record.balance < cost) {
    return { ok: false, reason: 'insufficient_credits' };
  }
  return {
    ok: true,
    credits_remaining: record.balance,
    sufficient: true,
  };
}

export type CommitInternalResult =
  | { ok: true; credits_charged: number; balance_after: number; no_charge_reason: NoChargeReason }
  | { ok: false; reason: 'invalid_token' };

/**
 * Internal commit. Sister sites call this after their handler runs.
 * If `noChargeReason` is set, no debit happens; the event is logged to
 * the AFTA public ledger (`pay:no-charge:{date}`) with the sister-site
 * endpoint path so the network ledger reflects the failure. If null,
 * the debit is committed atomically.
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
  },
): Promise<CommitInternalResult> {
  const { token, cost, endpoint, noChargeReason } = args;
  if (
    typeof token !== 'string' ||
    !token ||
    !token.startsWith('tf_live_')
  ) {
    return { ok: false, reason: 'invalid_token' };
  }

  // No-charge path: log the event without touching the credit balance.
  // This requires reading the record only to surface balance_after; if
  // the record is gone, treat balance as 0 (admin burn or race).
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

  // Charge path: atomic debit.
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
}

export async function requirePayment(
  request: Request,
  env: Env,
  tier: 1 | 2 | 3,
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
    const existing = (await env.TENSORFEED_CACHE.get(`pay:tx:${txHash}`, 'json')) as TxRecord | null;
    if (existing) {
      // Already claimed; charge against the existing token if it has balance
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

    const verified = await verifyBaseUSDCTransaction(txHash, env);
    if (!verified.ok) {
      return {
        paid: false,
        response: jsonResponse(
          { ok: false, error: 'tx_verification_failed', reason: verified.reason },
          402,
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
    };

    await Promise.all([
      env.TENSORFEED_CACHE.put(`pay:credits:${token}`, JSON.stringify(tokenRecord)),
      env.TENSORFEED_CACHE.put(`pay:tx:${txHash}`, JSON.stringify(txRec)),
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
    };
  }

  // No payment provided -> return 402 with full payment instructions
  return { paid: false, response: paymentRequiredResponse(env, cost, tier) };
}

function paymentRequiredResponse(env: Env, creditsRequired: number, tier: number): Response {
  const minUsd = Math.max(1, creditsRequired * 0.02);
  return jsonResponse(
    {
      ok: false,
      error: 'payment_required',
      message: 'This is a paid endpoint. Pay via USDC on Base or use a bearer token.',
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
        recommended: 'Buy credits once via /api/payment/buy-credits, get a bearer token, use Authorization: Bearer <token> for all future calls (50ms latency).',
        x402_fallback: 'Send USDC on Base, retry this request with X-Payment-Tx: <txHash> header. Slower but no pre-flight needed.',
      },
    },
    402,
    {
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
